import React, { useMemo } from 'react';
import type { Node } from '../../router/node';
import { State } from '../../router/router';
import { isNodeActive } from '../helpers';
import { useRouterState } from '../hooks/useRouterState';

interface RouteParams {
    children?: React.ReactNode;
    name: string | string[];
    render?: (state: State<any> | null) => React.ReactNode;
}

/**
 * Helper fucntion.
 * Finds out whether a node with the given name is currently active or not.
 * @param name name of the node to check
 * @param nodes list of currently active nodes
 * @returns
 */
const nodeIsActive = (name: string | string[], nodes: Node<any>[]) => {
    let active = false;
    for (let node of nodes) {
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

    return active;
};

/**
 * Render children(s) if route is active
 * @param param0
 * @returns
 */
export const Route = ({ children, name }: RouteParams) => {
    let r = useRouterState();
    let active = r.state ? nodeIsActive(name, r.state.activeNodes) : false;

    return useMemo(() => {
        return active && children ? <React.Fragment>{children}</React.Fragment> : null;
    }, [active, children]);
};

interface RouteStateParams {
    name: string | string[];
    children?: (state: State<any> | null) => JSX.Element;
}

/**
 * Pass RouterState to its children and then render that children, if route is active
 * @param param0
 * @returns
 */
export const RouteState = ({ children, name }: RouteStateParams) => {
    let r = useRouterState();
    let active = r.state ? nodeIsActive(name, r.state.activeNodes) : false;

    return useMemo(() => {
        return active && children ? children(r.state) : null;
    }, [active, children, r.state]);
};
