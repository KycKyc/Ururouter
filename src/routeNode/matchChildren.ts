import type { ParseResult } from 'pathParser';
import { stringifyUrl, parseUrl } from 'query-string';
import type { Anchor, Params } from '../types/common';
import { MatchOptions, RouteNode } from './RouteNode';

export interface MatchResponse {
    nodes: RouteNode[];
    params: Params;
    anchor: Anchor;
}

const matchChildren = (nodes: Map<string, RouteNode>, path: string, options: MatchOptions = {}) => {
    const { queryParamsMode = 'default', caseSensitive = false } = options;
    const currentMatch: MatchResponse = {
        nodes: [],
        params: {},
        anchor: null,
    };

    [path, currentMatch.anchor = null] = path.split('#', 2);
    let defaultQueryOptions = {};

    let processNextNodes = true;
    while (processNextNodes) {
        processNextNodes = false;
        for (let node of nodes.values()) {
            let result: ParseResult | null = null;
            let haveChildrens = node.nameMap.size !== 0;

            // Parse path segment
            result = node.parser!.parse(path, { caseSensitive });
            // console.debug(result);

            if (result == null) continue;

            // Save our matched node and params
            currentMatch.nodes.push(node);
            currentMatch.params = { ...currentMatch.params, ...result.match.urlParams };

            // New path is waht was left after parsing
            let basePath = result.remains.path;

            if (haveChildrens && basePath === '') {
                // have childrens, but path is ``, assign `/` back to iterate through childrens and find {name:`...index`, path: '/'} children
                basePath = '/';
            }

            if (!haveChildrens && basePath === '/') {
                basePath = '';
            }

            // Rebuilding path
            if (Object.keys(result.remains.queryParams).length > 0) {
                path = stringifyUrl({ url: basePath, query: result.remains.queryParams }, node.pathOptions?.queryParamOptions);
            } else {
                path = basePath;
            }

            // Saving queryPrams that was parsed by this node
            for (let paramName in result.match.queryParams) {
                currentMatch.params[paramName] = result.match.queryParams[paramName];
            }

            if (basePath.length === 0) {
                // Process params that were left intact
                if (queryParamsMode !== 'strict') {
                    let queryRemains = parseUrl(path, defaultQueryOptions).query;
                    for (let paramName in queryRemains) {
                        if (paramName in currentMatch.params) continue;
                        currentMatch.params[paramName] = queryRemains[paramName];
                    }
                }

                return currentMatch;
            }

            nodes = node.nameMap;
            processNextNodes = true;
            break;
        }
    }

    return null;
};

export default matchChildren;
