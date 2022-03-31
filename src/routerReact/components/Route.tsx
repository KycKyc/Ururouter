import React, { useMemo } from 'react';
import { State } from '../../router/router';
import { isNodeActive } from '../helpers';
import { useRouterState } from '../hooks/useRouterState';

interface RouteParams {
    children?: React.ReactNode;
    name: string | string[];
    render?: (state: State<any> | null) => React.ReactNode;
}

/**
 *
 * @param param0
 * @returns
 */
export const Route = ({ children, name }: RouteParams) => {
    let r = useRouterState();
    let active = false;
    if (r.state) {
        for (let node of r.state.activeNodes) {
            if (Array.isArray(name)) {
                for (let _n of name) {
                    active = isNodeActive(_n, node.treeNames);
                    if (active) break;
                }
            } else {
                active = isNodeActive(name, node.treeNames);
            }

            if (active) break;
        }
    }

    return useMemo(() => {
        return active && children ? <React.Fragment>{children}</React.Fragment> : null;
    }, [active, children]);
};

interface RouteStateParams {
    name: string | string[];
    children?: (state: State<any> | null) => JSX.Element;
}

/**
 *
 * @param param0
 * @returns
 */
export const RouteState = ({ children, name }: RouteStateParams) => {
    let r = useRouterState();
    let active = false;
    if (r.state) {
        for (let node of r.state.activeNodes) {
            if (Array.isArray(name)) {
                for (let _n of name) {
                    active = isNodeActive(_n, node.treeNames);
                    if (active) break;
                }
            } else {
                active = isNodeActive(name, node.treeNames);
            }

            if (active) break;
        }
    }

    return useMemo(() => {
        return active && children ? children(r.state) : null;
    }, [active, children, r.state]);
};
