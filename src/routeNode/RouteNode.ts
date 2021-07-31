import { Path, URLParamsEncodingType } from 'pathParser';
import { IOptions as QueryParamsOptions } from 'search-params';

import { buildPathFromNodes, buildStateFromMatch, getMetaFromNodes, getPathFromNodes, sortChildrenFunc } from './helpers';
import matchChildren from './matchChildren';

export type Callback = (node: Partial<RouteNode> & { name: string }) => void;
export type TrailingSlashMode = 'default' | 'never' | 'always';
export type QueryParamsMode = 'default' | 'strict' | 'loose';

export interface BuildOptions {
    trailingSlashMode?: TrailingSlashMode;
    queryParamsMode?: QueryParamsMode;
    queryParams?: QueryParamsOptions;
    urlParamsEncoding?: URLParamsEncodingType;
}

export interface MatchOptions {
    caseSensitive?: boolean;
    trailingSlashMode?: TrailingSlashMode;
    queryParamsMode?: QueryParamsMode;
    queryParams?: QueryParamsOptions;
    strictTrailingSlash?: boolean;
    strongMatching?: boolean;
    urlParamsEncoding?: URLParamsEncodingType;
}

export interface MatchResponse {
    nodes: RouteNode[];
    params: Record<string, any>;
}

export interface RouteNodeStateMeta {
    [routeName: string]: {
        [routeParams: string]: 'query' | 'url';
    };
}

export interface RouteNodeState {
    name: string;
    params: Record<string, any>;
    meta: RouteNodeStateMeta;
}

export interface RouteNodeOptions {
    finalSort?: boolean;
    onAdd?: Callback;
    parent?: RouteNode;
    sort?: boolean;
}

export interface BasicRoute {
    name: string;
    path: string;
    children?: BasicRoute[];
    options?: RouteNodeOptions;
    [key: string]: any;
}

export class RouteNode implements BasicRoute {
    name: string;
    path: string;
    absolute: boolean;
    parser: Path | null;
    children: RouteNode[];
    parent?: RouteNode;

    constructor({ name = '', path = '', children = [], options = {}, ...augments }: Partial<BasicRoute> = {}) {
        this.name = name;
        this.absolute = /^~/.test(path);
        this.path = this.absolute ? path.slice(1) : path;

        this.parser = this.path ? new Path(this.path) : null;
        this.children = [];
        this.parent = options.parent;
        if (augments) {
            Object.assign(this, augments);
        }

        this.checkParents();

        this.add(children, options.onAdd, options.finalSort ? false : options.sort !== false);

        if (options.finalSort) {
            this.sortDescendants();
        }

        return this;
    }

    private checkParents() {
        if (this.absolute && this.hasParentsParams()) {
            throw new Error('[RouteNode] A RouteNode with an abolute path cannot have parents with route parameters');
        }
    }

    getParentNodes(nodes: RouteNode[] = []): RouteNode[] {
        return this.parent && this.parent.parser ? this.parent.getParentNodes(nodes.concat(this.parent)) : nodes.reverse();
    }

    setParent(parent: RouteNode) {
        this.parent = parent;
        this.checkParents();
    }

    setPath(path: string = '') {
        this.path = path;
        this.parser = path ? new Path(path) : null;
    }

    add(route: BasicRoute | BasicRoute[], cb?: Callback, sort: boolean = true): this {
        if (route === undefined || route === null) {
            return this;
        }

        if (route instanceof Array) {
            route.forEach((r) => this.add(r, cb, sort));
            return this;
        }

        if (!(route instanceof RouteNode) && !(route instanceof Object)) {
            throw new Error('RouteNode.add() expects routes to be an Object or an instance of RouteNode.');
        } else if (!(route instanceof RouteNode)) {
            if (!route.name || !route.path) {
                throw new Error('RouteNode.add() expects routes to have a name and a path defined.');
            }

            let { name, path, children, ...extra } = route;
            route = new RouteNode({
                name,
                path,
                children,
                options: {
                    finalSort: false,
                    onAdd: cb,
                    sort,
                },
                ...extra,
            });
        }

        // Useless condition, only to please TS
        if (!(route instanceof RouteNode)) {
            return this;
        }

        route.setParent(this);
        this.addRouteNode(route, sort);

        const fullName = route
            .getParentNodes([route])
            .map((_: RouteNode) => _.name)
            .join('.');

        if (cb) {
            cb({
                ...route,
                name: fullName,
            });
        }

        return this;
    }

