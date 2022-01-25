const runtimePkg = require('@babel/runtime/package.json');

module.exports = (api) => {
    api.cache(false);
    return {
        presets: [
            [
                '@babel/preset-env',
                {
                    targets: {
                        esmodules: true,
                    },
                    bugfixes: true,
                    modules: false,
                    loose: true,
                },
            ],
            '@babel/preset-react',
        ],
        plugins: [
            [
                '@babel/plugin-transform-typescript',
                {
                    allowDeclareFields: true,
                    isTSX: true,
                },
            ],
            [
                '@babel/plugin-transform-runtime',
                {
                    version: runtimePkg.version,
                },
            ],
            ['@babel/plugin-proposal-class-properties', { loose: true }],
        ],
    };
};
