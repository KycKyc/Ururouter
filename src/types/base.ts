export type { IOptions as QueryParamFormats } from 'search-params';
export type URLParamsEncodingType = 'default' | 'uri' | 'uriComponent' | 'none' | 'legacy';
export type TrailingSlashMode = 'default' | 'never' | 'always';
export type QueryParamsMode = 'default' | 'strict' | 'loose';

export type Callback = (...args: any[]) => void;
export type Params = Record<string, any>;
