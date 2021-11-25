import React from 'react';
import { RouteNode } from '../routeNode';
import { Params } from 'types/base';
import { State } from './router';

export type AsyncFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
}) => Promise<{} | void> | {} | void;

export type EnterFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
    results: {
        preflight: {} | void;
        parentNodeEnter: {} | void;
    };
    // preflightResult: {} | undefined;
    // passthrough: {} | undefined;
}) => Promise<{} | void> | {} | void;

export type NodeClassSignature<Dependencies> = RouteNode & {
    ['constructor']: new (params: NodeInitParams<Dependencies, any>) => void;
    preflight?: AsyncFn<Dependencies, any>;
    onEnter?: EnterFn<Dependencies, any>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    /** Suppress asyncRequests and on onEnter functions, even if navigationOptions.reload is true */
    ignoreReloadCall: boolean;
    /** React components */
    components?: { [key: string]: React.ComponentType<any> };
};

export type NodeInitParams<Dependencies = any, NodeClass = Node<Dependencies>> = {
    name?: string;
    path?: string;
    preflight?: AsyncFn<Dependencies, NodeClass>;
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
    preflight?: AsyncFn<Dependencies, Node<Dependencies>>;
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

        if (params.preflight) {
            this.preflight = params.preflight;
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
