import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import del from 'rollup-plugin-delete';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const inputFileName = 'src/index.ts';
const moduleName = pkg.name;

const extensions = ['.js', '.ts', '.tsx', '.json'];

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
                banner: '// => Router42',
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
                banner: '// => Router42',
                plugins: [terser({ ecma: 8, safari10: true })],
                exports: 'named',
                globals: {
                    react: 'React',
                },
            },
        ],
        external: ['react'],
        plugins: [
            babel({
                include: 'src/**/*',
                exclude: '**/node_modules/**',
                babelHelpers: 'runtime',
                extensions,
            }),
            commonjs(),
            del({ targets: 'dist/*' }),
            nodeResolve({
                extensions,
            }),
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
            babel({
                include: 'src/**/*',
                exclude: '**/node_modules/**',
                babelHelpers: 'runtime',
                extensions,
            }),
            commonjs(),
            nodeResolve({
                extensions,
            }),
        ],
    },
];

export default config;
