import React, { forwardRef, Ref } from 'react';
import type { Node } from '../../router/node';
import type { Router42 } from '../../router/router';
import { useRouter } from '../hooks/useRouter';

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

    function forwardFunction(props: React.PropsWithChildren<PureProps>, ref: React.ForwardedRef<ComponentInstance>) {
        return <ComponentWithNode forwardedRef={ref} {...props} />;
    }

    forwardFunction.displayName = `forwardRef(withRouter(${displayName}))`;

    return forwardRef(forwardFunction);
};
