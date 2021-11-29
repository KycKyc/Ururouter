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

// We do not use it anywhere right now.
// reserved for future use, probably
export type NodeEventParams = {
    [key: string]: any;
};

// Callbacks
export type EventCallbackNavigation<NodeClass> = (params: EventParamsNavigation<NodeClass>) => void;
export type NodeEventCallback = (params?: NodeEventParams) => void;
