import type { RouteNodeState } from 'routeNode';
import { TrailingSlashMode, QueryParamsMode, QueryParamFormats, URLParamsEncodingType, Params } from 'types/base';
import { BrowserHistory } from './browserHistory';
import { errorCodes, events } from './constants';
import { NavigationError, RouterError } from './errors';
import { generateId } from './helpers';
import { Node, NodeInitParams } from './node';
import type { PrefligthResult, OnEnterResult } from './node';
import { DefaultEventNames } from './types';
import type { EventCallbackNavigation, EventParamsNavigation } from './types/events';

export interface NavigationOptions {
    /** replace in browserHistory, nothing else is affected ? */
    replace?: boolean;
    /** Will trigger reactivation of asyncRequests and OnEnter Node functions */
    reload?: boolean;
    /** browserHistory thing, is this navigation call was triggered by popState event ? */
    popState?: boolean;
    force?: boolean;
    [key: string]: any;
}

export interface StateMeta {
    id: string;
    params: Params;
    navigation: NavigationOptions;
    redirected: boolean;
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

type HistoryControllerConstructor<NodeClass> = {
    new (router: Router42<any, any>): HistoryController<NodeClass>;
};
interface HistoryController<NodeClass> {
    start: () => void;
    stop: () => void;
    onTransitionSuccess: EventCallbackNavigation<NodeClass>;
    getLocation: () => string;
}

export class Router42<Dependencies, NodeClass extends Node<Dependencies> = Node<Dependencies>> {
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
    historyController: HistoryController<NodeClass>;

    transitionId = -1;

    illegalChars = new RegExp(/[.*+?^${}()|[\]\\]/, 'g');

    // Workaroung for TS bug: https://stackoverflow.com/questions/69019704/generic-that-extends-type-that-require-generic-type-inference-do-not-work/69028892#69028892
    constructor(
        routes: NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[],
        options?: Partial<Options>,
        dependencies?: Dependencies,
        historyController?: HistoryControllerConstructor<NodeClass>
    );

    constructor(
        routes: NodeClass | NodeClass[],
        options?: Partial<Options>,
        dependencies?: Dependencies,
        historyController?: HistoryControllerConstructor<NodeClass>
    );

