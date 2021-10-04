import { RouteNode } from 'routeNode';
import { Params } from 'types/base';
import { State } from './router';

export type AsyncFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
}) => Promise<any> | void;

export type EnterFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
    asyncResult?: any;
    passthrough?: any;
}) => Promise<{ state?: State<NodeClass> | undefined; passthrough?: any } | void> | { state?: State<NodeClass> | undefined; passthrough?: any } | void;

export type NodeClassSignature<Dependencies> = RouteNode & {
    ['constructor']: new (params: NodeInitParams<Dependencies, any>) => void;
    asyncRequests?: AsyncFn<Dependencies, any>;
    onEnter?: EnterFn<Dependencies, any>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    /** Suppress asyncRequests and on onEnter functions, even if navigationOptions.reload is true */
    ignoreReloadCall: boolean;
};

export type NodeInitParams<Dependencies, NodeClass> = {
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
};

export class Node<Dependencies> extends RouteNode {
    asyncRequests?: AsyncFn<Dependencies, Node<Dependencies>>;
    onEnter?: EnterFn<Dependencies, Node<Dependencies>>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams: Params = {};
    ignoreReloadCall: boolean = false;

    constructor(signature: NodeInitParams<Dependencies, Node<Dependencies>>) {
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
