import { useEffect } from 'react';
import { useRouterState } from './hooks/useRouterState';

/**
 * is node with given name active?
 * @param name - looking for this name
 * @param names - list of known node names
 * @returns
 */
export const isNodeActive = (name: string, names: string[]): boolean => {
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
