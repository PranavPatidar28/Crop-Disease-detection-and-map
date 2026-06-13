/**
 * Jest config for pure-logic unit tests only (utils with no React Native /
 * Expo runtime imports). Uses babel-jest with an INLINE babel config
 * (configFile/babelrc disabled) so Metro's own babel setup is never touched,
 * and so we avoid ts-jest (incompatible with this app's TypeScript 6).
 *
 * Scope is intentionally limited via testMatch to src/**\/utils. Testing
 * components / hooks would require jest-expo + a RN test environment, which is
 * a separate, larger effort.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  // supercluster + its kdbush dep ship ESM; transform them (they live under
  // pnpm's nested .pnpm/<pkg>@<ver>/ layout). Everything else stays ignored.
  transformIgnorePatterns: ['/node_modules/.pnpm/(?!(supercluster|kdbush)@)'],
  clearMocks: true,
};
