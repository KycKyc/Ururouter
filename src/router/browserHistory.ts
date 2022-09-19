import type { Params, Anchor } from '../types/common';
import type { Ururouter, State } from './router';
import type { EventCallbackNavigation, EventParamsNavigation } from './types/events';

interface BrowserState {}

export type HistoryControllerConstructor<NodeClass> = {
    new (router: Ururouter<any, any>): HistoryController<NodeClass>;
};
export interface HistoryController<NodeClass> {
    start: () => void;
    stop: () => void;
    onTransitionSuccess: EventCallbackNavigation<NodeClass>;
    getLocation: () => string;
}

class BrowserHistory<Dependencies> implements HistoryController<any> {
    router: Ururouter<Dependencies>;
    removePopStateListener: (() => void) | null;

    constructor(router: Ururouter<Dependencies, any>) {
        this.router = router;
        this.removePopStateListener = null;
    }

    getLocation() {
        // Should be correctly encoded by the browser, but we will reencode them, just in case
        const path = safelyEncodePath(window.location.pathname) || '/';
        const search = window.location.search;
        const hash = safelyEncodePath(window.location.hash);
        return path + search + hash;
    }

    private getHash() {
        return window.location.hash;
    }

    private replaceState(state: any, path?: string, title: string = '') {
        window.history.replaceState(state, title, path);
    }

    private pushState(state: any, path?: string, title: string = '') {
        window.history.pushState(state, title, path);
    }

    private getState(): State<any> | null {
        return window.history.state;
    }

    private onPopState(evt: PopStateEvent) {
        let name: string | null, params: Params | null, anchor: Anchor;
        if (evt.state?.name === undefined) {
            ({ name, params, anchor } = this.router.matchPath(this.getLocation()));
        } else {
            name = evt.state.name;
            params = evt.state.params;
            anchor = evt.state.anchor;
        }

        // Withdraw if something are missing
        if (name === null || params === null) return;
        if (this.router.state && this.router.matchCurrentState(name, params, anchor, true, false)) return;

        this.router.navigate(name, params, anchor, { popState: true });
    }

    private updateState(toState: State<any> | null, url: string, replace: boolean) {
        const trimmedState = toState
            ? {
                  meta: toState.meta,
                  name: toState.name,
                  params: toState.params,
                  anchor: toState.anchor,
                  path: toState.path,
              }
            : toState;

        if (replace) this.replaceState(trimmedState, url);
        else this.pushState(trimmedState, url);
    }

    start() {
        let b = this.onPopState.bind(this);
        window.addEventListener('popstate', b);
        this.removePopStateListener = () => {
            window.removeEventListener('popstate', b);
        };
    }

    stop() {
        if (this.removePopStateListener !== null) {
            this.removePopStateListener();
            this.removePopStateListener = null;
        }
    }

    onTransitionSuccess({ toState, options }: EventParamsNavigation<any>) {
        // Bail if this navigation was triggered by popState event
        if (options.popState) return;

        const historyState = this.getState();
        const hasState = historyState !== null;

        // const statesAreEqual = fromState !== null && this.router.areStatesEqual(fromState, toState, false);
        const replace = options.replace || !hasState; // || statesAreEqual;

        this.updateState(toState, toState.path, replace);
    }
}

const safelyEncodePath = (path: string) => {
    try {
        return encodeURI(decodeURI(path));
    } catch (_) {
        return path;
    }
};

export { BrowserHistory };