    private addRouteNode(route: RouteNode, sort: boolean = true): this {
        const names = route.name.split('.');

        if (names.length === 1) {
            // Check duplicated routes
            if (this.children.map((child) => child.name).indexOf(route.name) !== -1) {
                throw new Error(`Alias "${route.name}" is already defined in route node`);
            }

            // Check duplicated paths
            if (this.children.map((child) => child.path).indexOf(route.path) !== -1) {
                throw new Error(`Path "${route.path}" is already defined in route node`);
            }

            this.children.push(route);

            if (sort) {
                this.sortChildren();
            }
        } else {
            // Locate parent node
            const nodes = this.getNodesByName(names.slice(0, -1).join('.'));
            if (nodes) {
                route.name = names[names.length - 1];
                nodes[nodes.length - 1].add(route);
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

    getNonAbsoluteChildren(): RouteNode[] {
        return this.children.filter((child) => !child.absolute);
    }

    sortChildren() {
        if (!this.children.length) return;
        const originalChildren = this.children.slice(0);
        this.children.sort(sortChildrenFunc(originalChildren));
    }

    sortDescendants() {
        this.sortChildren();
        this.children.forEach((child) => child.sortDescendants());
    }

    buildPath(routeName: string, params: Record<string, any> = {}, options: BuildOptions = {}): string {
        const nodes = this.getNodesByName(routeName);

        if (!nodes) {
            throw new Error("[route-node][buildPath] '{routeName}' is not defined");
        }

        return buildPathFromNodes(nodes, params, options);
    }

    buildState(name: string, params: Record<string, any> = {}): RouteNodeState | null {
        const nodes = this.getNodesByName(name);

        if (!nodes || !nodes.length) {
            return null;
        }

        return {
            name,
            params,
            meta: getMetaFromNodes(nodes),
        };
    }

    private hasParentsParams(): boolean {
        if (this.parent && this.parent.parser) {
            const parser = this.parent.parser;
            const hasParams = parser.hasUrlParams || parser.hasSpatParam || parser.hasMatrixParams || parser.hasQueryParams;

            return hasParams || this.parent.hasParentsParams();
        }

        return false;
    }

    private findAbsoluteChildren(): RouteNode[] {
        return this.children.reduce<RouteNode[]>(
            (absoluteChildren, child) => absoluteChildren.concat(child.absolute ? child : []).concat(child.findAbsoluteChildren()),
            []
        );
    }

    /**
     * Getting the last child with slash or question mark at the end.
     * Used in `matchPath`.
     * When we find a Node and this node is having a child, like `/`
     *
     * As example:
     * Node `/ko`
     *    Subnode: `/`
     *
     * @returns RouteNode
     */
    private findSlashChild(): RouteNode | undefined {
        const slashChildren = this.getNonAbsoluteChildren().filter((child) => child.parser && /^\/(\?|$)/.test(child.parser.path));

        return slashChildren[0];
    }

    /**
     * Getting list of nodes by full name, like `en.user.orders`
     * @param routeName
     * @returns RouteNode[]
     */
    getNodesByName(routeName: string): RouteNode[] | null {
        const findNodeByName = (name: string, routes: RouteNode[]) => {
            const filteredRoutes = routes.filter((r) => r.name === name);
            return filteredRoutes.length ? filteredRoutes[0] : undefined;
        };

        const nodes: RouteNode[] = [];
        // let routes = this.parser ? [this] : this.children;
        let routes: RouteNode[] = [this];
        // let routes = this.children;
        // const names = (this.parser ? [this.name] : []).concat(routeName.split('.'));
        const names = [this.name].concat(routeName.split('.'));
        // const names = routeName.split('.');

        const matched = names.every((name) => {
            const node = findNodeByName(name, routes);
            if (node) {
                routes = node.children;
                nodes.push(node);
                return true;
            }

            return false;
        });

        return matched ? nodes : null;
    }

    /**
     * Find one node by full name of the node, like `en.user.orders`
     * @param routeName
     * @returns RouteNode
     */
    findNodeByName(routeName: string): RouteNode | null {
        let node = this.getNodesByName(routeName);
        if (node === null) return null;
        return node[node.length - 1];
    }

    matchPath(path: string, options: MatchOptions = {}): RouteNodeState | null {
        if (path === '' && !options.strictTrailingSlash) {
            path = '/';
        }

        const match = this.getNodesMatchingPath(path, options);

        if (!match) {
            return null;
        }

        const matchedNodes = match.nodes;

        // if match was absolute node.
        if (matchedNodes[0].absolute) {
            const nodeParents = matchedNodes[0].getParentNodes();

            matchedNodes.splice(0, 0, ...nodeParents);
        }

        const lastNode = matchedNodes[matchedNodes.length - 1];
        const lastNodeSlashChild = lastNode.findSlashChild();

        if (lastNodeSlashChild) {
            matchedNodes.push(lastNodeSlashChild);
        }

        return buildStateFromMatch(match);
    }

    private getNodesMatchingPath(path: string, options: MatchOptions): MatchResponse | null {
        const topLevelNodes = this.parser ? [this] : this.children;
        const startingNodes = topLevelNodes.reduce<RouteNode[]>((nodes, node) => nodes.concat(node, node.findAbsoluteChildren()), []);

        const currentMatch: MatchResponse = {
            nodes: [],
            params: {},
        };

        const finalMatch = matchChildren(startingNodes, path, currentMatch, options);

        if (finalMatch && finalMatch.nodes.length === 1 && finalMatch.nodes[0].name === '') {
            return null;
        }

        return finalMatch;
    }
}

/**
 * Create augmented RouteNode.
 * Ts workaround, to get proper augmented type autocomplete
 * @param init
 * @returns RouteNode
 */
export const createNode = <Augments>(init?: Partial<BasicRoute> & Augments) => new RouteNode(init) as RouteNode & Augments;
