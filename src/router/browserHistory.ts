import { NavigationOptions, Router42, State } from './router';

class BrowserHistory<Dependencies> {
    router: Router42<Dependencies>;
    removePopStateListener: (() => void) | null;

    constructor(router: Router42<Dependencies>) {
        this.router = router;
        this.removePopStateListener = null;
    }

    private getLocation() {
        const correctedPath = safelyEncodePath(window.location.pathname);
        return (correctedPath || '/') + window.location.search;
    }

    private getHash() {
        return window.location.hash;
    }

    private replaceState(state: any, title: string, path?: string) {
        window.history.replaceState(state, title, path);
    }

    private pushState(state: any, title: string, path?: string) {
        window.history.pushState(state, title, path);
    }

    private getState(): State<any> | null {
        return window.history.state;
    }

    private onPopState(evt: PopStateEvent) {
        const newState = !evt.state?.name;
        const state = newState
            ? this.router.matchPath(this.getLocation())
            : this.router.makeState(evt.state.name, evt.state.params, { ...evt.state.meta }, evt.state.meta.id);

        if (!state) return;

        if (this.router.state && this.router.areStatesEqual(state, this.router.state, false)) return;

        this.router.navigate(state.name, state.params);
    }

    private updateState(toState: State<any> | null, url: string, replace: boolean) {
        // const trimmedState = toState
        //     ? {
        //           meta: toState.meta,
        //           name: toState.name,
        //           params: toState.params,
        //           path: toState.path,
        //       }
        //     : toState;

        if (replace) this.replaceState(toState, '', url);
        else this.pushState(toState, '', url);
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

    onTransitionSuccess({ fromState, toState, options }: { fromState: State<any> | null; toState: State<any>; options: NavigationOptions }) {
        const historyState = this.getState();
        const hasState = historyState !== null;

        const statesAreEqual = fromState !== null && this.router.areStatesEqual(fromState, toState, false);
        const replace = options.replace || !hasState || statesAreEqual;
        let url = this.router.buildPath(toState.name, toState.params);
        // why only on null state ?
        if (fromState === null) {
            url += this.getHash();
        }

        this.updateState(toState, url, replace);
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
