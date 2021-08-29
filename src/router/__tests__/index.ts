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
                            await new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('user.review');
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
        expect(results[0].type === 'error').toBeTruthy();
        expect(results[0].payload.error?.code === 'TRANSITION_CANCELLED').toBeTruthy();
        expect(results[1].type === 'success').toBeTruthy();
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

    it('status, route is active, full path', async () => {
        const router = createRouter();
        await router.start('/');
        await router.navigate('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' });
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' })).toBe(true);
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' })).toBe(true);
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' }, true, false)).toBe(false);
    });

    it('status, route is active, some child', async () => {
        const router = createRouter();
        await router.start('/');
        await router.navigate('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' });
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' })).toBe(true);
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc', kek: 'pek' })).toBe(true);
        expect(router.isActive('ru.profile.auctions', { name: 'KycKyc' }, true, false)).toBe(false);
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
