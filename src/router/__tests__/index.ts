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

    it('transitionPath', () => {
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
                    { name: 'top', path: '/top/:id' },
                    { name: 'statistics', path: '/statistics?type' },
                    { name: 'drop', path: '/drop' },
                ],
            },
        ]);

        router.start('/orders');
        router.navigate('user.review', { page: 1 });
        router.navigate('user.review', { page: 2 });
    });

    it('test', async () => {
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
                        onEnter: ({ asyncResult }) => {
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
                        onEnter: async ({ asyncResult }) => {
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
});
