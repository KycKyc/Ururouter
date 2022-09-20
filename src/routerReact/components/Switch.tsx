import React from 'react';
import { isNodeActive } from '../helpers';
import { useRouterState } from '../hooks/useRouterState';

interface Props {
    children: React.ReactNode;
}

export const Switch = ({ children }: Props) => {
    let r = useRouterState();
    if (r.state === null) return null;

    let active = false;
    let element: React.ReactElement;
    React.Children.forEach(children, (child) => {
        if (active === false && React.isValidElement(child)) {
            let name = child.props.name;

            active = r.state ? isNodeActive(name, r.state.activeNodes) : false;
            if (active) {
                element = child;
                return;
            }
        }
    });

    return active ? React.cloneElement(element!, { __active: true }) : null;
};
