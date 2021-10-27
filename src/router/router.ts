import type { RouteNodeState } from 'routeNode';
import { TrailingSlashMode, QueryParamsMode, QueryParamFormats, URLParamsEncodingType, Params } from 'types/base';
import { errorCodes, events } from './constants';
import { NavigationError, RouterError } from './errors';
import { Node, NodeInitParams, NodeClassSignature } from './node';
import { DefaultEventNames } from './types';
import type { EventCallbackNavigation, EventCallbackNode, EventParamsNavigation, EventParamsNode } from './types/events';

export interface NavigationOptions {
    /** replace in browserHistory, nothing else is affected ? */
    replace?: boolean;
    /** Will trigger reactivation of asyncRequests and OnEnter Node functions */
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

export interface State<NodeClass> {
    name: string;
    params: Params;
    meta?: StateMeta;
    path: string;
    activeNodes: NodeClass[];
}

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

type NavigationResult<NodeClass> = {
    type: 'error' | 'success';
    payload: {
        fromState?: State<NodeClass> | null;
        toState?: State<NodeClass>;
        toDeactivate?: NodeClass[];
        toActivate?: NodeClass[];
        error?: NavigationError<string, string>;
    };
};

export class Router42<Dependencies, NodeClass extends NodeClassSignature<Dependencies> = Node<Dependencies>> {
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
        preNavigate?: (name: string, params?: Params) => [name: string, params: Params | undefined];
    } = {
        preNavigate: undefined,
    };

    dependencies?: Dependencies;
    callbacks: { [key: string]: Function[] } = {};

    state: State<NodeClass> | null = null;
    stateId = 0;
    started = false;

    rootNode: NodeClass;

    transitionId = -1;

    illegalChars = new RegExp(/[.*+?^${}()|[\]\\]/, 'g');

    // Workaroung for TS bug: https://stackoverflow.com/questions/69019704/generic-that-extends-type-that-require-generic-type-inference-do-not-work/69028892#69028892
    constructor(
        routes: NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[],
        options?: Partial<Options>,
        dependencies?: Dependencies
    );

