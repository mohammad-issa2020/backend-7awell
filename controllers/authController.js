import authService from '../services/authService.js';
import BaseResponse from '../utils/baseResponse.js';

class AuthController {
  /**
   * Check availability of phone number or email
   * GET /auth/check-availability?medium={phone|email}&value={value}
   */
  async checkAvailability(req, res) {
    try {
      const { medium, value } = req.query;
      
      const result = await authService.checkAvailability(medium, value);
      
      return BaseResponse.success(
        res,
        result,
        `${medium === 'phone' ? 'Phone number' : 'Email'} availability checked`
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to check availability',
        400,
        error.message,
        'AVAILABILITY_CHECK_FAILED'
      );
    }
  }





  /**
   * Create placeholder address for wallet
   * @param {string} userId - user id
   * @returns {string} placeholder address
   */




  /**
   * Refresh/validate Stytch session
   * POST /auth/refresh
   */
  async refreshSession(req, res) {
    try {
      const { refreshToken, session_token } = req.body;
      
      // Handle both parameter names for compatibility
      const sessionToken = session_token || refreshToken;
      
      if (!sessionToken) {
        return BaseResponse.error(
          res,
          'Session token is required',
          400,
          'refreshToken or session_token field is required',
          'MISSING_SESSION_TOKEN'
        );
      }
      
      const result = await authService.refreshSession(sessionToken);
      
      return BaseResponse.success(
        res,
        result,
        'Session refreshed successfully'
      );
    } catch (error) {
      if (error.message.includes('Session authentication failed')) {
        return BaseResponse.unauthorized(
          res,
          'Session expired or invalid',
          'SESSION_EXPIRED'
        );
      }
      
      return BaseResponse.error(
        res,
        'Session refresh failed',
        400,
        error.message,
        'SESSION_REFRESH_FAILED'
      );
    }
  }

  /**
   * Get current user information
   * GET /auth/me
   */
  async getCurrentUser(req, res) {
    try {
      return BaseResponse.success(
        res,
        { user: req.user },
        'User profile retrieved successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to retrieve user profile',
        500,
        error.message,
        'USER_PROFILE_FAILED'
      );
    }
  }

  /**
   * Get user's active sessions
   * GET /auth/sessions
   */
  async getSessions(req, res) {
    try {
      const stytchUserId = req.user.stytchId;
      
      if (!stytchUserId) {
        return BaseResponse.error(
          res,
          'Stytch user ID not found',
          400,
          'Missing Stytch user ID in session',
          'MISSING_STYTCH_USER_ID'
        );
      }
      
      const sessions = await authService.getUserSessions(stytchUserId);
      
      // Format sessions for response
      const formattedSessions = sessions.map(session => ({
        session_id: session.session_id,
        started_at: session.started_at,
        last_accessed_at: session.last_accessed_at,
        expires_at: session.expires_at,
        attributes: session.attributes,
        current: session.session_id === req.user.session.session_id
      }));
      
      return BaseResponse.success(
        res,
        { sessions: formattedSessions },
        'Sessions retrieved successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to retrieve sessions',
        500,
        error.message,
        'SESSIONS_RETRIEVAL_FAILED'
      );
    }
  }

  /**
   * Revoke specific session
   * DELETE /auth/sessions/:sessionId
   */
  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const success = await authService.revokeSession(sessionId);
      
