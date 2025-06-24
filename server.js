import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import routes
import apiRoutes from './routes/index.js';
import BaseResponse, { createSuccessResponse, createErrorResponse } from './utils/baseResponse.js';

// Import Winston logging
import logger from './utils/logger.js';
import { 
  winstonMorgan, 
  winstonLoggingMiddleware, 
  errorLoggingMiddleware,
  authLoggingMiddleware,
  transactionLoggingMiddleware 
} from './middleware/winstonMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS

// Winston logging middleware
app.use(winstonMorgan); // HTTP request logging through Winston
app.use(winstonLoggingMiddleware({
  logRequests: true,
  logResponses: true,
  includeBody: process.env.NODE_ENV === 'development',
  excludePaths: ['/health', '/ping', '/favicon.ico']
}));

// Specific logging middleware
app.use(authLoggingMiddleware);
app.use(transactionLoggingMiddleware);

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

// Winston error logging middleware
app.use(errorLoggingMiddleware);

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log error using Winston (already logged by errorLoggingMiddleware, but this ensures it's logged)
  logger.logError(err, {
    url: req.originalUrl,
    method: req.method,
    statusCode: err.status || 500
  }, req.user?.id, req);
  
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
  const startupMessage = `🚀 Server is running on port ${PORT}`;
  const apiInfo = {
    port: PORT,
    apiUrl: `http://localhost:${PORT}/api`,
    healthCheck: `http://localhost:${PORT}/api/health`,
    testEndpoints: `http://localhost:${PORT}/api/tests`,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  };

  // Log to Winston
  logger.info(startupMessage, {
    category: 'startup',
    ...apiInfo
  });

  // Also log to console for immediate feedback
  console.log(startupMessage);
  console.log(`📱 API Base URL: ${apiInfo.apiUrl}`);
  console.log(`🏥 Health check: ${apiInfo.healthCheck}`);
  console.log(`🧪 Test endpoints: ${apiInfo.testEndpoints}`);
  console.log(`🌍 Environment: ${apiInfo.environment}`);
  console.log(`📝 Log Level: ${apiInfo.logLevel}`);
  console.log(`📁 Logs Directory: ./logs/`);
});

export default app; 