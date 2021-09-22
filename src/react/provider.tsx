import React, { ReactNode, useLayoutEffect, useState } from 'react';
import { events } from 'router/constants';
import { Router42, State } from 'router/router';
import { RouterStateContext, RouterContext } from './context';

type Props = { children: ReactNode; router: Router42<any, any, any, any> };

export const RouterProvider = ({ children, router }: Props) => {
    const [state, setState] = useState<{ state: State | null; activeNodes: any[] }>({ state: router.state, activeNodes: [] });
    useLayoutEffect(() => {
        const removeListner = router.addEventListener(events.TRANSITION_SUCCESS, ({ toState, nodes }) => {
            setState({ state: toState, activeNodes: nodes.intersection.concat(nodes.toActivate) });
        });

        return removeListner;
    }, [router]);

    return (
        <RouterContext.Provider value={router}>
            <RouterStateContext.Provider value={{ router: router, state: state.state, activeNodes: state.activeNodes }}>{children}</RouterStateContext.Provider>
        </RouterContext.Provider>
    );
};
