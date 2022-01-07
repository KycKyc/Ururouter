import React from 'react';
import { Params } from 'types/base';
import { RouteNode } from '../routeNode';
import { nodeEvents } from './constants';
import { State } from './router';
import { NodeDefaultEventNames } from './types';
import { NodeEventParams, NodeEventCallback } from './types/events';

export type PrefligthResult<Result = any> = Result | void;
export type OnEnterResult<Result = any> = Result | void;
export type PrefligthReturn<Result = any> = Promise<PrefligthResult<Result>> | PrefligthResult<Result>;
export type OnEnterReturn<Result = any> = Promise<OnEnterResult<Result>> | OnEnterResult<Result>;

export type PreflightFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
}) => PrefligthReturn;

export type EnterFn<Dependencies, NodeClass> = (params: {
    node: NodeClass;
    toState: State<NodeClass>;
    fromState: State<NodeClass> | null;
    dependencies?: Dependencies;
    results: {
        preflight: PrefligthResult;
        parentNodeEnter: OnEnterResult;
    };
}) => OnEnterReturn;

export type NodeInitParams<Dependencies, NodeClass> = {
    name?: string;
    path?: string;
    preflight?: PreflightFn<Dependencies, NodeClass>;
    onEnter?: EnterFn<Dependencies, NodeClass>;
    forwardTo?: string;
    children?: NodeInitParams<Dependencies, NodeClass>[] | NodeClass[] | NodeClass;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    /** Ignore preflight and on onEnter functions while executing navigation, if navigation options.replace was set to `true` */
    ignoreReplaceOpt?: boolean;
    /** React components */
    components?: { [key: string]: React.ComponentType<any> };
};

export class Node<Dependencies> extends RouteNode {
    preflight?: PreflightFn<Dependencies, this>;
    onEnter?: EnterFn<Dependencies, this>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams: Params = {};
    ignoreReplaceOpt: boolean = false;
    components: { [key: string]: React.ComponentType<any> } = {};
    callbacks: { [key: string]: Function[] } = {};

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

        if (params.ignoreReplaceOpt) {
            this.ignoreReplaceOpt = params.ignoreReplaceOpt;
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

    updateComponent(name: string, component: React.ComponentType<any>, force = false) {
        if (this.components[name] === component && !force) return;
        this.components[name] = component;
        this.invokeEventListeners(nodeEvents.ROUTER_RELOAD_NODE);
    }
}

// type HandlerFunc<F = any> = {
//     one: (state: string) => F;
//     two: <U extends F>(res: U) => void;
// };

// const crt = <W>(sig: HandlerFunc<W>): HandlerFunc<W> => {
//     return sig;
// };

// let result = crt({
//     one: (state) => {
//         return { one: 'w', two: 'l' };
//     },
//     two: (res) => {},
// });

// let a: HandlerFunc = {
//     one: (state) => 1,
//     two: (res) => {},
// };
