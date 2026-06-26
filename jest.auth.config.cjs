/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: ['**/auth/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'auth/services/**/*.ts',
    'auth/repositories/redis-token-revocation.repository.ts',
    'auth/strategies/internal.strategy.ts',
    'auth/strategies/enter-app.strategy.ts',
    'auth/strategies/token-refresh.strategy.ts',
  ],
  coverageDirectory: '../coverage-auth',
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
};
