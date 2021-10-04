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
export type EventCallback<NodeClass> = (params: EventParamsNavigation<NodeClass>) => void;
export type EventCallbackNode = (params: EventParamsNode) => void;


let a: EventParamsNode | EventParamsNavigation<any> | undefined
a = {name: '1'}

const fn = (params?: EventParamsNode | EventParamsNavigation<any>) =>{
    console.debug(params)
}

fn({name: '1'})