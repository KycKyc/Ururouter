import React from 'react';
import { Router42, State } from '../router/router';

export type RouteContextSignature = {
    state: State | null;
    activeNodes: any[];
    router: Router42<any, any, any, any> | null;
};

// move under router controll, to be able to get every generic
export const RouterStateContext = React.createContext<RouteContextSignature>({ state: null, router: null, activeNodes: [] });
export const RouterContext = React.createContext<Router42<any, any, any, any> | null>(null);
