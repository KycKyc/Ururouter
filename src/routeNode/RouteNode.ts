import { Path } from '../pathParser';
import type { PathOptions } from '../pathParser';
import type { Params, Anchor, TrailingSlashMode, QueryParamsMode } from '../types/common';
import { buildPathFromNodes, buildStateFromMatch, getMetaFromNodes, getPathFromNodes, sortedNameMap, getDefaultParamsFromNodes } from './helpers';
import matchChildren from './matchChildren';

export interface BuildOptions {
    trailingSlashMode?: TrailingSlashMode;
    queryParamsMode?: QueryParamsMode;
}

export interface MatchOptions {
    caseSensitive?: boolean;
    queryParamsMode?: QueryParamsMode;
}

export interface RouteNodeStateMeta {
    params: {
        [routeName: string]: {
            [routeParams: string]: 'query' | 'url';
        };
    };
}

export interface RouteNodeState {
    name: string;
    params: Params;
    anchor: Anchor;
    meta: RouteNodeStateMeta;
}

export interface RouteNodeInitParams {
    name?: string;
    path?: string;
    pathOptions?: Partial<PathOptions>;
    children?: RouteNodeInitParams[] | RouteNode[] | RouteNode;
    sort?: boolean;
    defaultParams?: Params;
}

const trailingSlashRex = /(.+?)(\/)(\?.*$|$)/gim;

export class RouteNode {
    // ['constructor']: new (params: RouteNodeInitParams) => this;
    name: string;
    treeNames: string[];
    path: string;
    absolute: boolean;
    parser: Path | null;
    pathOptions?: Partial<PathOptions>;
    nameMap: Map<string, this>;
    private masterNode: this;
    private isRoot: boolean;
    defaultParams: Params = {}; // TODO: proper way of defining them in constructor

    constructor({ name = '', path = '', pathOptions, sort = true, children = [], ...augments }: RouteNodeInitParams) {
        this.name = name;
        this.treeNames = [];
        this.absolute = /^~/.test(path);

        this.path = this.absolute ? path.slice(1) : path;
        this.pathOptions = pathOptions;
        this.parser = this.path ? new Path(this.path, this.pathOptions) : null;

        this.isRoot = !name || !path;

        this.nameMap = new Map();

        this.masterNode = this;

        if (augments) {
            Object.assign(this, augments);
        }

        this.add(children, false);
        if (sort) this.reflow();

        // return this;
    }

    /**
     * Probably you wanna sort parrent childs after changing the path ?
     * @param path
     */
    setPath(path: string = '') {
        this.path = path;
        this.parser = path ? new Path(path) : null;
    }

    /**
     *
     * @param route
     * @param {boolean} sort: be careful with sort, without sorting router will not work correctly
     * @returns
     */
    add(route: RouteNodeInitParams | RouteNodeInitParams[] | this | this[], sort: boolean = true): this {
        if (route === undefined || route === null) {
            return this;
        }

        if (route instanceof Array) {
            if (route.length === 0) return this;
            route.forEach((r) => this.add(r, false));
            if (sort) this.reflow();

            return this;
        }

        if (!(route instanceof Object)) {
            throw new Error('RouteNode.add() expects routes to be an Object at least.');
        }

        let node: this;
        // If route is some object and not instance of RouteNode class, we should build correct instance from it
        if (!(route instanceof RouteNode)) {
            let { name, path, pathOptions, children = [], ...extra } = route;
            node = new (this.constructor as new (params: RouteNodeInitParams) => this)({
                name,
                path,
                pathOptions,
                children,
                sort: false,
                ...extra,
            });
        } else {
            node = route;
        }

        // Check if instance is corect one, do not allow mixed instance, will be chaotic otherwise
        if (!(node instanceof this.constructor)) {
            // TODO: remove, probably doesn;t make sense, will throw earlier or denied by TS
            throw new Error('RouteNode.add() expects routes to be the same instance as the parrent node.');
        }

        if (node.isRoot) {
            if (node.nameMap.size === 0) {
                throw new Error("RouteNode.add() expects routes to have a name(not '') and a path, or at least have some children to steal");
            }

            node.nameMap.forEach((node) => {
                this.addRouteNode(node);
            });

            if (sort) this.reflow(false);

            return this;
        }

        this.addRouteNode(node);
        if (sort) this.reflow();

        return this;
    }

