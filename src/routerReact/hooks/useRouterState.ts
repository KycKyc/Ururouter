import { useContext } from 'react';
import { RouterStateContext } from '../context';

export const useRouterState = () => {
    return useContext(RouterStateContext);
};
