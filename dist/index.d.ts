/// <reference types="base.ts" />
/// <reference types="react" />
import { IOptions as QueryParamFormats } from "search-params";
import { IOptions as QueryParamFormats$0 } from "search-params";
import React from "react";
import { ReactNode, Component, HTMLAttributes, MouseEventHandler } from "react";
type URLParamsEncodingType = "default" | "uri" | "uriComponent" | "none" | "legacy";
interface Token {
    type: string;
    match: string;
    val: any;
    otherVal: any;
    regex?: RegExp;
}
interface PathOptions {
    /**
     * Query parameters buiding and matching options, see
     * https://github.com/troch/search-params#options
     */
    queryParamFormats?: QueryParamFormats;
    /**
     * Specifies the method used to encode URL parameters:
     *   - `'default': `encodeURIComponent` and `decodeURIComponent`
     *      are used but some characters to encode and decode URL parameters,
     *      but some characters are preserved when encoding
     *      (sub-delimiters: `+`, `:`, `'`, `!`, `,`, `;`, `'*'`).
     *   - `'uriComponent'`: use `encodeURIComponent` and `decodeURIComponent`
     *      for encoding and decoding URL parameters.
     *   - `'uri'`: use `encodeURI` and `decodeURI for encoding and decoding
     *      URL parameters.
     *   - `'none'`: no encoding or decoding is performed
     *   - `'legacy'`: the approach for version 5.x and below (not recoomended)
     */
    urlParamsEncoding?: URLParamsEncodingType;
}
interface InternalPathOptions {
    queryParamFormats?: QueryParamFormats;
    urlParamsEncoding: URLParamsEncodingType;
}
interface PathTestOptions extends PathOptions {
    caseSensitive?: boolean;
    strictTrailingSlash?: boolean;
}
type trailingSlashMode = "default" | "never" | "always";
interface PathBuildOptions extends PathOptions {
    ignoreConstraints?: boolean;
    ignoreSearch?: boolean;
    trailingSlashMode?: trailingSlashMode;
}
type TestMatch<T extends Record<string, any> = Record<string, any>> = T | null;
declare class Path<T extends Record<string, any> = Record<string, any>> {
    static createPath<T extends Record<string, any> = Record<string, any>>(path: string, options?: PathOptions): Path<T>;
    path: string;
    tokens: Token[];
    hasUrlParams: boolean;
    hasSpatParam: boolean;
    hasMatrixParams: boolean;
    hasQueryParams: boolean;
    options: InternalPathOptions;
    spatParams: string[];
    urlParams: string[];
    queryParams: string[];
    params: string[];
    source: string;
    constructor(path: string, options?: PathOptions);
    isQueryParam(name: string): boolean;
    isSpatParam(name: string): boolean;
    test(path: string, opts?: PathTestOptions): TestMatch<T>;
    partialTest(path: string, opts?: PathTestOptions): TestMatch<T>;
    build(params?: T, opts?: PathBuildOptions): string;
    private getParams;
    private urlTest;
}
type TrailingSlashMode = "default" | "never" | "always";
type QueryParamsMode = "default" | "strict" | "loose";
interface BuildOptions {
    trailingSlashMode?: TrailingSlashMode;
    queryParamsMode?: QueryParamsMode;
    queryParamFormats?: QueryParamFormats;
    urlParamsEncoding?: URLParamsEncodingType;
}
interface MatchOptions extends BuildOptions {
    caseSensitive?: boolean;
    strictTrailingSlash?: boolean;
}
interface MatchResponse {
    nodes: RouteNode[];
    params: Record<string, any>;
}
interface RouteNodeStateMeta {
    params: {
        [routeName: string]: {
            [routeParams: string]: "query" | "url";
        };
    };
}
interface RouteNodeState {
    name: string;
    params: Record<string, any>;
    meta: RouteNodeStateMeta;
}
interface RouteNodeOptions {
    sort?: boolean;
}
type BasicNodeSignature = {
    name?: string;
    path?: string;
    children?: BasicNodeSignature[] | RouteNode[] | RouteNode;
    options?: RouteNodeOptions;
};
declare class RouteNode {
    ["constructor"]: new (signature: BasicNodeSignature, parent?: RouteNode) => this;
    name: string;
    treeNames: string[];
    path: string;
    absolute: boolean;
    parser: Path | null;
    nameMap: Map<string, this>;
    masterNode: this;
    isRoot: boolean;
    constructor({ name, path, children, options, ...augments }: BasicNodeSignature);
    /**
     * Probably you wanna sort parrent childs after changing the path ?
     * @param path
     */
    setPath(path?: string): void;
    /**
     *
     * @param route
     * @param {boolean} sort: be careful with sort, without sorting router will not work correctly
     * @returns
     */
    add(route: BasicNodeSignature | BasicNodeSignature[] | this | this[], sort?: boolean): this;
    private addRouteNode;
    private reflow;
    private propagateMaster;
    private resetTreeNames;
    private rebuildTreeNames;
    getPath(routeName: string): string | null;
    sortChildren(): void;
    sortDescendants(): void;
    buildPath(name: string, params?: Record<string, any>, options?: BuildOptions): string;
    buildState(name: string, params?: Record<string, any>): RouteNodeState | null;
    /**
     * Get LIST of nodes by full name, like `en.user.orders`
     * @param name
     * @returns RouteNode[]
     */
    getNodesByName(name: string): this[] | null;
    /**
     * get ONE node by full name of the node, like `en.user.orders`
     * @param name
     * @returns RouteNode
     */
    getNodeByName(name: string): this | null;
    matchPath(path: string, options?: MatchOptions): RouteNodeState | null;
}
/**
 * Create augmented RouteNode.
 * Ts workaround, to get proper augmented type autocomplete
 * @param init
 * @returns RouteNode
 */
