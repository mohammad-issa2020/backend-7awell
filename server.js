import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes
import apiRoutes from './routes/index.js';
import BaseResponse, { createSuccessResponse, createErrorResponse } from './utils/baseResponse.js';

// Import Enhanced logging system
import logger from './utils/logger.js';
import { correlationMiddleware } from './src/logger/correlation.js';
import { httpLogger, detailedLoggingMiddleware, securityLoggingMiddleware } from './src/logger/middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// =================== CRITICAL: Correlation tracking MUST be first ===================
app.use(correlationMiddleware);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS

// Enhanced logging middleware
app.use(httpLogger); // HTTP request/response logging
app.use(detailedLoggingMiddleware()); // Detailed request logging
app.use(securityLoggingMiddleware); // Security monitoring

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Root route
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed', {
    category: 'api',
    endpoint: '/',
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    message: 'Welcome to Enhanced Express.js Backend!',
    version: '2.0.0',
    status: 'Running',
    features: {
      enhancedLogging: true,
      correlationTracking: true,
      structuredLogs: true
    },
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
  // Log error using enhanced logger
  logger.logError(err, {
    url: req.originalUrl,
    method: req.method,
    statusCode: err.status || 500,
    category: 'error'
  });
  
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
  const startupMessage = `🚀 Enhanced server started successfully`;
  const apiInfo = {
    port: PORT,
    apiUrl: `http://localhost:${PORT}/api`,
    healthCheck: `http://localhost:${PORT}/health`,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'debug',
    nodeVersion: process.version,
    enhancedLogging: true,
    correlationTracking: true
  };

  // Log startup with enhanced logger
  logger.info(startupMessage, {
    category: 'startup',
    ...apiInfo
  });

  // Log feature activation
  logger.info('Enhanced logging features activated', {
    category: 'startup',
    features: {
      correlationIds: true,
      structuredLogging: true,
      securityMonitoring: true,
      performanceTracking: true,
      fileRotation: true,
      lokiIntegration: false
    }
  });

  // Console output for immediate feedback
  console.log('🎉 Enhanced Express.js Backend Started!');
  console.log(`🚀 Port: ${PORT}`);
  console.log(`📱 API: ${apiInfo.apiUrl}`);
  console.log(`🏥 Health: ${apiInfo.healthCheck}`);
  console.log(`🌍 Environment: ${apiInfo.environment}`);
  console.log(`📝 Log Level: ${apiInfo.logLevel}`);
  console.log(`📁 Logs: ./logs/ (with daily rotation)`);
  console.log('✨ NEW FEATURES:');
  console.log('   🔗 Correlation tracking for all requests');
  console.log('   📊 Structured JSON logging');
  console.log('   🛡️  Enhanced security monitoring');
  console.log('   ⚡ Performance tracking');
  console.log('   🔄 Daily log rotation');
  console.log('   📡 Loki integration disabled');
});

export default app; 