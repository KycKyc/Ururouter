import { Path, URLParamsEncodingType } from 'pathParser';
import { IOptions as QueryParamsOptions } from 'search-params';

import { buildPathFromNodes, buildStateFromMatch, getMetaFromNodes, getPathFromNodes, sortChildrenFunc } from './helpers';
import matchChildren from './matchChildren';

type Extra = { [key: string]: any };
export interface RouteDefinition {
    name: string;
    path: string;
    children?: RouteDefinition[];
    extra?: Extra;
}
export type Route = RouteNode | RouteDefinition;
export type Callback = (...args: any[]) => void;
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

export type { QueryParamsOptions };

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

export class RouteNode {
    name: string;
    absolute: boolean;
    path: string;
    parser: Path | null;
    children: RouteNode[];
    parent?: RouteNode;
    extra?: Extra;

    constructor(name: string = '', path: string = '', childRoutes: Route[] = [], options: RouteNodeOptions = {}, extra?: Extra) {
        this.name = name;
        this.absolute = /^~/.test(path);
        this.path = this.absolute ? path.slice(1) : path;

        this.parser = this.path ? new Path(this.path) : null;
        this.children = [];
        this.parent = options.parent;
        this.extra = { ...extra };

        this.checkParents();

        this.add(childRoutes, options.onAdd, options.finalSort ? false : options.sort !== false);

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

    add(route: Route | Route[], cb?: Callback, sort: boolean = true): this {
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

            let { name, path, children, extra } = route;
            route = new RouteNode(
                name,
                path,
                children,
                {
                    finalSort: false,
                    onAdd: cb,
                    sort,
                },
                extra
            );
        }

        (route as RouteNode).setParent(this);
        this.addRouteNode(route as RouteNode, sort);

        const fullName = (route as RouteNode)
            .getParentNodes([route as RouteNode])
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

    // TODO: remove, use add instead (rewrite tests)
    addNode(name: string, path: string) {
        this.add(new RouteNode(name, path));
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

    private getNodesByName(routeName: string): RouteNode[] | null {
        const findNodeByName = (name: string, routes: RouteNode[]) => {
            const filteredRoutes = routes.filter((r) => r.name === name);
            return filteredRoutes.length ? filteredRoutes[0] : undefined;
        };

        const nodes: RouteNode[] = [];
        let routes = this.parser ? [this] : this.children;
        const names = (this.parser ? [''] : []).concat(routeName.split('.'));

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
