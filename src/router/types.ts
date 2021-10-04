import { errorCodes, events } from './constants';

type Diff<T, From> = T extends From ? never : T;

export type DefaultEventNames = typeof events[keyof typeof events];
export type DefaultErrorCodes = typeof errorCodes[keyof typeof errorCodes];
export type SupplementErrorCodes<Errors = never> = Diff<Errors, DefaultErrorCodes> | DefaultErrorCodes;
export type SupplementEventNames<Events = never> = Diff<Events, DefaultEventNames> | DefaultEventNames; // EventNames = DefaultEventNames | string
