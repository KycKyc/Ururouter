import { useContext, useState, useLayoutEffect } from 'react';
import { nodeEvents } from '../../router/constants';
import { RouterContext } from '../context';

export const useRouteNode = (nodeName: string) => {
    let router = useContext(RouterContext);
    if (router == null) {
        console.warn("[useRouteNode] Router isn't defined inside context, return null");
    }

    // Getting node by it's real name
    let node = router?.rootNode.getNodeByName(router.wildcardFormat(nodeName)) || null;
    const [, setState] = useState({ id: 0 });
    useLayoutEffect(() => {
        if (node == null) {
            return;
        }

        const removeListner = node.addEventListener(nodeEvents.ROUTER_RELOAD_NODE, () => {
            setState((s) => {
                return { id: (s.id += 1) };
            });
        });

        return removeListner;
    }, [nodeName, node]);

    return node;
};
