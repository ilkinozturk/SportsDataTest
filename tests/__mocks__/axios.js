// Mock axios for testing

const axios = {
  get: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  post: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  put: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  delete: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  patch: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  create: jest.fn(() => axios),
  defaults: {
    headers: {
      common: {},
      post: {},
      get: {},
      put: {},
      patch: {},
      delete: {}
    }
  }
};

module.exports = axios;
