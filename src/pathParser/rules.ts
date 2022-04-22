export const defaultOrConstrained = (match: string): string => '(' + (match ? match : "[a-zA-Z0-9-_.~%':|=+\\*@$]+") + ')';

export type RegExpFactory = (match: any) => RegExp;

export interface IRule {
    /* The name of the rule */
    type: string;
    /* The regular expression used to find a token in a path definition */
    pattern: RegExp;
    /* The derived regular expression to match a path */
    regex?: RegExp | RegExpFactory;
}

const rules: IRule[] = [
    {
        type: 'url-parameter',
        pattern: /^:([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
        regex: (match: RegExpMatchArray) => new RegExp(defaultOrConstrained(match[3])),
    },
    {
        type: 'url-parameter-splat',
        pattern: /^\*([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/,
        regex: /([^?]*)/,
    },
    {
        type: 'url-parameter-matrix',
        pattern: /^;([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
        regex: (match: RegExpMatchArray) => new RegExp(';' + match[1] + '=' + defaultOrConstrained(match[3])),
    },
    {
        type: 'query-parameter',
        pattern: /^(?:\?|&)(?::)?([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/,
    },
    {
        type: 'delimiter',
        pattern: /^(\/|\?)/,
        regex: (match: RegExpMatchArray) => new RegExp('\\' + match[0]),
    },
    {
        type: 'sub-delimiter',
        pattern: /^(!|&|-|_|\.|;)/,
        regex: (match: RegExpMatchArray) => new RegExp(match[0]),
    },
    {
        type: 'fragment',
        pattern: /^([0-9a-zA-Z]+)/,
        regex: (match: RegExpMatchArray) => new RegExp(match[0]),
    },
];

export default rules;
