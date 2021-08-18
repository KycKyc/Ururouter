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

    it('test', () => {
        const router = new Router42([
            {
                name: 'user',
                asyncRequests: () => {
                    console.debug('async call: user');
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve('user');
                        }, 2000);
                    });
                },
                onEnter: ({ asyncResult: async }) => {
                    console.debug(`on Enter: ${async}`);
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve('user');
                        }, 1000);
                    }).then((result: any) => {
                        console.debug(`on Enter, resolved: ${result}`);
                    });
                },
                path: '/user',
                children: [
                    {
                        name: 'orders',
                        path: '/orders/:id',
                        asyncRequests: () => {
                            console.debug('async call: orders');
                            return new Promise((resolve) => {
                                setTimeout(() => {
                                    resolve('user/orders');
                                }, 500);
                            });
                        },
                        onEnter: ({ asyncResult: async }) => {
                            console.debug(`on Enter: ${async}`);
                        },
                    },
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
        router.navigate('user.orders', { id: 1 });
        router.navigate('user.review', { page: 1 });
        return new Promise((resolve) => {
            setTimeout(resolve, 4000);
        });
    });
});
