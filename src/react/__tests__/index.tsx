/**
 * @jest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import React, { useMemo } from 'react';
import { events } from 'router/constants';
import { Router42, Options, Node } from 'router/router';
import { Route } from '../components/Route';
import { isActive } from '../helpers';
import { useRouteNode } from '../hooks/useRouteNode';
import { useRouterState } from '../hooks/useRouterState';
import { RouterProvider } from '../provider';

const ComponentDependsOnNode = () => {
    let profileNode = useRouteNode('en.profile');
    console.debug('render profile node');
    return <div>{profileNode.component}</div>;
};

const ComponentDependsOnState = () => {
    let r = useRouterState();
    console.debug('render based on State');
    let active = false;
    for (let node of r.activeNodes) {
        active = isActive('*.profile', node.treeNames);
        if (active) break;
    }

    let child = useMemo(() => {
        return active ? <ChildComponent /> : null;
    }, [active]);

    return (
        <div>
            <span>{r.state?.name}</span>
            {child}
        </div>
    );
};

const ChildComponent = () => {
    console.debug('Child render');
    return <div>i am a child</div>;
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
            //@ts-ignore
            router.invokeEventListeners(events.ROUTER_RELOAD_NODE, { name: 'en.profile' });
        });

        screen.debug();
    });

    it('route component', async () => {
        const router = createRouter();
        await router.start('/');
        const reactApp = (
            <RouterProvider router={router}>
                <Route name={'*.index'}>Index</Route>
                <Route name={'*.profile.index'}>Profile Index</Route>
                <Route name={'*.profile.auctions.index'}>Auctions Index</Route>
            </RouterProvider>
        );

        render(reactApp);

        screen.debug();
        // await act(async () => {
        //     await router.navigate('en.profile.index', { name: 'KycKyc' });
        // });

        // screen.debug();
        // await act(async () => {
        //     await router.navigate('en.profile.auctions.index', { name: 'KycKyc' });
        // });

        // screen.debug();
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
