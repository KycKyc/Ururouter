import React from 'react';
import { useRouteNode } from '../hooks/useRouteNode';

interface Params {
    node: string;
    component: string;
    children?: React.ReactNode;
}

/**
 * Extract and render React component from RouteNode
 */
export const NodeComponent = ({ node, component, children }: Params) => {
    const routeNode = useRouteNode(node);
    const Component = routeNode?.components[component];

    if (Component === undefined) {
        return null;
    }

    return <Component>{children}</Component>;
};
