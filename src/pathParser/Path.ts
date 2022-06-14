import { parse, stringify } from 'query-string';
import type { ParseOptions } from 'query-string';

import type { URLParamsEncodingType } from '../types/common';
import { decodeParam, encodeParam } from './encoding';
import { defaultOrConstrained } from './rules';
import tokenise, { Token } from './tokeniser';

const exists = (val: any) => val !== undefined && val !== null;

export const splitPath = (path: string): [string, string, string | null] => {
    let [remaining, anchor] = path.split('#', 2);
    let [base, search] = remaining.split('?', 2);
    return [base, search || '', anchor || null];
};

const upToDelimiter = (source: string) => {
    return /(\/)$/.test(source) ? source : source + '(?:\\/|\\?|\\.|;|$)';
};

const appendQueryParam = (params: Record<string, any>, param: string, val: any = '') => {
    const existingVal = params[param];

    if (existingVal === undefined) {
        params[param] = val;
    } else {
        // TODO: use cases? tests?
        params[param] = Array.isArray(existingVal) ? existingVal.concat(val) : [existingVal, val];
    }

    return params;
};

export interface PathOptions {
    queryParamOptions: ParseOptions;
    urlParamsEncoding: URLParamsEncodingType;
}

export interface PathTestOptions {
    caseSensitive?: boolean;
    strictTrailingSlash?: boolean;
    strictQueryParams?: boolean;
}

export interface PathBuildOptions {
    ignoreConstraints?: boolean;
    ignoreSearch?: boolean;
}

export interface ParseResult {
    match: {
        path: string;
        urlParams: Record<string, any>;
        queryParams: Record<string, any>;
    };
    remains: {
        path: string;
        queryParams: Record<string, any>;
    };
}

export interface BuildResult {
    base: string;
    query: string;
    remainingParams: Record<string, any>;
}

export class Path<T extends Record<string, any> = Record<string, any>> {
    public static createPath<T extends Record<string, any> = Record<string, any>>(path: string, options?: PathOptions) {
        return new Path<T>(path, options);
    }

    public path: string;
    public tokens: Token[];
    public hasUrlParams: boolean;
    public hasSpatParam: boolean;
    public hasMatrixParams: boolean;
    public hasQueryParams: boolean;
    public spatParams: string[];
    public urlParams: string[];
    public queryParams: string[];
    public source: string;
    public trailingSlash: boolean;
    public options: PathOptions = {
        urlParamsEncoding: 'default',
        queryParamOptions: {
            sort: false,
        },
    };

    // TODO: We do not need this annymore?
    private lockOptions = false;

    // remove trailing slash of a path
    // 'keke/'.replace(/(.+)\/$/, '$1')
    // 'keke/?ololo=1'.replace(/(.+)\/\?/, '$1?')
    // Or maybe just split it

