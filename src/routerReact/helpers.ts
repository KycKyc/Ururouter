import { useEffect } from 'react';
import type { Node } from '../router/node';
import { useRouterState } from './hooks/useRouterState';

/**
 * determione if name is present inside array of names
 * @param name - looking for this name
 * @param names - list of known node names
 * @returns
 */
export const checkNames = (name: string, names: string[]): boolean => {
    if (name.indexOf('*') === -1) {
        return names.indexOf(name) !== -1;
    }

    let compareTo = name.split('.');
    for (let treeName of names) {
        let compareWith = treeName.split('.');
        let active = compareTo.every((part, index) => {
            if (part === '*' && compareWith[index] !== undefined) {
                return true;
            }

            return part === compareWith[index];
        });

        if (active) return true;
    }

    return false;
};

/**
 * Helper fucntion.
 * Finds out whether a node with the given name is currently active across given nodes, or not.
 * @param name name of the node to check
 * @param nodes list of currently active nodes
 * @returns
 */
export const isNodeActive = (name: string | string[], nodes: Node<any>[]) => {
    let active = false;
    for (let node of nodes) {
        if (Array.isArray(name)) {
            for (let _n of name) {
                active = checkNames(_n, node.treeNames);
                if (active) break;
            }
        } else {
            active = checkNames(name, node.treeNames);
        }

        if (active) break;
    }

    return active;
};

/**
 * Scroll to anchor (http://site.com/path#anchor)
 * Where `anchor` is id of some element on a page
 * @param elementId
 * @returns
 */
export const scrollIntoView = (elementId: string | undefined | null) => {
    if (elementId === undefined || elementId === null) return;
    const element = document.getElementById(elementId);
    element?.scrollIntoView();
};

/**
 * React hook, scroll to route anchor (http://site.com/path#anchor)
 * Where `anchor` is id of some element on a page
 */
export const useScrollIntoView = () => {
    const state = useRouterState();

    useEffect(() => {
        scrollIntoView(state.state?.anchor);
    }, [state.state]);

    return state.state?.anchor;
};
