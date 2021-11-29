import React, { ReactNode, useLayoutEffect, useState } from 'react';
import { events } from '../router/constants';
import { Node } from '../router/node';
import { Router42, State } from '../router/router';
import type { EventParamsNavigation } from '../router/types/events';
import { RouterStateContext, RouterContext } from './context';

type Props = { children: ReactNode; router: Router42<any> };

export const RouterProvider = ({ children, router }: Props) => {
    const [state, setState] = useState<{ state: State<Node<any>> | null }>({ state: router.state });
    useLayoutEffect(() => {
        const removeListner = router.addEventListener(events.TRANSITION_SUCCESS, ({ toState }: EventParamsNavigation<Node<any>>) => {
            setState({ state: toState });
        });

        return removeListner;
    }, [router]);

    return (
        <RouterContext.Provider value={router}>
            <RouterStateContext.Provider value={{ router: router, state: state.state }}>{children}</RouterStateContext.Provider>
        </RouterContext.Provider>
    );
};
