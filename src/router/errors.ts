import { Params, Anchor } from 'types/base';
import { errorCodes, events } from './constants';
import { DefaultErrorCodes, EventNames, ErrorCodes } from './types';

export class RouterError extends Error {
    code: DefaultErrorCodes;
    args?: any[];
    constructor(code: DefaultErrorCodes, message?: string, ...args: any[]) {
        super(message);
        this.name = 'RouterError';
        this.code = code;

        if (args) {
            this.args = args;
        }
    }
}

type NavErrParams<CustomErrorCodes = never, CustomEventNames = never> = {
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
    constructor({ code, triggerEvent, message, redirect, ...args }: NavErrParams<CustomErrorCodes, CustomEventNames>) {
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

export class Redirect extends NavigationError<string, string> {
    constructor({ to, params, anchor = null, ...args }: { to: string; params: Params; anchor?: Anchor }) {
        super({
            code: errorCodes.TRANSITION_REDIRECTED,
            triggerEvent: events.TRANSITION_REDIRECTED,
            redirect: { to, params, anchor },
            ...args,
        });
    }
}
