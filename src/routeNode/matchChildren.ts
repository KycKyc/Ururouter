import { TestMatch } from 'pathParser';
import { omit, parse } from 'search-params';
import type { Anchor, Params, TrailingSlashMode } from '../types/common';
import { MatchOptions, RouteNode } from './RouteNode';

export interface MatchResponse {
    nodes: RouteNode[];
    params: Params;
    anchor: Anchor;
}

const splitPath = (path: string): [string, string, string | null] => {
    let [remaining, anchor] = path.split('#', 2);
    let [purePath, search] = remaining.split('?', 2);
    return [purePath, search || '', anchor || null];
};

const matchChildren = (nodes: Map<string, RouteNode>, path: string, options: MatchOptions = {}) => {
    const { queryParamsMode = 'default', strictTrailingSlash = false, caseSensitive = false } = options;
    const currentMatch: MatchResponse = {
        nodes: [],
        params: {},
        anchor: null,
    };

    let search: string;
    [path, search, currentMatch.anchor] = splitPath(path);

    let processNextNodes = true;
    let consumed: string | undefined;
    while (processNextNodes) {
        processNextNodes = false;
        for (let node of nodes.values()) {
            let match: TestMatch | null = null;
            let noChildren = node.nameMap.size === 0;
            let trailingSlashMode: TrailingSlashMode = noChildren ? (strictTrailingSlash ? 'default' : 'never') : 'default';
            if (consumed === '/') {
                if (node.path[0] === '/' && path[0] !== '/') {
                    path = '/' + path;
                } else if (node.path[0] !== '/' && path[0] === '/') {
                    path = path.slice(1);
                }
            }

            // Partially match remaining path segment
            match = node.parser!.partialTest(search ? `${path}?${search}` : path, {
                caseSensitive,
                queryParamFormats: options.queryParamFormats,
                urlParamsEncoding: options.urlParamsEncoding,
                strictTrailingSlash,
            });

            if (match == null) continue;

            // Save our matched node and params
            currentMatch.nodes.push(node);
            Object.keys(match).forEach((param) => (currentMatch.params[param] = match![param]));

            // Getting consumed segment from a path
            consumed = node.parser!.build(match, {
                ignoreSearch: true,
                urlParamsEncoding: options.urlParamsEncoding,
                trailingSlashMode,
            });

            // remove consumed segment from a path
            // Remove url-query params owned by this node from the remaining path, all is left will be placed in the `querystring` variable.
            path = path.slice(consumed.length);
            search = omit(search, node.parser!.queryParams, options.queryParamFormats).querystring;

            if (!strictTrailingSlash && path === '/' && !/\/$/.test(consumed)) {
                path = '';
            }

            if (!strictTrailingSlash && !noChildren && path === '') {
                path = '/';
            }

            // Fully matched, withdraw
            if (!path.length && !search.length) {
                return currentMatch;
            }

            // Path is matched, search params are not,
            // non strict mode and some unmatched queryParams is left, save them into a match object, then withdraw
            if (queryParamsMode !== 'strict' && path.length === 0 && search.length !== 0) {
                const remainingQueryParams = parse(search, options.queryParamFormats) as any;

                Object.keys(remainingQueryParams).forEach((name) => (currentMatch.params[name] = remainingQueryParams[name]));

                return currentMatch;
            }
            /////

            nodes = node.nameMap;
            processNextNodes = true;
            break;
        }
    }

    return null;
};

export default matchChildren;
