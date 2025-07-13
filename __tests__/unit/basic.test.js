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

  test('Server file should exist and be readable', () => {
    const fs = require('fs');
    expect(fs.existsSync('server.js')).toBe(true);
  });

  test('Public directory should exist', () => {
    const fs = require('fs');
    expect(fs.existsSync('public')).toBe(true);
    expect(fs.existsSync('public/index.html')).toBe(true);
  });
});