    constructor(path: string, options?: Partial<PathOptions>) {
        if (!path) {
            throw new Error('Missing path in Path constructor');
        }

        let query: string = '';
        let haveQueryRex = /\?(:?[A-Za-z0-9_:&]+$)/;
        if (path.match(haveQueryRex)) {
            [path, query] = path.split(haveQueryRex, 2);
        }

        // Detect trailling slash, remember it and remove from the path to simplify parsing
        this.trailingSlash = false;
        if (path.match(/(.*)\/$/)) {
            path = path.replace(/(.+)\/$/, '$1');
            this.trailingSlash = true;
        }

        if (!path.match(/^\//)) {
            console.warn(`Path should have leading slash, i transformed it for you: '/${path}'`);
            path = '/' + path;
        }

        // Parsing query params requirements
        this.queryParams = query.split('&').filter((val) => val.length > 0);
        this.hasQueryParams = query.length > 0;

        // Parsing path and params inside it
        this.path = path;
        this.tokens = tokenise(path);

        this.hasUrlParams = this.tokens.filter((t) => /^url-parameter/.test(t.type)).length > 0;
        this.hasSpatParam = this.tokens.filter((t) => /splat$/.test(t.type)).length > 0;
        this.hasMatrixParams = this.tokens.filter((t) => /matrix$/.test(t.type)).length > 0;

        // Extract named parameters from tokens
        this.spatParams = this.getParams('url-parameter-splat');
        this.urlParams = this.getParams(/^url-parameter/); // Will include spat-params as well

        // Regular expressions to match given url (without querryParams)
        this.source = this.tokens.map((token) => token.regex!.source).join('');

        // Defining Options
        if (options !== undefined) {
            this.updateOptions(options);
            this.lockOptions = true;
        }
    }

    public updateOptions(options: Partial<PathOptions>, force: boolean = false) {
        if (this.lockOptions && !force) return;
        this.options = { ...this.options, ...options, ...{ queryParamOptions: { ...this.options.queryParamOptions, ...options.queryParamOptions } } };
    }

    public isQueryParam(name: string): boolean {
        return this.queryParams.indexOf(name) !== -1;
    }

    public isSpatParam(name: string): boolean {
        return this.spatParams.indexOf(name) !== -1;
    }

    public strictParse(
        path: string,
        { caseSensitive = false, strictTrailingSlash = false, strictQueryParams = false }: PathTestOptions = {}
    ): ParseResult | null {
        const result = this.parse(path, { caseSensitive });

        // Not even a partial match
        if (result == null) return null;

        // Matched but there is still some remains left in the path
        if (result.remains.path !== '/' && result.remains.path.length > 0) {
            return null;
        }

        // If trailing slash is strictly defined
        if (strictTrailingSlash && ((result.remains.path === '/' && !this.trailingSlash) || (result.remains.path === '' && this.trailingSlash))) {
            return null;
        }

        // If some excessive querry params left and we do not want this, bail
        if (strictQueryParams && Object.keys(result.remains.queryParams).length > 0) {
            return null;
        }

        return result;
    }

    public parse(path: string, { caseSensitive = false }: Pick<PathTestOptions, 'caseSensitive'> = {}): ParseResult | null {
        let query: string;
        [path, query] = splitPath(path);

        // Check if partial match (start of given path matches regex)
        const result = this.urlTest(path, upToDelimiter(this.source), caseSensitive);

        if (result == null) {
            return null;
        }

        // if (!this.hasQueryParams) {
        //     return result;
        // }

        const queryParams = parse(query, this.options.queryParamOptions);
        for (let param of Object.keys(queryParams)) {
            if (this.isQueryParam(param)) {
                appendQueryParam(result.match.queryParams, param, queryParams[param]);
            } else {
                appendQueryParam(result.remains.queryParams, param, queryParams[param]);
            }
        }

        return result;
    }

    public preBuild(params: T = {} as T, { ignoreConstraints = false, ignoreSearch = false }: PathBuildOptions = {}): BuildResult {
        let remainingParams = { ...params };
        const encodedUrlParams = Object.keys(params)
            .filter((p) => !this.isQueryParam(p))
            .reduce<Record<string, any>>((acc, key) => {
                if (!exists(params[key])) {
                    return acc;
                }

                const val = params[key];
                const isSpatParam = this.isSpatParam(key);

                if (typeof val === 'boolean') {
                    acc[key] = val;
                } else if (Array.isArray(val)) {
                    // TODO: use cases? tests?
                    acc[key] = val.map((v) => encodeParam(v, this.options.urlParamsEncoding, isSpatParam));
                } else {
                    acc[key] = encodeParam(val, this.options.urlParamsEncoding, isSpatParam);
                }

                return acc;
            }, {});

        // Check all params are provided (not search parameters which are optional)
        if (this.urlParams.some((p) => !exists(params[p]))) {
            const missingParameters = this.urlParams.filter((p) => !exists(params[p]));
            throw new Error("Cannot build path: '" + this.path + "' requires missing parameters { " + missingParameters.join(', ') + ' }');
        }

        // Check constraints
        if (!ignoreConstraints) {
            const constraintsPassed = this.tokens
                .filter((t) => /^url-parameter/.test(t.type) && !/-splat$/.test(t.type))
                .every((t) => {
                    // console.debug(RegExp('^' + defaultOrConstrained(t.constrain[1]) + '$'));
                    // console.debug(encodedUrlParams[t.paramName]);
                    return new RegExp('^' + defaultOrConstrained(t.constrain[1]) + '$').test(encodedUrlParams[t.paramName]);
                });

            if (!constraintsPassed) {
                throw new Error(`Some parameters of '${this.path}' are of invalid format`);
            }
        }

        let base = this.tokens
            .map((token, i, a) => {
                if (token.type === 'url-parameter-matrix') {
                    delete remainingParams[token.paramName];
                    return `;${token.paramName}=${encodedUrlParams[token.paramName]}`;
                }

                if (/^url-parameter/.test(token.type)) {
                    delete remainingParams[token.paramName];
                    return encodedUrlParams[token.paramName];
                }

                return token.match;
            })
            .join('');

        if (this.trailingSlash) {
            base += '/';
        }

        if (ignoreSearch) {
            return {
                base,
                query: '',
                remainingParams,
            };
        }

        const searchParams = this.queryParams
            .filter((p) => Object.keys(params).indexOf(p) !== -1)
            .reduce<Record<string, any>>((sparams, paramName) => {
                delete remainingParams[paramName];
                sparams[paramName] = params[paramName];
                return sparams;
            }, {});

        const searchPart = stringify(searchParams, this.options.queryParamOptions);

        return {
            base,
            query: searchPart,
            remainingParams,
        };
    }

    public build(params: T = {} as T, options: PathBuildOptions = {}): string {
        let result = this.preBuild(params, options);
        return result.query ? result.base + '?' + result.query : result.base;
    }

    private getParams(type: string | RegExp): string[] {
        const predicate = type instanceof RegExp ? (t: Token) => type.test(t.type) : (t: Token) => t.type === type;

        return this.tokens.filter(predicate).map((t) => t.paramName);
    }

    private urlTest(path: string, source: string, caseSensitive: boolean): ParseResult | null {
        // TODO: merge wiith this.parse
        const regex = new RegExp('^' + source, caseSensitive ? '' : 'i');
        const match = path.match(regex);

        if (!match) {
            return null;
        }

        let matchBase = match[0].replace(/\/$/, '');

        if (!this.urlParams.length) {
            return {
                match: {
                    path: matchBase,
                    urlParams: {},
                    queryParams: {},
                },
                remains: {
                    path: path.replace(matchBase, ''),
                    queryParams: {},
                },
            };
        }

        // Reduce named params to key-value pairs
        let matchUrlParams = match.slice(1).reduce<Record<string, any>>((params, m, i) => {
            params[this.urlParams[i]] = decodeParam(m, this.options.urlParamsEncoding);
            return params;
        }, {});

        // console.debug(matchUrlParams);

        return {
            match: {
                path: matchBase,
                urlParams: matchUrlParams,
                queryParams: {},
            },
            remains: {
                path: path.replace(matchBase, ''),
                queryParams: {},
            },
        };
    }
}

export default Path;
