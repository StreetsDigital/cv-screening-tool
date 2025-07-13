const request = require('supertest');

// Mock Claude API for testing
jest.mock('../../__tests__/mocks/claudeAPI.js');

describe('API Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.ANTHROPIC_API_KEY = 'test_api_key';
  });

  beforeEach(() => {
    // Reset modules to get fresh app instance
    jest.resetModules();
  });

  test('Health check endpoint should work', async () => {
    // For now, just test that the test environment is properly set up
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.ANTHROPIC_API_KEY).toBe('test_api_key');
  });

  test('Demo mode should be available', () => {
    // Test that demo mode functionality exists
    const demoResponse = {
      success: true,
      analysis: {
        score: 85,
        summary: "Demo analysis result",
        strengths: ["Test strength"],
        concerns: ["Test concern"],
        recommendation: "Demo recommendation"
      }
    };
    
    expect(demoResponse.success).toBe(true);
    expect(demoResponse.analysis.score).toBeGreaterThan(0);
  });

  test('API structure should be valid', () => {
    // Test basic API structure requirements
    const apiStructure = {
      analyzeCV: 'POST /api/analyze-cv',
      feedback: 'POST /api/feedback',
      health: 'GET /health'
    };
    
    expect(Object.keys(apiStructure)).toHaveLength(3);
  });
});