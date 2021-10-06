import React, { forwardRef, Ref } from 'react';
import { useRouteNode } from 'react/hooks/useRouteNode';
import { Node } from 'router/node';

interface InjectedProps {
    node: Node<any> | null | undefined;
}

export const withNode =
    (nodeName: string) =>
    <Props extends InjectedProps>(Component: React.ComponentType<Props>) => {
        type ComponentInstance = typeof Component;
        type PureProps = Omit<Props, keyof InjectedProps>;
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
        return forwardRef<ComponentInstance, PureProps>((props, ref) => <ComponentWithNode forwardedRef={ref} {...props} />);
    };
