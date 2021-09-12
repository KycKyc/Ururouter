export const errorCodes = {
    ROUTER_NOT_STARTED: 'NOT_STARTED',
    ROUTER_INCORRECT_CONFIGS: 'INCORRECT_CONFIGS',
    ROUTER_ALREADY_STARTED: 'ALREADY_STARTED',
    ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
    SAME_STATES: 'SAME_STATES',
    TRANSITION_UNKNOWN_ERROR: 'TRANSITION_UNKNOWN_ERROR',
    TRANSITION_CANCELLED: 'TRANSITION_CANCELLED',
    TRANSITION_REDIRECTED: 'TRANSITION_REDIRECTED',
} as const;

export const events = {
    ROUTER_START: '@@event/start',
    ROUTER_STOP: '@@event/stop',
    TRANSITION_START: '@@event/transition/start',
    TRANSITION_SUCCESS: '@@event/transition/success',
    TRANSITION_CANCELED: '@@event/transition/canceled',
    TRANSITION_UNKNOWN_ERROR: '@@event/transition/unknown_error',
    ROUTER_RELOAD_NODE: '@@event/node/reload',
} as const;
