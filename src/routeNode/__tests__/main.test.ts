import { RouteNode, createNode } from '../index';

function withoutMeta(obj: Record<string, any> | null) {
    if (!obj) {
        return obj;
    }

    const { meta, ...rest } = obj;

    return rest;
}

describe('RouteNode', function () {
    it('should instanciate an empty RouteNode if no routes are specified in constructor', function () {
        const node = new RouteNode({ children: [] });

        expect(node.nameMap.size).toBe(0);
    });

    it('should throw an error when RouteNode is not used as a constructor', function () {
        expect(function () {
            // @ts-ignore
            RouteNode({ children: [{ name: 'home' }] });
        }).toThrow();
    });

    it('should instanciate a RouteNode object from plain objects', function () {
        const node = createNode({
            children: [
                { name: 'home', path: '/home' },
                { name: 'profile', path: '/profile' },
            ],
        });

        expect(node.nameMap.size).toBe(2);
    });

    it('should perform a final sort all routes after adding them', () => {
        // TODO: remove or refactor
        const routes = [...Array(10)].map((_, index) => ({
            name: `r${index}`,
            path: `/${index}`,
            children: [...Array(500)].map((_, childIndex) => ({
                name: `r${childIndex}`,
                path: `/${childIndex}`,
            })),
        }));

        createNode({
            children: routes,
            pathOptions: {
                finalSort: true,
            },
        });
        // No assertion here, if final sort functionality is broken
        // the test will exceed the 2s timeout and fail
    });

    it('should throw an error when trying to instanciate a RouteNode object with plain objects missing `name` or `path` properties', function () {
        expect(function () {
            // @ts-ignore
            new RouteNode({ children: [{ name: 'home' }] });
        }).toThrow();

        expect(function () {
            // @ts-ignore
            new RouteNode({ children: [{ path: '/profile' }] });
        }).toThrow();
    });

    it('should throw an error when trying to add a node which is not an instance of RouteNode or Object', function () {
        const rootNode = new RouteNode({ children: [] });
        expect(function () {
            // @ts-ignore
            rootNode.add('users');
        }).toThrow();
    });

    it('should throw an error when trying to add a route to a node with an already existing alias or path', function () {
        const root = new RouteNode({ children: [{ name: 'home', path: '/home' }] });

        expect(function () {
            root.add({ name: 'home', path: '/profile' });
        }).toThrow('Name "home" is already defined as children of this node(""), will not overwrite');

        expect(function () {
            root.add({ name: 'profile', path: '/home' });
        }).toThrow('Path "/home" is already defined as children of this node(""), will not overwrite');

        expect(function () {
            root.add({ name: 'home.profile', path: '/home' });
        }).not.toThrow();

        expect(function () {
            root.add({ name: 'home.profile', path: '/profile' });
        }).toThrow();
    });

    it("should throw an error when trying to add a route which parent doesn't exist", function () {
        const root = new RouteNode({ children: [{ name: 'home', path: '/home' }] });
        expect(function () {
            root.add({ name: 'nested.route', path: '/route' });
        }).toThrow();
    });

    it('should instanciate a RouteNode object from RouteNode objects', function () {
        const node = new RouteNode({ children: [new RouteNode({ name: 'home', path: '/home' }), new RouteNode({ name: 'profile', path: '/profile' })] });

        expect(node.nameMap.size).toBe(2);
    });

    it('should find a nested route by name', function () {
        const node = getRoutes();

        expect(node.getPath('home')).toBe('/home');
        expect(node.getPath('users')).toBe('/users');
        expect(node.getPath('users.list')).toBe('/users/list');
        expect(node.getPath('users.view')).toBe('/users/view/:id');
    });

    it('should find a nested route by name', function () {
        const node = getRoutes();

        expect(node.getPath('users.manage')).toBeNull();
    });

    it('should build the path of a nested route', function () {
        const node = getRoutes();
        // Building paths
        expect(node.buildPath('home')).toBe('/home');
        expect(node.buildPath('users')).toBe('/users');
        expect(node.buildPath('users.list')).toBe('/users/list');
        expect(node.buildPath('users.view', { id: 1 })).toBe('/users/view/1');
        // Missing parameters
        expect(function () {
            node.buildPath('users.view');
        }).toThrow();
    });

    it('should build the state object of a nested route', function () {
        const node = getRoutes();
        // Building paths
        expect(node.buildState('home')).toEqual({
            meta: { params: { home: {} } },
            name: 'home',
            params: {},
            anchor: null,
        });

        expect(node.buildState('users.view', { id: 1 })).toEqual({
            meta: {
                params: {
                    users: {},
                    'users.view': {
                        id: 'url',
                    },
                },
            },
            name: 'users.view',
            params: { id: 1 },
            anchor: null,
        });
    });

    it('should find a nested route by matching a path', function () {
        const node = getRoutes();
        // Building paths
        expect(withoutMeta(node.matchPath('/users'))).toEqual({
            name: 'users.index',
            params: {},
            anchor: null,
        });

        expect(node.matchPath('/users/view/1')).toEqual({
            meta: {
                params: {
                    users: {},
                    'users.view': {
                        id: 'url',
                    },
                },
            },
            name: 'users.view',
            params: { id: '1' },
            anchor: null,
        });

        expect(node.matchPath('/users/profile/1')).toBeNull();
        expect(node.matchPath('/users/view/profile/1')).toBeNull();
    });

    it('should match and build paths with nested query parameters', function () {
        const node = new RouteNode({
            children: [
                new RouteNode({
                    name: 'grandParent',
                    path: '/grand-parent?nickname',
                    children: [
                        new RouteNode({ name: 'index', path: '/' }),
                        new RouteNode({
                            name: 'parent',
                            path: '/parent?name',
                            children: [new RouteNode({ name: 'index', path: '/' }), new RouteNode({ name: 'child', path: '/child?age' })],
                        }),
                    ],
                }),
            ],
        });

        // Building
        expect(node.buildPath('grandParent', { nickname: 'gran' })).toBe('/grand-parent?nickname=gran');

        expect(
            node.buildPath('grandParent.parent', {
                nickname: 'gran gran',
                name: 'maman',
            })
        ).toBe('/grand-parent/parent?nickname=gran%20gran&name=maman');

        expect(node.buildPath('grandParent.parent', { nickname: 'gran' })).toBe('/grand-parent/parent?nickname=gran');

        expect(node.buildPath('grandParent.parent', { name: 'maman' })).toBe('/grand-parent/parent?name=maman');

        expect(node.buildPath('grandParent.parent.child', { name: 'maman', age: 3 })).toBe('/grand-parent/parent/child?name=maman&age=3');

        expect(node.buildPath('grandParent.parent.child', {})).toBe('/grand-parent/parent/child');

        expect(
            node.buildPath('grandParent.parent.child', {
                nickname: ['gran', 'granny'],
            })
        ).toBe('/grand-parent/parent/child?nickname=gran&nickname=granny');

        expect(node.buildPath('grandParent.parent.child', { nickname: undefined })).toBe('/grand-parent/parent/child');

        // Matching
        expect(withoutMeta(node.matchPath('/grand-parent'))).toEqual({
            name: 'grandParent.index',
            params: {},
            anchor: null,
        });

        expect(node.matchPath('/grand-parent?nickname=gran')).toEqual({
            meta: {
                params: {
                    grandParent: {
                        nickname: 'query',
                    },
                    'grandParent.index': {},
                },
            },
            name: 'grandParent.index',
            params: { nickname: 'gran' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/grand-parent/parent?nickname=gran&name=maman%20man'))).toEqual({
            name: 'grandParent.parent.index',
            params: { nickname: 'gran', name: 'maman man' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/grand-parent/parent/child?nickname=gran&name=maman'))).toEqual({
            name: 'grandParent.parent.child',
            params: { nickname: 'gran', name: 'maman' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/grand-parent/parent/child?nickname=gran&name=maman&age=3'))).toEqual({
            name: 'grandParent.parent.child',
            params: { nickname: 'gran', name: 'maman', age: '3' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/grand-parent/parent/child?nickname=gran&nickname=granny&name=maman&age=3'))).toEqual({
            name: 'grandParent.parent.child',
            params: { nickname: ['gran', 'granny'], name: 'maman', age: '3' },
            anchor: null,
        });

        // still matching remainingPath only consist of unknown qsParams
        expect(
            node.matchPath('/grand-parent?nickname=gran&name=papa', {
                queryParamsMode: 'default',
            })
        ).toEqual({
            meta: {
                params: {
                    grandParent: {
                        nickname: 'query',
                    },
                    'grandParent.index': {},
                },
            },
            name: 'grandParent.index',
            params: { nickname: 'gran', name: 'papa' },
            anchor: null,
        });

        expect(
            node.matchPath('/grand-parent/parent/child?nickname=gran&names=papa-maman', {
                queryParamsMode: 'default',
            })
        ).toEqual({
            meta: {
                params: {
                    grandParent: {
                        nickname: 'query',
                    },
                    'grandParent.parent': {
                        name: 'query',
                    },
                    'grandParent.parent.child': {
                        age: 'query',
                    },
                },
            },
            name: 'grandParent.parent.child',
            params: { nickname: 'gran', names: 'papa-maman' },
            anchor: null,
        });
    });

    it('should find a nested route by matching a path with a splat', function () {
        const node = getRoutesWithSplat();
        // Building paths
        expect(withoutMeta(node.matchPath('/users/view/1'))).toEqual({
            name: 'users.view',
            params: { id: '1' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/users/profile/1'))).toEqual({
            name: 'users.splat',
            params: { id: 'profile/1' },
            anchor: null,
        });

        expect(node.matchPath('/users/view/profile/1')).toBeNull();
    });

    it('should work on a tree without a root node', function () {
        const usersNode = new RouteNode({
            name: 'users',
            path: '/users',
            children: [new RouteNode({ name: 'list', path: '/list' }), new RouteNode({ name: 'view', path: '/view/:id' })],
        });

        expect(withoutMeta(usersNode.matchPath('/users/view/1'))).toEqual({
            name: 'users.view',
            params: { id: '1' },
            anchor: null,
        });

        expect(withoutMeta(usersNode.matchPath('/users/list'))).toEqual({
            name: 'users.list',
            params: {},
            anchor: null,
        });
    });

    it('should be able to add deep nodes', function () {
        const rootNode = new RouteNode({ children: [] })
            .add({ name: 'users', path: '/users' })
            .add({ name: 'users.view', path: '/view/:id' })
            .add({ name: 'users.list', path: '/list' });

        expect(rootNode.buildPath('users.view', { id: 1 }, null, { queryParamsMode: 'strict' })).toBe('/users/view/1');

        expect(rootNode.buildPath('users.list', { id: 1 }, null, { queryParamsMode: 'strict' })).toBe('/users/list');
    });

    it('should sort paths by length', function () {
        const rootNode = new RouteNode({ children: [] })
            .add({ name: 'personList', path: '/persons/' })
            .add({ name: 'personDetail', path: '/persons/:personId' })
            .add({ name: 'section', path: '/section/:id?a' })
            .add({ name: 'index', path: '/?queryparamOfexceptionalLength' })
            .add({ name: 'id', path: '/:id?rrrr' })
            .add({ name: 'abo', path: '/abo' })
            .add({ name: 'about', path: '/about?hello' })
            .add({ name: 'users', path: '/users-tab' })
            .add({ name: 'user', path: '/users/:id' })
            .add({ name: 'postNew', path: '/blogs/:blogId/posts/new' })
            .add({ name: 'postDetail', path: '/blogs/:blogId/posts/:postId' });

        expect(withoutMeta(rootNode.matchPath('/'))).toEqual({
            name: 'index',
            params: {},
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/abo'))).toEqual({
            name: 'abo',
            params: {},
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/about'))).toEqual({
            name: 'about',
            params: {},
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/abc'))).toEqual({
            name: 'id',
            params: { id: 'abc' },
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/section/abc'))).toEqual({
            name: 'section',
            params: { id: 'abc' },
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/persons/jwoudenberg'))).toEqual({
            name: 'personDetail',
            params: { personId: 'jwoudenberg' },
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/users-tab'))).toEqual({
            name: 'users',
            params: {},
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/users/thomas'))).toEqual({
            name: 'user',
            params: { id: 'thomas' },
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/blogs/123/posts/new'))).toEqual({
            name: 'postNew',
            params: { blogId: '123' },
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath('/blogs/123/posts/456'))).toEqual({
            name: 'postDetail',
            params: { blogId: '123', postId: '456' },
            anchor: null,
        });
    });

    it('should match paths with and without trailing slashes', function () {
        let rootNode = getRoutes();

        expect(withoutMeta(rootNode.matchPath('/users/list/'))).toEqual({ name: 'users.list', params: {}, anchor: null });

        expect(withoutMeta(rootNode.matchPath('/users/list'))).toEqual({ name: 'users.list', params: {}, anchor: null });

        rootNode = getRoutes(true);
        expect(withoutMeta(rootNode.matchPath('/users/list'))).toEqual({ name: 'users.list', params: {}, anchor: null });

        expect(withoutMeta(rootNode.matchPath('/users/list/'))).toEqual({ name: 'users.list', params: {}, anchor: null });

        expect(withoutMeta(rootNode.matchPath('/'))).toEqual({
            name: 'index',
            params: {},
            anchor: null,
        });

        expect(withoutMeta(rootNode.matchPath(''))).toEqual({ name: 'index', params: {}, anchor: null });
    });

    it('should match paths with optional trailing slashes and a non-empty root node', function () {
        const rootNode = new RouteNode({ path: '/?c&d', children: [new RouteNode({ name: 'a', path: '/' })] });

        const state = { name: 'a', params: {}, anchor: null };

        expect(withoutMeta(rootNode.matchPath('/'))).toEqual(state);

        expect(withoutMeta(rootNode.matchPath('/'))).toEqual(state);

        expect(withoutMeta(rootNode.matchPath(''))).toEqual(state);
    });

    it('should support query parameters with square brackets', function () {
        const node = new RouteNode({
            children: [new RouteNode({ name: 'route', path: '/route?arr', children: [new RouteNode({ name: 'deep', path: '/deep?arr2' })] })],
        });

        expect(withoutMeta(node.matchPath('/route/deep?arr=1&arr=2&arr2=3&arr2=4'))).toEqual({
            name: 'route.deep',
            params: { arr: ['1', '2'], arr2: ['3', '4'] },
            anchor: null,
        });
    });

    it('should support query parameters in the root node', function () {
        const node = new RouteNode({ path: '/?a', children: [new RouteNode({ name: 'route', path: '/path?b' })] });
        expect(node.matchPath('/path?a=1&b=2')).toEqual({
            meta: {
                params: {
                    '': { a: 'query' },
                    route: { b: 'query' },
                },
            },
            name: 'route',
            params: { a: '1', b: '2' },
            anchor: null,
        });

        expect(node.buildState('route', { b: '1' })).toEqual({
            meta: {
                params: {
                    '': { a: 'query' },
                    route: { b: 'query' },
                },
            },
            name: 'route',
            params: { b: '1' },
            anchor: null,
        });

        expect(node.buildState('route', { a: '1', b: '1' })).toEqual({
            meta: {
                params: {
                    '': { a: 'query' },
                    route: { b: 'query' },
                },
            },
            name: 'route',
            params: { a: '1', b: '1' },
            anchor: null,
        });

        expect(node.buildPath('route', { b: '2' })).toBe('/path?b=2');
        expect(node.buildPath('route', { a: '1', b: '2' })).toBe('/path?a=1&b=2');
    });

    it('should be able to modify a path', function () {
        const node = new RouteNode({ children: [new RouteNode({ name: 'route', path: '/path' })] });

        expect(node.buildPath('route')).toBe('/path');
        expect(node.buildPath('route', { param: '1' }, null, { queryParamsMode: 'strict' })).toBe('/path');
        node.setPath('/?param');
        expect(node.buildPath('route', { param: '1' }, null, { queryParamsMode: 'strict' })).toBe('/path?param=1');
    });

    it('should serialise extra search parameters', function () {
        const node = new RouteNode({ children: [new RouteNode({ name: 'route', path: '/path' })] });

        expect(
            withoutMeta(
                node.matchPath('/path?a=1&b=2&c=3&d', {
                    queryParamsMode: 'default',
                })
            )
        ).toEqual({
            name: 'route',
            params: { a: '1', b: '2', c: '3', d: null },
            anchor: null,
        });
    });

    it('should throw an error when adding an absolute path below nodes with params', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => jest.fn());
        new RouteNode({
            children: [new RouteNode({ name: 'path', path: '/path/:path', children: [new RouteNode({ name: 'absolute', path: '~/absolute' })] })],
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            'Absolute child-Node was placed under Node that have params in their path, be sure that this child-node will migrate to another node, node: path, child-node: absolute'
        );
    });

    it('should build absolute paths', function () {
        const node = new RouteNode({
            children: [
                new RouteNode({
                    name: 'path',
                    path: '/path',
                    children: [new RouteNode({ name: 'relative', path: '/relative' }), new RouteNode({ name: 'absolute', path: '~/absolute' })],
                }),
            ],
        });

        expect(node.buildPath('path.relative')).toBe('/path/relative');
        expect(node.buildPath('absolute')).toBe('/absolute');
    });

    it('should match absolute paths', function () {
        const absolute = new RouteNode({ name: 'absolute', path: '~/absolute' });

        const node = new RouteNode({
            children: [new RouteNode({ name: 'path', path: '/path', children: [new RouteNode({ name: 'relative', path: '/relative' }), absolute] })],
        });

        expect(withoutMeta(node.matchPath('/path/relative'))).toEqual({
            name: 'path.relative',
            params: {},
            anchor: null,
        });

        expect(node.matchPath('/path/absolute')).toBeNull();
        expect(withoutMeta(node.matchPath('/absolute'))).toEqual({
            name: 'absolute',
            params: {},
            anchor: null,
        });
    });

    it('should automatically match deep nested "/" children', () => {
        const node = new RouteNode({
            children: [
                new RouteNode({
                    name: 'section',
                    path: '/section',
                    children: [new RouteNode({ name: 'top', path: '/?withParam' }), new RouteNode({ name: 'part', path: '/:part' })],
                }),
            ],
        });

        expect(withoutMeta(node.matchPath('/section'))).toEqual({
            name: 'section.top',
            params: {},
            anchor: null,
        });

        expect(node.buildPath('section.top')).toEqual('/section/');
        expect(node.buildPath('section.top', {}, null, { trailingSlashMode: 'never' })).toEqual('/section');
    });

    it('should match deep nested "/" children with query params', () => {
        const node = new RouteNode({
            children: [
                new RouteNode({
                    name: 'app',
                    path: '?showVersion',
                    children: [new RouteNode({ name: 'admin', path: '/admin', children: [new RouteNode({ name: 'users', path: '/?sort&page' })] })],
                }),
            ],
        });

        expect(withoutMeta(node.matchPath('/admin/?page=1'))).toEqual({
            name: 'app.admin.users',
            params: { page: '1' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/admin/'))).toEqual({
            name: 'app.admin.users',
            params: {},
            anchor: null,
        });
    });

    it('should fully match route nodes who have no children', () => {
        const node = new RouteNode({ children: [new RouteNode({ name: 'home', path: '/home' }), new RouteNode({ name: 'section', path: '/:section' })] });

        expect(withoutMeta(node.matchPath('/homeland'))).toEqual({
            name: 'section',
            params: { section: 'homeland' },
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/hom'))).toEqual({
            name: 'section',
            params: { section: 'hom' },
            anchor: null,
        });
    });

    describe('when queryParamsMode is loose', () => {
        it('should serialise extra params to search part', () => {
            const node = new RouteNode({ children: [new RouteNode({ name: 'home', path: '/home' })] });

            expect(node.buildPath('home', { extra: 1, more: 2 }, null)).toBe('/home?extra=1&more=2');
        });
    });

    describe('when strictQueryParams is falsy and strictTrailingSlash is falsy', () => {
        it('should match extra query params', () => {
            const node = new RouteNode({
                children: [
                    { name: 'root', path: '/' },
                    { name: 'home', path: '/home' },
                ],
            });

            const opts = {
                queryParamsMode: 'default',
                strictTrailingSlash: false,
            } as const;

            const match1 = node.matchPath('/?s=3', opts);
            const match2 = node.matchPath('/home/?s=3', opts);

            expect(withoutMeta(match1)).toEqual({
                name: 'root',
                params: { s: '3' },
                anchor: null,
            });

            expect(withoutMeta(match2)).toEqual({
                name: 'home',
                params: { s: '3' },
                anchor: null,
            });
        });
    });

    it('should trim trailing slashes when building paths', () => {
        const node = new RouteNode({
            children: [
                new RouteNode({ name: 'a', path: '/a', children: [new RouteNode({ name: 'b', path: '/?c' })] }),
                new RouteNode({ name: 'c', path: '/?c' }),
            ],
        });

        expect(node.buildPath('a.b', {}, null, { trailingSlashMode: 'never' })).toEqual('/a');

        expect(node.buildPath('a.b', { c: 1 }, null, { trailingSlashMode: 'never' })).toEqual('/a?c=1');

        expect(node.buildPath('c', { c: 1 }, null, { trailingSlashMode: 'never' })).toEqual('/?c=1');
    });

    it('should remove repeated slashes when building paths', () => {
        const node = new RouteNode({
            children: [
                new RouteNode({
                    name: 'a',
                    path: '/',
                    children: [new RouteNode({ name: 'b', path: '/', children: [new RouteNode({ name: 'c', path: '/' })] })],
                }),
            ],
        });

        expect(node.buildPath('a.b', {})).toEqual('/');
        expect(node.buildPath('a.b.c', {})).toEqual('/');
    });

    it('should match paths with repeating slashes', () => {
        const node = new RouteNode({
            children: [
                new RouteNode({
                    name: 'a',
                    path: '/',
                    children: [
                        new RouteNode({
                            name: 'b',
                            path: '/',
                            children: [new RouteNode({ name: 'index', path: '/' }), new RouteNode({ name: 'c', path: '/:bar' })],
                        }),
                    ],
                }),
            ],
        });

        expect(withoutMeta(node.matchPath('/'))).toEqual({
            name: 'a.b.index',
            params: {},
            anchor: null,
        });

        expect(withoutMeta(node.matchPath('/foo'))).toEqual({
            name: 'a.b.c',
            params: { bar: 'foo' },
            anchor: null,
        });
    });

    it('should sort path with complex regexes correctly', () => {
        const node = new RouteNode({
            children: [new RouteNode({ name: 'a', path: '/:path<foo|bar(?:baz?)>/:bar' }), new RouteNode({ name: 'b', path: '/:foo' })],
        });

        expect(withoutMeta(node.matchPath('/foo/bar'))).toEqual({
            name: 'a',
            params: { path: 'foo', bar: 'bar' },
            anchor: null,
        });
    });

    it('should be case insensitive by default', () => {
        const node = new RouteNode({ children: [new RouteNode({ name: 'a', path: '/a' })] });

        expect(node.matchPath('/a')?.name).toBe('a');
        expect(node.matchPath('/A', { caseSensitive: false })?.name).toBe('a');
        expect(node.matchPath('/A', { caseSensitive: true })).toBeNull();
    });

    it('should pass query parameters options to path-parser', () => {
        const node = new RouteNode({
            children: [new RouteNode({ name: 'a', path: '/a?b&c' })],
            pathOptions: {
                queryParamOptions: {
                    parseBooleans: true,
                    arrayFormat: 'bracket',
                },
            },
        });

        expect(node.matchPath('/a?b=true&c[]=1')?.params).toEqual({
            b: true,
            c: ['1'],
        });
    });

    it('should match path with a plus character', () => {
        const routes = [
            {
                name: 'page',
                path: '/:name<.+>/:id<\\w{2}[0-9]{4}>.html',
            },
        ];

        const node = new RouteNode({ children: routes });
        expect(node.matchPath('/foo+bar/AB1234.html')?.params).toEqual({
            id: 'AB1234',
            name: 'foo+bar',
        });
    });

    it('should return null if there is no match', () => {
        const routes = [
            {
                name: 'page',
                path: '/:name<\\d+>',
            },
        ];

        const node = new RouteNode({ children: routes });
        expect(node.matchPath('/foobar%24')).toBeNull();
    });

    it('should throw when trying to build undefined nodes', () => {
        const node = new RouteNode({
            children: [
                {
                    name: 'home',
                    path: '/home',
                },
            ],
        });

        expect(() => node.buildPath('hom')).toThrow();
    });

    it('should have correct treeNames', () => {
        const mainNodes = new RouteNode({
            children: [
                {
                    name: 'item',
                    path: '/item/:item',
                    children: [
                        { name: 'index', path: '/' },
                        { name: 'stats', path: '/statistics' },
                        { name: 'drop', path: '/drop' },
                    ],
                },
                {
                    name: 'profile',
                    path: '/profile/:name',
                    children: [
                        { name: 'index', path: '/' },
                        { name: 'auctions', path: '/auctions' },
                        { name: 'transactions', path: '/transactions' },
                        {
                            name: 'reviews',
                            path: '/reviews',
                            children: [
                                { name: 'index', path: '/' },
                                { name: 'page', path: '/:page' },
                            ],
                        },
                    ],
                },
                { name: 'index', path: '/' },
                {
                    name: 'auctions',
                    path: '/auctions?type',
                    children: [
                        { name: 'index', path: '/' },
                        { name: 'recent', path: '/recent' },
                        { name: 'search', path: '/search' },
                    ],
                },
                { name: 'notFound', path: '/404' },
            ],
        });

        const route = new RouteNode({
            children: [
                { name: 'en', path: '/', children: mainNodes },
                { name: 'ru', path: '/ru', children: mainNodes },
                { name: 'ko', path: '/ko', children: mainNodes },
            ],
        });

        let enNode = route.getNodeByName('en.profile.index');
        let koNode = route.getNodeByName('ko.profile.index');
        expect(koNode === enNode).toBeTruthy();
    });

    describe('defaultParams', () => {
        it('should work', () => {
            const nodes = new RouteNode({
                children: [
                    {
                        name: 'item',
                        path: '/item/:item',
                        defaultParams: { item: 'soma' },
                        children: [
                            { name: 'index', path: '/' },
                            { name: 'stats', path: '/statistics/:range', defaultParams: { range: 'day' } },
                        ],
                    },
                ],
            });

            const defaultParams = nodes.getDefaultParams('item.stats');
            expect(defaultParams).toEqual({ item: 'soma', range: 'day' });
        });

        it('child should overwrite parent defaults', () => {
            const nodes = new RouteNode({
                children: [
                    {
                        name: 'item',
                        path: '/item/:item',
                        defaultParams: { item: 'soma' },
                        children: [
                            { name: 'index', path: '/' },
                            { name: 'stats', path: '/statistics/:range', defaultParams: { range: 'day', item: 'bronko' } },
                        ],
                    },
                ],
            });

            const defaultParams = nodes.getDefaultParams('item.stats');
            expect(defaultParams).toEqual({ item: 'bronko', range: 'day' });
        });
    });

    describe('uri encoding', () => {
        const routeNode = new RouteNode({
            pathOptions: { urlParamsEncoding: 'uriComponent' },
            children: [
                {
                    name: 'route',
                    path: '/:param',
                },
            ],
        });

        it('should build with correct encoding', () => {
            expect(
                routeNode.buildPath(
                    'route',
                    {
                        param: 'test$@',
                    },
                    null
                )
            ).toBe('/test%24%40');
        });

        it('should match with correct decoding', () => {
            expect(withoutMeta(routeNode.matchPath('/test%24%40'))).toEqual({
                name: 'route',
                params: {
                    param: 'test$@',
                },
                anchor: null,
            });
        });
    });

    describe('lang prefixes', () => {
        const mainNodes = [
            new RouteNode({ name: 'default', path: '/' }),
            new RouteNode({ name: 'home', path: '/home' }),
            new RouteNode({
                name: 'user',
                path: '/user',
                children: [
                    new RouteNode({ name: 'default', path: '/' }),
                    new RouteNode({ name: 'orders', path: '/orders' }),
                    new RouteNode({ name: 'reviews', path: '/review/:page' }),
                ],
            }),
        ];

        const enNode = new RouteNode({ name: 'en', path: '/', children: mainNodes });
        const ruNode = new RouteNode({ name: 'ru', path: '/ru', children: mainNodes });
        const koNode = new RouteNode({ name: 'ko', path: '/ko', children: mainNodes });
        const appNodes = new RouteNode({ children: [enNode, ruNode, koNode] });

        it('should match prefix-less path (en-lang)', () => {
            expect(appNodes.matchPath('/')).toEqual({
                name: 'en.default',
                params: {},
                anchor: null,
                meta: { params: { en: {}, 'en.default': {} } },
            });

            expect(appNodes.matchPath('/user')).toEqual({
                name: 'en.user.default',
                params: {},
                anchor: null,
                meta: { params: { en: {}, 'en.user': {}, 'en.user.default': {} } },
            });

            expect(appNodes.matchPath('/user/')).toEqual({
                name: 'en.user.default',
                params: {},
                anchor: null,
                meta: { params: { en: {}, 'en.user': {}, 'en.user.default': {} } },
            });

            expect(appNodes.matchPath('/user/orders/')).toEqual({
                name: 'en.user.orders',
                meta: { params: { en: {}, 'en.user': {}, 'en.user.orders': {} } },
                anchor: null,
                params: {},
            });
        });

        it('should match path with lang prefix (ko-lang)', () => {
            expect(appNodes.matchPath('/ko')).toEqual({
                name: 'ko.default',
                params: {},
                anchor: null,
                meta: { params: { ko: {}, 'ko.default': {} } },
            });

            expect(appNodes.matchPath('/ko/user/orders?page=1')).toEqual({
                name: 'ko.user.orders',
                params: { page: '1' },
                anchor: null,
                meta: { params: { ko: {}, 'ko.user': {}, 'ko.user.orders': {} } },
            });

            expect(appNodes.matchPath('/ko/user/orders/?page=1')).toEqual({
                name: 'ko.user.orders',
                params: { page: '1' },
                anchor: null,
                meta: { params: { ko: {}, 'ko.user': {}, 'ko.user.orders': {} } },
            });
        });

        it('find node', () => {
            const mainNodes = [
                new RouteNode({ name: 'default', path: '/' }),
                new RouteNode({ name: 'home', path: '/home' }),
                new RouteNode({
                    name: 'user',
                    path: '/user',
                    children: [
                        new RouteNode({ name: 'default', path: '/' }),
                        createNode({ name: 'orders', path: '/orders', augment: 'augmentedOrders' }),
                        new RouteNode({ name: 'reviews', path: '/review/:page' }),
                    ],
                }),
            ];

            const enNode = new RouteNode({ name: 'en', path: '/', children: mainNodes });
            const ruNode = new RouteNode({ name: 'ru', path: '/ru', children: mainNodes });
            const koNode = createNode({ name: 'ko', path: '/ko', children: mainNodes, augment: 'augmented' });
            const appNodes = new RouteNode({ children: [enNode, ruNode, koNode] });

            expect(appNodes.getNodeByName('ko.user.orders')).toMatchObject({ name: 'orders', path: '/orders', augment: 'augmentedOrders' });
            expect(koNode.getNodeByName('user.orders')).toMatchObject({ name: 'orders', path: '/orders', augment: 'augmentedOrders' });
        });
    });

    describe('experiments', function () {
        // it('should whatever index', () => {
        //     const app = new RouteNode({
        //         name: 'app',
        //         children: [
        //             {
        //                 path: '/',
        //                 name: 'market',
        //                 children: [
        //                     { path: '/', name: 'index' },
        //                     { path: '/popular', name: 'popular' },
        //                 ],
        //             },
        //         ],
        //     });
        //     let result;
        //     result = app.buildState('market');
        //     console.debug(result);
        // });
        // it('reviews', () => {
        // let tree = createNode({
        //     name: 'app',
        //     children: [
        //         createNode({
        //             name: 'user',
        //             path: '/user',
        //             children: [
        //                 createNode({
        //                     name: 'reviews',
        //                     path: '/reviews',
        //                     children: [
        //                         createNode({ name: 'index', path: '/' }),
        //                         createNode({ name: 'page', path: '/:page' }),
        //                         createNode({ name: 'test', path: '/test' }),
        //                         createNode({ name: 'testSlash', path: '/test/' }),
        //                     ],
        //                 }),
        //                 createNode({ name: 'orders', path: '/orders/' }),
        //             ],
        //         }),
        //         createNode({ name: 'orders', path: '/orders/' }),
        //     ],
        // });
        // let result;
        // let result = tree.matchPath('/user/orders', { strictTrailingSlash: false });
        // console.dir(tree, { depth: null, breakLength: 140 });
        // result = tree.matchPath('/user/reviews/', { strictTrailingSlash: false });
        // console.dir(result, { depth: null, breakLength: 140 });
        // result = tree.matchPath('/user/reviews', { strictTrailingSlash: false });
        // console.dir(result, { depth: null, breakLength: 140 });
        // console.debug('strictTrailingSlash: false');
        // result = tree.matchPath('/user/reviews/test', { strictTrailingSlash: false });
        // console.dir(result, { depth: null, breakLength: 140 });
        // result = tree.matchPath('/user/reviews/test/', { strictTrailingSlash: false });
        // console.dir(result, { depth: null, breakLength: 140 });
        // console.debug('strictTrailingSlash: true');
        // result = tree.matchPath('/user/reviews/test', { strictTrailingSlash: true });
        // console.dir(result, { depth: null, breakLength: 140 });
        // result = tree.matchPath('/user/reviews');
        // console.dir(result, { depth: null, breakLength: 140 });
        // result = tree.matchPath('/user/reviews/1');
        // console.dir(result, { depth: null, breakLength: 140 });
        // console.debug('trailingSlashMode');
        // let _path = tree.buildPath('user.reviews.index', {}, null, { trailingSlashMode: 'never' });
        // console.dir(_path);
        // _path = tree.buildPath('user.reviews.index', {}, null, { trailingSlashMode: 'always' });
        // console.dir(_path);
        // _path = tree.buildPath('user.reviews.index', {}, null, { trailingSlashMode: 'default' });
        // console.dir(_path);
        // _path = tree.buildPath('user.reviews.index', {});
        // console.dir(_path);
        // });
        // it('experiments - test', () => {
        //     const mainNodes = [
        //         new RouteNode({ name: 'default', path: '/' }),
        //         new RouteNode({ name: 'home', path: '/home' }),
        //         new RouteNode({
        //             name: 'user',
        //             path: '/user',
        //             children: [
        //                 new RouteNode({ name: 'default', path: '/' }),
        //                 new RouteNode({ name: 'orders', path: '/orders' }),
        //                 new RouteNode({ name: 'reviews', path: '/review/:page' }),
        //             ],
        //         }),
        //     ];
        //     const enNode = new RouteNode({ name: 'en', path: '/', children: mainNodes });
        //     const ruNode = new RouteNode({ name: 'ru', path: '/ru', children: mainNodes });
        //     const koNode = new RouteNode({ name: 'ko', path: '/ko', children: mainNodes });
        //     const appNodes = new RouteNode({ children: [enNode, ruNode, koNode] });
        //     expect(appNodes.matchPath('/user')).toEqual({
        //         name: 'en.user.default',
        //         params: {},
        //         anchor: null,
        //         meta: { params: { en: {}, 'en.user': {}, 'en.user.default': {} } },
        //     });
        // });
    });

    it('should move absolute node under control of master node, even if we would add it at the later stages', () => {
        const absNode = new RouteNode({ path: '~/abs', name: 'abs' });
        const intermediateNode = new RouteNode({ path: '/one', name: 'one' });
        let tree = new RouteNode({
            children: [{ path: '/', name: 'index' }, intermediateNode],
        });

        intermediateNode.add(absNode);

        expect(tree.nameMap.get('abs')).toBeDefined();
    });

    it('should warn about atteemp to defind child node twice', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const childNNode = new RouteNode({ name: 'child', path: '/child' });
        let tree = new RouteNode({
            children: [{ path: '/', name: 'index' }, childNNode],
        });

        tree.add(childNNode);

        expect(warn).toBeCalledWith("This child Node was already defined inside its parent, ignore: 'child'");
    });

    it('should build with trailing slashes, if defined', () => {
        let tree = new RouteNode({
            children: [
                { path: '/', name: 'index' },
                { path: '/one', name: 'one' },
            ],
        });

        const path = tree.buildPath('one', {}, null, { trailingSlashMode: 'always' });
        expect(path).toBe('/one/');
    });

    it('should match path with hash (anchor)', () => {
        let tree = createNode({
            name: 'app',
            children: [
                createNode({
                    name: 'user',
                    path: '/user',
                    children: [
                        createNode({
                            name: 'reviews',
                            path: '/reviews/',
                            children: [createNode({ name: 'index', path: '/' }), createNode({ name: 'page', path: '/:page' })],
                        }),
                        createNode({ name: 'orders', path: '/orders/' }),
                    ],
                }),
                createNode({ name: 'orders', path: '/orders/' }),
            ],
        });

        let result = tree.matchPath('/user/reviews?test=1#anchor');
        expect(result).toEqual({
            name: 'user.reviews.index',
            params: { test: '1' },
            anchor: 'anchor',
            meta: { params: { user: {}, 'user.reviews': {}, 'user.reviews.index': {} } },
        });
    });

    it('should build path with hash (anchor)', () => {
        let tree = createNode({
            name: 'app',
            children: [
                createNode({
                    name: 'user',
                    path: '/user',
                    children: [
                        createNode({
                            name: 'reviews',
                            path: '/reviews/',
                            children: [createNode({ name: 'index', path: '/' }), createNode({ name: 'page', path: '/:page' })],
                        }),
                        createNode({ name: 'orders', path: '/orders/' }),
                    ],
                }),
                createNode({ name: 'orders', path: '/orders/' }),
            ],
        });

        let result = tree.buildPath('user.reviews.index', { test: '1', kek: 'lol' }, 'anchor');
        expect(result).toBe('/user/reviews/?test=1&kek=lol#anchor');
    });

    it('shoud throw if one root node add another root node that do not have any children', () => {
        let tree = createNode({
            name: '',
        });

        expect(() => {
            tree.add({ name: '', path: '' });
        }).toThrow("RouteNode.add() expects routes to have a name(not '') and a path, or at least have some children to steal");
    });

    it('should propagate master node path settings', () => {
        let tree = new RouteNode({
            pathOptions: { urlParamsEncoding: 'none' },
            children: [
                { name: 'index', path: '/' },
                { name: 'one', path: '/one' },
                { name: 'two', path: '/two' },
                {
                    name: 'parent',
                    path: '/parent',
                    pathOptions: { urlParamsEncoding: 'uriComponent' },
                    children: [
                        { name: 'childOne', path: '/childOne' },
                        { name: 'childTwo', path: '/childtwo' },
                    ],
                },
            ],
        });

        let index = tree.nameMap.get('index');
        expect(index?.parser?.options.urlParamsEncoding).toBe('none');
        let childOne = tree?.nameMap.get('parent')?.nameMap.get('childOne');
        expect(childOne?.parser?.options.urlParamsEncoding).toBe('uriComponent');
    });
});

function getRoutes(trailingSlash?: boolean) {
    const suffix = trailingSlash ? '/' : '';
    const usersNode = new RouteNode({
        name: 'users',
        path: '/users',
        children: [
            new RouteNode({ name: 'index', path: '/' }),
            new RouteNode({ name: 'list', path: '/list' + suffix }),
            new RouteNode({ name: 'view', path: '/view/:id' + suffix }),
        ],
    });

    return new RouteNode({ children: [new RouteNode({ name: 'home', path: '/home' + suffix }), new RouteNode({ name: 'index', path: '/' }), usersNode] });
}

function getRoutesWithSplat() {
    const usersNode = new RouteNode({
        name: 'users',
        path: '/users',
        children: [
            new RouteNode({ name: 'splat', path: '/*id' }),
            new RouteNode({ name: 'view', path: '/view/:id' }),
            new RouteNode({ name: 'list', path: '/list' }),
        ],
    });

    return new RouteNode({ children: [usersNode] });
}
