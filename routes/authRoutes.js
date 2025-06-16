import express from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  authActivityLogger,
  securityActivityLogger,
  suspiciousActivityTracker,
  errorActivityLogger
} from '../middleware/activityMiddleware.js';
import {
  validateBody,
  validateQuery,
  checkAvailabilitySchema,
  refreshTokenSchema,
  startVerificationSchema,
  sendVerificationOTPSchema,
  verifyVerificationOTPSchema,
  completeLoginSchema
} from '../middleware/validation.js';

const router = express.Router();


const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    statusCode: 429,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    traceId: uuidv4()
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

// Wallet management routes (require authentication)
router.post(
  '/create-wallet',
  authenticateToken,
  authActivityLogger('Create Wallet'),
  authController.createWallet
);

router.get(
  '/wallet',
  authenticateToken,
  authActivityLogger('Get Wallet Info'),
  authController.getWallet
);

export default router; 