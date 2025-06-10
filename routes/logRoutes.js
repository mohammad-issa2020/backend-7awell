const express = require('express');
const logController = require('../controllers/logController');
const { authenticateToken } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Client-side Logging Routes
 * All routes require authentication
 */

// Rate limiting for regular logging
const logRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 log events per minute (2 per second)
  keyGenerator: (req) => `logs:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many log requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiting for batch logging (more restrictive)
const batchLogRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 batch requests per minute
  keyGenerator: (req) => `logs_batch:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many batch log requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiting for reading logs (lenient)
const readLogRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 read requests per minute
  keyGenerator: (req) => `logs_read:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many log read requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Logging Endpoints
 */

// POST /api/v1/logs - Log single client-side event
router.post('/',
  authenticateToken,
  logRateLimit,
  logController.logEvent
);

// POST /api/v1/logs/batch - Log multiple events in batch
router.post('/batch',
  authenticateToken,
  batchLogRateLimit,
  logController.logBatch
);

// POST /api/v1/logs/performance - Log performance metric
router.post('/performance',
  authenticateToken,
  logRateLimit,
  logController.logPerformance
);

// POST /api/v1/logs/error - Log client-side error
router.post('/error',
  authenticateToken,
  logRateLimit,
  logController.logError
);

/**
 * Reading Endpoints
 */

// GET /api/v1/logs - Get user's client logs
router.get('/',
  authenticateToken,
  readLogRateLimit,
  logController.getLogs
);

// GET /api/v1/logs/analytics - Get analytics summary
router.get('/analytics',
  authenticateToken,
  readLogRateLimit,
  logController.getAnalytics
);

// GET /api/v1/logs/types - Get available event types and categories
router.get('/types',
  authenticateToken,
  logController.getTypes // No rate limit for this simple endpoint
);

module.exports = router; 