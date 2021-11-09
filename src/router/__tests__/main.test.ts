import { RouteNode } from 'routeNode';
import { Params } from 'types/base';
import { errorCodes, events } from '../constants';
import { Redirect } from '../errors';
import { Node, NodeInitParams, AsyncFn, EnterFn } from '../node';
import { Router42, Options } from '../router';

class BetterRoute<Dependencies> extends RouteNode {
    additionalParam: boolean = true;
    asyncRequests?: AsyncFn<Dependencies, BetterRoute<Dependencies>>;
    onEnter?: EnterFn<Dependencies, BetterRoute<Dependencies>>;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    ignoreReloadCall: boolean = false;

    constructor(signature: NodeInitParams<Dependencies, BetterRoute<Dependencies>>) {
        super(signature);
        if (signature.defaultParams) {
            this.defaultParams = signature.defaultParams;
        }

        if (signature.asyncRequests) {
            this.asyncRequests = signature.asyncRequests;
        }

        if (signature.onEnter) {
            this.onEnter = signature.onEnter;
        }

        if (signature.encodeParams) {
            this.encodeParams = signature.encodeParams;
        }

        if (signature.decodeParams) {
            this.decodeParams = signature.decodeParams;
        }

        if (signature.ignoreReloadCall) {
            this.ignoreReloadCall = signature.ignoreReloadCall;
        }
    }

    getName() {
        return this.name;
    }
}

type EvenBetterParams<Dependencies, NodeClass> = {
    something: string;
    children?: EvenBetterParams<Dependencies, NodeClass>[] | EvenBetter<Dependencies>[] | EvenBetter<Dependencies>;
    name?: string;
    path?: string;
    asyncRequests?: AsyncFn<Dependencies, NodeClass>;
    onEnter?: EnterFn<Dependencies, NodeClass>;
    forwardTo?: string;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;
    ignoreReloadCall?: boolean;
};

class EvenBetter<Dependencies> extends Node<Dependencies> {
    constructor(signature: EvenBetterParams<Dependencies, EvenBetter<Dependencies>>) {
        super(signature as any);
    }

    getName() {
        return this.name;
    }
}

