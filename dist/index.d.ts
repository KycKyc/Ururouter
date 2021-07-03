import { Path, URLParamsEncodingType } from "path-parser";
import { IOptions as QueryParamsOptions } from "search-params";
declare namespace RouteNode {
    interface RouteDefinition {
        name: string;
        path: string;
        [key: string]: any;
    }
    type Route = RouteNode | RouteDefinition;
    type Callback = (...args: any[]) => void;
    type TrailingSlashMode = "default" | "never" | "always";
    type QueryParamsMode = "default" | "strict" | "loose";
    interface BuildOptions {
        trailingSlashMode?: TrailingSlashMode;
        queryParamsMode?: QueryParamsMode;
        queryParams?: QueryParamsOptions;
        urlParamsEncoding?: URLParamsEncodingType;
    }
    interface MatchOptions {
        caseSensitive?: boolean;
        trailingSlashMode?: TrailingSlashMode;
        queryParamsMode?: QueryParamsMode;
        queryParams?: QueryParamsOptions;
        strictTrailingSlash?: boolean;
        strongMatching?: boolean;
        urlParamsEncoding?: URLParamsEncodingType;
    }
    interface MatchResponse {
        segments: RouteNode[];
        params: Record<string, any>;
    }
    interface RouteNodeStateMeta {
        [routeName: string]: {
            [routeParams: string]: "query" | "url";
        };
    }
    interface RouteNodeState {
        name: string;
        params: Record<string, any>;
        meta: RouteNodeStateMeta;
    }
    interface RouteNodeOptions {
        finalSort?: boolean;
        onAdd?: Callback;
        parent?: RouteNode;
        sort?: boolean;
    }
    class RouteNode {
        name: string;
        absolute: boolean;
        path: string;
        parser: Path | null;
        children: RouteNode[];
        parent?: RouteNode;
        constructor(name?: string, path?: string, childRoutes?: Route[], options?: RouteNodeOptions);
        getParentSegments(segments?: RouteNode[]): RouteNode[];
        setParent(parent: RouteNode): void;
        setPath(path?: string): void;
        add(route: Route | Route[], cb?: Callback, sort?: boolean): this;
        addNode(name: string, path: string): this;
        getPath(routeName: string): string | null;
        getNonAbsoluteChildren(): RouteNode[];
        sortChildren(): void;
        sortDescendants(): void;
        buildPath(routeName: string, params?: Record<string, any>, options?: BuildOptions): string;
        buildState(name: string, params?: Record<string, any>): RouteNodeState | null;
        matchPath(path: string, options?: MatchOptions): RouteNodeState | null;
        private addRouteNode;
        private checkParents;
        private hasParentsParams;
        private findAbsoluteChildren;
        private findSlashChild;
        private getSegmentsByName;
        private getSegmentsMatchingPath;
    }
    export type { URLParamsEncodingType } from "path-parser";
}
export { RouteNode };
