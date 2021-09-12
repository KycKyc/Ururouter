import type { BasicRouteSignature, RouteNodeState } from 'routeNode';
import { RouteNode } from 'routeNode';
import { TrailingSlashMode, QueryParamsMode, QueryParamFormats, URLParamsEncodingType, Params } from 'types/base';
import { errorCodes, events } from './constants';

export interface NavigationOptions {
    /** replace in browserHistory, nothing else is affected ? */
    replace?: boolean;
    reload?: boolean;
    skipTransition?: boolean;
    force?: boolean;
    [key: string]: any;
}

export interface StateMeta {
    id: number;
    params: Params;
    navigation: NavigationOptions;
    redirected: boolean;
    source?: string;
}

export interface State {
    name: string;
    params: Params;
    meta?: StateMeta;
    path: string;
}

export type DefaultDependencies = Record<string, any>;

export type RouteSignature<Dependencies, NodeClass extends Node<Dependencies>> = {
    name?: string;
    path?: string;
    asyncRequests?: AsyncFn<Dependencies, NodeClass>;
    onEnter?: EnterFn<Dependencies, NodeClass>;
    forwardTo?: string;
    children?: RouteSignature<Dependencies, NodeClass>[] | NodeClass[] | NodeClass;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    ignoreReloadCall?: boolean;
};

export type AsyncFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State;
    fromState: State | null;
    dependencies?: Dependencies;
}) => Promise<any> | void;

export type EnterFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State;
    fromState: State | null;
    dependencies?: Dependencies;
    asyncResult?: any;
    passthrough?: any;
}) => Promise<{ state?: State | undefined; passthrough?: any } | void> | { state?: State | undefined; passthrough?: any } | void;

export interface Options {
    /** route name of 404 page */
    notFoundRouteName?: string;
    /** route name of default\fallback page, in case of undef route, alternative to 404, if 404 is disabled */
    defaultRouteName?: string;
    autoCleanUp: boolean;
    allowNotFound: boolean;
    strongMatching: boolean;
    rewritePathOnMatch: boolean;

    pathOptions: {
        trailingSlashMode: TrailingSlashMode;
        queryParamsMode: QueryParamsMode;
        queryParamFormats?: QueryParamFormats;
        urlParamsEncoding?: URLParamsEncodingType;
        caseSensitive: boolean;
        strictTrailingSlash: boolean;
    };
}
type Diff<T, From> = T extends From ? never : T;
type DefaultEventNames = typeof events[keyof typeof events];
type DefaultErrorCodes = typeof errorCodes[keyof typeof errorCodes];
type GenErrorCodes<Errors = DefaultErrorCodes> = Diff<Errors, DefaultErrorCodes> | DefaultErrorCodes;
type GenEventNames<Events = DefaultEventNames> = Diff<Events, DefaultEventNames> | DefaultEventNames;

type EventParams<NodeClass> = {
    fromState: State | null;
    toState: State;
    nodes: {
        toDeactivate: NodeClass[];
        toActivate: NodeClass[];
        intersection: NodeClass[];
    };

    options: NavigationOptions;
    error?: any;
    name?: string; // nodeName, decouple it into separate interface
};
type EventCallback<NodeClass> = (signature: EventParams<NodeClass>) => void;

export class Node<Dependencies> extends RouteNode {
    asyncRequests?: AsyncFn<Dependencies, any>;
    onEnter?: EnterFn<Dependencies, any>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    ignoreReloadCall: boolean = false;

    constructor(signature: RouteSignature<Dependencies, any>) {
        super(signature);
        if (signature.defaultParams) {
            this.defaultParams = signature.defaultParams;
        }

        if (signature.asyncRequests) {
            this.asyncRequests = signature.asyncRequests;
        }

        if (signature.onEnter) {
            this.onEnter = signature.onEnter;
        }

        if (signature.encodeParams) {
            this.encodeParams = signature.encodeParams;
        }

        if (signature.decodeParams) {
            this.decodeParams = signature.decodeParams;
        }

        if (signature.ignoreReloadCall) {
            this.ignoreReloadCall = signature.ignoreReloadCall;
        }
    }
}

