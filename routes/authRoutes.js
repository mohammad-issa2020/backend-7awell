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
import { validateBody, validateQuery } from '../middleware/validation.js';
import {
  checkAvailabilitySchema,
  refreshTokenSchema,
  startVerificationSchema,
  sendVerificationOTPSchema,
  verifyVerificationOTPSchema,
  completeLoginSchema,
  phoneLoginSchema,
  phoneVerifySchema,
  emailLoginSchema,
  emailVerifySchema,
  phoneChangeStartSchema,
  phoneChangeVerifyOldSchema,
  phoneChangeVerifyNewSchema
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
  authController.getSessions
);

router.delete(
  '/devices/:deviceId',
  authenticateToken,
  securityActivityLogger('Revoke device'),
  authController.revokeSession
);

router.delete(
  '/devices',
  authenticateToken,
  securityActivityLogger('Revoke all devices'),
  authController.revokeAllSessions
);


// NEW: Sequential Authentication Flow Routes
// Step 1: Send phone OTP
router.post(
  '/login/phone',
  validateBody(phoneLoginSchema),
  authActivityLogger('Start Phone Login'),
  authController.startPhoneLogin
);

// Step 2: Verify phone OTP
router.post(
  '/login/phone/verify',
  validateBody(phoneVerifySchema),
  authActivityLogger('Verify Phone OTP'),
  authController.verifyPhoneOTP
);

// Step 3: Send email OTP  
router.post(
  '/login/email',
  validateBody(emailLoginSchema),
  authActivityLogger('Start Email Login'),
  authController.startEmailLogin
);

// Step 4: Verify email OTP (without completing login)
router.post(
  '/login/email/verify',
  validateBody(emailVerifySchema),
  authActivityLogger('Verify Email OTP'),
  authController.verifyEmailOTP
);

// Step 5: Complete login after both verifications
router.post(
  '/login/complete',
  validateBody(completeLoginSchema),
  authActivityLogger('Complete Login'),
  authController.completeLogin
);

// NEW: Phone Change with OTP Verification (Guarded Operation)
// Step 1: Start phone change - Send OTP to old phone
router.post(
  '/phone/change/start',
  authenticateToken,
  validateBody(phoneChangeStartSchema),
  authActivityLogger('Start Phone Change'),
  authController.startPhoneChange
);

// Step 2: Verify old phone OTP - Send OTP to new phone
router.post(
  '/phone/change/verify-old',
  authenticateToken,
  validateBody(phoneChangeVerifyOldSchema),
  authActivityLogger('Verify Old Phone OTP'),
  authController.verifyOldPhoneOTP
);

// Step 3: Verify new phone OTP and complete change
router.post(
  '/phone/change/verify-new',
  authenticateToken,
  validateBody(phoneChangeVerifyNewSchema),
  authActivityLogger('Verify New Phone OTP and Complete Change'),
  authController.verifyNewPhoneOTPAndComplete
);



export default router; 