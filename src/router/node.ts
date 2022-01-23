import type React from 'react';
import type { Params } from 'types/base';
import { RouteNode } from '../routeNode';
import type { RouteNodeOptions } from '../routeNode';
import { nodeEvents } from './constants';
import type { State } from './router';
import type { NodeDefaultEventNames } from './types/base';
import type { EventParamsNode, EventCallbackNode } from './types/events';

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
    /** Called before  everything else, __simultaneously__ for all nodes in the current transition call*/
    preflight?: PreflightFn<Dependencies, NodeClass>;
    /** Called __sequentially__ for all nodes in the current transition call, and each after own node preflight function */
    onEnter?: EnterFn<Dependencies, NodeClass>;
    children?: NodeInitParams<Dependencies, NodeClass>[] | NodeClass[] | NodeClass;
    options?: RouteNodeOptions;
    /** default url params for this node, you can also overwrite any parent node params if you want  */
    defaultParams?: Params;
    /** Ignore preflight and on onEnter functions in process of transition, even if navigation options.replace is set to `true` */
    ignoreReplaceOpt?: boolean;
    /** Collection of React components */
    components?: { [key: string]: React.ComponentType<any> };
};

export class Node<Dependencies> extends RouteNode {
    preflight?: PreflightFn<Dependencies, this>;
    onEnter?: EnterFn<Dependencies, this>;
    defaultParams: Params = {};
    ignoreReplaceOpt: boolean = false;
    components: { [key: string]: React.ComponentType<any> } = {};
    callbacks: { [key: string]: EventCallbackNode[] } = {};

    constructor(params: NodeInitParams<Dependencies, Node<Dependencies>>) {
        super(params);

        if (params.preflight) {
            this.preflight = params.preflight;
        }

        if (params.onEnter) {
            this.onEnter = params.onEnter;
        }

        if (params.ignoreReplaceOpt) {
            this.ignoreReplaceOpt = params.ignoreReplaceOpt;
        }

        if (params.components) {
            this.components = params.components;
        }
    }

    invokeEventListeners(eventName: NodeDefaultEventNames | string, params?: EventParamsNode) {
        (this.callbacks[eventName] || []).forEach((cb) => cb(params));
    }

    removeEventListener(eventName: NodeDefaultEventNames | string, cb: EventCallbackNode) {
        this.callbacks[eventName] = this.callbacks[eventName].filter((_cb: any) => _cb !== cb);
    }

    addEventListener(eventName: NodeDefaultEventNames | string, cb: EventCallbackNode) {
        this.callbacks[eventName] = (this.callbacks[eventName] || []).concat(cb);

        return () => this.removeEventListener(eventName, cb);
    }

    updateComponent(name: string, component: React.ComponentType<any>, force = false) {
        if (this.components[name] === component && !force) return;
        this.components[name] = component;
        this.invokeEventListeners(nodeEvents.ROUTER_RELOAD_NODE);
    }
}