    constructor(routes: NodeClass | NodeClass[], options?: Partial<Options>, dependencies?: Dependencies);
    constructor(
        routes: NodeClass | NodeClass[] | NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[],
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
            this.rootNode = routes as NodeClass;
        } else if (routes instanceof Array) {
            this.rootNode = new Node({ children: routes }) as NodeClass;
        } else {
            this.rootNode = new Node(routes) as NodeClass;
        }
    }

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

    invokeEventListeners(eventName: DefaultEventNames | string, params?: EventParamsNavigation<NodeClass> | EventParamsNode) {
        (this.callbacks[eventName] || []).forEach((cb: any) => cb(params));
    }

    removeEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass> | EventCallbackNode) {
        this.callbacks[eventName] = this.callbacks[eventName].filter((_cb: any) => _cb !== cb);
    }

    addEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass> | EventCallbackNode) {
        this.callbacks[eventName] = (this.callbacks[eventName] || []).concat(cb);

        return () => this.removeEventListener(eventName, cb);
    }

    //
    // Routes
    //
    buildPath(name: string, params?: Params) {
        name = this.inheritNameFragments(this.state?.name, name);
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
        name = this.inheritNameFragments(this.state.name, name);
        if (exact) {
            return this.areStatesEqual(this.makeState(name, params), this.state, ignoreQueryParams);
        }

        return this.isEqualOrDescendant(this.makeState(name, params), this.state);
    }

    isEqualOrDescendant(parentState: State<NodeClass>, childState: State<NodeClass>) {
        const regex = new RegExp('^' + parentState.name + '($|\\..*$)');
        if (!regex.test(childState.name)) return false;
        // If child state name extends parent state name, and all parent state params
        // are in child state params.
        return Object.keys(parentState.params).every((p) => parentState.params[p] === childState.params[p]);
    }

    //
    // State management
    //

    makeState(name: string, params: Params = {}, meta?: Omit<StateMeta, 'id'>, forceId?: number): State<NodeClass> {
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
            activeNodes: [],
        };
    }

    areStatesEqual(state1: State<NodeClass>, state2: State<NodeClass>, ignoreQueryParams = true) {
        if (state1.name !== state2.name) return false;

        const getUrlParams = (name: string) => this.rootNode.getNodeByName(name)?.parser?.['urlParams'] || [];

        const state1Params = ignoreQueryParams ? getUrlParams(state1.name) : Object.keys(state1.params);
        const state2Params = ignoreQueryParams ? getUrlParams(state2.name) : Object.keys(state2.params);
        return state1Params.length === state2Params.length && state1Params.every((p) => state1.params[p] === state2.params[p]);
    }

    buildNodeState(name: string, params: Params = {}) {
        let _params = {
            ...(this.rootNode.getNodeByName(name)?.defaultParams || {}),
            ...params,
        };

        return this.rootNode.buildState(name, _params);
    }

    //
    // Lifecycle
    //
    start(path: string): Promise<NavigationResult<NodeClass>> {
        if (this.started) {
            throw new RouterError(errorCodes.ROUTER_ALREADY_STARTED, 'already started');
        }

        this.started = true;
        this.invokeEventListeners(events.ROUTER_START);

        return this.navigateByPath(path);
    }

    stop() {
        if (!this.started) {
            throw new RouterError(errorCodes.ROUTER_NOT_STARTED, 'not started');
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

    private inheritNameFragments(basedOn: string | undefined, target: string): string {
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

    navigate(name: string, params?: Params, options: NavigationOptions = {}): Promise<NavigationResult<NodeClass>> {
        if (!this.started) {
            // throw instead ?
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError({ code: errorCodes.ROUTER_NOT_STARTED }) } });
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
                throw new NavigationError({
                    code: errorCodes.TRANSITION_CANCELLED,
                    message: "404 page was set in options, but wasn't defined in routes",
                });
            }

            // Navigate to 404, if set
            if (this.options.allowNotFound && this.options.notFoundRouteName) {
                return this.navigate(this.options.notFoundRouteName, { path: name }, { replace: true, reload: true });
            }

            if (name === this.options.defaultRouteName && !nodeState) {
                throw new NavigationError({
                    code: errorCodes.TRANSITION_CANCELLED,
                    message: "defaultPage page was set in options, but wasn't defined in routes",
                });
            }

            // Navigate to default route, if set, and if 404 is not set or disabled
            if (this.options.defaultRouteName) {
                return this.navigate(this.options.defaultRouteName, { replace: true, reload: true });
            }

            // add listner invocation?
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError({ code: errorCodes.ROUTE_NOT_FOUND }) } });
        }

        const toState = this.makeState(nodeState.name, nodeState.params, {
            params: nodeState.meta.params,
            navigation: options,
            redirected: false,
        });

        let sameStates = this.state ? this.areStatesEqual(this.state, toState, false) : false;
        if (sameStates && !options.force && !options.reload) {
            // add listner invocation?
            return Promise.resolve({ type: 'error', payload: { error: new NavigationError({ code: errorCodes.SAME_STATES }) } });
        }

        this.transitionId += 1;
        return this.transition(this.transitionId, toState, this.state, options);
    }

    private async transition(
        id: number,
        toState: State<NodeClass>,
        fromState: State<NodeClass> | null,
        options: NavigationOptions
    ): Promise<NavigationResult<NodeClass>> {
        let canceled = () => id !== this.transitionId;
        const afterAsync = (result: [{ state?: void | State<NodeClass>; passthrough?: any }, any]) => {
            if (canceled()) {
                throw new NavigationError({ code: errorCodes.TRANSITION_CANCELLED, triggerEvent: events.TRANSITION_CANCELED });
            }

            // Useless part, state is always present (?)
            if (!result[0].state) {
                result[0].state = toState;
            }

            return { state: result[0].state, passthrough: result[0].passthrough, asyncResult: result[1] };
        };

        const afterOnEnter = ({ state, passthrough }: { state?: State<NodeClass> | undefined; passthrough?: any } | void = {}) => {
            if (canceled()) {
                throw new NavigationError({ code: errorCodes.TRANSITION_CANCELLED, triggerEvent: events.TRANSITION_CANCELED });
            }

            if (!state) {
                state = toState;
            }

            return { state, passthrough };
        };

        let { toDeactivate, toActivate, intersection } = this.transitionPath(fromState, toState);
        let chain: Promise<{ state: State<NodeClass>; passthrough: any }> = Promise.resolve({ state: toState, passthrough: undefined });
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
            state.activeNodes = intersection.concat(toActivate);
            this.state = toState = state;
            this.invokeEventListeners(events.TRANSITION_SUCCESS, { fromState, toState, nodes: { toDeactivate, toActivate, intersection }, options });
            return { type: 'success', payload: { fromState, toState, toDeactivate, toActivate } };
        } catch (e: any) {
            if (e.name !== 'NavigationError') {
                e.code = errorCodes.TRANSITION_UNKNOWN_ERROR;
                e.triggerEvent = events.TRANSITION_UNKNOWN_ERROR;
            }

            if (e.code === errorCodes.TRANSITION_REDIRECTED) {
                return this.navigate(e.redirect.to, e.redirect.params, { force: true });
            }

            if (e.triggerEvent) {
                this.invokeEventListeners(e.triggerEvent, { fromState, toState, nodes: { toDeactivate, toActivate, intersection }, options, error: e });
            }

            return { type: 'error', payload: { fromState, toState, toDeactivate, toActivate, error: e } };
        }
    }

    transitionPath(fromState: State<NodeClass> | null, toState: State<NodeClass>) {
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

        let [compBase, compTo] = fromState?.name.length || 0 > toState.name.length ? [toStateIds, fromStateIds] : [fromStateIds, toStateIds];

        let index = 0;
        let node = 0;
        let segmentName: string | null = null;
        for (let value of compBase) {
            segmentName = segmentName === null ? value : `${segmentName}.${value}`;
            if (compTo.indexOf(value) === index && paramsAreEqual(segmentName) && (!toNavigationOpts.reload || toActivate[node].ignoreReloadCall)) {
                let commonNode = toActivate.splice(node, 1)[0];
                toDeactivate.splice(node, 1);
                intersection.push(commonNode);
                index += 1;
            } else {
                index += 1;
                node += 1;
                // break;
            }
        }

        return {
            toDeactivate,
            toActivate,
            intersection,
        };
    }
}