type NavigationResult<CustomErrorCodes, CustomEventNames, NodeClass> = {
    type: 'error' | 'success';
    payload: {
        fromState?: State | null;
        toState?: State;
        toDeactivate?: NodeClass[];
        toActivate?: NodeClass[];
        error?: NavigationError<CustomErrorCodes, CustomEventNames>;
    };
};

export class RouterError<CustomErrorCodes> extends Error {
    code: GenErrorCodes<CustomErrorCodes>;
    args?: any[];
    constructor(code: GenErrorCodes<CustomErrorCodes>, message?: string, ...args: any[]) {
        super(message);
        this.name = 'RouterError';
        this.code = code;

        if (args) {
            this.args = args;
        }
    }
}

type NavErrSignature<CustomErrorCodes, CustomEventNames> = {
    code: GenErrorCodes<CustomErrorCodes>;
    event?: GenEventNames<CustomEventNames>;
    message?: string;
    redirect?: { name: string; params: Params };
    [key: string]: any;
};
export class NavigationError<CustomErrorCodes, CustomEventNames> extends Error {
    code: GenErrorCodes<CustomErrorCodes>;
    redirect?: { name: string; params: Params };
    args?: { [key: string]: any };
    constructor({ code, event, message, redirect, ...args }: NavErrSignature<CustomErrorCodes, CustomEventNames>) {
        super(message);
        this.name = 'NavigationError';
        this.code = code;
        if (redirect) {
            this.redirect = redirect;
        }

        if (args) {
            this.args = args;
        }
    }
}

export class Router42<Dependencies extends DefaultDependencies, ErrorCodes extends string, EventNames extends string, NodeClass extends Node<Dependencies>> {
    options: Options = {
        autoCleanUp: true,
        allowNotFound: false,
        strongMatching: true,
        rewritePathOnMatch: true,

        pathOptions: {
            trailingSlashMode: 'default',
            queryParamsMode: 'default',
            queryParamFormats: {
                arrayFormat: 'none',
                booleanFormat: 'none',
                nullFormat: 'default',
            },
            urlParamsEncoding: 'default',
            caseSensitive: false,
            strictTrailingSlash: false,
        },
    };

    hooks: {
        preNavigate?: (name?: string, params?: Params) => [name: string | undefined, params: Params | undefined];
    } = {
        preNavigate: undefined,
    };

    dependencies?: Dependencies;
    callbacks: { [key: string]: Function[] } = {};

    state: State | null = null;
    stateId = 0;
    started = false;

    rootNode: NodeClass;

    transitionId = -1;

    // Workaroung for TS bug: https://stackoverflow.com/questions/69019704/generic-that-extends-type-that-require-generic-type-inference-do-not-work/69028892#69028892
    constructor(
        routes: RouteSignature<Dependencies, Node<Dependencies>> | RouteSignature<Dependencies, Node<Dependencies>>[],
        options?: Partial<Options>,
        dependencies?: Dependencies
    );

    constructor(routes: NodeClass | NodeClass[], options?: Partial<Options>, dependencies?: Dependencies);
    constructor(
        routes: NodeClass | NodeClass[] | RouteSignature<Dependencies, Node<Dependencies>> | RouteSignature<Dependencies, Node<Dependencies>>[],
        options?: Partial<Options>,
        dependencies?: Dependencies
    ) {
        this.options = {
            ...this.options,
            ...options,
        };

        if (!(routes instanceof Array)) {
            if ((routes.name || '').length > 0 || (routes.path || '').length > 0) {
                throw new RouterError(
                    errorCodes.ROUTER_INCORRECT_CONFIGS,
                    'First node in a tree should have empty name and path, e.g. `new Route({children: [...]})` or `{children: [...]}`'
                );
            }
        }

        this.dependencies = dependencies;
        if (routes instanceof Node) {
            this.rootNode = routes;
        } else if (routes instanceof Array) {
            this.rootNode = new Node({ children: routes }) as NodeClass;
        } else {
            this.rootNode = new Node(routes) as NodeClass;
        }
    }

    //
    // Events
    //

    invokeEventListeners(eventName: GenEventNames<EventNames>, params?: EventParams<NodeClass>) {
        (this.callbacks[eventName] || []).forEach((cb: any) => cb(params));
    }

