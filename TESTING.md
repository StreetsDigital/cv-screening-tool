# Testing Guide

## 🧪 Overview

This project uses Jest for unit testing and Supertest for API integration testing. All tests are designed to run without requiring external API calls or database connections.

## 📁 Test Structure

```
__tests__/
├── setup.js              # Global test configuration
├── mocks/                 # Mock functions and data
│   └── claudeAPI.js      # Mock Claude API responses
├── unit/                 # Unit tests for individual functions
│   └── utilities.test.js # Utility function tests
└── integration/          # Integration tests for API endpoints
    └── api.test.js       # API endpoint tests
```

## 🚀 Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (re-runs tests on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Test Coverage

After running `npm run test:coverage`, open `coverage/index.html` in your browser to view detailed coverage reports.

**Coverage Targets:**
- Functions: > 80%
- Lines: > 80%
- Branches: > 70%
- Statements: > 80%

## 🎯 What's Tested

### API Endpoints
- ✅ `POST /api/analyze-cv` - CV analysis with valid and invalid inputs
- ✅ `POST /api/feedback` - Feedback submission with validation
- ✅ Rate limiting functionality
- ✅ Error handling and validation

### Unit Functions
- ✅ Input validation (CV text, job description, feedback)
- ✅ Score processing and normalization
- ✅ Text processing utilities
- ✅ Keyword extraction and similarity calculation

### Mocked Components
- ✅ Claude API calls (no real API usage during tests)
- ✅ Database operations (for Phase 2.5 preparation)
- ✅ Email services (for Phase 2.5 preparation)

## 🛠️ Writing New Tests

### Unit Test Example
```javascript
// __tests__/unit/myFunction.test.js
describe('My Function', () => {
  test('should do something expected', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Integration Test Example
```javascript
// __tests__/integration/myEndpoint.test.js
const request = require('supertest');
const app = require('../../server');

describe('POST /api/my-endpoint', () => {
  test('should return success with valid input', async () => {
    const response = await request(app)
      .post('/api/my-endpoint')
      .send(validData)
      .expect(200);
      
    expect(response.body).toHaveProperty('success', true);
  });
});
```

## 🔄 Continuous Integration

Tests run automatically on:
- ✅ Every push to `main` or `develop` branches
- ✅ Every pull request to `main`
- ✅ Multiple Node.js versions (16.x, 18.x, 20.x)

### GitHub Actions Workflow
The CI/CD pipeline includes:
1. **Dependency Installation** - `npm ci`
2. **Unit Tests** - `npm run test:unit`
3. **Integration Tests** - `npm run test:integration`
4. **Coverage Report** - `npm run test:coverage`
5. **Security Scan** - `npm audit`
6. **Build Verification** - `npm run build`

## 🐛 Debugging Tests

### Common Issues

**Test Timeout:**
```bash
# Increase timeout in jest.config.json
"testTimeout": 10000
```

**API Mock Not Working:**
```javascript
// Ensure mocks are set up before importing modules
jest.mock('@anthropic-ai/sdk');
const app = require('../../server');
```

**Environment Variables:**
```bash
# Tests use .env.test file
NODE_ENV=test npm test
```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- __tests__/unit/utilities.test.js

# Run tests matching pattern
npm test -- --testNamePattern="CV Analysis"
```

## 📈 Phase 2.5 Test Preparation

The testing framework is ready for Phase 2.5 features:

### Database Testing
- Mock PostgreSQL operations
- Test database migrations
- Validate candidate search functionality

### Email Testing
- Mock SendGrid/Mailgun APIs
- Test email template rendering
- Validate automation triggers

### LinkedIn Integration Testing
- Mock LinkedIn API calls
- Test URL generation
- Validate connection tracking

## 🎯 Best Practices

1. **Test Isolation** - Each test should be independent
2. **Mock External APIs** - No real API calls in tests
3. **Descriptive Names** - Clear test descriptions
4. **Edge Cases** - Test boundary conditions
5. **Error Scenarios** - Test error handling
6. **Performance** - Keep tests fast (<10s total)

## 📞 Getting Help

If tests fail:
1. Check the error message and stack trace
2. Verify environment variables in `.env.test`
3. Ensure all dependencies are installed
4. Check that mocks are properly configured
5. Review the test documentation above

For additional help, create an issue in the repository with:
- Test command that failed
- Full error message
- Environment details (Node.js version, OS)
