import { RouteNode } from 'routeNode';
import { Router42, NavigationError } from '../router';

describe('router42', () => {
    it('router', () => {
        const router = new Router42([
            {
                name: 'user',
                path: '/user',
                children: [
                    { name: 'orders', path: '/orders/:id' },
                    { name: 'profile', path: '/:profile?searchOne' },
                    { name: 'auctions', path: '/auctions' },
                ],
            },
        ]);

        router.start('/user');
        router.navigate('user.profile', { profile: 'KycKyc', searchOne: ['kek', 'pek'] });
    });

    it('transitionPath', async () => {
        const router = new Router42([
            {
                name: 'user',
                path: '/user',
                children: [
                    { name: 'orders', path: '/orders/:id' },
                    { name: 'profile', path: '/:profile?searchOne' },
                    { name: 'auctions', path: '/auctions' },
                    { name: 'review', path: '/review/:page' },
                ],
                canActivate: () => {},
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
        let result = await router.navigate('user.review', { page: 1 });
        expect(result.type).toBe('success');
        expect(result.payload.toState?.params.page).toBe(1);
        result = await router.navigate('user.review', { page: 2 });
        expect(result.type).toBe('success');
        expect(result.payload.toState?.params.page).toBe(2);
        expect(result.payload.fromState?.params.page).toBe(1);
        expect(result.payload.toDeactivate!.length).toBe(1);
        expect(result.payload.toActivate!.length).toBe(1);
        expect(result.payload.toDeactivate![0].name).toBe('review');
        expect(result.payload.toDeactivate![0].name).toBe('review');
        expect(result.payload.toActivate![0].name).toBe('review');
    });

    it('transition should be canceled', async () => {
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
                            console.debug(passthrough);
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
                            expect(asyncResult).toBe('kek');
                            expect(asyncResult).toBe('user.review(async)');
                            await new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('user.review');
                                }, 1000);
                            });
                        },
                    },
                ],
                canActivate: () => {},
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

    it('404', () => {});
});

const createRouter = () => {
    const mainNodes = [
        new RouteNode({ name: 'index', path: '/' }),
        new RouteNode({
            name: 'item',
            path: '/:item',
            children: [
                { name: 'index', path: '/' },
                { name: 'stats', path: '/statistics' },
                { name: 'drop', path: '/drop' },
            ],
        }),
        new RouteNode({
            name: 'profile',
            path: '/:name',
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
        }),
        new RouteNode({
            name: 'auctions',
            path: '/auctions?type',
            children: [
                { name: 'index', path: '/' },
                { name: 'recent', path: '/recent' },
                { name: 'search', path: '/search' },
            ],
        }),
        new RouteNode({ name: 'notFound', path: '/404' }),
    ];

    return new Router42([{ children: [] }]);
};
