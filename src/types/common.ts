/**
 * Type:\
 * __default__ - encode every segment through `encodeURIComponent` except these additional symbols: `$+,;|`:\
 * __uriComponent__ - encode every segment through `encodeURIComponent`\
 * __none__ - do not encode anything
 *
 * WARNING: be carefull with `'` symbol, could be used to inject, if you (for some reason) inserting param into html
 */
export type URLParamsEncodingType = 'default' | 'uriComponent' | 'none';

/** Mode:\
 * __default__ - build path as defined in Node\
 * __never__ - build path without trailing slash\
 * __always__ - build path with trailing slash
 */
export type TrailingSlashMode = 'default' | 'never' | 'always';

/** Mode:\
 * __default__ - parse all, build all\
 * __strict__ - parse only defined, build only defined
 */
export type QueryParamsMode = 'default' | 'strict';

/**
 * Parsed url params, as object
 */
export type Params = Record<string, any>;

/**
 * This:\
 * `/path/to/somewhere#anchor`
 */
export type Anchor = string | null;
