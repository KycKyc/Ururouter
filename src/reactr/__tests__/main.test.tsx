/**
 * @jest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import React, { useMemo } from 'react';
import { events } from 'router/constants';
import { Node } from 'router/node';
import { Router42, Options, State } from 'router/router';
import { Link } from '../components/Link';
import { Route, RouteState } from '../components/Route';
import { isNodeActive } from '../helpers';
import { withNode } from '../hocs/withNode';
import { withRouter } from '../hocs/withRouter';
import { withRouterState } from '../hocs/withRouterState';
import { useRouteNode } from '../hooks/useRouteNode';
import { useRouter } from '../hooks/useRouter';
import { useRouterState } from '../hooks/useRouterState';
import { RouterProvider } from '../provider';

describe('React', () => {
    it('isNodeActive func working properly', async () => {
        expect(isNodeActive('*.index', ['en.inex', 'ko.index'])).toBeTruthy();
        expect(isNodeActive('en.index', ['en.index', 'ko.index'])).toBeTruthy();
        expect(isNodeActive('index', ['en.inex', 'ko.index'])).toBeFalsy();
        expect(isNodeActive('ru.index', ['en.inex', 'ko.index'])).toBeFalsy();
    });

    it('RouteState is working', async () => {
        const router = createRouter();
        await router.start('/');
        const reactApp = (
            <RouterProvider router={router}>
                <div>
                    <RouteState name='*.profile'>
                        {(state) => {
                            return <div>{state!.name}</div>;
                        }}
                    </RouteState>
                </div>
            </RouterProvider>
        );

        let { getByText } = render(reactApp);
        await act(async () => {
            await router.navigate('*.profile.index', { name: 'KycKyc' });
        });

        getByText('en.profile.index');
        await act(async () => {
            await router.navigate('*.profile.auctions', { name: 'KycKyc' });
        });

        getByText('en.profile.auctions');
    });

    it('links are working', async () => {
        const router = createRouter();
        await router.start('/');
        const reactApp = createReactApp(router, ({ children }) => <div>{children}</div>);

        let { getByText } = render(reactApp);

        getByText('Page content of index');
        await act(async () => {
            let link = getByText('Profile Index');
            link.click();
        });

        getByText('Page content of Profile index');
        await act(async () => {
            let link = getByText('Profile - Auctions');
            link.click();
        });

        getByText('Page content of Auctions index');
    });

    describe('Hooks', () => {
        it('useNode', async () => {
            const ProfileWithNode = ({ children }: { children: React.ReactNode }) => {
                const node = useRouteNode('en.profile');
                const Component = node!.components.main;
                return <Component>{children}</Component>;
            };

            const router = createRouter();
            const reactApp = createReactApp(router, ProfileWithNode);
            const spy = jest.spyOn(router, 'removeEventListener');
            await router.start('/');

            let { getByText } = render(reactApp);

            await act(async () => {
                let link = getByText('Profile Index');
                link.click();
            });

            getByText('Loading');

            await act(async () => {
                router.rootNode.getNodeByName('en.profile')!.components.main = ({ children }: { children: React.ReactNode }) => {
                    return (
                        <div>
                            <h1>Profile</h1>
                            {children}
                        </div>
                    );
                };

                router.invokeEventListeners(events.ROUTER_RELOAD_NODE, { name: 'en.profile' });
            });

            getByText('Page content of Profile index');

            await act(async () => {
                let link = getByText('Index');
                link.click();
            });

            getByText('Page content of index');
            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0]).toBe('@@event/node/reload');
        });

        it('useRouter', async () => {
            const renderCounter = jest.fn();

            const ProfileWithRoute = ({ children }: { children: React.ReactNode }) => {
                const router = useRouter();
                const onClick = () => {
                    router?.navigate('*.index');
                };

                renderCounter();
                return (
                    <div>
                        <h1>Profile</h1>
                        <button onClick={onClick}>To main</button>
                        {children}
                    </div>
                );
            };

            const router = createRouter();
            const reactApp = createReactApp(router, ProfileWithRoute);
            await router.start('/');

            let { getByText } = render(reactApp);

            await act(async () => {
                let link = getByText('Profile Index');
                link.click();
            });

            getByText('Page content of Profile index');

            await act(async () => {
                let link = getByText('Profile - Auctions');
                link.click();
            });

            getByText('Page content of Auctions index');

            await act(async () => {
                let link = getByText('To main');
                link.click();
            });

            getByText('Page content of index');

            expect(renderCounter.mock.calls.length).toBe(1);
        });

        it('useState', async () => {
            const renderCounter = jest.fn();

            const ProfileWithState = ({ children }: { children: React.ReactNode }) => {
                const { state } = useRouterState();

                renderCounter(state?.name);
                return (
                    <div>
                        <h1>Profile</h1>
                        {children}
                    </div>
                );
            };

            const router = createRouter();
            const reactApp = createReactApp(router, ProfileWithState);
            await router.start('/');

            let { getByText } = render(reactApp);

            await act(async () => {
                let link = getByText('Profile Index');
                link.click();
            });

            getByText('Page content of Profile index');

            await act(async () => {
                let link = getByText('Profile - Auctions');
                link.click();
            });

            getByText('Page content of Auctions index');

            await act(async () => {
                let link = getByText('Index');
                link.click();
            });

            getByText('Page content of index');

            expect(renderCounter.mock.calls.length).toBe(2);
        });
    });

    describe('HOCs', () => {
        it('withRouter', async () => {
            const renderCounter = jest.fn();
            const router = createRouter();
            await router.start('/');

            type WithRouterProps = {
                router: Router42<any, Node<any>> | null;
            };
            class ComponentWithRouter extends React.Component<WithRouterProps> {
                render() {
                    let { router } = this.props;
                    renderCounter(router);
                    return <div></div>;
                }
            }
            const Wrapped = withRouter(ComponentWithRouter);

            // @ts-ignore
            expect(Wrapped.render.displayName).toBe('forwardRef(withRouter(ComponentWithRouter))');

            const reactApp = (
                <RouterProvider router={router}>
                    <Wrapped />
                </RouterProvider>
            );

            render(reactApp);

            await act(async () => {
                await router.navigate('en.profile.index', { name: 'KycKyc' });
            });

            await act(async () => {
                await router.navigate('en.profile.auctions', { name: 'KycKyc' });
            });

            expect(renderCounter.mock.calls.length).toBe(1);
            expect(renderCounter.mock.calls[0][0]).toBeDefined();
        });

        it('withRouterState', async () => {
            const renderCounter = jest.fn();
            const router = createRouter();
            await router.start('/');

            type WithRouterProps = {
                router: Router42<any, Node<any>> | null;
                state: State<Node<any>> | null;
            };
            class ComponentWithRouterState extends React.Component<WithRouterProps> {
                render() {
                    let { router, state } = this.props;
                    renderCounter(state?.name);
                    return <div></div>;
                }
            }
            const Wrapped = withRouterState(ComponentWithRouterState);

            // @ts-ignore
            expect(Wrapped.render.displayName).toBe('forwardRef(withRouterState(ComponentWithRouterState))');

            const reactApp = (
                <RouterProvider router={router}>
                    <Wrapped />
                </RouterProvider>
            );

            render(reactApp);

            await act(async () => {
                await router.navigate('en.profile.index', { name: 'KycKyc' });
            });

            await act(async () => {
                await router.navigate('en.profile.auctions', { name: 'KycKyc' });
            });

            expect(renderCounter.mock.calls.length).toBe(3);
            expect(renderCounter.mock.calls[0][0]).toBe('en.index');
            expect(renderCounter.mock.calls[1][0]).toBe('en.profile.index');
            expect(renderCounter.mock.calls[2][0]).toBe('en.profile.auctions');
        });

        it('withNode', async () => {
            const renderCounter = jest.fn();
            const router = createRouter();
            await router.start('/');

            type WithRouterProps = {
                node: Node<any> | null | undefined;
            };
            class ComponentWithNode extends React.Component<WithRouterProps> {
                render() {
                    let { node } = this.props;
                    const Component = node!.components.main;
                    renderCounter(node?.name);
                    return <Component />;
                }
            }
            const Wrapped = withNode('en.profile')(ComponentWithNode);

            // @ts-ignore
            expect(Wrapped.render.displayName).toBe('forwardRef(withNode(ComponentWithNode))');

            const reactApp = (
                <RouterProvider router={router}>
                    <Wrapped />
                </RouterProvider>
            );

            let { getByText } = render(reactApp);

            await act(async () => {
                await router.navigate('en.profile.index', { name: 'KycKyc' });
            });

            await act(async () => {
                await router.navigate('en.profile.auctions', { name: 'KycKyc' });
            });

            getByText('Loading');

            await act(async () => {
                router.rootNode.getNodeByName('en.profile')!.components.main = () => <div>Component</div>;
                router.invokeEventListeners(events.ROUTER_RELOAD_NODE, { name: 'en.profile' });
            });

            getByText('Component');

            expect(renderCounter.mock.calls.length).toBe(2);
            expect(renderCounter.mock.calls[0][0]).toBe('profile');
            expect(renderCounter.mock.calls[1][0]).toBe('profile');
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

    const mainNodes = new Node({
        children: [
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
                components: { main: () => <section>Loading</section> },
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
        ],
    });

    return new Router42(
        [
            { name: 'en', path: '/', children: mainNodes },
            { name: 'ru', path: '/ru', children: mainNodes },
            { name: 'ko', path: '/ko', children: mainNodes },
        ],
        options
    );
};

const PageContent = ({ name, children }: { name: string; children?: React.ReactNode }) => {
    return <div>Page content of {name}</div>;
};

const createReactApp = (router: Router42<any, any>, Profile: React.ComponentType<any>) => {
    return (
        <RouterProvider router={router}>
            <nav>
                <Link name='*.index'>Index</Link>
                <Link name='*.profile.index' activeOn='*.profile' params={{ name: 'KycKyc' }}>
                    Profile
                </Link>
                <Link name='*.profile.index' params={{ name: 'KycKyc' }}>
                    Profile Index
                </Link>
                <Link name='*.profile.auctions' params={{ name: 'KycKyc' }}>
                    Profile - Auctions
                </Link>
            </nav>
            <Route name={'*.index'}>
                <section>
                    <h1>Main</h1>
                    <PageContent name='index' />
                </section>
            </Route>
            <Route name={'*.auctions'}>
                <section>
                    <h1>Auctions</h1>
                    <PageContent name='auctions' />
                </section>
            </Route>
            <Route name={'*.profile'}>
                <Profile>
                    <Route name={'*.profile.index'}>
                        <PageContent name='Profile index' />
                    </Route>
                    <Route name={'*.profile.auctions'}>
                        <PageContent name='Auctions index' />
                    </Route>
                </Profile>
            </Route>
        </RouterProvider>
    );
};
