// Mock Redis client
const createClient = jest.fn(() => ({
  connect: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  isOpen: true,
}));

module.exports = {
  createClient,
};