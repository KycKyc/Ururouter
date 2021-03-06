## API Report File for "router42"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { Component } from 'react';
import { HTMLAttributes } from 'react';
import { IOptions } from 'search-params';
import { MouseEventHandler } from 'react';
import { default as React_2 } from 'react';
import { ReactNode } from 'react';

// @public (undocumented)
export class BrowserHistory<Dependencies> implements HistoryController<any> {
    constructor(router: Router42<Dependencies, any>);
    // (undocumented)
    getLocation(): string;
    // Warning: (ae-forgotten-export) The symbol "EventParamsNavigation" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    onTransitionSuccess({ fromState, toState, options }: EventParamsNavigation<any>): void;
    // (undocumented)
    removePopStateListener: (() => void) | null;
    // (undocumented)
    router: Router42<Dependencies>;
    // (undocumented)
    start(): void;
    // (undocumented)
    stop(): void;
}

// @public (undocumented)
export interface BuildOptions {
    // (undocumented)
    queryParamFormats?: IOptions;
    // Warning: (ae-forgotten-export) The symbol "QueryParamsMode" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    queryParamsMode?: QueryParamsMode;
    // Warning: (ae-forgotten-export) The symbol "TrailingSlashMode" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    trailingSlashMode?: TrailingSlashMode;
    // Warning: (ae-forgotten-export) The symbol "URLParamsEncodingType" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    urlParamsEncoding?: URLParamsEncodingType;
}

// @public
export const createNode: <Augments>(init: RouteNodeInitParams & Augments) => RouteNode & Augments;

// @public (undocumented)
export type EnterFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
    results: {
        preflight: PrefligthResult;
        parentNodeEnter: OnEnterResult;
    };
}) => OnEnterReturn;

// @public (undocumented)
export const errorCodes: {
    readonly ROUTER_NOT_STARTED: "NOT_STARTED";
    readonly ROUTER_INCORRECT_CONFIGS: "INCORRECT_CONFIGS";
    readonly ROUTER_ALREADY_STARTED: "ALREADY_STARTED";
    readonly ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly SAME_STATES: "SAME_STATES";
    readonly TRANSITION_UNKNOWN_ERROR: "TRANSITION_UNKNOWN_ERROR";
    readonly TRANSITION_CANCELLED: "TRANSITION_CANCELLED";
    readonly TRANSITION_REDIRECTED: "TRANSITION_REDIRECTED";
};

// @public (undocumented)
export const events: {
    readonly ROUTER_START: "@@event/start";
    readonly ROUTER_STOP: "@@event/stop";
    readonly TRANSITION_START: "@@event/transition/start";
    readonly TRANSITION_SUCCESS: "@@event/transition/success";
    readonly TRANSITION_CANCELED: "@@event/transition/canceled";
    readonly TRANSITION_REDIRECTED: "@@event/transition/redirected";
    readonly TRANSITION_UNKNOWN_ERROR: "@@event/transition/unknown_error";
};

// @public (undocumented)
export interface HistoryController<NodeClass> {
    // (undocumented)
    getLocation: () => string;
    // Warning: (ae-forgotten-export) The symbol "EventCallbackNavigation" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    onTransitionSuccess: EventCallbackNavigation<NodeClass>;
    // (undocumented)
    start: () => void;
    // (undocumented)
    stop: () => void;
}

// @public (undocumented)
export type HistoryControllerConstructor<NodeClass> = {
    new (router: Router42<any, any>): HistoryController<NodeClass>;
};

// Warning: (ae-forgotten-export) The symbol "LinkProps" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export class Link extends Component<LinkProps> {
    constructor(props: LinkProps);
    // Warning: (ae-forgotten-export) The symbol "Params" needs to be exported by the entry point index.d.ts
    // Warning: (ae-forgotten-export) The symbol "Anchor" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    buildUrl: (name: string, params?: Params, anchor?: Anchor) => string | undefined;
    // (undocumented)
    clickHandler(evt: React_2.MouseEvent<HTMLAnchorElement>): void;
    // (undocumented)
    context: React_2.ContextType<typeof RouterStateContext>;
    // Warning: (ae-forgotten-export) The symbol "RouteContextSignature" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    static contextType: React_2.Context<RouteContextSignature>;
    // (undocumented)
    static defaultProps: {
        activeClassName: string;
        ignoreQueryParams: boolean;
        exact: boolean;
    };
    // (undocumented)
    render(): JSX.Element;
}

