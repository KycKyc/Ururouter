import React, { ReactNode, useContext, useState, useMemo, useLayoutEffect } from 'react';
import { events } from '../../router/constants';
import type { EventParamsNode } from '../../router/types/events';
import { RouterContext } from '../context';

export const useRouteNode = (nodeName: string) => {
    let router = useContext(RouterContext);
    if (router == null) {
        console.warn("[useRouteNode] Router isn't defined inside context, return null");
        return null;
    }

    // Getting node by it's real name
    let node = router.rootNode.getNodeByName(router.wildcardFormat(nodeName));
    const [, setState] = useState({ id: 0 });
    useLayoutEffect(() => {
        const removeListner = router!.addEventListener(events.ROUTER_RELOAD_NODE, ({ name }: EventParamsNode) => {
            // if `nodeName` was defined as wildcard route, `name` should be wildcard too
            // if node wasn't defined as wildcard, it should be in treeNames
            if (name === nodeName || (node?.treeNames || []).includes(name)) {
                setState((s) => {
                    return { id: (s.id += 1) };
                });
            }
        });

        return removeListner;
    }, [router, nodeName]);

    return node;
};