    private addRouteNode(node: this): this {
        // If node have trailing slash, remove it, cause parents can't have trailing slashes.
        // Only exception is `/` path
        if (trailingSlashRex.test(this.path)) {
            this.path = this.path.replace(trailingSlashRex, '$1$3');
            this.parser = this.path ? new Path(this.path) : null;
        }

        // Move absolute node under control of `rootNode`
        if (node.absolute && this !== this.masterNode) {
            this.masterNode.addRouteNode(node);
            return this;
        }

        // `route` have childs, some of them are absolute ?
        // move them under control of `rootNode`
        let deferredSort = false;
        for (let [childName, childNode] of node.nameMap.entries()) {
            if (childNode.absolute) {
                node.nameMap.delete(childName);
                this.masterNode.addRouteNode(childNode);
                deferredSort = true;
            }
        }

        // After moving all nodes under controll of rootNode, we should sort them
        if (deferredSort) {
            this.masterNode.sortChildren();
        }

        // Process with attempt to add `route` as a child of this node
        const names = node.name.split('.');
        if (names.length === 1) {
            // Check if name already defined
            if (this.nameMap.has(node.name) && this.nameMap.get(node.name) !== node) {
                throw new Error(`Name "${node.name}" is already defined as children of this node("${this.name}"), will not overwrite`);
            }

            // Check if path already defined somewhere inside child nodes
            for (let childNode of this.nameMap.values()) {
                if (childNode.path === node.path && childNode !== node) {
                    throw new Error(`Path "${node.path}" is already defined as children of this node("${this.name}"), will not overwrite`);
                }
            }

            if (this.nameMap.get(node.name) === node) {
                // Already defined, no point in redefining the same node on the same name and path
                console.warn(`This child Node was already defined inside its parent, ignore: '${node.name}'`);
                return this;
            }

            this.nameMap.set(node.name, node);

            if (
                node.absolute &&
                this.parser &&
                (this.parser.hasUrlParams || this.parser.hasSpatParam || this.parser.hasMatrixParams || this.parser.hasQueryParams)
            ) {
                console.warn(
                    `Absolute child-Node was placed under Node that have params in their path, be sure that this child-node will migrate to another node, node: ${this.name}, child-node: ${node.name}`
                );
            }

            node.propagateMaster(this);
        } else {
            // Locate parent node,`route.name` should already be descendant of this node.
            const nodes = this.getNodesByName(names.slice(0, -1).join('.'));
            if (nodes) {
                node.name = names[names.length - 1];
                nodes[nodes.length - 1].addRouteNode(node);
            } else {
                throw new Error(`Could not add route named '${node.name}', parent is missing.`);
            }
        }

        return this;
    }

    /**
     * Sort childen of this node
     * @param deepSort - should we recursively sort children of childern?
     */
    private reflow(deepSort = true) {
        if (deepSort) {
            this.sortDescendants();
        } else {
            this.sortChildren();
        }

        this.masterNode.resetTreeNames();
        this.masterNode.rebuildTreeNames();
    }

    sortChildren() {
        if (!this.nameMap.size) return;
        this.nameMap = sortedNameMap(this.nameMap) as Map<string, this>;
    }

    sortDescendants() {
        this.sortChildren();
        for (let childNode of this.nameMap.values()) {
            childNode.sortDescendants();
        }
    }

    private propagateMaster(node: this) {
        this.masterNode = node;

        // Pass master PathOptions to its childrens
        if (this.masterNode.pathOptions !== undefined && this.pathOptions === undefined) {
            this.pathOptions = this.masterNode.pathOptions;
            this.parser?.updateOptions(this.masterNode.pathOptions);
        }

        for (let childNode of this.nameMap.values()) {
            childNode.propagateMaster(node);
        }
    }