// @public (undocumented)
export interface MatchOptions extends BuildOptions {
    // (undocumented)
    caseSensitive?: boolean;
    // (undocumented)
    strictTrailingSlash?: boolean;
}

// @public (undocumented)
export class NavigationError<CustomErrorCodes, CustomEventNames> extends Error {
    // Warning: (ae-forgotten-export) The symbol "NavigationErrorParams" needs to be exported by the entry point index.d.ts
    constructor({ code, triggerEvent, message, redirect, ...args }: NavigationErrorParams<CustomErrorCodes, CustomEventNames>);
    // (undocumented)
    args?: {
        [key: string]: any;
    };
    // Warning: (ae-forgotten-export) The symbol "ErrorCodes" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    code: ErrorCodes<CustomErrorCodes>;
    // (undocumented)
    redirect?: {
        to: string;
        params: Params;
        anchor: Anchor;
    };
    // Warning: (ae-forgotten-export) The symbol "EventNames" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    triggerEvent?: EventNames<CustomEventNames>;
}

// @public (undocumented)
export interface NavigationOptions {
    force?: boolean;
    popState?: boolean;
    replace?: boolean;
}

// @public (undocumented)
class Node_2<Dependencies> extends RouteNode {
    constructor(params: NodeInitParams<Dependencies, Node_2<Dependencies>>);
    // (undocumented)
    addEventListener(eventName: NodeDefaultEventNames | string, cb: EventCallbackNode): () => void;
    // (undocumented)
    callbacks: {
        [key: string]: EventCallbackNode[];
    };
    // (undocumented)
    components: {
        [key: string]: React_2.ComponentType<any>;
    };
    // (undocumented)
    defaultParams: Params;
    // (undocumented)
    ignoreReplaceOpt: boolean;
    // Warning: (ae-forgotten-export) The symbol "NodeDefaultEventNames" needs to be exported by the entry point index.d.ts
    // Warning: (ae-forgotten-export) The symbol "EventParamsNode" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    invokeEventListeners(eventName: NodeDefaultEventNames | string, params?: EventParamsNode): void;
    // (undocumented)
    onEnter?: EnterFn<Dependencies, this>;
    // (undocumented)
    preflight?: PreflightFn<Dependencies, this>;
    // (undocumented)
    removeEventListener(eventName: NodeDefaultEventNames | string, cb: EventCallbackNode): void;
    // (undocumented)
    updateComponent(name: string, component: React_2.ComponentType<any>, force?: boolean): void;
}
export { Node_2 as Node }

// Warning: (ae-forgotten-export) The symbol "NodeComponentParams" needs to be exported by the entry point index.d.ts
//
// @public
export const NodeComponent: ({ node, component, children }: NodeComponentParams) => JSX.Element | null;

// @public (undocumented)
export const nodeEvents: {
    readonly ROUTER_RELOAD_NODE: "@@event/node/reload";
};

// @public (undocumented)
export type NodeInitParams<Dependencies, NodeClass> = {
    name?: string;
    path?: string;
    preflight?: PreflightFn<Dependencies, NodeClass>;
    onEnter?: EnterFn<Dependencies, NodeClass>;
    children?: NodeInitParams<Dependencies, NodeClass>[] | NodeClass[] | NodeClass;
    options?: RouteNodeOptions;
    defaultParams?: Params;
    ignoreReplaceOpt?: boolean;
    components?: {
        [key: string]: React_2.ComponentType<any>;
    };
};

// @public (undocumented)
export type OnEnterResult<Result = any> = Result | void;

// @public (undocumented)
export type OnEnterReturn<Result = any> = Promise<OnEnterResult<Result>> | OnEnterResult<Result>;

// @public (undocumented)
export interface Options {
    // (undocumented)
    allowNotFound: boolean;
    defaultRouteName?: string;
    notFoundRouteName?: string;
    // (undocumented)
    pathOptions: {
        trailingSlashMode: TrailingSlashMode;
        queryParamsMode: QueryParamsMode;
        queryParamFormats?: IOptions;
        urlParamsEncoding?: URLParamsEncodingType;
        caseSensitive: boolean;
        strictTrailingSlash: boolean;
    };
}

// @public (undocumented)
export type PreflightFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
}) => PrefligthReturn;

// @public (undocumented)
export type PrefligthResult<Result = any> = Result | void;

// @public (undocumented)
export type PrefligthReturn<Result = any> = Promise<PrefligthResult<Result>> | PrefligthResult<Result>;

