import React from 'react';
import { Params } from 'types/base';
import { RouteNode } from '../routeNode';
import { nodeEvents } from './constants';
import { State } from './router';
import { NodeDefaultEventNames } from './types';
import { NodeEventParams, NodeEventCallback } from './types/events';

export type PreflightFn<Dependencies, NodeClass> = (params: {
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
}) => Promise<{} | void> | {} | void;

// export type NodeClassSignature<Dependencies> = RouteNode & {
//     ['constructor']: new (params: NodeInitParams<Dependencies, any>) => void;
//     preflight?: PreflightFn<Dependencies, any>;
//     onEnter?: EnterFn<Dependencies, any>;
//     encodeParams?(stateParams: Params): Params;
//     decodeParams?(pathParams: Params): Params;
//     defaultParams: Params;
//     /** Suppress asyncRequests and on onEnter functions, even if navigationOptions.reload is true */
//     ignoreReloadCall: boolean;
//     /** React components */
//     components: { [key: string]: React.ComponentType<any> };
//     callbacks: { [key: string]: Function[] };
//     invokeEventListeners: (eventName: NodeDefaultEventNames | string, params?: NodeEventParams) => void;
//     removeEventListener: (eventName: NodeDefaultEventNames | string, cb: NodeEventCallback) => void;
//     addEventListener: (eventName: NodeDefaultEventNames | string, cb: NodeEventCallback) => () => void;
// };

export type NodeInitParams<Dependencies = any, NodeClass = any> = {
    name?: string;
    path?: string;
    preflight?: PreflightFn<Dependencies, NodeClass>;
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
    preflight?: PreflightFn<Dependencies, this>;
    onEnter?: EnterFn<Dependencies, this>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams: Params = {};
    ignoreReloadCall: boolean = false;
    components: { [key: string]: React.ComponentType<any> } = {};
    callbacks: { [key: string]: Function[] } = {};

    constructor(params: NodeInitParams<Dependencies>) {
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

    invokeEventListeners(eventName: NodeDefaultEventNames | string, params?: NodeEventParams) {
        (this.callbacks[eventName] || []).forEach((cb: any) => cb(params));
    }

    removeEventListener(eventName: NodeDefaultEventNames | string, cb: NodeEventCallback) {
        this.callbacks[eventName] = this.callbacks[eventName].filter((_cb: any) => _cb !== cb);
    }

    addEventListener(eventName: NodeDefaultEventNames | string, cb: NodeEventCallback) {
        this.callbacks[eventName] = (this.callbacks[eventName] || []).concat(cb);

        return () => this.removeEventListener(eventName, cb);
    }

    updateComponent(name: string, component: React.ComponentType<any>) {
        this.components[name] = component;
        this.invokeEventListeners(nodeEvents.ROUTER_RELOAD_NODE);
    }
}