    removeEventListener(eventName: GenEventNames<EventNames>, cb: EventCallback<NodeClass>) {
        this.callbacks[eventName] = this.callbacks[eventName].filter((_cb: any) => _cb !== cb);
    }

    addEventListener(eventName: GenEventNames<EventNames>, cb: EventCallback<NodeClass>) {
        this.callbacks[eventName] = (this.callbacks[eventName] || []).concat(cb);

        return () => this.removeEventListener(eventName, cb);
    }

    //
    // Routes
    //
    buildPath(name: string, params?: Params) {
        let defaultParams = this.rootNode.getNodeByName(name)?.defaultParams || {};
        const { trailingSlashMode, queryParamsMode, queryParamFormats, urlParamsEncoding } = this.options.pathOptions;

        return this.rootNode.buildPath(name, { ...defaultParams, ...params }, { trailingSlashMode, queryParamsMode, queryParamFormats, urlParamsEncoding });
    }

    /**
     * Do this have any potential use?
     * @param path
     * @returns
     */
    matchPath(path: string) {
        const match = this.rootNode.matchPath(path, this.options.pathOptions);
        if (match == null) {
            return null;
        }

        const { name, params, meta } = match;
        return this.makeState(name, params, {
            params: meta.params,
            navigation: {},
            redirected: false,
        });
    }

    isActive(name: string, params?: Params, exact = true, ignoreQueryParams = true): boolean {
        if (this.state === null) return false;
        if (exact) {
            return this.areStatesEqual(this.makeState(name, params), this.state, ignoreQueryParams);
        }

        return this.isEqualOrDescendant(this.makeState(name, params), this.state);
    }

    isEqualOrDescendant(parentState: State, childState: State) {
        const regex = new RegExp('^' + parentState.name + '($|\\..*$)');
        if (!regex.test(childState.name)) return false;
        // If child state name extends parent state name, and all parent state params
        // are in child state params.
        return Object.keys(parentState.params).every((p) => parentState.params[p] === childState.params[p]);
    }

    //
    // State management
    //

    makeState(name: string, params: Params = {}, meta?: Omit<StateMeta, 'id'>, forceId?: number): State {
        let defaultParams = this.rootNode.getNodeByName(name)?.defaultParams || {};

        return {
            name,
            params: {
                ...defaultParams,
                ...params,
            },
            meta: meta
                ? {
                      ...meta,
                      id: forceId === undefined ? ++this.stateId : forceId,
                  }
                : undefined,
            path: this.buildPath(name, params),
        };
    }

    areStatesEqual(state1: State, state2: State, ignoreQueryParams = true) {
        if (state1.name !== state2.name) return false;

        const getUrlParams = (name: string) => this.rootNode.getNodeByName(name)?.parser?.['urlParams'] || [];

        const state1Params = ignoreQueryParams ? getUrlParams(state1.name) : Object.keys(state1.params);
        const state2Params = ignoreQueryParams ? getUrlParams(state2.name) : Object.keys(state2.params);
        return state1Params.length === state2Params.length && state1Params.every((p) => state1.params[p] === state2.params[p]);
    }

    buildNodeState(routeName: string, routeParams: Params = {}) {
        let params = {
            ...(this.rootNode.getNodeByName(routeName)?.defaultParams || {}),
            ...routeParams,
        };

        return this.rootNode.buildState(routeName, params);
    }

    //
    // Lifecycle
    //
    start(path: string): Promise<NavigationResult<ErrorCodes, EventNames, NodeClass>> {
        if (this.started) {
            throw new RouterError<ErrorCodes>(errorCodes.ROUTER_ALREADY_STARTED, 'already started');
        }

        this.started = true;
        this.invokeEventListeners(events.ROUTER_START);

        return this.navigateByPath(path);
    }

    stop() {
        if (!this.started) {
            throw new RouterError<ErrorCodes>(errorCodes.ROUTER_NOT_STARTED, 'not started');
        }

        this.started = false;
        this.invokeEventListeners(events.ROUTER_STOP);
    }

    //
    // Navigation
    //
    cancel() {
        this.transitionId += 1;
    }

