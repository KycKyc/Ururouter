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
    onAdd?: Callback;
    parent?: RouteNode;
    sort?: boolean;
}

export type BasicRouteSignature =
    | {
          name: string;
          path: string;
          children?: BasicRouteSignature[];
          options?: RouteNodeOptions;
      }
    | {
          name?: string;
          path?: string;
          children: BasicRouteSignature[];
          options?: RouteNodeOptions;
      };

const trailingSlash = /(.+?)(\/)(\?.*$|$)/gim;

export class RouteNode {
    ['constructor']: new (signature: BasicRouteSignature, __parentNames?: string[]) => this;
    name: string;
    treeNames: string[];
    path: string;
    absolute: boolean;
    parser: Path | null;
    nameMap: Map<string, this>;
    parent?: RouteNode;

    constructor({ name = '', path = '', children = [], options = {}, ...augments }: BasicRouteSignature, __parentNames?: string[]) {
        this.name = name;

        // Small hack, we are doing it here to properly inherit parrent name in case if we are building nodes from one large object.
        // Otherwise we will end with `parent.child` -> `child.subchild` -> `subchild.subsubchild` etc.
        this.treeNames = [];
        if (__parentNames instanceof Array) {
            if (__parentNames.length === 0) {
                this.treeNames.push(this.name);
            } else {
                __parentNames.forEach((name) => {
                    this.treeNames.push(`${name}.${this.name}`);
                });
            }
        }

        this.absolute = /^~/.test(path);
        this.path = this.absolute ? path.slice(1) : path;

        // remove trailing slash
        // this.path = this.path ? standertizePath(this.path) : this.path;
        this.parser = this.path ? new Path(this.path) : null;

        this.nameMap = new Map();
        // this.pathMap = new Map();

        if (augments) {
            Object.assign(this, augments);
        }

        this.add(children, options.onAdd, options.sort ? 1 : 0);

        return this;
    }

    private getRootNode(): RouteNode {
        let node: RouteNode = this;
        while (true) {
            if (node.parent === undefined) {
                return node;
            }

            node = node.parent;
        }
    }

    getParentNodes(nodes: RouteNode[] = []): RouteNode[] {
        return this.parent && this.parent.parser ? this.parent.getParentNodes(nodes.concat(this.parent)) : nodes.reverse();
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
     * Sort is mandatory
     * @param route
     * @param cb
     * @param {number} sort sorting behaviour:
     * 0 - do not sort
     * 1 - sort node and its descendants
     * 2 - do not sort this node, but sort its descendants (used for delayed sorting arrays of nodes)
     * @returns
     */
    add(route: BasicRouteSignature | BasicRouteSignature[] | this | this[], cb?: Callback, sort: number = 1): this {
        if (route === undefined || route === null) {
            return this;
        }

        if (route instanceof Array) {
            if (route.length === 0) return this;
            route.forEach((r) => this.add(r, cb, sort === 1 ? 2 : sort));
            if (sort >= 1) this.sortChildren();
            return this;
        }

        if (!(route instanceof Object)) {
            throw new Error('RouteNode.add() expects routes to be an Object at least.');
        }

        let node: this;
        // If route is some object and not instance of RouteNode class, we should build correct instance from it
        if (!(route instanceof RouteNode)) {
            if (!route.name || !route.path) {
                throw new Error('RouteNode.add() expects routes to have a name and a path defined.');
            }

            let { name, path, children, ...extra } = route;
            node = new this.constructor(
                {
                    name,
                    path,
                    children,
                    options: {
                        onAdd: cb,
                        sort: sort >= 1 ? true : false,
                    },
                    ...extra,
                },
                this.treeNames
            );
        } else {
            node = route;
        }

        // Check if instance is corect one, do not allow mixed instance, will be chaotic otherwise
        if (!(node instanceof this.constructor)) {
            throw new Error('RouteNode.add() expects routes to be the same instance as the parrent node.');
        }

        this.addRouteNode(node, sort === 2 ? false : true);

        const fullName = node
            .getParentNodes([node])
            .map((_: RouteNode) => _.name)
            .join('.');

        if (cb) {
            cb({
                ...node,
                name: fullName,
            });
        }

        return this;
    }

    private addRouteNode(route: this, sort: boolean = true): this {
        // If node have trailing slash, remove it, cause parents can't have trailing slashes.
        // Only exception is `/` path
        if (trailingSlash.test(this.path)) {
            this.path = this.path.replace(trailingSlash, '$1$3');
            this.parser = this.path ? new Path(this.path) : null;
        }

        let rootNode = this.getRootNode();

        // Move absolute node under control of `rootNode`
        if (route.absolute && this !== rootNode) {
            rootNode.addRouteNode(route, sort);
            return this;
        }

        // `route` have childs, some of them are absolute ?
        // move them under control of `rootNode`
        const nameIter = route.nameMap.entries();
        // const pathIter = route.pathMap.entries();
        let nameResult = nameIter.next();
        // let pathResult = pathIter.next();
        // After moving all nodes, we should sort them, only once, to save resources
        let sortAfter = false;
        // These maps should be in sync, checking one is enough
        while (!nameResult.done) {
            let [childName, childNode] = nameResult.value;
            // let childPath = pathResult.value[0];
            if (childNode.absolute) {
                route.nameMap.delete(childName);
                // route.pathMap.delete(childPath);
                rootNode.addRouteNode(childNode, false);
                sortAfter = true;
            }

            nameResult = nameIter.next();
            // pathResult = pathIter.next();
        }

        if (sortAfter) {
            rootNode.sortChildren();
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
            // this.pathMap.set(route.path, route);
            route.parent = this;

            // Update treeNames
            let treeNames = [];
            if (this.treeNames.length === 0) {
                treeNames.push(route.name);
            } else {
                this.treeNames.forEach((name) => {
                    treeNames.push(`${name}.${route.name}`);
                });
            }

            route.treeNames = treeNames;

            if (
                route.absolute &&
                this.parser &&
                (this.parser.hasUrlParams || this.parser.hasSpatParam || this.parser.hasMatrixParams || this.parser.hasQueryParams)
            ) {
                console.warn(
                    `Absolute child-Node was placed under Node that have params in their path, be sure that this child-node will migrate to another node, node: ${this.name}, child-node: ${route.name}`
                );
            }

            if (sort) {
                this.sortChildren();
            }
        } else {
            // Locate parent node,`route.name` should already be descendant of this node.
            const nodes = this.getNodesByName(names.slice(0, -1).join('.'));
            if (nodes) {
                route.name = names[names.length - 1];
                nodes[nodes.length - 1].addRouteNode(route, sort);
            } else {
                throw new Error(`Could not add route named '${route.name}', parent is missing.`);
            }
        }

        return this;
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
