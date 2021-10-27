import React from 'react';
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
    /** React components */
    components?: { [key: string]: React.ComponentType<any> };
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
    /** React components */
    components?: { [key: string]: React.ComponentType<any> };
};

export class Node<Dependencies> extends RouteNode {
    asyncRequests?: AsyncFn<Dependencies, Node<Dependencies>>;
    onEnter?: EnterFn<Dependencies, Node<Dependencies>>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams: Params = {};
    ignoreReloadCall: boolean = false;
    components: { [key: string]: React.ComponentType<any> } = {};

    constructor(params: NodeInitParams<Dependencies, Node<Dependencies>>) {
        super(params);
        if (params.defaultParams) {
            this.defaultParams = params.defaultParams;
        }

        if (params.asyncRequests) {
            this.asyncRequests = params.asyncRequests;
        }

        if (params.onEnter) {
            this.onEnter = params.onEnter;
        }

        if (params.encodeParams) {
            this.encodeParams = params.encodeParams;
        }

        if (params.decodeParams) {
            this.decodeParams = params.decodeParams;
        }

        if (params.ignoreReloadCall) {
            this.ignoreReloadCall = params.ignoreReloadCall;
        }

        if (params.components) {
            this.components = params.components;
        }
    }
}
