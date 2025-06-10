const express = require('express');
const promotionController = require('../controllers/promotionController');
const { authenticateToken, authenticateAdmin, adminOnly } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Promotion Routes
 * User routes require user authentication
 * Admin routes require admin authentication
 */

// Rate limiting for promotion endpoints
const promotionRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req) => `promotions:${req.user?.id || req.admin?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many promotion requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiting for promotion tracking (more restrictive)
const trackingRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 tracking events per minute
  keyGenerator: (req) => `promotion_tracking:${req.user?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many tracking requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Admin rate limiting (more lenient)
const adminRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 admin requests per minute
  keyGenerator: (req) => `promotions_admin:${req.admin?.id || req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many admin requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * User Promotion Endpoints (require user authentication)
 */

// GET /api/v1/promotions - Get promotions for user
router.get('/', 
  authenticateToken,
  promotionRateLimit,
  promotionController.getPromotions
);

/**
 * Admin Promotion Endpoints (require admin authentication)
 */


// GET /api/v1/promotions/all - Get all promotions (admin)
router.get('/all',
  authenticateAdmin,
  adminOnly,
  adminRateLimit,
  promotionController.getAllPromotions
);

// DELETE /api/v1/promotions/cache - Clear promotion cache (admin)
router.delete('/cache',
  authenticateAdmin,
  adminOnly,
  adminRateLimit,
  promotionController.clearCache
);

/**
 * Admin Promotion Management Endpoints (require admin authentication)
 */

// POST /api/v1/promotions - Create new promotion (admin)
router.post('/',
  authenticateAdmin,
  adminOnly,
  adminRateLimit,
  promotionController.createPromotion
);

// PUT /api/v1/promotions/:promotionId - Update promotion (admin)
router.put('/:promotionId',
  authenticateAdmin,
  adminOnly,
  adminRateLimit,
  promotionController.updatePromotion
);

// DELETE /api/v1/promotions/:promotionId - Delete promotion (admin)
router.delete('/:promotionId',
  authenticateAdmin,
  adminOnly,
  adminRateLimit,
  promotionController.deletePromotion
);

module.exports = router; 