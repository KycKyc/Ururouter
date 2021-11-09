module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleDirectories: ['node_modules', 'src'],
    roots: ['<rootDir>/src/'],
    collectCoverage: true,
    testTimeout: 20000,
};
