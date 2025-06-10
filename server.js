const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const apiRoutes = require('./routes/index');
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
    status: 'Running',
    api: {
      base: '/api',
      documentation: 'Check README.md for complete API documentation'
    }
  });
});

// API routes
app.use('/api', apiRoutes);

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

// 404 handler - this should be the last route
app.use('*', (req, res) => {
  return BaseResponse.notFound(
    res, 
    `Cannot ${req.method} ${req.originalUrl}. Check /api for available endpoints.`
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoints: http://localhost:${PORT}/api/tests`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 