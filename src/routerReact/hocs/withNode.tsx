import React, { forwardRef, Ref } from 'react';
import type { Node } from '../../router/node';
import { useRouteNode } from '../hooks/useRouteNode';

export interface NodeProps {
    node: Node<any> | null | undefined;
}

export const withNode =
    (nodeName: string) =>
    <Props extends NodeProps>(Component: React.ComponentType<Props>) => {
        type ComponentInstance = typeof Component;
        type PureProps = Omit<Props, keyof NodeProps>;
        type ForwardedProps = PureProps & {
            forwardedRef: Ref<ComponentInstance>;
        };

        const displayName = Component.displayName || Component.name || 'Component';
        const ComponentWithNode = (props: ForwardedProps) => {
            const { forwardedRef, ...rest } = props;
            const node = useRouteNode(nodeName);
            return <Component node={node} ref={forwardedRef} {...(rest as any)} />;
        };

        ComponentWithNode.displayName = `withNode(${displayName})`;

        function forwardFunction(props: React.PropsWithChildren<PureProps>, ref: React.ForwardedRef<ComponentInstance>) {
            return <ComponentWithNode forwardedRef={ref} {...props} />;
        }

        forwardFunction.displayName = `forwardRef(withNode(${displayName}))`;

        return forwardRef(forwardFunction);
    };
