import { TestMatch } from 'pathParser';
import { omit, parse } from 'search-params';
import type { Anchor, Params } from '../types/common';
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
    const { queryParamsMode = 'default', caseSensitive = false } = options;
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
            let haveChildrens = node.nameMap.size !== 0;
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
            });

            if (match == null) continue;

            // Save our matched node and params
            currentMatch.nodes.push(node);
            Object.keys(match).forEach((param) => (currentMatch.params[param] = match![param]));

            // Getting consumed segment from a path
            consumed = node.parser!.build(match, {
                ignoreSearch: true,
                urlParamsEncoding: options.urlParamsEncoding,
                // Probably shouldn't matter, user should have correct paths in a node tree, that means no trailing slashes for node with children (TODO: force it ?)
                trailingSlashMode: haveChildrens ? 'default' : 'never',
            });

            // remove consumed segment from a path
            // Remove url-query params owned by this node from the remaining path, all is left will be placed in the `querystring` variable.
            path = path.slice(consumed.length);
            search = omit(search, node.parser!.queryParams, options.queryParamFormats).querystring;

            if (path === '/' && !/\/$/.test(consumed)) {
                // 'path is `/` and consumed part didn't had `/` at the end, that means it's final node, just path had trailing slash'
                path = '';
            }

            if (haveChildrens && path === '') {
                // have childrens, but path is ``, assign `/` back to iterate through childrens and find {name:`...index`, path: '/'} children
                path = '/';
            }

            // console.debug('remaining path: ', path);
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
