import { Path, URLParamsEncodingType } from 'pathParser';
import { IOptions as QueryParamFormats } from 'search-params';

import { buildPathFromNodes, buildStateFromMatch, getMetaFromNodes, getPathFromNodes, sortedNameMap } from './helpers';
import matchChildren from './matchChildren';

export type Callback = (node: Partial<RouteNode> & { name: string }) => void;
export type TrailingSlashMode = 'default' | 'never' | 'always';
export type QueryParamsMode = 'default' | 'strict' | 'loose';

export interface BuildOptions {
    trailingSlashMode?: TrailingSlashMode;
    queryParamsMode?: QueryParamsMode;
    queryParamFormats?: QueryParamFormats;
    urlParamsEncoding?: URLParamsEncodingType;
}

export interface MatchOptions extends BuildOptions {
    caseSensitive?: boolean;
    strictTrailingSlash?: boolean;
}

export interface MatchResponse {
    nodes: RouteNode[];
    params: Record<string, any>;
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
    params: Record<string, any>;
    meta: RouteNodeStateMeta;
}

export interface RouteNodeOptions {
    sort?: boolean;
}

export type BasicRouteSignature = {
    name?: string;
    path?: string;
    children?: BasicRouteSignature[] | RouteNode[] | RouteNode;
    options?: RouteNodeOptions;
};

const trailingSlash = /(.+?)(\/)(\?.*$|$)/gim;

export class RouteNode {
    ['constructor']: new (signature: BasicRouteSignature, parent?: RouteNode) => this;
    name: string;
    treeNames: string[];
    path: string;
    absolute: boolean;
    parser: Path | null;
    nameMap: Map<string, this>;
    masterNode: this;
    isRoot: boolean;
    type: 'master' | 'subordinate' = 'master';

    constructor({ name = '', path = '', children = [], options = { sort: true }, ...augments }: BasicRouteSignature) {
        this.name = name;
        this.treeNames = [];
        this.absolute = /^~/.test(path);
        this.path = this.absolute ? path.slice(1) : path;
        this.parser = this.path ? new Path(this.path) : null;

        this.isRoot = !name || !path;

        this.nameMap = new Map();

        this.masterNode = this;

        if (augments) {
            Object.assign(this, augments);
        }

        this.add(children, false);
        if (options.sort) this.reflow();

        return this;
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
    add(route: BasicRouteSignature | BasicRouteSignature[] | this | this[], sort: boolean = true): this {
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
            let { name, path, children = [], ...extra } = route;
            node = new this.constructor({
                name,
                path,
                children,
                options: {
                    sort: false,
                },
                ...extra,
            });
        } else {
            node = route;
        }

        // Check if instance is corect one, do not allow mixed instance, will be chaotic otherwise
        if (!(node instanceof this.constructor)) {
            throw new Error('RouteNode.add() expects routes to be the same instance as the parrent node.');
        }

        if (node.isRoot) {
            if (node.nameMap.size === 0) {
                throw new Error('RouteNode.add() expects routes to have a name and a path, or at least have some children to steal');
            }

            console.debug(`Node:"${this.name}" steals children from another rootNode`);

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

    private addRouteNode(route: this): this {
        // If node have trailing slash, remove it, cause parents can't have trailing slashes.
        // Only exception is `/` path
        if (trailingSlash.test(this.path)) {
            this.path = this.path.replace(trailingSlash, '$1$3');
            this.parser = this.path ? new Path(this.path) : null;
        }

        // Move absolute node under control of `rootNode`
        if (route.absolute && this !== this.masterNode) {
            this.masterNode.addRouteNode(route);
            return this;
        }

        // `route` have childs, some of them are absolute ?
        // move them under control of `rootNode`
        let deferredSort = false;
        for (let [childName, childNode] of route.nameMap.entries()) {
            if (childNode.absolute) {
                route.nameMap.delete(childName);
                this.masterNode.addRouteNode(childNode);
                deferredSort = true;
            }
        }

        // After moving all nodes under controll of rootNode, we should sort them
        if (deferredSort) {
            this.masterNode.sortChildren();
        }

        // Process with attempt to add `route` as a child of this node
        const names = route.name.split('.');
        if (names.length === 1) {
            // Check if name already defined
            if (this.nameMap.has(route.name) && this.nameMap.get(route.name) !== route) {
                throw new Error(`Name "${route.name}" is already defined in this node: "${this.name}", will not overwrite`);
            }

            // Check if path already defined
            // if (this.pathMap.has(route.path) && this.pathMap.get(route.path) !== route) {
            //     throw new Error(`Path "${route.path}" is already defined in this node: "${this.name}", will not overwrite`);
            // }

            // if (this.nameMap.get(route.name) === route && this.pathMap.get(route.path) === route) {
            if (this.nameMap.get(route.name) === route) {
                // Already defined, no point in redefining the same node on the same name and path
                return this;
            }

            this.nameMap.set(route.name, route);

            if (
                route.absolute &&
                this.parser &&
                (this.parser.hasUrlParams || this.parser.hasSpatParam || this.parser.hasMatrixParams || this.parser.hasQueryParams)
            ) {
                console.warn(
                    `Absolute child-Node was placed under Node that have params in their path, be sure that this child-node will migrate to another node, node: ${this.name}, child-node: ${route.name}`
                );
            }

            route.propagateMaster(this);
        } else {
            // Locate parent node,`route.name` should already be descendant of this node.
            const nodes = this.getNodesByName(names.slice(0, -1).join('.'));
            if (nodes) {
                route.name = names[names.length - 1];
                nodes[nodes.length - 1].addRouteNode(route);
            } else {
                throw new Error(`Could not add route named '${route.name}', parent is missing.`);
            }
        }

        return this;
    }

    private reflow(deepSort = true) {
        if (deepSort) {
            this.sortDescendants();
        } else {
            this.sortChildren();
        }

        this.masterNode.resetTreeNames();
        this.masterNode.rebuildTreeNames();
    }

    private propagateMaster(node: this) {
        this.masterNode = node;
        for (let node of this.nameMap.values()) {
            node.propagateMaster(node);
        }
    }

    private resetTreeNames() {
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

    getPath(routeName: string): string | null {
        const nodesByName = this.getNodesByName(routeName);

        return nodesByName ? getPathFromNodes(nodesByName) : null;
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

    buildPath(name: string, params: Record<string, any> = {}, options: BuildOptions = {}): string {
        const nodes = this.getNodesByName(name);

        if (!nodes) {
            throw new Error(`[route-node][buildPath] "${name}" is not defined`);
        }

        if (this.parser) {
            nodes.splice(0, 0, this);
        }

        return buildPathFromNodes(nodes, params, options);
    }

    buildState(name: string, params: Record<string, any> = {}): RouteNodeState | null {
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
        if (path === '' && !options.strictTrailingSlash) {
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
export const createNode = <Augments>(init: BasicRouteSignature & Augments) => new RouteNode(init) as RouteNode & Augments;
