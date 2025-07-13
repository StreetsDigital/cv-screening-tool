const request = require('supertest');

// Mock the server for testing
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  use: jest.fn(),
  listen: jest.fn()
};

describe('Basic Application Tests', () => {
  test('Environment should be set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Required environment variables should be set', () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
  });

  test('Package.json should have required fields', () => {
    const packageJson = require('../../package.json');
    expect(packageJson.name).toBe('cv-screening-tool');
    expect(packageJson.version).toBeDefined();
    expect(packageJson.main).toBe('server.js');
  });

  test('Server file should exist', () => {
    expect(() => {
      require('../../server.js');
    }).not.toThrow();
  });
});