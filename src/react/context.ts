import React from 'react';
import { Node } from 'router/node';
import { Router42, State } from 'router/router';

export type RouteContextSignature = {
    state: State<Node<any>> | null;
    router: Router42<any> | null;
};

// move under router controll, to be able to get every generic
export const RouterStateContext = React.createContext<RouteContextSignature>({ state: null, router: null });
export const RouterContext = React.createContext<Router42<any> | null>(null);
