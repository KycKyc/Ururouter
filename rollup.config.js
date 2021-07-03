import pluginCommonjs from '@rollup/plugin-commonjs';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import pluginTypescript from 'rollup-plugin-ts';
import pkg from './package.json';

const inputFileName = 'src/index.ts';
const moduleName = pkg.name;

const config = [
    {
        input: inputFileName,
        output: [
            {
                file: pkg.module,
                sourcemap: true,
                format: 'es',
                exports: 'named',
            },
            {
                file: pkg.main,
                name: moduleName,
                sourcemap: true,
                format: 'cjs',
                exports: 'named',
            },
        ],
        plugins: [
            pluginTypescript({
                transpiler: 'babel',
            }),
            pluginCommonjs(),
            pluginNodeResolve(),
        ],
    },
];

export default config;
