import { build } from 'search-params';
import { BuildOptions, MatchResponse, RouteNode, RouteNodeState, RouteNodeStateMeta } from './RouteNode';

export const getMetaFromNodes = (nodes: RouteNode[]): RouteNodeStateMeta => {
    let accName = '';

    return nodes.reduce<RouteNodeStateMeta>((meta, node) => {
        const urlParams =
            node.parser?.urlParams.reduce<Record<string, any>>((params, p) => {
                params[p] = 'url';
                return params;
            }, {}) ?? {};

        const allParams =
            node.parser?.queryParams.reduce<Record<string, any>>((params, p) => {
                params[p] = 'query';
                return params;
            }, urlParams) ?? {};

        if (node.name !== undefined) {
            accName = accName ? accName + '.' + node.name : node.name;
            meta[accName] = allParams;
        }

        return meta;
    }, {});
};

export const buildStateFromMatch = (match: MatchResponse): RouteNodeState | null => {
    if (!match || !match.nodes || !match.nodes.length) {
        return null;
    }

    const name = match.nodes
        .map((nade) => nade.name)
        .filter((name) => name)
        .join('.');

    const params = match.params;

    return {
        name,
        params,
        meta: getMetaFromNodes(match.nodes),
    };
};

export const buildPathFromNodes = (nodes: RouteNode[], params: Record<string, any> = {}, options: BuildOptions = {}) => {
    const { queryParamsMode = 'default', trailingSlashMode = 'default' } = options;
    const searchParams: string[] = [];
    const nonSearchParams: string[] = [];

    for (const node of nodes) {
        const { parser } = node;

        if (parser) {
            searchParams.push(...parser.queryParams);
            nonSearchParams.push(...parser.urlParams);
            nonSearchParams.push(...parser.spatParams);
        }
    }

    if (queryParamsMode === 'loose') {
        const extraParams = Object.keys(params).reduce<string[]>(
            (acc, p) => (searchParams.indexOf(p) === -1 && nonSearchParams.indexOf(p) === -1 ? acc.concat(p) : acc),
            []
        );

        searchParams.push(...extraParams);
    }

    const searchParamsObject = searchParams.reduce<Record<string, any>>((acc, paramName) => {
        if (Object.keys(params).indexOf(paramName) !== -1) {
            acc[paramName] = params[paramName];
        }

        return acc;
    }, {});

    const searchPart = build(searchParamsObject, options.queryParams);

    const path = nodes
        .reduce<string>((path, node) => {
            const nodePath =
                node.parser?.build(params, {
                    ignoreSearch: true,
                    queryParams: options.queryParams,
                    urlParamsEncoding: options.urlParamsEncoding,
                }) ?? '';

            return node.absolute ? nodePath : path + nodePath;
        }, '')
        // remove repeated slashes
        .replace(/\/\/{1,}/g, '/');

    let finalPath = path;

    if (trailingSlashMode === 'always') {
        finalPath = /\/$/.test(path) ? path : `${path}/`;
    } else if (trailingSlashMode === 'never' && path !== '/') {
        finalPath = /\/$/.test(path) ? path.slice(0, -1) : path;
    }

    return finalPath + (searchPart ? '?' + searchPart : '');
};

export const getPathFromNodes = (nodes: RouteNode[]): string | null => (nodes ? nodes.map((node) => node.path).join('') : null);

export const sortChildrenFunc =
    (originalChildren: RouteNode[]) =>
    (left: RouteNode, right: RouteNode): number => {
        const leftPath = left.path
            .replace(/<.*?>/g, '')
            .split('?')[0]
            .replace(/(.+)\/$/, '$1');

        const rightPath = right.path
            .replace(/<.*?>/g, '')
            .split('?')[0]
            .replace(/(.+)\/$/, '$1');

        // '/' last
        if (leftPath === '/') {
            return 1;
        }

        if (rightPath === '/') {
            return -1;
        }

        // Spat params last
        if (left.parser?.hasSpatParam) {
            return 1;
        }

        if (right.parser?.hasSpatParam) {
            return -1;
        }

        // No spat, number of segments (less segments last)
        const leftSegments = (leftPath.match(/\//g) || []).length;
        const rightSegments = (rightPath.match(/\//g) || []).length;
        if (leftSegments < rightSegments) {
            return 1;
        }

        if (leftSegments > rightSegments) {
            return -1;
        }

        // Same number of segments, number of URL params ascending
        const leftParamsCount = left.parser?.urlParams.length ?? 0;
        const rightParamsCount = right.parser?.urlParams.length ?? 0;
        if (leftParamsCount < rightParamsCount) {
            return -1;
        }

        if (leftParamsCount > rightParamsCount) {
            return 1;
        }

        // Same number of segments and params, last segment length descending
        const leftParamLength = (leftPath.split('/').slice(-1)[0] || '').length;
        const rightParamLength = (rightPath.split('/').slice(-1)[0] || '').length;
        if (leftParamLength < rightParamLength) {
            return 1;
        }

        if (leftParamLength > rightParamLength) {
            return -1;
        }

        // Same last segment length, preserve definition order. Note that we
        // cannot just return 0, as sort is not guaranteed to be a stable sort.
        return originalChildren.indexOf(left) - originalChildren.indexOf(right);
    };
