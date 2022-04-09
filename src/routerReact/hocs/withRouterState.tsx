import React, { forwardRef, Ref } from 'react';
import type { Node } from '../../router/node';
import type { Router42, State } from '../../router/router';
import { useRouterState } from '../hooks/useRouterState';

export interface RouterStateProps {
    state: State<Node<any>> | null;
    router: Router42<any> | null;
}

export const withRouterState = <Props extends RouterStateProps>(Component: React.ComponentType<Props>) => {
    type ComponentInstance = typeof Component;
    type PureProps = Omit<Props, keyof RouterStateProps>;
    type ForwardedProps = PureProps & {
        forwardedRef: Ref<ComponentInstance>;
    };

    const displayName = Component.displayName || Component.name || 'Component';
    const ComponentWithNode = (props: ForwardedProps) => {
        const { forwardedRef, ...rest } = props;
        const { router, state } = useRouterState();
        return <Component router={router} state={state} ref={forwardedRef} {...(rest as any)} />;
    };

    ComponentWithNode.displayName = `withRouterState(${displayName})`;

    function forwardFunction(props: React.PropsWithChildren<PureProps>, ref: React.ForwardedRef<ComponentInstance>) {
        return <ComponentWithNode forwardedRef={ref} {...props} />;
    }

    forwardFunction.displayName = `forwardRef(withRouterState(${displayName}))`;

    return forwardRef(forwardFunction);
};
