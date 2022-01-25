import type { NavigationOptions, State } from '../router';

//
// Navigation events
//

export type EventParamsNavigation<NodeClass> = {
    fromState: State<NodeClass> | null;
    toState: State<NodeClass>;
    nodes: {
        toDeactivate: NodeClass[];
        toActivate: NodeClass[];
        intersection: NodeClass[];
    };

    options: NavigationOptions;
    error?: any;
};

export type EventCallbackNavigation<NodeClass> = (params: EventParamsNavigation<NodeClass>) => void;

//
// Node events
//

/**
 * We do not have any particulare use of params in context of Node events\
 * but this may be usefull in the future
 */
export type EventParamsNode = {
    [key: string]: any;
};

export type EventCallbackNode = (params?: EventParamsNode) => void;