// @public (undocumented)
export class Redirect extends NavigationError<string, string> {
    // Warning: (ae-forgotten-export) The symbol "RedirectParams" needs to be exported by the entry point index.d.ts
    constructor({ to, params, anchor, ...args }: RedirectParams);
}

// Warning: (ae-forgotten-export) The symbol "RouteParams" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const Route: ({ children, name }: RouteParams) => JSX.Element | null;

// @public (undocumented)
export class RouteNode {
    constructor({ name, path, children, options, ...augments }: RouteNodeInitParams);
    // (undocumented)
    absolute: boolean;
    // (undocumented)
    add(route: RouteNodeInitParams | RouteNodeInitParams[] | this | this[], sort?: boolean): this;
    // (undocumented)
    buildPath(name: string, params?: Params, anchor?: Anchor, options?: BuildOptions): string;
    // (undocumented)
    buildState(name: string, params?: Params, anchor?: Anchor): RouteNodeState | null;
    // (undocumented)
    ['constructor']: new (signature: RouteNodeInitParams, parent?: RouteNode) => this;
    // (undocumented)
    defaultParams: Params;
    getDefaultParams(routeName: string): Params;
    getNodeByName(name: string): this | null;
    getNodesByName(name: string): this[] | null;
    getPath(routeName: string): string | null;
    // (undocumented)
    matchPath(path: string, options?: MatchOptions): RouteNodeState | null;
    // (undocumented)
    name: string;
    // (undocumented)
    nameMap: Map<string, this>;
    // Warning: (ae-forgotten-export) The symbol "Path" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    parser: Path | null;
    // (undocumented)
    path: string;
    setPath(path?: string): void;
    // (undocumented)
    sortChildren(): void;
    // (undocumented)
    sortDescendants(): void;
    // (undocumented)
    treeNames: string[];
}

// @public (undocumented)
export interface RouteNodeInitParams {
    // (undocumented)
    children?: RouteNodeInitParams[] | RouteNode[] | RouteNode;
    // (undocumented)
    defaultParams?: Params;
    // (undocumented)
    name?: string;
    // (undocumented)
    options?: RouteNodeOptions;
    // (undocumented)
    path?: string;
}

// @public (undocumented)
export interface RouteNodeOptions {
    // (undocumented)
    sort?: boolean;
}

// @public (undocumented)
export interface RouteNodeState {
    // (undocumented)
    anchor: Anchor;
    // (undocumented)
    meta: RouteNodeStateMeta;
    // (undocumented)
    name: string;
    // (undocumented)
    params: Params;
}

// @public (undocumented)
export interface RouteNodeStateMeta {
    // (undocumented)
    params: {
        [routeName: string]: {
            [routeParams: string]: 'query' | 'url';
        };
    };
}

// @public (undocumented)
export class Router42<Dependencies, NodeClass extends Node_2<Dependencies> = Node_2<Dependencies>> {
    constructor(routes: NodeInitParams<Dependencies, Node_2<Dependencies>> | NodeInitParams<Dependencies, Node_2<Dependencies>>[], options?: Partial<Options>, dependencies?: Dependencies, historyController?: HistoryControllerConstructor<NodeClass>);
    constructor(routes: NodeClass | NodeClass[], options?: Partial<Options>, dependencies?: Dependencies, historyController?: HistoryControllerConstructor<NodeClass>);
    // (undocumented)
    addEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass>): () => void;
    // (undocumented)
    buildNodeState(name: string, params?: Params, anchor?: Anchor): RouteNodeState | null;
    // (undocumented)
    buildPath(name: string, params?: Params, anchor?: Anchor): string;
    // (undocumented)
    callbacks: {
        [key: string]: Function[];
    };
    // (undocumented)
    cancel(): void;
    // (undocumented)
    dependencies?: Dependencies;
    // (undocumented)
    historyController: HistoryController<NodeClass>;
    // (undocumented)
    hooks: {
        preNavigate?: (name: string, params: Params, anchor: Anchor) => [name: string, params: Params, anchor: Anchor];
    };
    // (undocumented)
    illegalChars: RegExp;
    // Warning: (ae-forgotten-export) The symbol "DefaultEventNames" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    invokeEventListeners(eventName: DefaultEventNames | string, params?: EventParamsNavigation<NodeClass>): void;
    // (undocumented)
    isActive(name: string, params?: Params, anchor?: Anchor, exact?: boolean, ignoreQueryParams?: boolean): boolean;
    // (undocumented)
    makeState(name: string, params?: Params, anchor?: Anchor, meta?: Omit<StateMeta, 'id'>): State<NodeClass>;
    // (undocumented)
    matchCurrentState(name: string, params: Params | undefined, anchor: Anchor, exact?: boolean, ignoreQueryParams?: boolean): boolean;
    matchPath(path: string): {
        name: null;
        params: null;
        anchor: null;
    } | {
        name: string;
        params: Params;
        anchor: Anchor;
    };
    // (undocumented)
    navigate(name: string, params?: Params, anchor?: Anchor, options?: NavigationOptions): Promise<NavigationResult<NodeClass>>;
    navigateByPath(path: string, params?: Params, anchor?: Anchor, options?: NavigationOptions): Promise<NavigationResult<NodeClass>>;
    // (undocumented)
    options: Options;
    // (undocumented)
    removeEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass>): void;
    // (undocumented)
    rootNode: NodeClass;
    // Warning: (ae-forgotten-export) The symbol "NavigationResult" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    start(path?: string): Promise<NavigationResult<NodeClass>>;
    // (undocumented)
    started: boolean;
    // (undocumented)
    state: State<NodeClass> | null;
    // (undocumented)
    stop(): void;
    // (undocumented)
    transitionId: number;
    // (undocumented)
    transitionPath(fromState: State<NodeClass> | null, toState: State<NodeClass>): {
        toDeactivate: NodeClass[];
        toActivate: NodeClass[];
        intersection: NodeClass[];
    };
    // (undocumented)
    wildcardFormat(name: string): string;
}

