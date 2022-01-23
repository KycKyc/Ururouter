import type { Diff } from 'types/helpers';
import { errorCodes, events, nodeEvents } from '../constants';

export type DefaultErrorCodes = typeof errorCodes[keyof typeof errorCodes];
export type ErrorCodes<Errors = never> = Diff<Errors, DefaultErrorCodes> | DefaultErrorCodes;

export type DefaultEventNames = typeof events[keyof typeof events];
export type NodeDefaultEventNames = typeof nodeEvents[keyof typeof nodeEvents];
export type EventNames<Events = never> = Diff<Events, DefaultEventNames> | DefaultEventNames;
