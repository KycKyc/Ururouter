import { TestMatch } from 'pathParser';
import type { trailingSlashMode as tSM } from 'pathParser';
import { omit, parse } from 'search-params';
import { MatchOptions, MatchResponse, RouteNode } from './RouteNode';

const getPath = (path: string): string => path.split('?')[0];
const getSearch = (path: string): string => path.split('?')[1] || '';

const matchChildren = (nodes: Map<string, RouteNode>, path: string, options: MatchOptions = {}) => {
    const { queryParamsMode = 'default', strictTrailingSlash = false, caseSensitive = false } = options;
    const currentMatch: MatchResponse = {
        nodes: [],
        params: {},
    };

    let processNextNodes = true;
    let consumed: string | undefined;
    while (processNextNodes) {
        processNextNodes = false;
        let i = nodes.entries();
        let result = i.next();
        while (!result.done) {
            let node = result.value[1];

            /////
            let match: TestMatch | null = null;
            let trailingSlashMode: tSM = node.pathMap.size === 0 ? (strictTrailingSlash ? 'default' : 'never') : 'default';
            if (consumed === '/') {
                if (node.path[0] === '/' && path[0] !== '/') {
                    path = '/' + path;
                } else if (node.path[0] !== '/' && path[0] === '/') {
                    path = path.slice(1);
                }
            }

            // Partially match remaining path segment
            match = node.parser!.partialTest(path, {
                caseSensitive,
                queryParams: options.queryParams,
                urlParamsEncoding: options.urlParamsEncoding,
            });

            if (match == null) {
                result = i.next();
                continue;
            }

            // Getting consumed segment from path
            consumed = node.parser!.build(match, {
                ignoreSearch: true,
                urlParamsEncoding: options.urlParamsEncoding,
                trailingSlashMode,
            });

            if (path.toLowerCase().indexOf(consumed.toLowerCase()) === 0) {
                path = path.slice(consumed.length);
            }

            // Remove url-query params owned by this node from the remaining path, all is left will be placed in the `querystring` variable.
            const { querystring } = omit(getSearch(path), node.parser!.queryParams, options.queryParams);

            path = getPath(path);

            if (!strictTrailingSlash && path === '/' && !/\/$/.test(consumed)) {
                path = '';
            }

            path += querystring ? `?${querystring}` : '';

            // Save node
            currentMatch.nodes.push(node);
            // Store matched params from this node
            Object.keys(match).forEach((param) => (currentMatch.params[param] = match![param]));

            if (!path.length) {
                // fully matched
                return currentMatch;
            }

            if (queryParamsMode !== 'strict' && path.indexOf('?') === 0) {
                // Non strict mode
                // And some unmatched queryParams is left, save them
                const remainingQueryParams = parse(path.slice(1), options.queryParams) as any;

                Object.keys(remainingQueryParams).forEach((name) => (currentMatch.params[name] = remainingQueryParams[name]));

                return currentMatch;
            }
            /////

            nodes = node.pathMap;
            processNextNodes = true;
            break;
        }
    }

    return null;
};

// const matchChildrenOld = (nodes: Map<string, RouteNode>, options: MatchOptions = {}): MatchResponse | null => {
//     const { queryParamsMode = 'default', strictTrailingSlash = false, caseSensitive = false } = options;

//     const isRoot = nodes.length === 1 && nodes[0].name === '';
//     for (const child of nodes) {
//         let match: TestMatch | null = null;
//         let trailingSlashMode: tSM = !child.children.length ? (strictTrailingSlash ? 'default' : 'never') : 'default';
//         //                               ↑ No childrens

//         // When we encounter some slash sheneningan, like repeating slashes, e.g `/user/` `/orders`
//         // We add the slash back to the remainingPath, or remove it from remainingPath
//         //
//         // Example of nodes:
//         // should add: `/` -> `/users'
//         // should remove: `/` ->'orders'
//         if (consumedBefore === '/') {
//             if (child.path[0] === '/' && remainingPath[0] !== '/') {
//                 remainingPath = '/' + remainingPath;
//             } else if (child.path[0] !== '/' && remainingPath[0] === '/') {
//                 remainingPath = remainingPath.slice(1);
//             }
//         }

//         // Partially match remaining path segment
//         match = child.parser!.partialTest(remainingPath, {
//             caseSensitive,
//             queryParams: options.queryParams,
//             urlParamsEncoding: options.urlParamsEncoding,
//         });

//         // Match was't fount withdraw from that Node
//         if (match == null) continue;

//         // Getting consumed segment from path
//         let consumedPath = child.parser!.build(match, {
//             ignoreSearch: true,
//             urlParamsEncoding: options.urlParamsEncoding,
//             trailingSlashMode,
//         });

//         // Can't create a regexp from the path because it might contain a regexp character.
//         if (remainingPath.toLowerCase().indexOf(consumedPath.toLowerCase()) === 0) {
//             remainingPath = remainingPath.slice(consumedPath.length);
//         }

//         // Remove url-query params owned by this node from the remaining path, all is left will be placed in the `querystring` variable.
//         const { querystring } = omit(getSearch(remainingPath), child.parser!.queryParams, options.queryParams);

//         remainingPath = getPath(remainingPath);

//         if (!isRoot && !strictTrailingSlash && remainingPath === '/' && !/\/$/.test(consumedPath)) {
//             remainingPath = '';
//         }

//         remainingPath += querystring ? `?${querystring}` : '';

//         // Save node
//         currentMatch.nodes.push(child);
//         // Store matched params from this node
//         Object.keys(match).forEach((param) => (currentMatch.params[param] = match![param]));

//         if (!isRoot && !remainingPath.length) {
//             // fully matched
//             return currentMatch;
//         }

//         if (!isRoot && queryParamsMode !== 'strict' && remainingPath.indexOf('?') === 0) {
//             // Non strict mode
//             // And some unmatched queryParams is left, save them
//             const remainingQueryParams = parse(remainingPath.slice(1), options.queryParams) as any;

//             Object.keys(remainingQueryParams).forEach((name) => (currentMatch.params[name] = remainingQueryParams[name]));

//             return currentMatch;
//         }

//         // Continue matching on non absolute children
//         const children = child.getNonAbsoluteChildren();
//         // If no children to match against but unmatched path left
//         if (!children.length) {
//             return null;
//         }

//         // Else: remaining path and children
//         return matchChildren(children, remainingPath, currentMatch, options, consumedPath);
//     }

//     return null;
// };

export default matchChildren;