// @public (undocumented)
export const RouterContext: React_2.Context<Router42<any, Node_2<any>> | null>;

// @public (undocumented)
export class RouterError extends Error {
    constructor(code: DefaultErrorCodes, message?: string, ...args: any[]);
    // (undocumented)
    args?: any[];
    // Warning: (ae-forgotten-export) The symbol "DefaultErrorCodes" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    code: DefaultErrorCodes;
}

// Warning: (ae-forgotten-export) The symbol "Props" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const RouterProvider: ({ children, router }: Props) => JSX.Element;

// @public (undocumented)
export const RouterStateContext: React_2.Context<RouteContextSignature>;

// @public
export const scrollIntoView: (elementId: string | undefined | null) => void;

// @public (undocumented)
export interface State<NodeClass> {
    // (undocumented)
    activeNodes: NodeClass[];
    anchor: Anchor;
    // (undocumented)
    meta?: StateMeta;
    // (undocumented)
    name: string;
    // (undocumented)
    params: Params;
    // (undocumented)
    path: string;
}

// @public (undocumented)
export interface StateMeta {
    // (undocumented)
    id: string;
    // (undocumented)
    navigation: NavigationOptions;
    // (undocumented)
    params: Params;
    // (undocumented)
    redirected: boolean;
}

// @public (undocumented)
export const useRouteNode: (nodeName: string) => Node_2<any> | null;

// @public (undocumented)
export const useRouter: () => Router42<any, Node_2<any>> | null;

// @public (undocumented)
export const useRouterState: () => RouteContextSignature;

// @public
export const useScrollIntoView: () => Anchor | undefined;

// Warning: (ae-forgotten-export) The symbol "InjectedProps" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const withNode: (nodeName: string) => <Props extends InjectedProps>(Component: React_2.ComponentType<Props>) => React_2.ForwardRefExoticComponent<React_2.PropsWithoutRef<Omit<Props, "node">> & React_2.RefAttributes<React_2.ComponentType<Props>>>;

// Warning: (ae-forgotten-export) The symbol "InjectedProps" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const withRouter: <Props extends InjectedProps_2>(Component: React_2.ComponentType<Props>) => React_2.ForwardRefExoticComponent<React_2.PropsWithoutRef<Omit<Props, "router">> & React_2.RefAttributes<React_2.ComponentType<Props>>>;

// Warning: (ae-forgotten-export) The symbol "InjectedProps" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const withRouterState: <Props extends InjectedProps_3>(Component: React_2.ComponentType<Props>) => React_2.ForwardRefExoticComponent<React_2.PropsWithoutRef<Omit<Props, keyof InjectedProps_3>> & React_2.RefAttributes<React_2.ComponentType<Props>>>;

// Warnings were encountered during analysis:
//
// es/router/node.d.ts:55:9 - (ae-forgotten-export) The symbol "EventCallbackNode" needs to be exported by the entry point index.d.ts

// (No @packageDocumentation comment for this package)

```
