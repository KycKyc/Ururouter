import { createNode, RouteNode } from 'routeNode';
import { errorCodes, events } from '../constants';
import { Router42, Options, Route, NavigationError } from '../router';

describe('router42', () => {
    it('general, should start', async () => {
        const router = createRouter();
        let result = await router.start('/');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('en.index');
    });

    it('general, should throw if root node is not correct', async () => {
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

    it("general, shoulnd't allow to start twice", async () => {
        const router = createRouter();
        await router.start('/');
        await expect(async () => {
            await router.start('/ru');
        }).rejects.toThrow('already started');
    });

    it('general, all nodes should share the same instance', () => {
        expect(() => {
            new Router42({
                children: [new Route({ name: 'en', path: '/' }), new Route({ name: 'ru', path: '/ru' }), new RouteNode({ name: 'ko', path: '/ko' })],
            });
        }).toThrow('RouteNode.add() expects routes to be the same instance as the parrent node.');
    });

    it('transition, params are passed to the result', async () => {
        const router = createRouter();

        let result = await router.start('/');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('en.index');
        result = await router.navigate('en.profile.index', { name: 'KycKyc', searchOne: ['kek', 'pek'] });
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('en.profile.index');
        expect(result.payload.toState?.params).toEqual({ name: 'KycKyc', searchOne: ['kek', 'pek'] });
    });

    it('transition, working', async () => {
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

    it('transition, asyncRequests & onEnter are working', async () => {
        const router = new Router42([
            {
                name: 'user',
                asyncRequests: () => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve('user(async)');
                        }, 2000);
                    });
                },
                onEnter: async ({ asyncResult }) => {
                    expect(asyncResult).toBe('user(async)');
                    await new Promise((resolve) => {
                        setTimeout(() => {
                            resolve('user');
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
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('user.orders(async)');
                                }, 500);
                            });
                        },
                        onEnter: ({ asyncResult, passthrough }) => {
                            expect(asyncResult).toBe('user.orders(async)');
                        },
                    },
                    { name: 'profile', path: '/:profile?searchOne' },
                    { name: 'auctions', path: '/auctions' },
                    {
                        name: 'review',
                        path: '/review/:page',
                        asyncRequests: () => {
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('user.review(async)');
                                }, 500);
                            });
                        },
                        onEnter: async ({ asyncResult, passthrough }) => {
                            expect(asyncResult).toBe('user.review(async)');
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
        expect((results[1] as any).type).toBe('success');
    });

    it('transition, should cancel right after onEnter func', async () => {
        const router = new Router42([
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
                        onEnter: async () => {
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
        ]);

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

    it('transition, default params', async () => {
        const router = new Router42([
            { name: 'index', path: '/' },
            { name: 'section', path: '/:section', defaultParams: { section: 'kek', q: 'q' } },
        ]);

        await router.start('/');
        let result = await router.navigate('section');
        expect(result.payload.toState?.params).toEqual({ section: 'kek', q: 'q' });
    });

    it('transition, redirect', async () => {
        const router = new Router42(
            [
                { name: 'index', path: '/' },
                { name: 'auth', path: '/auth' },
                {
                    name: 'protected',
                    path: '/protected',
                    onEnter: ({ dependencies }) => {
                        if (!dependencies!.authorized) {
                            throw new NavigationError({
                                code: errorCodes.TRANSITION_REDIRECTED,
                                redirect: { name: 'auth', params: { return_to: 'protected' } },
                            });
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

    it('transition, pinpointed params in path are matter', async () => {
        let onEnter = jest.fn();
        const router = new Router42([
            {
                name: 'auctions',
                path: '/auctions?type',
                onEnter: onEnter,
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
        expect(result.payload.toActivate?.length).toBe(2);
        expect(result.payload.toDeactivate?.length).toBe(2);
        expect(result.payload.toActivate![0].name).toBe('auctions');
        expect(result.payload.toDeactivate![0].name).toBe('auctions');
        expect(onEnter.mock.calls.length).toBe(3);
        // omit one param, should detect and reactivate `auctions` node anyway
        result = await router.navigate('auctions.search', { weapon: 'tonkor' });
        expect(result.payload.toActivate?.length).toBe(2);
        expect(result.payload.toDeactivate?.length).toBe(2);
        expect(result.payload.toActivate![0].name).toBe('auctions');
        expect(result.payload.toDeactivate![0].name).toBe('auctions');
    });

    it('transition, catch unknown error', async () => {
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

    it('transition, navigation should work if states are the same and force == true', async () => {
        const router = createRouter();

        await router.start('/');
        await router.navigate('en.profile.index', { name: 'KycKyc' });
        let result = await router.navigate('en.profile.index', { name: 'KycKyc' }, { force: true });
        expect(result.type).toBe('success');
    });

    it('transition, navigation should not work if states are the same and force == false', async () => {
        const router = createRouter();

        await router.start('/');
        await router.navigate('en.profile.index', { name: 'KycKyc' });
        let result = await router.navigate('en.profile.index', { name: 'KycKyc' });
        expect(result.type).toBe('error');
        expect(result.payload.error?.code).toBe(errorCodes.SAME_STATES);
    });

    it('transition, reload should work', async () => {
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

    it('transition, reload, with nodes that ignore reload calls, should work correctly', async () => {
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

    it('transition, route not found, no fallbacks are defined', async () => {
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

    it('404, incorrect node name', async () => {
        const router = createRouter({ notFoundRouteName: 'incorrectNotFound' });

        await router.start('/');
        await expect(async () => {
            await router.navigate('en.blackhole');
        }).rejects.toThrow("404 page was set in options, but wasn't defined in routes");
    });

    it('404, should work', async () => {
        const router = createRouter();

        await router.start('/');
        let result = await router.navigate('en.blackhole');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('en.notFound');
    });

    it('404, should inherit lang', async () => {
        const router = createRouter({ notFoundRouteName: '*.notFound' });

        await router.start('/ru');
        let result = await router.navigate('ru.blackhole');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('ru.notFound');
    });

    it('404, start path is incorrect', async () => {
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

    it('defaultRouteName, should work', async () => {
        const router = createRouter({ defaultRouteName: 'en.index', allowNotFound: false });
        await router.start('/');
        let result = await router.navigate('en.blackhole');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('en.index');
    });

    it('defaultRouteName, incorrect node name', async () => {
        const router = createRouter({ defaultRouteName: 'incorrectDefaultRouteName', allowNotFound: false });
        await router.start('/');
        await expect(async () => {
            await router.navigate('en.blackhole');
        }).rejects.toThrow("defaultPage page was set in options, but wasn't defined in routes");
    });

    it('defaultRouteName, should inherit lang', async () => {
        const router = createRouter({ defaultRouteName: '*.index', allowNotFound: false });

        await router.start('/ru');
        let result = await router.navigate('ru.blackhole');
        expect(result.type).toBe('success');
        expect(result.payload.toState?.name).toBe('ru.index');
    });

    it('defaultRouteName, start path is incorrect', async () => {
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

    it('status, route is active, exact path', async () => {
        const router = createRouter();
        await router.start('/');
        await router.navigate('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' });
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' })).toBe(true);
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' })).toBe(true);
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' }, true, false)).toBe(false);
    });

    it('status, route is active, checking some child node', async () => {
        const router = createRouter();
        await router.start('/');
        await router.navigate('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' });
        expect(router.isActive('ru.profile', { name: 'KycKyc' }, false)).toBe(true);
        expect(router.isActive('ru.profile', { name: 'KycKyc' })).toBe(false);
    });

    it('events, start & stop', async () => {
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

    it('events, successful navigation', async () => {
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
