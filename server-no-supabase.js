const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Temporarily bypass Supabase-dependent routes
const BaseResponse = require('./utils/baseResponse');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Express.js Backend!',
    version: '1.0.0',
    status: 'Running (Supabase Disabled)',
    warning: 'This is a temporary server for testing. Please configure Supabase environment variables.',
    api: {
      base: '/api',
      documentation: 'Check README.md for complete API documentation'
    }
  });
});

// Temporary health check without Supabase
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'Active',
      supabase: 'Disabled - Missing Configuration',
      stytch: process.env.STYTCH_PROJECT_ID ? 'Configured' : 'Not Configured'
    },
    version: '1.0.0',
    warning: 'Supabase is disabled. Configure environment variables to enable full functionality.'
  });
});

// API overview without Supabase-dependent endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to 7awel Crypto Wallet API! (Limited Mode)',
    version: '1.0.0',
    description: 'RESTful API - Currently running without Supabase',
    warning: 'Most endpoints are disabled. Please configure Supabase environment variables.',
    availableEndpoints: {
      health: '/api/health',
      status: '/api/status'
    },
    setup: {
      guide: 'Check ENVIRONMENT_SETUP.md for configuration instructions',
      stytchGuide: 'Check STYTCH_SETUP_GUIDE.md for Stytch setup',
      requiredVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
    }
  });
});

// Status endpoint to check environment variables
app.get('/api/status', (req, res) => {
  const envStatus = {
    supabase: {
      url: !!process.env.SUPABASE_URL,
      anonKey: !!process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    stytch: {
      projectId: !!process.env.STYTCH_PROJECT_ID,
      secret: !!process.env.STYTCH_SECRET
    },
    optional: {
      redis: !!process.env.REDIS_URL,
      jwt: !!process.env.JWT_SECRET
    }
  };

  const allRequired = envStatus.supabase.url && 
                     envStatus.supabase.anonKey && 
                     envStatus.supabase.serviceRoleKey &&
                     envStatus.stytch.projectId &&
                     envStatus.stytch.secret;

  res.json({
    status: allRequired ? 'Ready' : 'Configuration Incomplete',
    environment: envStatus,
    nextSteps: allRequired ? 
      ['Switch to main server.js', 'Run npm run dev'] :
      ['Create .env file', 'Add missing environment variables', 'Check ENVIRONMENT_SETUP.md'],
    message: allRequired ? 
      'All required environment variables are set!' :
      'Some required environment variables are missing.'
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  return BaseResponse.error(
    res, 
    process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    500,
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
});

// 404 handler
app.use('*', (req, res) => {
  return BaseResponse.notFound(
    res, 
    `Cannot ${req.method} ${req.originalUrl}. Server is running in limited mode - configure Supabase to enable all endpoints.`
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT} (Limited Mode)`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Status check: http://localhost:${PORT}/api/status`);
  console.log(`⚠️  Warning: Supabase is disabled - configure environment variables`);
  console.log(`📋 Setup Guide: Check ENVIRONMENT_SETUP.md`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 