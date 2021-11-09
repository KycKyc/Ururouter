import { NavigationOptions, Router42, State } from './router';

interface BrowserState {}

class BrowserHistory<Dependencies> {
    router: Router42<Dependencies>;
    removePopStateListener: (() => void) | null;

    constructor(router: Router42<Dependencies, any>) {
        this.router = router;
        this.removePopStateListener = null;
    }

    getLocation() {
        const correctedPath = safelyEncodePath(window.location.pathname);
        return (correctedPath || '/') + window.location.search;
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
        const newState = !evt.state?.name;
        const state = newState ? this.router.matchPath(this.getLocation()) : this.router.makeState(evt.state.name, evt.state.params, { ...evt.state.meta });

        if (!state) return;

        if (this.router.state && this.router.matchCurrentState(state.name, state.params, true, false)) return;

        this.router.navigate(state.name, state.params, { popState: true });
    }

    private updateState(toState: State<any> | null, url: string, replace: boolean) {
        const trimmedState = toState
            ? {
                  meta: toState.meta,
                  name: toState.name,
                  params: toState.params,
                  path: toState.path,
              }
            : toState;
        // console.dir(toState, { depth: 5 });
        // console.dir(trimmedState, { depth: 5 });
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

    onTransitionSuccess({ fromState, toState, options }: { fromState: State<any> | null; toState: State<any>; options: NavigationOptions }) {
        const historyState = this.getState();
        console.debug(historyState);
        const hasState = historyState !== null;

        // const statesAreEqual = fromState !== null && this.router.areStatesEqual(fromState, toState, false);
        const replace = options.replace || !hasState; // || statesAreEqual;
        let url = this.router.buildPath(toState.name, toState.params);

        // why only on null state ?
        if (fromState === null) {
            url += this.getHash();
        }

        if (!options.popState) {
            this.updateState(toState, url, replace);
        }
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
