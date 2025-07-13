// server.js - Secure Express server for CV screening tool
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database and routes
const Database = require('./database/db');
const candidatesRoutes = require('./routes/candidates');
const jobsRoutes = require('./routes/jobs');
const applicationsRoutes = require('./routes/applications');
const feedbackRoutes = require('./routes/feedback');
const migrationRoutes = require('./routes/migration');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.vercel.app'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rate limiting - 10 requests per hour per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Database API routes
app.use('/api/candidates', candidatesRoutes(db));
app.use('/api/jobs', jobsRoutes(db));
app.use('/api/applications', applicationsRoutes(db));
app.use('/api/feedback', feedbackRoutes(db));
app.use('/api/migration', migrationRoutes(db));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await db.testConnection();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      rateLimit: {
        windowMs: 60 * 60 * 1000,
        max: 10
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message
    });
  }
});

// Request logging middleware
app.use('/api/', (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.path} from ${req.ip} at ${new Date().toISOString()}`);
  next();
});

// Proxy endpoint for Anthropic API
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt, type } = req.body;
    
    // Validation
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt is required' });
    }
    
    if (!type || !['extract_requirements', 'analyze_cv'].includes(type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    // Prompt length validation (prevent abuse)
    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt too long' });
    }
    
    console.log(`Making Anthropic API call for type: ${type}`);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: type === 'extract_requirements' ? 1000 : 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error ${response.status}:`, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Anthropic API success for type: ${type}`);
    
    res.json(data);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Rate limit: 10 requests per hour per IP`);
  console.log(`🔐 API key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection on startup
  try {
    const dbConnected = await db.testConnection();
    if (dbConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('⚠️  Database connection failed - running in localStorage mode');
    }
  } catch (error) {
    console.log('⚠️  Database error - running in localStorage mode:', error.message);
  }
});