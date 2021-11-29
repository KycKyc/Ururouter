import { errorCodes, events, nodeEvents } from './constants';

type Diff<T, From> = T extends From ? never : T;

export type DefaultEventNames = typeof events[keyof typeof events];
export type NodeDefaultEventNames = typeof nodeEvents[keyof typeof nodeEvents];
export type DefaultErrorCodes = typeof errorCodes[keyof typeof errorCodes];
export type ErrorCodes<Errors = never> = Diff<Errors, DefaultErrorCodes> | DefaultErrorCodes;
export type EventNames<Events = never> = Diff<Events, DefaultEventNames> | DefaultEventNames;
