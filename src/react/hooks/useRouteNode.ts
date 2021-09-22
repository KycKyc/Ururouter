import React, { ReactNode, useContext, useState, useMemo, useLayoutEffect } from 'react';
import { events } from 'router/constants';
import { RouterContext } from '../context';

export const useRouteNode = (nodeName: string) => {
    let router = useContext(RouterContext);
    let node = router?.rootNode.getNodeByName(nodeName);
    const [, setState] = useState({ id: 0 });
    useLayoutEffect(() => {
        const removeListner = router!.addEventListener(events.ROUTER_RELOAD_NODE, ({ name }) => {
            if (name === nodeName) {
                setState((s) => {
                    return { id: (s.id += 1) };
                });
            }
        });

        return removeListner;
    }, [router, nodeName]);

    return node;
};