    /**
     * Do not like name-based navigation?
     * Use this, url-based navigation.
     * But it's less performant, cause it will do additional trip through nodes.
     * @param path Just url, real plain url, without tokens (aka `:page`, `*spat` or whatever)
     * @param params Params to override, or additional params to add
     * @param options Navigation options
     * @returns
     */
    navigateByPath(path: string, params: Params = {}, options: NavigationOptions = {}) {
        let node = this.rootNode.matchPath(path, this.options.pathOptions);
        return this.navigate(node?.name || path, { ...(node?.params || {}), ...params }, options);
    }

    private inheritNameFragments(basedOn: string | undefined, target: string | undefined): string | undefined {
        if (!basedOn || !target) return target;
        if (target.indexOf('*') === -1) return target;
        let base = basedOn.split('.');
        let result = target.split('.').reduce<string[]>((result, part, index) => {
            if (part === '*') {
                result.push(base[index] || '*');
            } else {
                result.push(part);
            }

            return result;
        }, []);

        return result.join('.');
    }

    navigate(name?: string, params?: Params, options: NavigationOptions = {}): Promise<NavigationResult<ErrorCodes, EventNames, NodeClass>> {
        if (!this.started) {
            // throw instead ?
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes, EventNames>({ code: errorCodes.ROUTER_NOT_STARTED }) } });
        }

        name = this.inheritNameFragments(this.state?.name, name);
        if (this.hooks.preNavigate) {
            [name, params] = this.hooks.preNavigate(name, params);
        }

        let nodeState: RouteNodeState | null = null;

        if (name) {
            nodeState = this.buildNodeState(name, params);
        }

        if (!nodeState) {
            // 404 was defined but wasn't found, and this is this.navigate(404) call already
            if (name === this.options.notFoundRouteName && !nodeState) {
                throw new NavigationError<ErrorCodes, EventNames>({
                    code: errorCodes.TRANSITION_CANCELLED,
                    message: "404 page was set in options, but wasn't defined in routes",
                });
            }

            // Navigate to 404, if set
            if (this.options.allowNotFound && this.options.notFoundRouteName) {
                return this.navigate(this.options.notFoundRouteName, { path: name }, { replace: true, reload: true });
            }

            if (name === this.options.defaultRouteName && !nodeState) {
                throw new NavigationError<ErrorCodes, EventNames>({
                    code: errorCodes.TRANSITION_CANCELLED,
                    message: "defaultPage page was set in options, but wasn't defined in routes",
                });
            }

            // Navigate to default route, if set, and if 404 is not set or disabled
            if (this.options.defaultRouteName) {
                return this.navigate(this.options.defaultRouteName, { replace: true, reload: true });
            }

            // add listner invocation?
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes, EventNames>({ code: errorCodes.ROUTE_NOT_FOUND }) } });
        }

        const toState = this.makeState(nodeState.name, nodeState.params, {
            params: nodeState.meta.params,
            navigation: options,
            redirected: false,
        });

        let sameStates = this.state ? this.areStatesEqual(this.state, toState, false) : false;
        if (sameStates && !options.force && !options.reload) {
            // add listner invocation?
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes, EventNames>({ code: errorCodes.SAME_STATES }) } });
        }

        this.transitionId += 1;
        return this.transition(this.transitionId, toState, this.state, options);
    }

    private async transition(
        id: number,
        toState: State,
        fromState: State | null,
        options: NavigationOptions
    ): Promise<NavigationResult<ErrorCodes, EventNames, NodeClass>> {
        let canceled = () => id !== this.transitionId;
        const afterAsync = (result: [{ state?: void | State; passthrough?: any }, any]) => {
            if (canceled()) {
                throw new NavigationError({ code: errorCodes.TRANSITION_CANCELLED, event: events.TRANSITION_CANCELED });
            }

            // Useless part, state is always present (?)
            if (!result[0].state) {
                result[0].state = toState;
            }

            return { state: result[0].state, passthrough: result[0].passthrough, asyncResult: result[1] };
        };

        const afterOnEnter = ({ state, passthrough }: { state?: State | undefined; passthrough?: any } | void = {}) => {
            if (canceled()) {
                throw new NavigationError({ code: errorCodes.TRANSITION_CANCELLED, event: events.TRANSITION_CANCELED });
            }

            if (!state) {
                state = toState;
            }

            return { state, passthrough };
        };

        let { toDeactivate, toActivate, intersection } = this.transitionPath(fromState, toState);
        let chain: Promise<{ state: State; passthrough: any }> = Promise.resolve({ state: toState, passthrough: undefined });
        for (let node of toActivate) {
            let asyncFn = null;
            if (node.asyncRequests) {
                asyncFn = node.asyncRequests({ node, toState, fromState, dependencies: this.dependencies }) || null;
            }

            if (node.onEnter) {
                let ent = node.onEnter;
                chain = Promise.all([chain, asyncFn])
                    .then(afterAsync) // Check is transition was canceled after Async and chain calls, especially matters for the first `chain` which do not have any execution delay
                    .then((result) =>
                        ent({
                            node,
                            toState: result.state,
                            fromState,
                            dependencies: this.dependencies,
                            asyncResult: result.asyncResult,
                            passthrough: result.passthrough,
                        })
                    )
                    .then(afterOnEnter); // Check is transition was canceled after onEnter, usefull if onEnter returns Promise that will take some time to execute.
            }
        }

        try {
            let { state } = await chain;
            this.state = toState = state;
            this.invokeEventListeners(events.TRANSITION_SUCCESS, { fromState, toState, nodes: { toDeactivate, toActivate, intersection }, options });
            return { type: 'success', payload: { fromState, toState, toDeactivate, toActivate } };
        } catch (e: any) {
            if (e.name !== 'NavigationError') {
                e.code = errorCodes.TRANSITION_UNKNOWN_ERROR;
                e.event = events.TRANSITION_UNKNOWN_ERROR;
            }

            if (e.code === errorCodes.TRANSITION_REDIRECTED) {
                return this.navigate(e.redirect.name, e.redirect.params, { force: true });
            }

            if (e.event) {
                this.invokeEventListeners(e.event, { fromState, toState, nodes: { toDeactivate, toActivate, intersection }, options, error: e });
            }

            return { type: 'error', payload: { fromState, toState, toDeactivate, toActivate, error: e } };
        }
    }

    transitionPath(fromState: State | null, toState: State) {
        function paramsAreEqual(name: string) {
            let fromParams = Object.keys(fromState?.meta?.params[name] || {}).reduce<{ [keys: string]: 'string' }>((params, p) => {
                params[p] = fromState?.params[p];
                return params;
            }, {});

            let toParams = Object.keys(toState.meta?.params[name] || {}).reduce<{ [keys: string]: 'string' }>((params, p) => {
                params[p] = toState.params[p];
                return params;
            }, {});

            // is this a possible scenario at all?
            // ToDo: check and remove this block if not
            if (Object.keys(toParams).length !== Object.keys(fromParams).length) {
                return false;
            }

            if (Object.keys(toParams).length === 0) {
                return true;
            }

            return Object.keys(toParams).some((p) => toParams[p] === fromParams[p]);
        }

        const toNavigationOpts = toState?.meta?.navigation || {};
        let fromStateIds: string[] = [];
        let toStateIds: string[] = [];
        let toActivate: NodeClass[] = [];
        let toDeactivate: NodeClass[] = [];
        let intersection: NodeClass[] = [];

        if (fromState !== null) {
            fromStateIds = fromState.name.split('.');
            toDeactivate = this.rootNode.getNodesByName(fromState.name) || [];
        }

        toStateIds = toState.name.split('.');
        toActivate = this.rootNode.getNodesByName(toState.name) || [];

        // if (toNavigationOpts.reload) {
        //     return {
        //         toDeactivate,
        //         toActivate,
        //         intersection,
        //     };
        // }

        let [compFrom, compTo] = fromState?.name.length || 0 > toState.name.length ? [toStateIds, fromStateIds] : [fromStateIds, toStateIds];

        let index = 0;
        let segmentName: string | null = null;
        for (let value of compFrom) {
            segmentName = segmentName === null ? value : `${segmentName}.${value}`;
            if (compTo.indexOf(value) === index && paramsAreEqual(segmentName) && (!toNavigationOpts.reload || toActivate[0].ignoreReloadCall)) {
                let commonNode = toActivate.splice(0, 1)[0];
                toDeactivate.splice(0, 1);
                intersection.push(commonNode);
                index += 1;
            } else {
                break;
            }
        }

        return {
            toDeactivate,
            toActivate,
            intersection,
        };
    }
}