    private resetTreeNames() {
        // TODO: We do not need this method ?
        // rebuildTreeNames do all the works?
        this.treeNames = [];
        for (let node of this.nameMap.values()) {
            node.resetTreeNames();
        }
    }

    private rebuildTreeNames(parrentNames: string[] = []) {
        let treeNames: string[] = [];
        if (parrentNames.length === 0 && this.name !== '') {
            treeNames.push(this.name);
        } else {
            parrentNames.forEach((treeName) => {
                treeNames.push(`${treeName}.${this.name}`);
            });
        }

        this.treeNames = this.treeNames.concat(treeNames);

        // Update childrens
        for (let node of this.nameMap.values()) {
            node.rebuildTreeNames(treeNames);
        }
    }

    /**
     * Get synthezed path\\template for given route name
     * @param routeName route name, e.g `path.to.something`
     * @returns {string} path, e.g `/blogs/:blogId/posts/:postId`
     */
    getPath(routeName: string): string | null {
        const nodesByName = this.getNodesByName(routeName);

        return nodesByName ? getPathFromNodes(nodesByName) : null;
    }

    /**
     * Get defaultParams for given route name, all defaultParams from node tree (grandparent -> parent -> child)
     * @param routeName route name, e.g `path.to.something`
     * @returns {Object} params, e.g. `{param: 1, param: 2}`
     */
    getDefaultParams(routeName: string): Params {
        const nodesByName = this.getNodesByName(routeName);

        return nodesByName ? getDefaultParamsFromNodes(nodesByName) : {};
    }

    buildPath(name: string, params: Params = {}, anchor: Anchor = null, options: BuildOptions = {}): string {
        const nodes = this.getNodesByName(name);

        if (!nodes) {
            throw new Error(`[route-node][buildPath] "${name}" is not defined`);
        }

        if (this.parser) {
            nodes.splice(0, 0, this);
        }

        return buildPathFromNodes(nodes, params, anchor, options);
    }

    buildState(name: string, params: Params = {}, anchor: Anchor = null): RouteNodeState | null {
        const nodes = this.getNodesByName(name);

        if (!nodes || !nodes.length) {
            return null;
        }

        if (this.parser) {
            nodes.splice(0, 0, this);
        }

        return {
            name,
            params,
            anchor,
            meta: getMetaFromNodes(nodes),
        };
    }

    /**
     * Get LIST of nodes by full name, like `en.user.orders`
     * @param name
     * @returns RouteNode[]
     */
    getNodesByName(name: string): this[] | null {
        const result: this[] = [];
        let scanNode: this = this;

        const matched = name.split('.').every((name) => {
            let subNode = scanNode.nameMap.get(name);
            if (subNode === undefined) return false;
            result.push(subNode);
            scanNode = subNode;
            return true;
        });

        return matched ? result : null;
    }

    /**
     * get ONE node by full name of the node, like `en.user.orders`
     * @param name
     * @returns RouteNode
     */
    getNodeByName(name: string): this | null {
        let node = this.getNodesByName(name);
        if (node === null) return null;
        return node[node.length - 1];
    }

    matchPath(path: string, options: MatchOptions = {}): RouteNodeState | null {
        if (path === '') {
            path = '/';
        }

        const topLevelNodes = this.parser ? new Map([[this.name, this]]) : this.nameMap;
        const match = matchChildren(topLevelNodes, path, options);
        if (!match) {
            return null;
        }

        return buildStateFromMatch(match);
    }
}

/**
 * Create augmented RouteNode.
 * Ts workaround, to get proper augmented type autocomplete
 * @param init
 * @returns RouteNode
 */
export const createNode = <Augments>(init: RouteNodeInitParams & Augments) => new RouteNode(init) as RouteNode & Augments;