describe('router42', () => {
    it('should start', async () => {
        const router = createRouter();
        let result = await router.start('/');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('en.index');
    });

    it('should throw if root node is not correct', async () => {
        let create = () => {
            new Router42({
                name: 'auctions',
                path: '/auctions?type',
                children: [
                    { name: 'index', path: '/' },
                    { name: 'recent', path: '/recent' },
                    { name: 'search', path: '/search' },
                ],
            });
        };

        expect(create).toThrow('First node in a tree should have empty name and path, e.g. `new Route({children: [...]})` or `{children: [...]}');
    });

    it("shouldn't be allowed to start twice", async () => {
        const router = createRouter();
        await router.start('/');
        await expect(async () => {
            await router.start('/ru');
        }).rejects.toThrow('already started');
    });

    /**
     * here we are going to mix `RouteNode` with `Node`.
     */
    it('should throw, all nodes should share the same instance', () => {
        expect(() => {
            new Router42({
                children: [new Node({ name: 'en', path: '/' }), new Node({ name: 'ru', path: '/ru' }), new RouteNode({ name: 'ko', path: '/ko' })],
            });
        }).toThrow('RouteNode.add() expects routes to be the same instance as the parrent node.');
    });

    it('should work with superset of Route node class', async () => {
        let checkFn = jest.fn();
        // const r = new EvenBetter({
        //     name: '',
        //     something: 'kek',
        //     children: [
        //         {
        //             name: '',
        //             something: '',
        //         },
        //     ],
        // });

        const routes = new BetterRoute({
            name: '',
            path: '',
            children: [
                new BetterRoute({
                    name: 'index',
                    path: '/',
                    asyncRequests: ({ node }) => {
                        checkFn(node.getName());
                    },
                }),
                new BetterRoute({
                    name: 'page',
                    path: '/page',
                    asyncRequests: ({ node }) => {
                        checkFn(node.getName());
                    },
                }),
            ],
        });

        //
        // Uncomment if you want to check that node is having correct type
        //
        // const routes2 = new BetterRoute({
        //     name: '',
        //     path: '',
        //     asyncRequests: ({ node }) => {},
        //     children: [{ name: 'index', path: '/', asyncRequests: ({ node }) => {} }],
        // });

        const router = new Router42(routes);
        await router.start('/');
        await router.navigate('page');
        expect(checkFn.mock.calls.length).toBe(2);
        expect(checkFn.mock.calls[0][0]).toBe('index');
        expect(checkFn.mock.calls[1][0]).toBe('page');
    });

    describe('transition\\navigation', () => {
        it('navigation should work', async () => {
            const router = createRouter();

            let result = await router.start('/');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('en.index');

            result = await router.navigate('en.auctions');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('en.auctions');
        });

        it('navigation with params should work', async () => {
            const router = createRouter();

            let result = await router.start('/');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('en.index');

            result = await router.navigate('en.profile.index', { name: 'KycKyc', searchOne: ['kek', 'pek'] });
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('en.profile.index');
            expect(result.payload.toState?.params).toEqual({ name: 'KycKyc', searchOne: ['kek', 'pek'] });
            expect(result.payload.toState?.meta?.navigation).toEqual({});
            expect(result.payload.toState?.meta?.params).toEqual({ en: {}, 'en.profile': { name: 'url' }, 'en.profile.index': {} });
        });

        it('working', async () => {
            const router = createRouter();

            let result = await router.start('/auctions');
            result = await router.navigate('en.profile.reviews.page', { name: 'KycKyc', page: 1 });
            expect(result.type).toBe('success');
            expect(result.payload.toState?.params.page).toBe(1);
            result = await router.navigate('en.profile.reviews.page', { name: 'KycKyc', page: 2 });
            expect(result.type).toBe('success');
            expect(result.payload.toState?.params.page).toBe(2);
            expect(result.payload.fromState?.params.page).toBe(1);
            expect(result.payload.toDeactivate!.length).toBe(1);
            expect(result.payload.toActivate!.length).toBe(1);
            expect(result.payload.toDeactivate![0].name).toBe('page');
            expect(result.payload.toActivate![0].name).toBe('page');
        });

        it('asyncRequests & onEnter functions should work', async () => {
            const inspector = jest.fn();
            const router = new Router42([
                {
                    name: 'user',
                    asyncRequests: () => {
                        inspector('user(asyncCall)');
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve('user(asyncResult)');
                            }, 2000);
                        });
                    },
                    onEnter: async ({ asyncResult }) => {
                        inspector(asyncResult); //.toBe('user(async)');
                        await new Promise((resolve) => {
                            setTimeout(() => {
                                resolve('user(OnEnterResult)');
                            }, 5000);
                        });

                        return { passthrough: 'kek' };
                    },
                    path: '/user',
                    children: [
                        {
                            name: 'orders',
                            path: '/orders/:id',
                            asyncRequests: () => {
                                inspector('user.orders(asyncCall)');
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        resolve('user.orders(asyncResult)');
                                    }, 500);
                                });
                            },
                            onEnter: ({ asyncResult, passthrough }) => {
                                inspector(asyncResult); //.toBe('user.orders(async)');
                            },
                        },
                        { name: 'profile', path: '/:profile?searchOne' },
                        { name: 'auctions', path: '/auctions' },
                        {
                            name: 'review',
                            path: '/review/:page',
                            asyncRequests: () => {
                                inspector('user.review(asyncCall)');
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        resolve('user.review(asyncResult)');
                                    }, 500);
                                });
                            },
                            onEnter: async ({ asyncResult, passthrough }) => {
                                inspector(asyncResult); //.toBe('user.review(async)');
                                return await new Promise((resolve) => {
                                    setTimeout(() => {
                                        resolve();
                                    }, 1000);
                                });
                            },
                        },
                    ],
                },
                {
                    name: 'orders',
                    path: '/orders',
                    children: [
                        { name: 'index', path: '/' },
                        { name: 'top', path: '/top/:id' },
                        { name: 'statistics', path: '/statistics?type' },
                        { name: 'drop', path: '/drop' },
                    ],
                },
            ]);

            await router.start('/orders');
            let wait1 = router.navigate('user.orders', { id: 1 });
            let wait2 = router.navigate('user.review', { page: 1 });
            const results = await Promise.all([wait1, wait2]);
            expect(results[0].type).toBe('error');
            expect(results[0].payload.error?.code).toBe(errorCodes.TRANSITION_CANCELLED);
            expect(results[1].type).toBe('success');
            expect(results[1].payload.toState?.name).toBe('user.review');
            expect(inspector.mock.calls[0][0]).toBe('user(asyncCall)');
            expect(inspector.mock.calls[1][0]).toBe('user.orders(asyncCall)');
            expect(inspector.mock.calls[2][0]).toBe('user(asyncCall)');
            expect(inspector.mock.calls[3][0]).toBe('user.review(asyncCall)');
            expect(inspector.mock.calls[4][0]).toBe('user(asyncResult)');
            expect(inspector.mock.calls[5][0]).toBe('user.review(asyncResult)');
        });

        it('should cancel right after onEnter func after second navigation call (request delay simulation)', async () => {
            const router = new Router42(
                [
                    {
                        name: 'orders',
                        path: '/orders',
                        children: [
                            {
                                name: 'index',
                                path: '/',
                            },
                            {
                                name: 'top',
                                path: '/top/:id',
                                onEnter: async ({}) => {
                                    return await new Promise((resolve) => {
                                        setTimeout(() => {
                                            resolve();
                                        }, 1000);
                                    });
                                },
                            },
                            { name: 'statistics', path: '/statistics?type' },
                            { name: 'drop', path: '/drop' },
                        ],
                    },
                ],
                {},
                { lel: '' }
            );

            await router.start('/orders');
            let firstNavigarion = router.navigate('orders.top', { id: 1 });
            let simulatedDelay = new Promise((resolve) => {
                setTimeout(() => {
                    resolve(router.navigate('orders.drop'));
                }, 250);
            });

            const results = await Promise.all([firstNavigarion, simulatedDelay]);
            expect(results[0].type).toBe('error');
            expect(results[0].payload.error?.code).toBe(errorCodes.TRANSITION_CANCELLED);
            expect((results[1] as any).type).toBe('success');
        });

        it('default params are working', async () => {
            const router = new Router42([
                { name: 'index', path: '/' },
                { name: 'section', path: '/:section', defaultParams: { section: 'kek', q: 'q' } },
            ]);

            await router.start('/');
            let result = await router.navigate('section');
            expect(result.payload.toState?.params).toEqual({ section: 'kek', q: 'q' });
        });

        it('redirect should work (simulating auth requirenment)', async () => {
            const router = new Router42(
                [
                    { name: 'index', path: '/' },
                    { name: 'auth', path: '/auth' },
                    {
                        name: 'protected',
                        path: '/protected',
                        onEnter: ({ dependencies }) => {
                            if (!dependencies!.authorized) {
                                throw new Redirect({ to: 'auth', params: { return_to: 'protected' } });
                            }
                        },
                    },
                ],
                {},
                { authorized: false }
            );

            await router.start('/');
            let result = await router.navigate('protected');
            expect(result.payload.toState?.name).toBe('auth');
            expect(result.payload.toState?.params).toEqual({ return_to: 'protected' });
        });

        it('params in the path of the node, shold affect node activation', async () => {
            let onEnter = jest.fn();
            const router = new Router42([
                {
                    name: 'auctions',
                    path: '/auctions?type',
                    onEnter,
                    children: [
                        { name: 'index', path: '/' },
                        { name: 'recent', path: '/recent' },
                        { name: 'search', path: '/search' },
                    ],
                },
            ]);

            let result = await router.start('/auctions');
            result = await router.navigate('auctions.search', { type: 'lich', weapon: 'hek' });
            result = await router.navigate('auctions.search', { type: 'riven', weapon: 'tonkor' });
            expect(result.payload.toActivate?.length).toBe(1);
            expect(result.payload.toDeactivate?.length).toBe(1);
            expect(result.payload.toActivate![0].name).toBe('auctions');
            expect(result.payload.toDeactivate![0].name).toBe('auctions');
            expect(onEnter.mock.calls.length).toBe(3);
            // omit one param, should detect and reactivate `auctions` node anyway
            result = await router.navigate('auctions.search', { weapon: 'tonkor' });
            expect(result.payload.toActivate?.length).toBe(1);
            expect(result.payload.toDeactivate?.length).toBe(1);
            expect(result.payload.toActivate![0].name).toBe('auctions');
            expect(result.payload.toDeactivate![0].name).toBe('auctions');
        });

        it('should catch unknown error', async () => {
            const router = new Router42([
                { name: 'index', path: '/' },
                {
                    name: 'test',
                    path: '/test',
                    onEnter: () => {
                        throw new Error('Unexpected error');
                    },
                },
            ]);

            let cb = jest.fn();

            router.addEventListener(events.TRANSITION_UNKNOWN_ERROR, cb);

            await router.start('/');
            let result = await router.navigate('test');
            expect(result.type).toBe('error');

            expect(cb.mock.calls.length).toBe(1);
            expect(cb.mock.calls[0][0]['error']['message']).toBe('Unexpected error');
        });

        it('should work if states are the same and force == true', async () => {
            const router = createRouter();

            await router.start('/');
            await router.navigate('en.profile.index', { name: 'KycKyc' });
            let result = await router.navigate('en.profile.index', { name: 'KycKyc' }, { force: true });
            expect(result.type).toBe('success');
        });

        it('should throw if states are the same and force == false', async () => {
            const router = createRouter();

            await router.start('/');
            await router.navigate('en.profile.index', { name: 'KycKyc' });
            let result = await router.navigate('en.profile.index', { name: 'KycKyc' });
            expect(result.type).toBe('error');
            expect(result.payload.error?.code).toBe(errorCodes.SAME_STATES);
        });

        it('reload should work', async () => {
            const langEnter = jest.fn();
            const indexEnter = jest.fn();
            const mainNodes = [
                {
                    name: 'auctions',
                    path: '/auctions?type',
                    children: [
                        { name: 'index', path: '/', onEnter: indexEnter },
                        { name: 'recent', path: '/recent' },
                        { name: 'search', path: '/search' },
                    ],
                },
            ];

            const router = new Router42([
                { name: 'en', path: '/', children: mainNodes, onEnter: langEnter },
                { name: 'ru', path: '/ru', children: mainNodes, onEnter: langEnter },
                { name: 'ko', path: '/ko', children: mainNodes, onEnter: langEnter },
            ]);

            await router.start('/auctions');
            let result = await router.navigate('*.auctions.index', {});
            expect(result.payload.error?.code).toBe(errorCodes.SAME_STATES);
            result = await router.navigate('*.auctions.index', {}, { reload: true });
            expect(result.payload.toActivate?.length).toBe(3);
            expect(langEnter.mock.calls.length).toBe(2);
            expect(indexEnter.mock.calls.length).toBe(2);
        });

        it('ignoreReloadCall, nodes that have ignoreReloadCall setting, should work correctly', async () => {
            const langEnter = jest.fn();
            const indexEnter = jest.fn();
            const mainNodes = [
                {
                    name: 'auctions',
                    path: '/auctions?type',
                    children: [
                        { name: 'index', path: '/', onEnter: indexEnter },
                        { name: 'recent', path: '/recent' },
                        { name: 'search', path: '/search' },
                    ],
                },
            ];

            const router = new Router42([
                { name: 'en', path: '/', children: mainNodes, ignoreReloadCall: true, onEnter: langEnter },
                { name: 'ru', path: '/ru', children: mainNodes, ignoreReloadCall: true, onEnter: langEnter },
                { name: 'ko', path: '/ko', children: mainNodes, ignoreReloadCall: true, onEnter: langEnter },
            ]);

            await router.start('/auctions');
            let result = await router.navigate('*.auctions.index', {});
            expect(result.payload.error?.code).toBe(errorCodes.SAME_STATES);
            result = await router.navigate('*.auctions.index', {}, { reload: true });
            expect(result.payload.toActivate?.length).toBe(2);
            expect(langEnter.mock.calls.length).toBe(1);
            expect(indexEnter.mock.calls.length).toBe(2);
        });

        it('ignoreReloadCall, should work even if node is intermediate node', async () => {
            const onEnter = jest.fn();
            const nodes = [
                {
                    name: 'item',
                    path: '/item',
                    onEnter,
                    children: [
                        {
                            name: 'orders',
                            path: '/orders',
                            ignoreReloadCall: true,
                            onEnter,
                            children: [
                                {
                                    name: 'top',
                                    path: '/top',
                                    onEnter,
                                },
                            ],
                        },
                    ],
                },
            ];

            const router = new Router42(nodes);
            let result = await router.start('/item/orders/top');
            result = await router.navigate('item.orders.top', {}, { reload: true });
            expect(result.payload.toActivate?.length).toBe(2);
            expect(result.payload.toDeactivate?.length).toBe(2);
            expect(onEnter.mock.calls.length).toBe(5);
        });

        it('should throw if route was not found and no fallbacks were defined', async () => {
            const router = new Router42([
                { name: 'index', path: '/' },
                { name: 'one', path: '/one' },
                { name: 'two', path: '/two' },
            ]);

            await router.start('/');
            let result = await router.navigate('nowhere');
            expect(result.type).toBe('error');
            expect(result.payload.error?.code).toBe(errorCodes.ROUTE_NOT_FOUND);
        });

        it('should navigate by path instade of name', async () => {
            const router = createRouter();
            await router.start('/');

            let result = await router.navigateByPath('/auctions');
            expect(result.payload.toState?.name).toBe('en.auctions.index');

            result = await router.navigateByPath('/auctions?type=kuva');
            expect(result.payload.toState?.name).toBe('en.auctions.index');
            expect(result.payload.toState?.params).toEqual({ type: 'kuva' });

            result = await router.navigateByPath('/profile/KycKyc/reviews/2');
            expect(result.payload.toState?.name).toBe('en.profile.reviews.page');
            expect(result.payload.toState?.params).toEqual({ name: 'KycKyc', page: '2' });
        });

        it('should correctrly identify the current active route, full path', async () => {
            const router = createRouter();
            await router.start('/');
            await router.navigate('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' });
            expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' })).toBe(true);
            expect(router.isActive('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' })).toBe(true);
            expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' }, true, false)).toBe(false);
        });

        it('should correctrly identify the current active route, partial path', async () => {
            const router = createRouter();
            await router.start('/');
            await router.navigate('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' });
            expect(router.isActive('ru.profile', { name: 'KycKyc' }, false)).toBe(true);
            expect(router.isActive('ru.profile', { name: 'KycKyc' })).toBe(false);
        });
    });

    describe('Not Found', () => {
        it("should throw if notFoundRouteName name was set, but name wasn't defined in a node tree", async () => {
            const router = createRouter({ notFoundRouteName: 'incorrectNotFound' });

            await router.start('/');
            await expect(async () => {
                await router.navigate('en.blackhole');
            }).rejects.toThrow("404 page was set in options, but wasn't defined in routes");
        });

        it('should redirect to 404, if navigating to a route that does not exist', async () => {
            const router = createRouter();

            await router.start('/');
            let result = await router.navigate('en.blackhole');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('en.notFound');
        });

        it('should work with wildcard(*) in notFoundRouteName', async () => {
            const router = createRouter({ notFoundRouteName: '*.notFound' });

            await router.start('/ru');
            let result = await router.navigate('ru.blackhole');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('ru.notFound');
        });

        it("should work with wildcard(*) in notFoundRouteName, even if initial route name wasn't found in a tree", async () => {
            const router = createRouter({ notFoundRouteName: '*.notFound' });
            router.hooks.preNavigate = (name, params) => {
                if (name === '*.notFound') {
                    name = 'ko.notFound';
                }

                return [name, params];
            };

            let result = await router.start('/blackhole');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('ko.notFound');
        });
    });

    describe('default route', () => {
        it('should redirect to default route, if navigating to a route that does not exist', async () => {
            const router = createRouter({ defaultRouteName: 'en.index', allowNotFound: false });
            await router.start('/');
            let result = await router.navigate('en.blackhole');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('en.index');
        });

        it("should throw if defaultRouteName name was set, but name wasn't defined in a node tree", async () => {
            const router = createRouter({ defaultRouteName: 'incorrectDefaultRouteName', allowNotFound: false });
            await router.start('/');
            await expect(async () => {
                await router.navigate('en.blackhole');
            }).rejects.toThrow("defaultPage page was set in options, but wasn't defined in routes");
        });

        it('should work with wildcard(*) in defaultRouteName', async () => {
            const router = createRouter({ defaultRouteName: '*.index', allowNotFound: false });

            await router.start('/ru');
            let result = await router.navigate('ru.blackhole');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('ru.index');
        });

        it("should work with wildcard(*) in defaultRouteName, even if initial route name wasn't found in a tree", async () => {
            const router = createRouter({ defaultRouteName: '*.index', allowNotFound: false });
            router.hooks.preNavigate = (name, params) => {
                if (name === '*.index') {
                    name = 'ko.index';
                }

                return [name, params];
            };

            let result = await router.start('/blackhole');
            expect(result.type).toBe('success');
            expect(result.payload.toState?.name).toBe('ko.index');
        });
    });

    describe('events', () => {
        it('start & stop events should work', async () => {
            const router = createRouter();
            let start = jest.fn();
            let stop = jest.fn();

            router.addEventListener(events.ROUTER_START, start);
            router.addEventListener(events.ROUTER_START, stop);
            await router.start('/');
            router.stop();
            expect(start.mock.calls.length).toBe(1);
            expect(stop.mock.calls.length).toBe(1);
        });

        it('navigation event should work', async () => {
            const router = createRouter();
            let cb = jest.fn();

            router.addEventListener(events.TRANSITION_SUCCESS, cb);

            await router.start('/');
            await router.navigate('en.profile.index', { name: 'KycKyc' });

            expect(cb.mock.calls.length).toBe(2);
            expect(cb.mock.calls[0][0]['toState']['name']).toBe('en.index');
            expect(cb.mock.calls[1][0]['toState']['name']).toBe('en.profile.index');
        });
    });

    describe('browserHistory', () => {
        let historyPushSpy: jest.SpyInstance<void, [data: any, unused: string, url?: string | URL | null | undefined]>;
        let historyReplaceSpy: jest.SpyInstance<void, [data: any, unused: string, url?: string | URL | null | undefined]>;
        beforeEach(() => {
            // "Clear" state
            window.history.pushState(null, '', '/');
            historyPushSpy = jest.spyOn(history, 'pushState');
            historyReplaceSpy = jest.spyOn(history, 'replaceState');
        });

        afterEach(() => {
            historyPushSpy.mockRestore();
            historyReplaceSpy.mockRestore();
        });

        it('start, navigation and stop', async () => {
            const router = createRouter();
            await router.start('/');
            await router.navigate('en.profile.index', { name: 'KycKyc' });
            //
            // First history repolace call, router start.
            //
            // State
            expect(historyReplaceSpy.mock.calls[0][0]).toMatchObject({ name: 'en.index', params: {}, path: '/' });
            // Title
            expect(historyReplaceSpy.mock.calls[0][1]).toBe('');
            // Path
            expect(historyReplaceSpy.mock.calls[0][2]).toBe('/');

            //
            // First history push call, router navigation.
            //
            // State
            expect(historyPushSpy.mock.calls[0][0]).toMatchObject({ name: 'en.profile.index', params: { name: 'KycKyc' }, path: '/profile/KycKyc/' });
            // Title
            expect(historyPushSpy.mock.calls[0][1]).toBe('');
            // Path
            expect(historyPushSpy.mock.calls[0][2]).toBe('/profile/KycKyc/');

            router.stop();
        });

        it('get location', async () => {
            const originalLocation = { ...window.location };
            let windowSpy = jest.spyOn(window, 'location', 'get');
            windowSpy.mockImplementation(() => {
                return {
                    ...originalLocation,
                    pathname: '/profile/kyckyc',
                };
            });
            const router = createRouter();
            let result = await router.start();
            expect(result.payload.toState).toMatchObject({ name: 'en.profile.index', path: '/profile/kyckyc/' });
            windowSpy.mockRestore();
        });
    });
});

const createRouter = (options: Partial<Options> = {}) => {
    options = {
        defaultRouteName: 'en.index',
        notFoundRouteName: 'en.notFound',
        allowNotFound: true,
        ...options,
    };

    const mainNodes = [
        { name: 'index', path: '/' },
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
    ];

    return new Router42(
        {
            children: [
                { name: 'en', path: '/', children: mainNodes },
                { name: 'ru', path: '/ru', children: mainNodes },
                { name: 'ko', path: '/ko', children: mainNodes },
            ],
        },
        options
    );
};
