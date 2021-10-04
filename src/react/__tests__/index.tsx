/**
 * @jest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import React, { useMemo } from 'react';
import { events } from 'router/constants';
import { Node } from 'router/node';
import { Router42, Options } from 'router/router';
import { Link } from '../components/Link';
import { Route, RouteState } from '../components/Route';
import { isActive } from '../helpers';
import { useRouteNode } from '../hooks/useRouteNode';
import { useRouterState } from '../hooks/useRouterState';
import { RouterProvider } from '../provider';

const ComponentDependsOnNode = () => {
    let profileNode = useRouteNode('en.profile');
    console.debug('render profile node');
    //@ts-ignore
    return <div>{profileNode?.component}</div>;
};

const ComponentDependsOnState = () => {
    let r = useRouterState();
    console.debug('render based on State');
    let active = false;
    if (r.state) {
        for (let node of r.state.activeNodes) {
            active = isActive('*.profile', node.treeNames);
            if (active) break;
        }
    }

    let child = useMemo(() => {
        return active ? <PageComponent /> : null;
    }, [active]);

    return (
        <div>
            <span>{r.state?.name}</span>
            {child}
        </div>
    );
};

const PageComponent = ({ name = 'whatever' }) => {
    console.debug('Page component render');
    return <div>page: {name}</div>;
};

const Profile = ({ children }: { children: React.ReactNode }) => {
    console.debug('Profile render');
    return (
        <section>
            <h1>Profile page</h1>
            <div>{children}</div>
        </section>
    );
};

describe('router42 react', () => {
    it('experiments', async () => {
        const router = createRouter();
        await router.start('/');
        const reactApp = (
            <RouterProvider router={router}>
                <ComponentDependsOnNode />
                <ComponentDependsOnState />
            </RouterProvider>
        );

        render(reactApp);
        screen.debug();
        await act(async () => {
            await router.navigate('en.profile.index', { name: 'KycKyc' });
        });

        screen.debug();
        await act(async () => {
            await router.navigate('en.profile.auctions', { name: 'KycKyc' });
        });

        screen.debug();

        await act(async () => {
            //@ts-ignore
            router.rootNode.getNodeByName('en.profile').component = <div>kekw</div>;
            router.invokeEventListeners(events.ROUTER_RELOAD_NODE, { name: 'en.profile' });
        });

        screen.debug();
    });

    it('route component', async () => {
        const router = createRouter();
        await router.start('/');
        const reactApp = (
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
                    <PageComponent name='index' />
                </Route>
                <Route name={'*.profile'}>
                    <Profile>
                        <Route name={'*.profile.index'}>
                            <PageComponent name='Profile index' />
                        </Route>
                        <Route name={'*.profile.auctions'}>
                            <PageComponent name='Auctions index' />
                        </Route>
                    </Profile>
                </Route>
            </RouterProvider>
        );

        let { getByText } = render(reactApp);

        screen.debug();
        await act(async () => {
            // await router.navigate('en.profile.index', { name: 'KycKyc' });
            let link = getByText('Profile Index');
            link.click();
        });

        screen.debug();
        await act(async () => {
            // await router.navigate('en.profile.auctions', { name: 'KycKyc' });
            let link = getByText('Profile - Auctions');
            link.click();
        });

        screen.debug();
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