declare const createNode: <Augments>(init: BasicNodeSignature & Augments) => RouteNode & Augments;
type URLParamsEncodingType$0 = "default" | "uri" | "uriComponent" | "none" | "legacy";
type TrailingSlashMode$0 = "default" | "never" | "always";
type QueryParamsMode$0 = "default" | "strict" | "loose";
type Params = Record<string, any>;
declare const errorCodes: {
    readonly ROUTER_NOT_STARTED: "NOT_STARTED";
    readonly ROUTER_INCORRECT_CONFIGS: "INCORRECT_CONFIGS";
    readonly ROUTER_ALREADY_STARTED: "ALREADY_STARTED";
    readonly ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly SAME_STATES: "SAME_STATES";
    readonly TRANSITION_UNKNOWN_ERROR: "TRANSITION_UNKNOWN_ERROR";
    readonly TRANSITION_CANCELLED: "TRANSITION_CANCELLED";
    readonly TRANSITION_REDIRECTED: "TRANSITION_REDIRECTED";
};
declare const events: {
    readonly ROUTER_START: "@@event/start";
    readonly ROUTER_STOP: "@@event/stop";
    readonly TRANSITION_START: "@@event/transition/start";
    readonly TRANSITION_SUCCESS: "@@event/transition/success";
    readonly TRANSITION_CANCELED: "@@event/transition/canceled";
    readonly TRANSITION_REDIRECTED: "@@event/transition/redirected";
    readonly TRANSITION_UNKNOWN_ERROR: "@@event/transition/unknown_error";
    readonly ROUTER_RELOAD_NODE: "@@event/node/reload";
};
type Diff<T, From> = T extends From ? never : T;
type DefaultEventNames = typeof events[keyof typeof events];
type DefaultErrorCodes = typeof errorCodes[keyof typeof errorCodes];
type ErrorCodes<Errors = never> = Diff<Errors, DefaultErrorCodes> | DefaultErrorCodes;
type EventNames<Events = never> = Diff<Events, DefaultEventNames> | DefaultEventNames;
declare class RouterError extends Error {
    code: DefaultErrorCodes;
    args?: any[];
    constructor(code: DefaultErrorCodes, message?: string, ...args: any[]);
}
type NavErrParams<CustomErrorCodes = never, CustomEventNames = never> = {
    code: ErrorCodes<CustomErrorCodes>;
    triggerEvent?: EventNames<CustomEventNames>;
    message?: string;
    redirect?: {
        to: string;
        params: Params;
    };
    [key: string]: any;
};
declare class NavigationError<CustomErrorCodes, CustomEventNames> extends Error {
    code: ErrorCodes<CustomErrorCodes>;
    triggerEvent?: EventNames<CustomEventNames>;
    redirect?: {
        to: string;
        params: Params;
    };
    args?: {
        [key: string]: any;
    };
    constructor({ code, triggerEvent, message, redirect, ...args }: NavErrParams<CustomErrorCodes, CustomEventNames>);
}
declare class Redirect extends NavigationError<string, string> {
    constructor({ to, params, ...args }: {
        to: string;
        params: Params;
    });
}
type AsyncFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
}) => Promise<any> | void;
type EnterFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
    asyncResult?: any;
    passthrough?: any;
}) => Promise<{
    state?: State<NodeClass> | undefined;
    passthrough?: any;
} | void> | {
    state?: State<NodeClass> | undefined;
    passthrough?: any;
} | void;
type NodeClassSignature<Dependencies> = RouteNode & {
    ["constructor"]: new (params: NodeInitParams<Dependencies, any>) => void;
    asyncRequests?: AsyncFn<Dependencies, any>;
    onEnter?: EnterFn<Dependencies, any>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    /** Suppress asyncRequests and on onEnter functions, even if navigationOptions.reload is true */
    ignoreReloadCall: boolean;
    /** React components */
    components?: {
        [key: string]: React.ComponentType<any>;
    };
};
type NodeInitParams<Dependencies, NodeClass> = {
    name?: string;
    path?: string;
    asyncRequests?: AsyncFn<Dependencies, NodeClass>;
    onEnter?: EnterFn<Dependencies, NodeClass>;
    forwardTo?: string;
    children?: NodeInitParams<Dependencies, NodeClass>[] | NodeClass[] | NodeClass;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    /** Suppress asyncRequests and on onEnter functions, even if navigation options.reload === true */
    ignoreReloadCall?: boolean;
    /** React components */
    components?: {
        [key: string]: React.ComponentType<any>;
    };
};
declare class Node<Dependencies> extends RouteNode {
    asyncRequests?: AsyncFn<Dependencies, Node<Dependencies>>;
    onEnter?: EnterFn<Dependencies, Node<Dependencies>>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams: Params;
    ignoreReloadCall: boolean;
    components: {
        [key: string]: React.ComponentType<any>;
    };
    constructor(params: NodeInitParams<Dependencies, Node<Dependencies>>);
}
// Params
type EventParamsNavigation<NodeClass> = {
    fromState: State<NodeClass> | null;
    toState: State<NodeClass>;
    nodes: {
        toDeactivate: NodeClass[];
        toActivate: NodeClass[];
        intersection: NodeClass[];
    };
    options: NavigationOptions;
    error?: any;
};
type EventParamsNode = {
    name: string;
};
// Callbacks
type EventCallbackNavigation<NodeClass> = (params: EventParamsNavigation<NodeClass>) => void;
type EventCallbackNode = (params: EventParamsNode) => void;
interface NavigationOptions {
    /** replace in browserHistory, nothing else is affected ? */
    replace?: boolean;
    /** Will trigger reactivation of asyncRequests and OnEnter Node functions */
    reload?: boolean;
    skipTransition?: boolean;
    force?: boolean;
    [key: string]: any;
}
interface StateMeta {
    id: number;
    params: Params;
    navigation: NavigationOptions;
    redirected: boolean;
    source?: string;
}
interface State<NodeClass> {
    name: string;
    params: Params;
    meta?: StateMeta;
    path: string;
    activeNodes: NodeClass[];
}
interface Options {
    /** route name of 404 page */
    notFoundRouteName?: string;
    /** route name of default\fallback page, in case of undef route, alternative to 404, if 404 is disabled */
    defaultRouteName?: string;
    autoCleanUp: boolean;
    allowNotFound: boolean;
    strongMatching: boolean;
    rewritePathOnMatch: boolean;
    pathOptions: {
        trailingSlashMode: TrailingSlashMode$0;
        queryParamsMode: QueryParamsMode$0;
        queryParamFormats?: QueryParamFormats$0;
        urlParamsEncoding?: URLParamsEncodingType$0;
        caseSensitive: boolean;
        strictTrailingSlash: boolean;
    };
}
type NavigationResult<NodeClass> = {
    type: "error" | "success";
    payload: {
        fromState?: State<NodeClass> | null;
        toState?: State<NodeClass>;
        toDeactivate?: NodeClass[];
        toActivate?: NodeClass[];
        error?: NavigationError<string, string>;
    };
};
declare class Router42<Dependencies, NodeClass extends NodeClassSignature<Dependencies> = Node<Dependencies>> {
    options: Options;
    hooks: {
        preNavigate?: (name: string, params?: Params) => [
            name: string,
            params: Params | undefined
        ];
    };
    dependencies?: Dependencies;
    callbacks: {
        [key: string]: Function[];
    };
    state: State<NodeClass> | null;
    stateId: number;
    started: boolean;
    rootNode: NodeClass;
    transitionId: number;
    illegalChars: RegExp;
    // Workaroung for TS bug: https://stackoverflow.com/questions/69019704/generic-that-extends-type-that-require-generic-type-inference-do-not-work/69028892#69028892
    constructor(routes: NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[], options?: Partial<Options>, dependencies?: Dependencies);
    constructor(routes: NodeClass | NodeClass[], options?: Partial<Options>, dependencies?: Dependencies);
    // static fromNode<Dependencies>(routes: NodeSignature<Dependencies> | NodeSignature<Dependencies>[], options?: Partial<Options>, dependencies?: Dependencies) {
    //     return new this(routes);
    // }
    // static fromSignature<Dependencies>(
    //     routes: NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[],
    //     options?: Partial<Options>,
    //     dependencies?: Dependencies
    // ) {
    //     return new this(routes, options, dependencies);
    // }
    //
    // Events
    //
    invokeEventListeners(eventName: DefaultEventNames | string, params?: EventParamsNavigation<NodeClass> | EventParamsNode): void;
    removeEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass> | EventCallbackNode): void;
    addEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass> | EventCallbackNode): () => void;
    //
    // Routes
    //
    buildPath(name: string, params?: Params): string;
    /**
     * Do this have any potential use?
     * @param path
     * @returns
     */
    matchPath(path: string): State<NodeClass> | null;
    isActive(name: string, params?: Params, exact?: boolean, ignoreQueryParams?: boolean): boolean;
    isEqualOrDescendant(parentState: State<NodeClass>, childState: State<NodeClass>): boolean;
    //
    // State management
    //
    makeState(name: string, params?: Params, meta?: Omit<StateMeta, "id">, forceId?: number): State<NodeClass>;
    areStatesEqual(state1: State<NodeClass>, state2: State<NodeClass>, ignoreQueryParams?: boolean): boolean;
    buildNodeState(name: string, params?: Params): RouteNodeState | null;
    //
    // Lifecycle
    //
    start(path: string): Promise<NavigationResult<NodeClass>>;
    stop(): void;
    //
    // Navigation
    //
    cancel(): void;
    /**
     * Do not like name-based navigation?
     * Use this, url-based navigation.
     * But it's less performant, cause it will do additional trip through nodes.
     * @param path Just url, real plain url, without tokens (aka `:page`, `*spat` or whatever)
     * @param params Params to override, or additional params to add
     * @param options Navigation options
     * @returns
     */
    navigateByPath(path: string, params?: Params, options?: NavigationOptions): Promise<NavigationResult<NodeClass>>;
    private inheritNameFragments;
    navigate(name: string, params?: Params, options?: NavigationOptions): Promise<NavigationResult<NodeClass>>;
    private transition;
    transitionPath(fromState: State<NodeClass> | null, toState: State<NodeClass>): {
        toDeactivate: NodeClass[];
        toActivate: NodeClass[];
        intersection: NodeClass[];
    };
}
declare class BrowserHistory<Dependencies> {
    router: Router42<Dependencies>;
    removePopStateListener: (() => void) | null;
    constructor(router: Router42<Dependencies>);
    private getLocation;
    private getHash;
    private replaceState;
    private pushState;
    private getState;
    private onPopState;
    private updateState;
    start(): void;
    stop(): void;
    onTransitionSuccess({ fromState, toState, options }: {
        fromState: State<any> | null;
        toState: State<any>;
        options: NavigationOptions;
    }): void;
}
type Props = {
    children: ReactNode;
    router: Router42<any>;
};
declare const RouterProvider: ({ children, router }: Props) => JSX.Element;
type RouteContextSignature = {
    state: State<Node<any>> | null;
    router: Router42<any> | null;
};
// move under router controll, to be able to get every generic
declare const RouterStateContext: React.Context<RouteContextSignature>;
declare const RouterContext: React.Context<Router42<any, Node<any>> | null>;
interface LinkProps extends HTMLAttributes<HTMLAnchorElement> {
    name: string;
    params?: {
        [key: string]: any;
    };
    options?: NavigationOptions;
    className?: string;
    activeClassName?: string;
    activeOn?: string;
    exact?: boolean;
    ignoreQueryParams?: boolean;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
    target?: string;
}
declare class Link extends Component<LinkProps> {
    context: React.ContextType<typeof RouterStateContext>;
    static contextType: React.Context<RouteContextSignature>;
    static defaultProps: {
        activeClassName: string;
        ignoreQueryParams: boolean;
        exact: boolean;
    };
    buildUrl: (name: string, params: any) => string | undefined;
    constructor(props: LinkProps);
    clickHandler(evt: React.MouseEvent<HTMLAnchorElement>): void;
    render(): JSX.Element;
}
interface RouteParams {
    children?: React.ReactNode;
    name: string;
    render?: (state: State<any> | null) => React.ReactNode;
}
/**
 *
 * @param param0
 * @returns
 */