      if (success) {
        return BaseResponse.success(
          res,
          { revoked: true, sessionId },
          'Session revoked successfully'
        );
      } else {
        return BaseResponse.error(
          res,
          'Failed to revoke session',
          400,
          'Session not found or already revoked',
          'SESSION_REVOKE_FAILED'
        );
      }
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to revoke session',
        500,
        error.message,
        'SESSION_REVOKE_FAILED'
      );
    }
  }

  /**
   * Logout from current session
   * POST /auth/logout
   */
  async logout(req, res) {
    try {
      const sessionToken = req.sessionToken;
      
      const success = await authService.logout(sessionToken);
      
      if (success) {
        return BaseResponse.success(
          res,
          { loggedOut: true },
          'Logout successful'
        );
      } else {
        return BaseResponse.error(
          res,
          'Logout failed',
          400,
          'Session not found or already logged out',
          'LOGOUT_FAILED'
        );
      }
    } catch (error) {
      return BaseResponse.error(
        res,
        'Logout failed',
        500,
        error.message,
        'LOGOUT_FAILED'
      );
    }
  }

  /**
   * Revoke all user sessions (logout from all devices)
   * DELETE /auth/sessions
   */
  async revokeAllSessions(req, res) {
    try {
      const stytchUserId = req.user.stytchId;
      
      if (!stytchUserId) {
        return BaseResponse.error(
          res,
          'Stytch user ID not found',
          400,
          'Missing Stytch user ID in session',
          'MISSING_STYTCH_USER_ID'
        );
      }
      
      const success = await authService.revokeAllSessions(stytchUserId);
      
      if (success) {
        return BaseResponse.success(
          res,
          { allSessionsRevoked: true },
          'All sessions revoked successfully'
        );
      } else {
        return BaseResponse.error(
          res,
          'Failed to revoke all sessions',
          400,
          'No active sessions found',
          'REVOKE_ALL_SESSIONS_FAILED'
        );
      }
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to revoke all sessions',
        500,
        error.message,
        'REVOKE_ALL_SESSIONS_FAILED'
      );
    }
  }

  // Legacy route handlers for backward compatibility
  
  /**
   * Legacy refresh token endpoint (redirects to refreshSession)
   * POST /auth/refresh
   */
  async refreshToken(req, res) {
    // Map old refreshToken request to new refreshSession
    if (req.body.refreshToken) {
      req.body.session_token = req.body.refreshToken;
    }
    return this.refreshSession(req, res);
  }

  /**
   * Legacy get devices endpoint (redirects to getSessions)
   * GET /auth/devices
   */
  async getDevices(req, res) {
    return this.getSessions(req, res);
  }

  /**
   * Legacy revoke device endpoint (redirects to revokeSession)
   * DELETE /auth/devices/:deviceId
   */
  async revokeDevice(req, res) {
    // Map deviceId to sessionId
    req.params.sessionId = req.params.deviceId;
    return this.revokeSession(req, res);
  }

  /**
   * Start multi-step verification session
   * POST /auth/verification/start
   */
  async startVerification(req, res) {
    try {
      const { phoneNumber, email } = req.body;
      
      const result = await authService.startVerificationSession(phoneNumber, email);
      
      return BaseResponse.success(
        res,
        result,
        'Verification session started. Please verify both phone and email.',
        200
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to start verification',
        400,
        error.message,
        'VERIFICATION_START_FAILED'
      );
    }
  }

  /**
   * Send OTP for verification step
   * POST /auth/verification/send-otp
   */
  async sendVerificationOTP(req, res) {
    try {
      const { sessionId, medium, channel } = req.body;
      
      const result = await authService.sendVerificationOTP(sessionId, medium, channel);
      
      return BaseResponse.success(
        res,
        result,
        `OTP sent to ${medium}`,
        200
      );
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('session not found') || error.message.includes('expired')) {
        return BaseResponse.error(
          res,
          error.message,
          400,
          error.message,
          'VERIFICATION_SESSION_EXPIRED'
        );
      }

      if (error.message.includes('already verified')) {
        return BaseResponse.error(
          res,
          error.message,
          400,
          error.message,
          'ALREADY_VERIFIED'
        );
      }

      if (error.message.includes('Too many OTP requests')) {
        return BaseResponse.rateLimitExceeded(
          res,
          error.message,
          'OTP_RATE_LIMIT_EXCEEDED'
        );
      }
      
      return BaseResponse.error(
        res,
        'Failed to send verification OTP',
        400,
        error.message,
        'VERIFICATION_OTP_SEND_FAILED'
      );
    }
  }

  /**
   * Verify OTP for verification step (doesn't create session)
   * POST /auth/verification/verify-otp
   */
  async verifyVerificationOTP(req, res) {
    try {
      const { sessionId, medium, otp } = req.body;
      
      const result = await authService.verifyVerificationOTP(sessionId, medium, otp);
      
      return BaseResponse.success(
        res,
        result,
        result.message,
        200
      );
    } catch (error) {
      // Handle specific OTP verification errors
      if (error.message.includes('session not found') || error.message.includes('expired')) {
        return BaseResponse.error(
          res,
          error.message,
          400,
          error.message,
          'VERIFICATION_SESSION_EXPIRED'
        );
      }

      if (error.message.includes('Too many failed attempts')) {
        return BaseResponse.error(
          res,
          error.message,
          429,
          'Maximum verification attempts exceeded',
          'OTP_MAX_ATTEMPTS_EXCEEDED'
        );
      }
      
      if (error.message.includes('Invalid OTP')) {
        return BaseResponse.error(
          res,
          'Invalid OTP code',
          400,
          error.message,
          'INVALID_OTP'
        );
      }

      if (error.message.includes('already verified')) {
        return BaseResponse.error(
          res,
          error.message,
          400,
          error.message,
          'ALREADY_VERIFIED'
        );
      }
      
      return BaseResponse.error(
        res,
        'OTP verification failed',
        400,
        error.message,
        'VERIFICATION_OTP_FAILED'
      );
    }
  }

  /**
   * Complete login after both verifications
   * POST /auth/verification/complete-login
   */
  async completeLogin(req, res) {
    try {
      const { sessionId } = req.body;
      
      const result = await authService.completeLogin(sessionId);
      
      return BaseResponse.success(
        res,
        {
          user: result.user,
          session_token: result.session_token,
          session_jwt: result.session_jwt,
          message: result.message
        },
        'Login completed successfully'
      );
    } catch (error) {
      if (error.message.includes('session not found') || error.message.includes('expired')) {
        return BaseResponse.error(
          res,
          error.message,
          400,
          error.message,
          'VERIFICATION_SESSION_EXPIRED'
        );
      }

      if (error.message.includes('Both phone and email must be verified')) {
        return BaseResponse.error(
          res,
          'Complete verification required',
          400,
          error.message,
          'INCOMPLETE_VERIFICATION'
        );
      }

      return BaseResponse.error(
        res,
        'Login completion failed',
        400,
        error.message,
        'LOGIN_COMPLETION_FAILED'
      );
    }
  }

  /**
   * Get verification session status
   * GET /auth/verification/status/:sessionId
   */
  async getVerificationStatus(req, res) {
    try {
      const { sessionId } = req.params;
      
      const result = authService.getVerificationSessionStatus(sessionId);
      
      return BaseResponse.success(
        res,
        result,
        'Verification status retrieved successfully',
        200
      );
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('expired')) {
        return BaseResponse.error(
          res,
          error.message,
          404,
          error.message,
          'VERIFICATION_SESSION_NOT_FOUND'
        );
      }

      return BaseResponse.error(
        res,
        'Failed to get verification status',
        400,
        error.message,
        'VERIFICATION_STATUS_FAILED'
      );
    }
  }



  // NEW: Sequential Authentication Flow Methods

  /**
   * Step 1: Start phone login - Send OTP to phone
   * POST /auth/login/phone
   */
  async startPhoneLogin(req, res) {
    try {
      const { phoneNumber } = req.body;
      
      console.log('📱 Starting phone login for:', phoneNumber);
      
      const result = await authService.startPhoneLogin(phoneNumber);
      
      return BaseResponse.success(
        res,
        result,
        'OTP sent to phone number successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to send phone OTP',
        400,
        error.message,
        'PHONE_OTP_SEND_FAILED'
      );
    }
  }

  /**
   * Step 2: Verify phone OTP
   * POST /auth/login/phone/verify
   */
  async verifyPhoneOTP(req, res) {
    try {
      const { sessionId, otp } = req.body;
      
      console.log('🔐 Verifying phone OTP for session:', sessionId);
      
      const result = await authService.verifyPhoneOTP(sessionId, otp);
      
      return BaseResponse.success(
        res,
        result,
        'Phone OTP verified successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Phone OTP verification failed',
        400,
        error.message,
        'PHONE_OTP_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Step 3: Start email login - Send OTP to email
   * POST /auth/login/email
   */
  async startEmailLogin(req, res) {
    try {
      const { sessionId, email } = req.body;
      
      console.log('📧 Starting email login for session:', sessionId);
      
      const result = await authService.startEmailLogin(sessionId, email);
      
      return BaseResponse.success(
        res,
        result,
        'OTP sent to email successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to send email OTP',
        400,
        error.message,
        'EMAIL_OTP_SEND_FAILED'
      );
    }
  }

  /**
   * Step 4: Verify email OTP and complete login
   * POST /auth/login/email/verify
   */
  async verifyEmailOTPAndComplete(req, res) {
    try {
      const { sessionId, otp } = req.body;
      
      console.log('🎉 Completing login for session:', sessionId);
      
      const result = await authService.verifyEmailOTPAndComplete(sessionId, otp);
      
      return BaseResponse.success(
        res,
        result,
        'Login completed successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Login completion failed',
        400,
        error.message,
        'LOGIN_COMPLETION_FAILED'
      );
    }
  }

  // NEW: Phone Change Operations (Guarded Operations)

  /**
   * Step 1: Start phone change - Send OTP to current phone
   * POST /auth/phone/change/start
   */
  async startPhoneChange(req, res) {
    try {
      const { newPhoneNumber } = req.body;
      const userId = req.user.id;
      
      console.log('📱 Starting phone change for user:', userId, 'to:', newPhoneNumber);
      
      const result = await authService.startPhoneChange(userId, newPhoneNumber);
      
      return BaseResponse.success(
        res,
        result,
        'Phone change initiated - OTP sent to current phone'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to start phone change',
        400,
        error.message,
        'PHONE_CHANGE_START_FAILED'
      );
    }
  }

  /**
   * Step 2: Verify current phone OTP - Send OTP to new phone
   * POST /auth/phone/change/verify-old
   */
  async verifyOldPhoneOTP(req, res) {
    try {
      const { sessionId, otp } = req.body;
      const userId = req.user.id;
      
      console.log('🔐 Verifying old phone OTP for user:', userId, 'session:', sessionId);
      
      const result = await authService.verifyOldPhoneOTP(userId, sessionId, otp);
      
      return BaseResponse.success(
        res,
        result,
        'Current phone verified - OTP sent to new phone'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to verify current phone OTP',
        400,
        error.message,
        'OLD_PHONE_OTP_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Step 3: Verify new phone OTP and complete phone change
   * POST /auth/phone/change/verify-new
   */
  async verifyNewPhoneOTPAndComplete(req, res) {
    try {
      const { sessionId, otp } = req.body;
      const userId = req.user.id;
      
      console.log('🎊 Completing phone change for user:', userId, 'session:', sessionId);
      
      const result = await authService.verifyNewPhoneOTPAndComplete(userId, sessionId, otp);
      
      return BaseResponse.success(
        res,
        result,
        'Phone number changed successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to complete phone change',
        400,
        error.message,
        'PHONE_CHANGE_COMPLETION_FAILED'
      );
    }
  }
}

export default new AuthController(); 