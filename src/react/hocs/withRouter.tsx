import React, { forwardRef, Ref } from 'react';
import { useRouter } from 'react/hooks/useRouter';
import { Node } from 'router/node';
import { Router42 } from 'router/router';

interface InjectedProps {
    router: Router42<any, Node<any>> | null;
}

export const withRouter = <Props extends InjectedProps>(Component: React.ComponentType<Props>) => {
    type ComponentInstance = typeof Component;
    type PureProps = Omit<Props, keyof InjectedProps>;
    type ForwardedProps = PureProps & {
        forwardedRef: Ref<ComponentInstance>;
    };

    const displayName = Component.displayName || Component.name || 'Component';
    const ComponentWithNode = (props: ForwardedProps) => {
        const { forwardedRef, ...rest } = props;
        const router = useRouter();
        return <Component router={router} ref={forwardedRef} {...(rest as any)} />;
    };

    ComponentWithNode.displayName = `withRouter(${displayName})`;
    return forwardRef<ComponentInstance, PureProps>((props, ref) => <ComponentWithNode forwardedRef={ref} {...props} />);
};