declare const Route: ({ children, name }: RouteParams) => JSX.Element | null;
interface InjectedProps {
    node: Node<any> | null | undefined;
}
declare const withNode: (nodeName: string) => <Props extends InjectedProps>(Component: React.ComponentType<Props>) => React.ForwardRefExoticComponent<React.PropsWithoutRef<Omit<Props, "node">> & React.RefAttributes<React.ComponentType<Props>>>;
interface InjectedProps$0 {
    router: Router42<any, Node<any>> | null;
}
declare const withRouter: <Props extends InjectedProps$0>(Component: React.ComponentType<Props>) => React.ForwardRefExoticComponent<React.PropsWithoutRef<Omit<Props, "router">> & React.RefAttributes<React.ComponentType<Props>>>;
interface InjectedProps$1 {
    state: State<Node<any>> | null;
    router: Router42<any> | null;
}
declare const withRouterState: <Props extends InjectedProps$1>(Component: React.ComponentType<Props>) => React.ForwardRefExoticComponent<React.PropsWithoutRef<Omit<Props, keyof InjectedProps$1>> & React.RefAttributes<React.ComponentType<Props>>>;
declare const useRouteNode: (nodeName: string) => Node<any> | null | undefined;
declare const useRouter: () => Router42<any, Node<any>> | null;
declare const useRouterState: () => RouteContextSignature;
export { TrailingSlashMode, QueryParamsMode, BuildOptions, MatchOptions, MatchResponse, RouteNodeStateMeta, RouteNodeState, RouteNodeOptions, BasicNodeSignature, RouteNode, createNode, NavigationOptions, StateMeta, State, Options, Router42, RouterError, NavigationError, Redirect, errorCodes, events, BrowserHistory, AsyncFn, EnterFn, NodeClassSignature, NodeInitParams, Node, RouterProvider, RouterStateContext, RouterContext, Link, Route, withNode, withRouter, withRouterState, useRouteNode, useRouter, useRouterState };
