import { RouteNode } from 'routeNode';
import { Params } from 'types/base';
import { AsyncFn, EnterFn, NodeInitParams } from './router';

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
