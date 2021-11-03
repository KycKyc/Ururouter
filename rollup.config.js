import pluginNodeResolve from '@rollup/plugin-node-resolve';
import pluginTypescript from 'rollup-plugin-ts';
import del from 'rollup-plugin-delete';
import pkg from './package.json';
import { terser } from 'rollup-plugin-terser';

const inputFileName = 'src/index.ts';
const moduleName = pkg.name;

const config = [
    {
        input: inputFileName,
        output: [
            {
                file: pkg.main,
                name: moduleName,
                sourcemap: true,
                format: 'umd',
                esModule: false,
                banner: '// => Router',
                exports: 'named',
                globals: {
                    react: 'React',
                },
            },
            {
                file: pkg.main.replace('.js', '.min.js'),
                name: moduleName,
                sourcemap: true,
                format: 'umd',
                esModule: false,
                banner: '// => Router',
                plugins: [terser({ ecma: 8, safari10: true })],
                exports: 'named',
                globals: {
                    react: 'React',
                },
            },
        ],
        external: ['react'],
        plugins: [
            pluginTypescript({
                transpiler: 'babel',
                tsconfig: 'tsconfig.prod.json',
            }),
            del({ targets: 'dist/*' }),
            pluginNodeResolve(),
        ],
    },
    {
        input: inputFileName,
        output: [
            {
                file: pkg.moduleBundle,
                sourcemap: true,
                format: 'es',
                exports: 'named',
                banner: '// => Router',
                globals: {
                    react: 'React',
                },
            },
        ],
        external: ['react'],
        plugins: [
            pluginTypescript({
                transpiler: 'babel',
                target: 'es6',
                tsconfig: 'tsconfig.prod.json',
            }),
            pluginNodeResolve(),
        ],
    },
];

export default config;
