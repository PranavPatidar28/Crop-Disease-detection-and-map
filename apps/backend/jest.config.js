/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  // reflect-metadata is imported by main.ts in the app; tests need it too so
  // class-transformer / class-validator decorators resolve their metadata.
  setupFiles: ['reflect-metadata'],
  // Silences NestJS Logger noise; runs after the test framework is ready.
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          // Decorator metadata is needed for class-transformer/class-validator specs.
          emitDecoratorMetadata: true,
          experimentalDecorators: true,
        },
      },
    ],
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
};