    constructor(
        routes: NodeClass | NodeClass[] | NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[],
        options?: Partial<Options>,
        dependencies?: Dependencies,
        historyController?: HistoryControllerConstructor<NodeClass>
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

        if (historyController !== undefined) {
            this.historyController = new historyController(this);
        } else {
            this.historyController = new BrowserHistory(this);
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

    invokeEventListeners(eventName: DefaultEventNames | string, params?: EventParamsNavigation<NodeClass>) {
        (this.callbacks[eventName] || []).forEach((cb: any) => cb(params));
    }

    removeEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass>) {
        this.callbacks[eventName] = this.callbacks[eventName].filter((_cb: any) => _cb !== cb);
    }

    addEventListener(eventName: DefaultEventNames | string, cb: EventCallbackNavigation<NodeClass>) {
        this.callbacks[eventName] = (this.callbacks[eventName] || []).concat(cb);

        return () => this.removeEventListener(eventName, cb);
    }

    //
    // Routes
    //
    buildPath(name: string, params?: Params) {
        name = this.wildcardFormat(name);
        let defaultParams = this.rootNode.getDefaultParams(name);
        const { trailingSlashMode, queryParamsMode, queryParamFormats, urlParamsEncoding } = this.options.pathOptions;

        return this.rootNode.buildPath(name, { ...defaultParams, ...params }, { trailingSlashMode, queryParamsMode, queryParamFormats, urlParamsEncoding });
    }

    /**
     * Match and convert path into name of a node and params
     * @param path
     * @returns
     */
    matchPath(path: string) {
        const match = this.rootNode.matchPath(path, this.options.pathOptions);
        if (match == null) {
            return { name: null, params: null };
        }

        const { name, params } = match;
        return { name, params };
    }

    isActive(name: string, params?: Params, exact = true, ignoreQueryParams = true): boolean {
        if (this.state === null) return false;
        name = this.wildcardFormat(name);
        return this.matchCurrentState(name, params, exact, ignoreQueryParams);
    }

    //
    // State management
    //

    makeState(name: string, params: Params = {}, meta?: Omit<StateMeta, 'id'>): State<NodeClass> {
        let defaultParams = this.rootNode.getDefaultParams(name);

        return {
            name,
            params: {
                ...defaultParams,
                ...params,
            },
            meta: meta
                ? {
                      ...meta,
                      id: generateId(),
                  }
                : undefined,
            path: this.buildPath(name, params),
            activeNodes: [],
        };
    }

    /**
     *
     * @param name - node name, in case of descendants
     * @param params
     * @param exact - true: exact node, false: possibly descendant
     * e.g. current state is `profile.orders.index`, checking `profile.orders`, if exact is false, result will be true.
     * @param ignoreQueryParams
     * @returns
     */
    matchCurrentState(name: string, params: Params = {}, exact = true, ignoreQueryParams = true) {
        if (this.state == null) return false;

        if (exact) {
            if (this.state.name !== name) return false;
        } else {
            const regex = new RegExp('^' + name + '($|\\..*$)');
            if (!regex.test(this.state.name)) return false;
        }

        const getUrlParams = (name: string) =>
            this.rootNode.getNodesByName(name)?.reduce<string[]>((result, node) => {
                return result.concat(node?.parser?.urlParams || []);
            }, []) || [];

        const currentNodeParams = ignoreQueryParams ? getUrlParams(this.state.name) : Object.keys(this.state.params);
        const targetNodeParams = ignoreQueryParams ? getUrlParams(name) : Object.keys(params);
        return currentNodeParams.length === targetNodeParams.length && currentNodeParams.every((p) => this.state!.params[p] === params[p]);
    }

    buildNodeState(name: string, params: Params = {}) {
        let _params = {
            ...this.rootNode.getDefaultParams(name),
            ...params,
        };

        return this.rootNode.buildState(name, _params);
    }

    //
    // Lifecycle
    //
    start(path?: string): Promise<NavigationResult<NodeClass>> {
        if (this.started) {
            throw new RouterError(errorCodes.ROUTER_ALREADY_STARTED, 'already started');
        }

        if (this.historyController) {
            this.addEventListener(events.TRANSITION_SUCCESS, this.historyController.onTransitionSuccess.bind(this.historyController));
            this.historyController.start();
            if (path === undefined) {
                path = this.historyController.getLocation();
            }
        }

        this.started = true;
        this.invokeEventListeners(events.ROUTER_START);

        // if path wasn't defined, pass empty string, should throw 404 of default path then
        return this.navigateByPath(path || '');
    }

    stop() {
        if (!this.started) {
            throw new RouterError(errorCodes.ROUTER_NOT_STARTED, 'not started');
        }

        if (this.historyController) {
            this.historyController.stop();
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
        let nodeState = this.rootNode.matchPath(path, this.options.pathOptions);
        return this.navigate(nodeState?.name || path, { ...(nodeState?.params || {}), ...params }, options);
    }

    wildcardFormat(name: string): string {
        if (name.indexOf('*') === -1) return name;

        if (this.state == null) {
            console.warn("Can't format wildcard name, state isn't defined yet");
            return name;
        }

        let base = this.state.name.split('.');
        let result = name.split('.').reduce<string[]>((result, part, index) => {
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

        if (this.hooks.preNavigate) {
            [name, params] = this.hooks.preNavigate(name, params);
        }

        name = this.wildcardFormat(name);

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

        // let sameStates = this.state ? this.areStatesEqual(this.state, toState, false) : false;
        let sameStates = this.state ? this.matchCurrentState(toState.name, toState.params, true, false) : false;
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
        // Accepts previous onEnter result and current preflight result
        const afterAsync = (result: [OnEnterResult, PrefligthResult]) => {
            if (canceled()) {
                throw new NavigationError({ code: errorCodes.TRANSITION_CANCELLED, triggerEvent: events.TRANSITION_CANCELED });
            }

            return { parentNodeEnter: result[0], preflight: result[1] };
        };

        const afterOnEnter = (enterResult: OnEnterResult) => {
            if (canceled()) {
                throw new NavigationError({ code: errorCodes.TRANSITION_CANCELLED, triggerEvent: events.TRANSITION_CANCELED });
            }

            return enterResult;
        };

        let { toDeactivate, toActivate, intersection } = this.transitionPath(fromState, toState);
        let onEnterChain: Promise<OnEnterResult> = Promise.resolve();
        for (let node of toActivate) {
            let preflightResult = null;
            if (node.preflight) {
                preflightResult = node.preflight({ node, toState, fromState, dependencies: this.dependencies }) || null;
            }

            if (node.onEnter) {
                let ent = node.onEnter;
                onEnterChain = Promise.all([onEnterChain, preflightResult])
                    .then(afterAsync) // Check is transition was canceled after Async and chain calls, especially matters for the first `chain` which do not have any execution delay
                    .then((result) =>
                        ent({
                            node,
                            toState,
                            fromState,
                            dependencies: this.dependencies,
                            results: {
                                preflight: result.preflight,
                                parentNodeEnter: result.parentNodeEnter,
                            },
                        })
                    )
                    .then(afterOnEnter); // Check is transition was canceled after onEnter, usefull if onEnter returns Promise that will take some time to execute.
            }
        }

        try {
            await onEnterChain;
            toState.activeNodes = intersection.concat(toActivate);
            this.state = toState;
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
