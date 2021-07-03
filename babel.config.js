module.exports = (api) => {
    api.cache(true);
    return {
        presets: [
            [
                '@babel/preset-env',
                {
                    loose: true,
                },
            ],
            '@babel/react',
        ],
        plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
    };
};
