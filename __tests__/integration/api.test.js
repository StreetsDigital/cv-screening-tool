const request = require('supertest');
const { mockClaudeResponses } = require('../mocks/claudeAPI');

// Mock the Anthropic API to avoid real API calls during testing
jest.mock('@anthropic-ai/sdk', () => {
  return {
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{
            text: JSON.stringify(mockClaudeResponses.analyzeCV.analysis)
          }]
        })
      }
    }))
  };
});

// Import app after mocking
const app = require('../../server');

describe('API Integration Tests', () => {
  describe('POST /api/analyze-cv', () => {
    const validRequest = {
      cvText: "John Doe\nSoftware Engineer\n5 years experience with JavaScript, Node.js, React\nBachelor's in Computer Science\nTeam Lead at Tech Company",
      jobDescription: "Looking for a Senior JavaScript Developer with 3+ years experience in Node.js and React. Leadership experience preferred.",
      demoMode: false
    };

    test('should analyze CV successfully with valid input', async () => {
      const response = await request(app)
        .post('/api/analyze-cv')
        .send(validRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('score');
      expect(response.body.analysis).toHaveProperty('summary');
      expect(response.body.analysis).toHaveProperty('strengths');
      expect(response.body.analysis).toHaveProperty('concerns');
      expect(response.body.analysis).toHaveProperty('recommendation');
    });

    test('should handle demo mode correctly', async () => {
      const demoRequest = { ...validRequest, demoMode: true };
      
      const response = await request(app)
        .post('/api/analyze-cv')
        .send(demoRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.analysis.score).toBeGreaterThan(80);
    });

    test('should validate required fields', async () => {
      const invalidRequest = {
        cvText: "",
        jobDescription: validRequest.jobDescription,
        demoMode: false
      };

      const response = await request(app)
        .post('/api/analyze-cv')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing job description', async () => {
      const invalidRequest = {
        cvText: validRequest.cvText,
        jobDescription: "",
        demoMode: false
      };

      const response = await request(app)
        .post('/api/analyze-cv')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/analyze-cv')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
  describe('POST /api/feedback', () => {
    const validFeedback = {
      cvText: "John Doe CV content",
      jobDescription: "Job requirements",
      analysis: mockClaudeResponses.analyzeCV.analysis,
      feedback: "positive"
    };

    test('should accept positive feedback', async () => {
      const response = await request(app)
        .post('/api/feedback')
        .send(validFeedback)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should accept negative feedback', async () => {
      const negativeFeedback = { ...validFeedback, feedback: "negative" };
      
      const response = await request(app)
        .post('/api/feedback')
        .send(negativeFeedback)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should validate feedback type', async () => {
      const invalidFeedback = { ...validFeedback, feedback: "invalid" };
      
      const response = await request(app)
        .post('/api/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should require all feedback fields', async () => {
      const incompleteFeedback = {
        cvText: "CV content",
        feedback: "positive"
        // Missing jobDescription and analysis
      };
      
      const response = await request(app)
        .post('/api/feedback')
        .send(incompleteFeedback)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting after multiple requests', async () => {
      const requests = [];
      const validRequest = {
        cvText: "Test CV",
        jobDescription: "Test Job",
        demoMode: true
      };

      // Make multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/analyze-cv')
            .send(validRequest)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimited = responses.filter(res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    test('should return server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
