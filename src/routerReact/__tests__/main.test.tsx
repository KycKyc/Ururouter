/**
 * @jest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import React, { useMemo } from 'react';
import { Node } from 'router/node';
import { Ururouter, Options, State } from '../../router/router';
import { Link } from '../components/Link';
import { NodeComponent } from '../components/NodeComponent';
import { Route, RouteState } from '../components/Route';
import { Switch } from '../components/Switch';
import { checkNames } from '../helpers';
import { withNode } from '../hocs/withNode';
import { withRouter } from '../hocs/withRouter';
import { withRouterState } from '../hocs/withRouterState';
import { useRouteNode } from '../hooks/useRouteNode';
import { useRouter } from '../hooks/useRouter';
import { useRouterState } from '../hooks/useRouterState';
import { RouterProvider } from '../provider';

describe('React', () => {
    it('`checkNames` func working properly', async () => {
        expect(checkNames('*.index', ['en.inex', 'ko.index'])).toBeTruthy();
        expect(checkNames('en.index', ['en.index', 'ko.index'])).toBeTruthy();
        expect(checkNames('*', ['en.inex', 'ko.index'])).toBeTruthy();

        expect(checkNames('index', ['en.inex', 'ko.index'])).toBeFalsy();
        expect(checkNames('ru.index', ['en.inex', 'ko.index'])).toBeFalsy();
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
        expect(router.state?.anchor).toBe('test');
    });

    it('<Switch> should work', async () => {
        const router = createRouter();
        await router.start('/');

        const renderCounter = jest.fn();
        const EverythingElse: React.FC = () => {
            renderCounter();
            return <div>Everything else</div>;
        };

        const reactApp = (
            <RouterProvider router={router}>
                <div>
                    <Switch>
                        <Route name='*.item'>Item</Route>
                        <Route name='*'>
                            <EverythingElse />
                        </Route>
                    </Switch>
                </div>
            </RouterProvider>
        );

        let { getByText } = render(reactApp);

        // first render of `Everything else`
        getByText('Everything else');

        await act(async () => {
            await router.navigate('*.item.index', { item: 'something' });
        });

        // Render of `item` node
        getByText('Item');

        await act(async () => {
            await router.navigate('*.auctions.recent', { type: 'kek' });
        });

        // second render of `Everything else`
        getByText('Everything else');

        await act(async () => {
            await router.navigate('*.auctions.search', { type: 'kek' });
        });

        // third render of `Everything else`
        getByText('Everything else');

        await act(async () => {
            await router.navigate('*.auctions.index', { type: 'kek2' });
        });

        // fourth render of `Everything else`
        getByText('Everything else');

        // Total number of re-renders for `Everything else` should be 2
        expect(renderCounter.mock.calls.length).toBe(2);
    });

    it('<Route>, multi routes component should work', async () => {
        const router = createRouter();
        await router.start('/');
        const reactApp = createReactApp(router, ({ children }) => <div>{children}</div>);
        let { getByText } = render(reactApp);

        await act(async () => {
            await router.navigate('*.auctions');
        });

        getByText('Common component for index and auctions');

        await act(async () => {
            await router.navigate('*.index');
        });

        getByText('Common component for index and auctions');

        await act(async () => {
            await router.navigate('*.profile.index', { name: 'KycKyc' });
        });

        expect(() => {
            getByText('Common component for index and auctions');
        }).toThrow();
    });

    describe('Hooks', () => {
        it('useNode', async () => {
            const ProfileWithNode = ({ children }: { children: React.ReactNode }) => {
                const node = useRouteNode('en.profile');
                const Component = node!.components.main;
                return <Component>{children}</Component>;
            };

            const router = createRouter();
            const targetNode = router.rootNode.getNodeByName('en.profile')!;
            const reactApp = createReactApp(router, ProfileWithNode);
            const spy = jest.spyOn(targetNode, 'removeEventListener');
            await router.start('/');

            let { getByText } = render(reactApp);

            await act(async () => {
                let link = getByText('Profile Index');
                link.click();
            });

            getByText('Loading');

            await act(async () => {
                const profileComponent = ({ children }: { children: React.ReactNode }) => {
                    return (
                        <div>
                            <h1>Profile</h1>
                            {children}
                        </div>
                    );
                };

                router.rootNode.getNodeByName('en.profile')!.updateComponent('main', profileComponent);
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

        it('useNode, wildcard', async () => {
            //
            // UseRouteNode with wildcarded name
            //
            const ProfileWithNode = ({ children }: { children: React.ReactNode }) => {
                const node = useRouteNode('*.profile');
                const Component = node!.components.main;
                return <Component>{children}</Component>;
            };

            const router = createRouter();
            const reactApp = createReactApp(router, ProfileWithNode);
            await router.start('/');

            let { getByText } = render(reactApp);

            await act(async () => {
                let link = getByText('Profile Index');
                link.click();
            });

            getByText('Loading');

            //
            // Test that wildcard trigger is working
            //
            await act(async () => {
                let profileComponent = ({ children }: { children: React.ReactNode }) => {
                    return (
                        <div>
                            <h1>Dynamic Profile page</h1>
                            {children}
                        </div>
                    );
                };

                router.rootNode.getNodeByName('en.profile')!.updateComponent('main', profileComponent);
            });

            getByText('Dynamic Profile page');
            getByText('Page content of Profile index');

            await act(async () => {
                let link = getByText('Index');
                link.click();
            });

            getByText('Page content of index');

            await act(async () => {
                let link = getByText('Profile Index');
                link.click();
            });

            //
            // Test that NON-wildcard trigger is working
            //
            await act(async () => {
                const profilecomponent = ({ children }: { children: React.ReactNode }) => {
                    return (
                        <div>
                            <h1>Dynamic Profile page, en</h1>
                            {children}
                        </div>
                    );
                };

                router.rootNode.getNodeByName('en.profile')!.updateComponent('main', profilecomponent);
            });

            getByText('Dynamic Profile page, en');
            getByText('Page content of Profile index');
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
                router: Ururouter<any, Node<any>> | null;
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
                router: Ururouter<any, Node<any>> | null;
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
                router.rootNode.getNodeByName('en.profile')!.updateComponent('main', () => <div>Component</div>);
            });

            getByText('Component');

            expect(renderCounter.mock.calls.length).toBe(2);
            expect(renderCounter.mock.calls[0][0]).toBe('profile');
            expect(renderCounter.mock.calls[1][0]).toBe('profile');
        });
    });

    it('NodeComponent should work', async () => {
        const router = createRouter();
        await router.start('/');

        const reactApp = (
            <RouterProvider router={router}>
                <Route name={'*.index'}>
                    <section>
                        <h1>Index</h1>
                    </section>
                </Route>
                <Route name={'*.profile'}>
                    <NodeComponent node='*.profile' component='alt'>
                        <Route name={'*.profile.index'}>
                            <span>Profile index</span>
                        </Route>
                        <Route name={'*.profile.auctions'}>
                            <span>Profile auctions</span>
                        </Route>
                    </NodeComponent>
                </Route>
            </RouterProvider>
        );

        const rootElement = document.createElement('div');
        rootElement.setAttribute('id', 'root');

        let { getByText } = render(reactApp, { container: rootElement });

        getByText('Index');

        await act(async () => {
            await router.navigate('en.profile.index', { name: 'KycKyc' });
        });

        expect(rootElement.children.length).toBe(0);

        await act(async () => {
            router.rootNode.getNodeByName('en.profile')!.updateComponent('alt', ({ children }) => <div id='profile'>{children}</div>);
        });

        getByText('Profile index');
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

    return new Ururouter(
        [
            { name: 'en', path: '/', children: mainNodes },
            { name: 'ru', path: '/ru', children: mainNodes },
            { name: 'ko', path: '/ko', children: mainNodes },
        ],
        options
    );
};

const createReactApp = (router: Ururouter<any, any>, Profile: React.ComponentType<any>) => {
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
                <Link name='*.profile.auctions' params={{ name: 'KycKyc' }} anchor={'test'}>
                    Profile - Auctions
                </Link>
            </nav>
            <Route name={'*.index'}>
                <section>
                    <h1>Main</h1>
                    <div>Page content of index</div>
                </section>
            </Route>
            <Route name={'*.auctions'}>
                <section>
                    <h1>Auctions</h1>
                    <div>Page content of Auctions</div>
                </section>
            </Route>
            <Route name={['*.index', '*.auctions']}>
                <section>
                    <span>Common component for index and auctions</span>
                </section>
            </Route>
            <Route name={'*.profile'}>
                <Profile>
                    <Route name={'*.profile.index'}>
                        <div>Page content of Profile index</div>
                    </Route>
                    <Route name={'*.profile.auctions'}>
                        <div>Page content of Auctions index</div>
                    </Route>
                </Profile>
            </Route>
        </RouterProvider>
    );
};
