import React, { Component, HTMLAttributes, MouseEventHandler } from 'react';
import { NavigationOptions } from 'router/router';
import { RouterStateContext } from '../context';

export interface LinkProps extends HTMLAttributes<HTMLAnchorElement> {
    name: string;
    params?: { [key: string]: any };
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

    buildUrl: (name: string, params: any) => string | undefined;

    constructor(props: LinkProps) {
        super(props);

        this.clickHandler = this.clickHandler.bind(this);

        let urlCache = () => {
            let url: string | undefined = undefined;
            let _name: string | undefined = undefined;
            let _params: any = undefined;
            return (name: string, params: any) => {
                if (name !== _name || _params !== params) {
                    url = this.context.router?.buildPath(name, params);
                    _name = name;
                    _params = params;
                }

                return url;
            };
        };

        this.buildUrl = urlCache();
    }

    clickHandler(evt: React.MouseEvent<HTMLAnchorElement>) {
        const { onClick, target } = this.props;
        let { name, params, options } = this.props;
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
            router?.navigate(name, params || {}, options);
        }
    }

    render() {
        let { children, activeClassName, className, name, params, ignoreQueryParams, exact, activeOn, ...props } = this.props;
        let { router } = this.context;
        const active = router?.isActive(activeOn || name, params, exact, ignoreQueryParams) || false;
        const linkclassName = (active ? [activeClassName] : []).concat(className ? className.split(' ') : []).join(' ');
        const href = this.buildUrl(name, params);

        return (
            <a className={linkclassName} href={href} onClick={this.clickHandler} {...props}>
                {children}
            </a>
        );
    }
}

export { Link };
