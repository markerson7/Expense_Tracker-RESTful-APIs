import { jest } from '@jest/globals';

// Mock DB module
jest.unstable_mockModule('./src/config/db.js', () => ({
  connectDB: jest.fn(),
  disconnectDB: jest.fn(),
  getIsConnected: jest.fn(),
  setIsConnected: jest.fn(),
}));

describe('app.js branch coverage', () => {
  let originalEnv;
  let dbModule;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    dbModule = await import('./src/config/db.js');
  });

  it('should call connectDB and app.listen when NODE_ENV is not test', async () => {
    process.env.NODE_ENV = 'development';
    // Mock app.listen before import
    const expressModule = await import('express');
    jest.spyOn(expressModule.default.application, 'listen').mockImplementation(() => {});
    const appModule = await import('./src/app.js');
    expect(dbModule.connectDB).toHaveBeenCalled();
    expect(expressModule.default.application.listen).toHaveBeenCalled();
    expect(appModule.default).toBeDefined();
    expressModule.default.application.listen.mockRestore();
  });

  // ...other tests for routes and middleware...
});