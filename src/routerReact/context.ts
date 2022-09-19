import React from 'react';
import { Node } from '../router/node';
import { Ururouter, State } from '../router/router';

export type RouteContextSignature = {
    state: State<Node<any>> | null;
    router: Ururouter<any> | null;
};

// move under router controll, to be able to get every generic
export const RouterStateContext = React.createContext<RouteContextSignature>({ state: null, router: null });
export const RouterContext = React.createContext<Ururouter<any> | null>(null);
