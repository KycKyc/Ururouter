import type { Params, Anchor } from '../types/common';
import { errorCodes, events } from './constants';
import type { DefaultErrorCodes, EventNames, ErrorCodes } from './types/base';

export class RouterError extends Error {
    code: DefaultErrorCodes;
    args?: any[];
    /**
     * General router error
     * @param code - Error code
     * @param message - error message to display
     * @param args - additional arguments
     */
    constructor(code: DefaultErrorCodes, message?: string, ...args: any[]) {
        super(message);
        this.name = 'RouterError';
        this.code = code;

        if (args) {
            this.args = args;
        }
    }
}

type NavigationErrorParams<CustomErrorCodes = never, CustomEventNames = never> = {
    code: ErrorCodes<CustomErrorCodes>;
    triggerEvent?: EventNames<CustomEventNames>;
    message?: string;
    redirect?: { to: string; params: Params; anchor: Anchor };
    [key: string]: any;
};

export class NavigationError<CustomErrorCodes, CustomEventNames> extends Error {
    code: ErrorCodes<CustomErrorCodes>;
    triggerEvent?: EventNames<CustomEventNames>;
    redirect?: { to: string; params: Params; anchor: Anchor };
    args?: { [key: string]: any };
    /**
     *
     * @param param0
     */
    constructor({ code, triggerEvent, message, redirect, ...args }: NavigationErrorParams<CustomErrorCodes, CustomEventNames>) {
        super(message);
        this.name = 'NavigationError';
        this.code = code;
        this.triggerEvent = triggerEvent;
        if (redirect) {
            this.redirect = redirect;
        }

        if (args) {
            this.args = args;
        }
    }
}

type RedirectParams = {
    to: string;
    params: Params;
    anchor?: Anchor;
};

export class Redirect extends NavigationError<string, string> {
    /**
     *
     * @param param0
     */
    constructor({ to, params, anchor = null, ...args }: RedirectParams) {
        super({
            code: errorCodes.TRANSITION_REDIRECTED,
            triggerEvent: events.TRANSITION_REDIRECTED,
            redirect: { to, params, anchor },
            ...args,
        });
    }
}
