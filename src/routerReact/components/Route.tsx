import React, { useMemo } from 'react';
import { State } from '../../router/router';
import { isNodeActive } from '../helpers';
import { useRouterState } from '../hooks/useRouterState';

interface RouteParams {
    children?: React.ReactNode;
    name: string | string[];
    /** Forcefuly make this route active, bypass all checks, used by \<Switch> */
    __active?: boolean;
    render?: (state: State<any> | null) => React.ReactNode;
}

/**
 * Render children(s) if route is active
 * @param param0
 * @returns
 */
export const Route = ({ children, name, __active = false }: RouteParams) => {
    let r = useRouterState();
    if (__active === false) {
        __active = r.state ? isNodeActive(name, r.state.activeNodes) : false;
    }

    return useMemo(() => {
        return __active && children ? <React.Fragment>{children}</React.Fragment> : null;
    }, [__active, children]);
};

interface RouteStateParams {
    name: string | string[];
    /** Forcefuly make this route active, bypass all checks, used by \<Switch> */
    __active?: boolean;
    children?: (state: State<any> | null) => JSX.Element;
}

/**
 * Pass RouterState to its children and then render that children, if route is active
 * @param param0
 * @returns
 */
export const RouteState = ({ children, name, __active = false }: RouteStateParams) => {
    let r = useRouterState();
    if (__active === false) {
        __active = r.state ? isNodeActive(name, r.state.activeNodes) : false;
    }

    return useMemo(() => {
        return __active && children ? children(r.state) : null;
    }, [__active, children, r.state]);
};
