import { TestMatch } from 'pathParser';
import type { trailingSlashMode as tSM } from 'pathParser';
import { omit, parse } from 'search-params';
import { MatchOptions, MatchResponse, RouteNode } from './RouteNode';

const getPath = (path: string): string => path.split('?')[0];
const getSearch = (path: string): string => path.split('?')[1] || '';

const matchChildren = (
    nodes: RouteNode[],
    pathSegment: string,
    currentMatch: MatchResponse,
    options: MatchOptions = {},
    consumedBefore?: string
): MatchResponse | null => {
    const { queryParamsMode = 'default', strictTrailingSlash = false, strongMatching = true, caseSensitive = false } = options;

    const isRoot = nodes.length === 1 && nodes[0].name === '';
    for (const child of nodes) {
        // Partially match path
        let match: TestMatch | null = null;
        let remainingPath;
        let segment = pathSegment;
        let trailingSlashMode: tSM = !child.children.length ? (strictTrailingSlash ? 'default' : 'never') : 'default';
        //                               ↑ No childrens

        if (consumedBefore === '/' && child.path[0] === '/') {
            // when we encounter repeating slashes we add the slash
            // back to the URL to make it de facto pathless
            segment = '/' + pathSegment;
        }

        match = child.parser!.partialTest(segment, {
            delimited: strongMatching,
            caseSensitive,
            queryParams: options.queryParams,
            urlParamsEncoding: options.urlParamsEncoding,
        });

        // Match was't fount withdraw from that Node tree
        if (match == null) continue;

        // Remove consumed segment from path
        let consumedPath = child.parser!.build(match, {
            ignoreSearch: true,
            urlParamsEncoding: options.urlParamsEncoding,
            trailingSlashMode,
        });

        // console.debug(`segment: '${segment}', should consume: '${consumedPath}', mode: ${trailingSlashMode}`);
        // Can't create a regexp from the path because it might contain a
        // regexp character.
        if (segment.toLowerCase().indexOf(consumedPath.toLowerCase()) === 0) {
            remainingPath = segment.slice(consumedPath.length);
        } else {
            remainingPath = segment;
        }

        const { querystring } = omit(getSearch(remainingPath), child.parser!.queryParams, options.queryParams);

        remainingPath = getPath(remainingPath);

        if (!strictTrailingSlash && !isRoot && remainingPath === '/' && !/\/$/.test(consumedPath)) {
            remainingPath = '';
        }

        remainingPath += querystring ? `?${querystring}` : '';

        currentMatch.segments.push(child);
        Object.keys(match).forEach((param) => (currentMatch.params[param] = match![param]));

        if (!isRoot && !remainingPath.length) {
            // fully matched
            return currentMatch;
        }

        if (!isRoot && queryParamsMode !== 'strict' && remainingPath.indexOf('?') === 0) {
            // unmatched queryParams in non strict mode
            const remainingQueryParams = parse(remainingPath.slice(1), options.queryParams) as any;

            Object.keys(remainingQueryParams).forEach((name) => (currentMatch.params[name] = remainingQueryParams[name]));

            return currentMatch;
        }

        // Continue matching on non absolute children
        const children = child.getNonAbsoluteChildren();
        // If no children to match against but unmatched path left
        if (!children.length) {
            return null;
        }

        // Else: remaining path and children
        return matchChildren(children, remainingPath, currentMatch, options, consumedPath);
    }

    return null;
};

export default matchChildren;
