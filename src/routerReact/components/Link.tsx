import React, { Component, HTMLAttributes, MouseEventHandler } from 'react';
import { NavigationOptions } from 'router/router';
import type { Params, Anchor } from 'types/base';
import { RouterStateContext } from '../context';

interface LinkProps extends HTMLAttributes<HTMLAnchorElement> {
    name: string;
    params?: Params;
    anchor?: Anchor;
    options?: NavigationOptions;
    className?: string;
    activeClassName?: string;
    activeOn?: string;
    exact?: boolean;
    ignoreQueryParams?: boolean;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
    target?: string;
    // TODO: accept then \\ catch functions for "navigation"-promise?
}

class Link extends Component<LinkProps> {
    declare context: React.ContextType<typeof RouterStateContext>;
    static contextType = RouterStateContext;
    static defaultProps = {
        activeClassName: 'active',
        ignoreQueryParams: true,
        exact: false,
    };

    buildUrl: (name: string, params?: Params, anchor?: Anchor) => string | undefined;

    constructor(props: LinkProps) {
        super(props);

        this.clickHandler = this.clickHandler.bind(this);

        let urlCache = () => {
            let url: string | undefined = undefined;
            let _name: string | undefined = undefined;
            let _params: any = undefined;
            let _anchor: any = undefined;
            return (name: string, params?: Params, anchor?: Anchor) => {
                if (name !== _name || _params !== params || _anchor !== anchor) {
                    url = this.context.router?.buildPath(name, params, anchor);
                    _name = name;
                    _params = params;
                    _anchor = anchor;
                }

                return url;
            };
        };

        this.buildUrl = urlCache();
    }

    clickHandler(evt: React.MouseEvent<HTMLAnchorElement>) {
        const { onClick, target } = this.props;
        let { name, params, anchor, options } = this.props;
        let { router } = this.context;

        if (onClick) {
            onClick(evt);

            if (evt.defaultPrevented) {
                return;
            }
        }

        const comboKey = evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey;

        if (evt.button === 0 && !comboKey && target !== '_blank') {
            evt.preventDefault();
            router?.navigate(name, params || {}, anchor, options);
        }
    }

    render() {
        let { children, activeClassName, className, name, params, anchor, ignoreQueryParams, exact, activeOn, ...props } = this.props;
        let { router } = this.context;
        const active = router?.isActive(activeOn || name, params, anchor, exact, ignoreQueryParams) || false;
        const linkclassName = (active ? [activeClassName] : []).concat(className ? className.split(' ') : []).join(' ');
        const href = this.buildUrl(name, params, anchor);

        return (
            <a className={linkclassName} href={href} onClick={this.clickHandler} {...props}>
                {children}
            </a>
        );
    }
}

export { Link };
