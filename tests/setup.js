// Jest setup file
// Configure test environment and global mocks

// Set test environment
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test-api-key';
process.env.PORT = '3002';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn
};

// Mock external API calls
jest.mock('axios');

// Set default test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});