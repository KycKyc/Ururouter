import { NavigationOptions, State } from 'router/router';

// Params
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

export type EventParamsNode = {
    name: string;
};

// Callbacks
export type EventCallbackNavigation<NodeClass> = (params: EventParamsNavigation<NodeClass>) => void;
export type EventCallbackNode = (params: EventParamsNode) => void;
