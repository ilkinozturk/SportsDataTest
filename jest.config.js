module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'utils/**/*.js',
    'schemas/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/test-*.js',
    '!**/*.test.js',
  ],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/logs/'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
