const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  authActivityLogger,
  securityActivityLogger,
  suspiciousActivityTracker,
  errorActivityLogger
} = require('../middleware/activityMiddleware');
const {
  validateBody,
  validateQuery,
  checkAvailabilitySchema,
  sendOTPSchema,
  verifyOTPSchema,
  loginSchema,
  refreshTokenSchema,
  startVerificationSchema,
  sendVerificationOTPSchema,
  verifyVerificationOTPSchema,
  completeLoginSchema
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting configurations
const otpRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests per window
  message: {
    statusCode: 429,
    message: 'Too many OTP requests, please try again in 5 minutes',
    errorCode: 'OTP_RATE_LIMIT_EXCEEDED',
    traceId: require('uuid').v4()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    statusCode: 429,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    traceId: require('uuid').v4()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: {
    statusCode: 429,
    message: 'Too many login attempts, please try again in 15 minutes',
    errorCode: 'LOGIN_RATE_LIMIT_EXCEEDED',
    traceId: require('uuid').v4()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting and suspicious activity tracking to all auth routes
router.use(generalRateLimit);
router.use(suspiciousActivityTracker());
router.use(errorActivityLogger());

// Public routes (no authentication required)

router.get(
  '/check-availability',
  validateQuery(checkAvailabilitySchema),
  authController.checkAvailability
);

router.post(
  '/otp/send',
  otpRateLimit,
  validateBody(sendOTPSchema),
  authActivityLogger('Send OTP'),
  authController.sendOTP
);

router.post(
  '/otp/verify',
  validateBody(verifyOTPSchema),
  authActivityLogger('Verify OTP'),
  authController.verifyOTP
);

router.post(
  '/login',
  loginRateLimit,
  validateBody(loginSchema),
  authActivityLogger('User login'),
  authController.login
);

router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  authActivityLogger('Refresh session'),
  authController.refreshSession
);

router.get(
  '/me',
  authenticateToken,
  authController.getCurrentUser
);

router.get(
  '/sessions',
  authenticateToken,
  securityActivityLogger('Get sessions'),
  authController.getSessions
);

router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  securityActivityLogger('Revoke session'),
  authController.revokeSession
);

router.delete(
  '/sessions',
  authenticateToken,
  securityActivityLogger('Revoke all sessions'),
  authController.revokeAllSessions
);

router.post(
  '/logout',
  authenticateToken,
  authActivityLogger('User logout'),
  authController.logout
);

router.get(
  '/devices',
  authenticateToken,
  securityActivityLogger('Get devices'),
  authController.getDevices
);

router.delete(
  '/devices/:deviceId',
  authenticateToken,
  securityActivityLogger('Revoke device'),
  authController.revokeDevice
);

router.delete(
  '/devices',
  authenticateToken,
  securityActivityLogger('Revoke all devices'),
  authController.revokeAllSessions
);

// Multi-step verification routes
router.post(
  '/verification/start',
  validateBody(startVerificationSchema),
  authActivityLogger('Start Verification'),
  authController.startVerification
);

router.post(
  '/verification/send-otp',
  validateBody(sendVerificationOTPSchema),
  authActivityLogger('Send Verification OTP'),
  authController.sendVerificationOTP
);

router.post(
  '/verification/verify-otp',
  validateBody(verifyVerificationOTPSchema),
  authActivityLogger('Verify Verification OTP'),
  authController.verifyVerificationOTP
);

router.post(
  '/verification/complete-login',
  validateBody(completeLoginSchema),
  authActivityLogger('Complete Login'),
  authController.completeLogin
);

router.get(
  '/verification/status/:sessionId',
  authActivityLogger('Get Verification Status'),
  authController.getVerificationStatus
);

module.exports = router; 