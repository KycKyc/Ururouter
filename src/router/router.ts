import type { BasicRoute, RouteNodeState } from 'routeNode';
import { RouteNode } from 'routeNode';
import { TrailingSlashMode, QueryParamsMode, QueryParamFormats, URLParamsEncodingType, Params } from 'types/base';
import { constants, errorCodes } from './constants';

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

export type Unsubscribe = () => void;
export type DoneFn = (err?: any, state?: State) => void;
export type CancelFn = () => void;

export type RouteDefinition<Dependencies> = BasicRoute & {
    asyncRequests?: AsyncFn<Dependencies>;
    onEnter?: EnterFn<Dependencies>;
    forwardTo?: string;
    children?: Array<RouteDefinition<Dependencies>>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
};

export type AsyncFn<Dependencies extends DefaultDependencies = DefaultDependencies> = (params: {
    node: Route<Dependencies>;
    toState: State;
    fromState: State | null;
    dependencies?: Dependencies;
}) => Promise<any> | void;

export type EnterFn<Dependencies extends DefaultDependencies = DefaultDependencies> = (params: {
    node: Route<Dependencies>;
    toState: State;
    fromState: State | null;
    dependencies?: Dependencies;
    asyncResult?: any;
}) => State | Promise<State | void> | void;

export interface Options {
    /** route name of 404 page */
    notFoundRouteName?: string;
    /** route name of default\fallback page, in case of undef route, alternative to 404 */
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
type EventNames = typeof constants[keyof typeof constants];
type DefaultErrorCodes = typeof errorCodes[keyof typeof errorCodes];
type ErrorCodes<Errors = DefaultErrorCodes> = Diff<Errors, DefaultErrorCodes> | DefaultErrorCodes;

class Route<Dependencies> extends RouteNode {
    asyncRequests?: AsyncFn<Dependencies>;
    onEnter?: EnterFn<Dependencies>;
    forwardTo?: string;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;

    // Useless constructor, because everything is optional anyway
    constructor(init: any) {
        super(init);
        if (init.defaultParams) {
            this.defaultParams = init.defaultParams;
        }
    }
}

type NavigationResult<Dependencies, CustomErrorCodes = never> = {
    type: 'error' | 'success';
    payload: {
        fromState?: State | null;
        toState?: State;
        toDeactivate?: Route<Dependencies>[];
        toActivate?: Route<Dependencies>[];
        error?: NavigationError<CustomErrorCodes>;
    };
};

export class NavigationError<CustomErrorCodes = never> extends Error {
    code: ErrorCodes<CustomErrorCodes>;
    redirect?: { name: string; params: Params };
    args?: any[];
    constructor(code: ErrorCodes<CustomErrorCodes>, message?: string, redirect?: { name: string; params: Params }, ...args: any[]) {
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

export class Router42<Dependencies, ErrorCodes = never> {
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

    dependencies?: Dependencies;
    callbacks: { [key: string]: Function[] } = {};

    state: State | null = null;
    stateId = 0;
    started = false;

    rootNode: Route<Dependencies>;

    transitionId = -1;

    constructor(routes: RouteDefinition<Dependencies>[], options?: Partial<Options>, dependencies?: Dependencies) {
        this.options = {
            ...this.options,
            ...options,
        };

        this.dependencies = dependencies;
        this.rootNode = routes instanceof Route ? routes : new Route<Dependencies>({ children: routes }); // new RouteNode({ children: routes });
    }

    //
    // Events
    //

    invokeEventListeners(eventName: EventNames, ...args: any[]) {
        (this.callbacks[eventName] || []).forEach((cb) => cb(...args));
    }

    removeEventListener(eventName: EventNames, cb: Function) {
        this.callbacks[eventName] = this.callbacks[eventName].filter((_cb) => _cb !== cb);
    }

    addEventListener(eventName: EventNames, cb: Function) {
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

    isActive(name: string, params: Params, ignoreQueryParams = true) {
        if (this.state === null) return false;
        if (this.state.name === name) return this.areStatesEqual(this.makeState(name, params), this.state, ignoreQueryParams);
        this.areStatesDescendants(this.makeState(name, params), this.state);
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

    areStatesDescendants(parentState: State, childState: State) {
        const regex = new RegExp('^' + parentState.name + '\\.(.*)$');
        if (!regex.test(childState.name)) return false;
        // If child state name extends parent state name, and all parent state params
        // are in child state params.
        return Object.keys(parentState.params).every((p) => parentState.params[p] === childState.params[p]);
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
    start(path: string): Promise<NavigationResult<Dependencies, ErrorCodes>> {
        if (this.started) {
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes>(errorCodes.ROUTER_ALREADY_STARTED) } });
        }

        this.started = true;
        this.invokeEventListeners(constants.ROUTER_START);

        return this.navigateByPath(path);
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
        return this.navigate(node?.name || path, { ...(node?.params || {}), params }, options);
    }

    navigate(name?: string, params?: Params, options: NavigationOptions = {}): Promise<NavigationResult<Dependencies, ErrorCodes>> {
        if (!this.started) {
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes>(errorCodes.ROUTER_NOT_STARTED) } });
        }

