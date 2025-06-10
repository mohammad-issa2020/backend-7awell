const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');
const { authenticateAdmin, requireAdminPermission } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Admin Authentication Routes
 */

// Rate limiting for admin auth endpoints
const adminAuthRateLimit = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  keyGenerator: (req) => `admin_auth:${req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many admin authentication attempts. Please try again later.',
    code: 'ADMIN_AUTH_RATE_LIMIT_EXCEEDED'
  }
});

// More restrictive rate limiting for sensitive admin operations
const adminSensitiveRateLimit = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  keyGenerator: (req) => `admin_sensitive:${req.ip}`,
  message: {
    status: 'ERROR',
    message: 'Too many sensitive admin operations. Please try again later.',
    code: 'ADMIN_SENSITIVE_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Public Admin Authentication Routes (no auth required)
 */

// POST /api/v1/admin/auth/login - Admin login
router.post('/login',
  adminAuthRateLimit,
  adminAuthController.login
);

// GET /api/v1/admin/auth/validate - Validate admin token (for debugging)
router.get('/validate',
  adminAuthController.validateToken
);

/**
 * Protected Admin Routes (require admin authentication)
 */

// POST /api/v1/admin/auth/logout - Admin logout
router.post('/logout',
  authenticateAdmin,
  adminAuthController.logout
);

// GET /api/v1/admin/auth/me - Get admin profile
router.get('/me',
  authenticateAdmin,
  adminAuthController.getProfile
);

// POST /api/v1/admin/auth/change-password - Change admin password
router.post('/change-password',
  authenticateAdmin,
  adminSensitiveRateLimit,
  adminAuthController.changePassword
);

/**
 * Super Admin Routes (require admin permissions)
 */

// POST /api/v1/admin/auth/create - Create new admin (development only)
router.post('/create',
  adminSensitiveRateLimit,
  adminAuthController.createAdmin
);

module.exports = router; 