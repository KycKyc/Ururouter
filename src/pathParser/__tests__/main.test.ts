import queryString from 'query-string';
import { Path } from '../index';

describe('Path', () => {
    it('should throw an error when instanciated without parameter', () => {
        expect(() => {
            new Path('');
        }).toThrow();
    });

    it('should throw an error if Path is used like a function', () => {
        expect(() => {
            // @ts-ignore
            Path();
        }).toThrow();
    });

    it('should throw an error if a path cannot be tokenised', () => {
        expect(() => {
            new Path('/!#');
        }).toThrow();
    });

    it('should return a path if createPath is used', () => {
        expect(Path.createPath('/users')).toBeDefined();
    });

    it('should warn about incorrect path format', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const path = Path.createPath('users');
        expect(warn).toBeCalledWith("Path should have leading slash, i transformed it for you: '/users'");
        expect(path.path).toBe('/users');
    });

    it('Should not mmatch if patch is not fully matched', () => {
        const path = new Path('/user');
        expect(path.strictParse('/user/whatever')).toBeNull();
    });

    it('should match and build paths with url parameters', () => {
        const path = new Path('/users/profile/:id-:id2.html');
        // Successful match & partial match
        expect(path.strictParse('/users/profile/123-abc.html')).toMatchObject({
            match: {
                urlParams: {
                    id: '123',
                    id2: 'abc',
                },
            },
        });

        expect(path.parse('/users/profile/123-abc.html?what')).toMatchObject({
            match: {
                urlParams: { id: '123', id2: 'abc' },
            },
        });

        // Unsuccessful match
        expect(path.strictParse('/users/details/123-abc')).toBeNull();
        expect(path.strictParse('/users/details/123-abc.html')).toBeNull();

        expect(path.build({ id: '123', id2: 'abc' })).toBe('/users/profile/123-abc.html');

        expect(() => {
            path.build({ id: '123' });
        }).toThrow("Cannot build path: '/users/profile/:id-:id2.html' requires missing parameters { id2 }");
    });

    it('should ignore undefined url-param', () => {
        const path = new Path('/:kek/users?offset&limit');

        expect(path.build({ lol: undefined, kek: 12, offset: 31, limit: undefined })).toBe('/12/users?offset=31');
    });

    it('bool in url-params should work', () => {
        const path = new Path('/:kek/users?offset&limit');
        expect(path.build({ kek: true })).toBe('/true/users');
    });

    it('should add trailing slash', () => {
        const path = new Path('/:kek/users/');
        expect(path.build({ kek: true })).toBe('/true/users/');
    });

    it('should match and build paths with query parameters', () => {
        const path = new Path('/users?offset&limit', {
            queryParamOptions: { parseBooleans: true },
        });

        // Successful match & partial match
        expect(path.strictParse('/users?offset=31&limit=15')).toMatchObject({
            match: {
                queryParams: {
                    offset: '31',
                    limit: '15',
                },
            },
        });

        expect(path.strictParse('/users?offset=31&offset=30&limit=15')).toMatchObject({
            match: {
                queryParams: { offset: ['31', '30'], limit: '15' },
            },
        });

        expect(path.strictParse('/users?offset=1&limit=15')).toMatchObject({
            match: {
                queryParams: { offset: '1', limit: '15' },
            },
        });

        expect(path.strictParse('/users?limit=15')).toMatchObject({
            match: {
                queryParams: { limit: '15' },
            },
        });

        expect(path.parse('/users?offset=true&limits=1')).toMatchObject({
            match: {
                queryParams: {
                    offset: true,
                },
            },
            remains: {
                queryParams: {
                    limits: '1',
                },
            },
        });

        expect(path.parse('/users?offset=1&offset=2%202&limits=1')).toMatchObject({
            match: {
                queryParams: {
                    offset: ['1', '2 2'],
                },
            },
            remains: {
                queryParams: {
                    limits: '1',
                },
            },
        });

        expect(path.parse('/users')).toMatchObject({ match: { path: '/users' } });

        // Unsuccessful match
        expect(path.strictParse('/users?offset=31&order=asc', { strictQueryParams: true })).toBeNull();
        expect(path.strictParse('/users?offset=31&limit=10&order=asc', { strictQueryParams: true })).toBeNull();

        expect(path.build({ offset: 31, limit: '15 15' })).toBe('/users?offset=31&limit=15%2015');

        expect(path.build({ offset: 31 })).toBe('/users?offset=31');
        expect(path.build({ offset: 31, limit: '' })).toBe('/users?offset=31&limit=');

        expect(path.build({ offset: 31, limit: undefined })).toBe('/users?offset=31');

        expect(path.build({ offset: 31, limit: false })).toBe('/users?offset=31&limit=false');

        expect(path.build({ offset: 31, limit: true })).toBe('/users?offset=31&limit=true');

        expect(path.build({ offset: [31, 30], limit: false })).toBe('/users?offset=31&offset=30&limit=false');

        expect(path.build({ offset: 31, limit: 15 }, { ignoreSearch: true })).toBe('/users');
    });

    it('should match and build paths of query parameters with square brackets', () => {
        const path = new Path('/users?offset&limit', {
            queryParamOptions: { arrayFormat: 'bracket' },
        });

        expect(path.build({ offset: 31, limit: ['15'] })).toBe('/users?offset=31&limit[]=15');

        expect(path.build({ offset: 31, limit: ['15', '16'] })).toBe('/users?offset=31&limit[]=15&limit[]=16');

        expect(path.strictParse('/users?offset=31&limit[]=15')).toMatchObject({
            match: {
                queryParams: {
                    offset: '31',
                    limit: ['15'],
                },
            },
        });

        expect(path.strictParse('/users?offset=31&limit[]=15&limit[]=16')).toMatchObject({
            match: {
                queryParams: {
                    offset: '31',
                    limit: ['15', '16'],
                },
            },
        });
    });

    it('should match and build paths with url and query parameters', () => {
        const path = new Path('/users/profile/:id-:id2?id3');
        expect(path.hasQueryParams).toBe(true);
        // Successful match & partial match
        expect(path.strictParse('/users/profile/123-456?id3=789')).toMatchObject({
            match: {
                urlParams: {
                    id: '123',
                    id2: '456',
                },
                queryParams: { id3: '789' },
            },
        });

        expect(path.parse('/users/profile/123-456')).toMatchObject({
            match: {
                urlParams: { id: '123', id2: '456' },
            },
        });

        // Un,successful match
        expect(path.strictParse('/users/details/123-456')).toBeNull();
        expect(path.strictParse('/users/profile/123-456?id3=789&id4=000', { strictQueryParams: true })).toBeNull();

        expect(path.build({ id: '123', id2: '456', id3: '789' })).toBe('/users/profile/123-456?id3=789');
    });

    it('should be able to recieve new options', () => {
        const path = new Path('/users/profile/:id-:id2?:id3');

        expect(path.options.urlParamsEncoding).toBe('default');
        path.updateOptions({ urlParamsEncoding: 'none' });
        expect(path.options.urlParamsEncoding).toBe('none');

        const pathTwo = new Path('/users/profile/:id-:id2?:id3', { urlParamsEncoding: 'none' });
        expect(pathTwo.options.urlParamsEncoding).toBe('none');

        // Update configs shouldn't work if config was set in constructor
        pathTwo.updateOptions({ urlParamsEncoding: 'default' });
        expect(pathTwo.options.urlParamsEncoding).toBe('none');

        // But could be forced
        pathTwo.updateOptions({ urlParamsEncoding: 'default' }, true);
        expect(pathTwo.options.urlParamsEncoding).toBe('default');
    });

    it('should match and build paths with splat parameters', () => {
        const path = new Path('/users/*splat');
        expect(path.hasSpatParam).toBe(true);
        // Successful match
        expect(path.strictParse('/users/profile/123')).toMatchObject({
            match: {
                urlParams: { splat: 'profile/123' },
            },
        });

        expect(path.strictParse('/users/admin/manage/view/123')).toMatchObject({
            match: {
                urlParams: {
                    splat: 'admin/manage/view/123',
                },
            },
        });

        // Build path
        expect(path.build({ splat: 'profile/123' })).toBe('/users/profile/123');
    });

    it('should match and build paths with splat and url parameters', () => {
        const path = new Path('/users/*splat/view/:id');
        expect(path.hasSpatParam).toBe(true);
        // Successful match
        expect(path.strictParse('/users/profile/view/123')).toMatchObject({
            match: {
                urlParams: {
                    splat: 'profile',
                    id: '123',
                },
            },
        });

        expect(path.strictParse('/users/admin/manage/view/123')).toMatchObject({
            match: {
                urlParams: {
                    splat: 'admin/manage',
                    id: '123',
                },
            },
        });
    });

    it('should match and build paths with url, splat and query parameters', () => {
        const path = new Path('/:section/*splat?id');
        expect(path.hasSpatParam).toBe(true);
        // Successful match
        expect(path.strictParse('/users/profile/view?id=123')).toMatchObject({
            match: {
                urlParams: {
                    section: 'users',
                    splat: 'profile/view',
                },
                queryParams: {
                    id: '123',
                },
            },
        });

        expect(path.build({ section: 'users', splat: 'profile/view', id: '123' })).toBe('/users/profile/view?id=123');
    });

    it('should match and build paths with matrix parameters', () => {
        const path = new Path('/users/;section;id');
        expect(path.hasMatrixParams).toBe(true);
        // Build path
        expect(path.build({ section: 'profile', id: '123' })).toBe('/users/;section=profile;id=123');

        // Successful match
        expect(path.strictParse('/users/;section=profile;id=123')).toMatchObject({
            match: {
                urlParams: {
                    section: 'profile',
                    id: '123',
                },
            },
        });
    });

    // it('bfc', () => {
    //     let path = new Path('/');
    //     console.debug('Path: /users/kek');
    //     console.debug(path.parse('/'));
    // });

    // it('bfg', () => {
    //     let path = new Path('/user/');
    //     console.debug('Path: /users/kek');
    //     console.debug(path.parse('/users/kek'));

    //     console.debug('Path: /users');
    //     console.debug(path.parse('/users'));

    //     console.debug('Path: /user');
    //     console.debug(path.parse('/user'));

    //     console.debug('Path: /user/');
    //     console.debug(path.parse('/user/'));

    //     console.debug('Path: /user/kek/');
    //     console.debug(path.parse('/user/kek/'));

    //     console.debug('Path: /user/kek');
    //     console.debug(path.parse('/user/kek'));
    // });

    it('should match and build paths with constrained parameters', () => {
        let path = new Path('/users/:id<\\d+>');
        // Build path
        expect(path.build({ id: 99 })).toBe('/users/99');
        // Match path
        expect(path.strictParse('/users/11')).toMatchObject({ match: { urlParams: { id: '11' } } });
        expect(path.strictParse('/users/thomas')).toBeNull();

        path = new Path('/users/;id<[A-F0-9]{6}>');
        // Build path
        expect(path.build({ id: 'A76FE4' })).toBe('/users/;id=A76FE4');
        // Error because of incorrect parameter format
        expect(() => {
            path.build({ id: 'incorrect-param' });
        }).toThrow();

        // Force
        expect(path.build({ id: 'fake' }, { ignoreConstraints: true })).toBe('/users/;id=fake');

        // Match path
        expect(path.strictParse('/users/;id=A76FE4')).toMatchObject({ match: { urlParams: { id: 'A76FE4' } } });
        expect(path.strictParse('/users;id=Z12345')).toBeNull();
    });

    it('should match and build paths with star (*) as a parameter value', () => {
        const path = new Path('/test/:param');

        expect(path.build({ param: 'super*' })).toBe('/test/super*');

        expect(path.strictParse('/test/super*')).toMatchObject({ match: { urlParams: { param: 'super*' } } });
    });

    it('should match paths with optional trailing slashes', () => {
        let path = new Path('/my-path');
        expect(path.strictParse('/my-path/', { strictTrailingSlash: true })).toBeNull();
        expect(path.strictParse('/my-path/', { strictTrailingSlash: false })).toMatchObject({ match: { path: '/my-path' }, remains: { path: '/' } });

        path = new Path('/my-path/');
        expect(path.strictParse('/my-path', { strictTrailingSlash: true })).toBeNull();
        expect(path.strictParse('/my-path', { strictTrailingSlash: false })).toMatchObject({ match: { path: '/my-path' }, remains: { path: '' } });
    });

    it('should correctly match path that is consist of one slash', () => {
        const path = new Path('/');
        expect(path.strictParse('', { strictTrailingSlash: true })).toBeNull();
        expect(path.strictParse('', { strictTrailingSlash: false })).toBeNull();
        expect(path.strictParse('/', { strictTrailingSlash: true })).toMatchObject({ match: {}, remains: {} });
    });

    it('should match paths with encoded values', () => {
        const path = new Path('/test/:id');

        expect(path.parse('/test/%7B123-456%7D')).toMatchObject({ match: { urlParams: { id: '{123-456}' } } });
    });

    it('should encode values and build paths', () => {
        const path = new Path('/test/:id');

        expect(path.build({ id: '{123-456}' })).toBe('/test/%7B123-456%7D');
    });

    it('should partial match up to a delimiter', () => {
        const path = new Path('/univers');

        expect(path.parse('/university')).toBeDefined();
        expect(path.parse('/univers/hello')).toMatchObject({
            match: { path: '/univers' },
            remains: { path: '/hello' },
        });
    });

    it('should match with special characters in path', () => {
        const path = new Path('/test/:name/test2');

        expect(path.parse('/test/he:re/test2')).toMatchObject({ match: { urlParams: { name: 'he:re' } } });
        expect(path.parse("/test/he're/test2")).toMatchObject({ match: { urlParams: { name: "he're" } } });

        expect(path.build({ name: "he're" })).toEqual("/test/he're/test2");
    });

    it('should be case insensitive', () => {
        const path = new Path('/test');

        expect(path.strictParse('/test')).toMatchObject({ match: { path: '/test' } });
        expect(path.strictParse('/Test')).toMatchObject({ match: { path: '/Test' } });
        expect(path.strictParse('/TEST', { caseSensitive: true })).toBeNull();
    });

    // it('should be to overwrite options when building', () => {
    //     const path = new Path<{ param: string; enabled?: boolean }>('/:param?enabled', {
    //         queryParamFormats: {
    //             booleanFormat: 'string',
    //         },
    //         urlParamsEncoding: 'uriComponent',
    //     });

    //     expect(path.build({ param: 'a+b', enabled: true })).toBe('/a%2Bb?enabled=true');

    //     expect(
    //         path.build(
    //             { param: 'a+b', enabled: true },
    //             {
    //                 queryParamFormats: { booleanFormat: 'empty-true' },
    //                 urlParamsEncoding: 'default',
    //             }
    //         )
    //     ).toBe('/a+b?enabled');
    // });

    // it('should be to overwrite options when matching', () => {
    //     const path = new Path<{ param: string; enabled?: boolean }>('/:param?enabled', {
    //         queryParamFormats: {
    //             booleanFormat: 'string',
    //         },
    //         urlParamsEncoding: 'uriComponent',
    //     });

    //     expect(path.test('/a+b?enabled')).toEqual({
    //         param: 'a+b',
    //         enabled: null,
    //     });

    //     expect(
    //         path.test('/a+b?enabled', {
    //             queryParamFormats: { booleanFormat: 'empty-true' },
    //         })
    //     ).toEqual({
    //         param: 'a+b',
    //         enabled: true,
    //     });
    // });

    // it('test', () => {
    //     // let result = queryString.exclude('/?fos=1&foo[0]=2&foo[1]=3', ['foo', 'fos'], { arrayFormat: 'index' });
    //     // console.debug(result);
    //     let result2 = queryString.parseUrl('?a=1', { arrayFormat: 'index' });
    //     console.debug(result2);
    //     console.debug(queryString.stringifyUrl({ url: '', query: { a: 1 } }));
    //     // console.debug(queryString.stringifyUrl({ url: '', query: { a: 1 } }));
    // });

    it('should match unencoded pipes (Firefox)', () => {
        const path = new Path('/test/:param');

        expect(path.strictParse('/test/1|2')).toMatchObject({ match: { urlParams: { param: '1|2' } } });
    });

    it('should support a wide range of characters', () => {
        const path = new Path('/test/:param');

        expect(path.strictParse('/test/1+2=3@*')).toMatchObject({ match: { urlParams: { param: '1+2=3@*' } } });
    });

    describe('default encoding', () => {
        const path = new Path<{ param: string }>('/:param');

        it('should build with correct encoding', () => {
            expect(
                path.build({
                    param: 'test$@',
                })
            ).toBe('/test$%40');
        });

        it('should match with correct decoding', () => {
            expect(path.strictParse('/test%24%40')).toMatchObject({ match: { urlParams: { param: 'test$@' } } });

            expect(path.parse('/test$@')).toMatchObject({ match: { urlParams: { param: 'test$@' } } });
        });
    });

    describe('uri encoding', () => {
        const path = new Path('/:param', {
            urlParamsEncoding: 'uriComponent',
        });

        it('should build with correct encoding', () => {
            expect(
                path.build({
                    param: 'test$@',
                })
            ).toBe('/test%24%40');
        });

        it('should match with correct decoding', () => {
            expect(path.strictParse('/test%24%40')).toMatchObject({ match: { urlParams: { param: 'test$@' } } });

            expect(path.parse('/test$@')).toMatchObject({ match: { urlParams: { param: 'test$@' } } });
        });
    });

    describe('uriComponent encoding', () => {
        const path = new Path('/:param', {});

        it('should build with correct encoding', () => {
            expect(
                path.build({
                    param: 'test$%',
                })
            ).toBe('/test$%25');
        });

        it('should match with correct decoding', () => {
            expect(path.strictParse('/test$%25')).toMatchObject({ match: { urlParams: { param: 'test$%' } } });

            expect(path.parse('/test$@')).toMatchObject({ match: { urlParams: { param: 'test$@' } } });
        });
    });

    describe('no encoding', () => {
        const path = new Path('/:param', {
            urlParamsEncoding: 'none',
        });

        it('should build with correct encoding', () => {
            expect(
                path.build({
                    param: 'test$%',
                })
            ).toBe('/test$%');
        });

        it('should match with correct decoding', () => {
            expect(path.strictParse('/test$%25')).toMatchObject({ match: { urlParams: { param: 'test$%25' } } });
        });
    });
});
