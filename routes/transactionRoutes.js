import express from 'express';
import transactionController from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import rateLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Transaction Routes
 * All routes require authentication
 */

// Rate limiting for transaction reading (lenient)
const transactionReadRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Higher limit for tests
  keyGenerator: (req) => `transactions_read:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many transaction read requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiting for transaction writing (more restrictive)
const transactionWriteRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 30, // Higher limit for tests
  keyGenerator: (req) => `transactions_write:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many transaction write requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiting for stats and analytics (moderate)
const transactionStatsRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 stats requests per minute
  keyGenerator: (req) => `transactions_stats:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many statistics requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// GET /api/v1/transactions/options - Get available transaction types, statuses, etc.
router.get('/options',
  authenticateToken,
  transactionController.getTransactionOptions // No rate limit for this simple endpoint
);


/**
 * Main Transaction Endpoints
 */

// GET /api/v1/transactions - List transactions with cursor-based pagination
router.get('/',
  authenticateToken,
  transactionReadRateLimit,
  transactionController.getTransactions
);

// POST /api/v1/transactions - Create a new transaction
router.post('/',
  authenticateToken,
  transactionWriteRateLimit,
  transactionController.createTransaction
);

/**
 * Single Transaction Endpoints (must come after specific routes)
 */

// GET /api/v1/transactions/{id} - Get transaction by ID
router.get('/:id',
  authenticateToken,
  transactionReadRateLimit,
  transactionController.getTransactionById
);

// PATCH /api/v1/transactions/{id}/status - Update transaction status
router.patch('/:id/status',
  authenticateToken,
  transactionWriteRateLimit,
  transactionController.updateTransactionStatus
);

export default router; 