        let nodeState: RouteNodeState | null = null;

        if (name) {
            nodeState = this.buildNodeState(name, params);
        }

        // console.dir(route, { depth: null, breakLength: 140 });
        if (!nodeState) {
            // navigate to 404
            if (this.options.allowNotFound && this.options.notFoundRouteName) {
                return this.navigate(this.options.notFoundRouteName, { path: name }, { replace: true, reload: true });
            }

            if (this.options.defaultRouteName) {
                return this.navigate(this.options.defaultRouteName, { replace: true, reload: true });
            }

            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes>(errorCodes.ROUTE_NOT_FOUND) } });
        }

        const toState = this.makeState(nodeState.name, nodeState.params, {
            params: nodeState.meta.params,
            navigation: options,
            redirected: false,
        });

        // console.dir(toState, { depth: null, breakLength: 140 });

        let sameStates = this.state ? this.areStatesEqual(this.state, toState, false) : false;
        if (sameStates && !options.force && !options.reload) {
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError<ErrorCodes>(errorCodes.SAME_STATES) } });
        }

        this.transitionId += 1;
        return this.transition(this.transitionId, toState, this.state, options);
    }

    private async transition(
        id: number,
        toState: State,
        fromState: State | null,
        options: NavigationOptions
    ): Promise<NavigationResult<Dependencies, ErrorCodes>> {
        let canceled = () => id !== this.transitionId;
        const check: { (result: void | State): State; (result: [State, any]): [State, any] } = (result: any) => {
            if (canceled()) {
                throw new NavigationError(errorCodes.TRANSITION_CANCELLED);
            }

            if (result instanceof Array) {
                if (!result[0]) {
                    result[0] = toState;
                }

                return result;
            }

            if (!result) {
                result = toState;
            }

            return result;
        };

        let { toDeactivate, toActivate } = this.transitionPath(fromState, toState);
        let chain: Promise<State> = Promise.resolve(toState);
        for (let node of toActivate) {
            let asyncFn = null;
            if (node.asyncRequests) {
                asyncFn = node.asyncRequests({ node, toState, fromState, dependencies: this.dependencies }) || null;
            }

            if (node.onEnter) {
                let ent = node.onEnter;
                chain = Promise.all([chain, asyncFn])
                    .then(check) // Check is transition was canceled after async call
                    .then((result) => ent({ node, toState: result[0], fromState, dependencies: this.dependencies, asyncResult: result[1] }))
                    .then<State>(check); // Check is transition was canceled after onEnter, usefull if onEnter returns Promise. (will take time to execute)
            }
        }

        try {
            let finalState = await chain;
            this.state = finalState;
            this.invokeEventListeners(constants.TRANSITION_SUCCESS, { fromState, toState, toDeactivate, toActivate, options });
            return { type: 'success', payload: { fromState, toState, toDeactivate, toActivate } };
        } catch (e) {
            if (e.name === 'NavigationError') {
                console.debug(`Expected error: ${e.code}`);
            } else {
                console.debug('Unknown', e);
                e.code = errorCodes.TRANSITION_UNKNOWN_ERROR;
            }

            if (e.code === errorCodes.TRANSITION_REDIRECTED) {
                return this.navigate(e.redirect.name, e.redirect.params, { force: true });
            }

            this.invokeEventListeners(e.code, { fromState, toState, toDeactivate, toActivate, options, error: e });
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
        let toActivate: Route<Dependencies>[] = [];
        let toDeactivate: Route<Dependencies>[] = [];
        let intersection: Route<Dependencies>[] = [];

        if (fromState !== null) {
            fromStateIds = fromState.name.split('.');
            toDeactivate = this.rootNode.getNodesByName(fromState.name) || [];
        }

        toStateIds = toState.name.split('.');
        toActivate = this.rootNode.getNodesByName(toState.name) || [];

        if (toNavigationOpts.reload) {
            return {
                toDeactivate,
                toActivate,
                intersection,
            };
        }

        let [compFrom, compTo] = fromState?.name.length || 0 > toState.name.length ? [toStateIds, fromStateIds] : [fromStateIds, toStateIds];

        let index = 0;
        let segmentName: string | null = null;
        for (let value of compFrom) {
            segmentName = segmentName === null ? value : `${segmentName}.${value}`;
            if (compTo.indexOf(value) === index && paramsAreEqual(segmentName)) {
                let commonNode = toActivate.splice(0, 1)[0];
                toDeactivate.splice(0, 1);
                intersection.push(commonNode);
                index += 1;
            } else {
                break;
            }
        }

        // console.dir(toDeactivate.map((node) => node.name));
        // console.dir(toActivate.map((node) => node.name));
        // console.dir(intersection.map((node) => node.name));
        return {
            toDeactivate,
            toActivate,
            intersection,
        };
    }
}
