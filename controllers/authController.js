const authService = require('../services/authService');
const BaseResponse = require('../utils/baseResponse');

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
   * Send OTP to phone or email
   * POST /auth/otp/send
   */
  async sendOTP(req, res) {
    try {
      const { medium, value, channel } = req.body;
      
      const result = await authService.sendOTP(medium, value, channel);
      
      return BaseResponse.success(
        res,
        result,
        `OTP sent successfully via ${channel}`,
        200
      );
    } catch (error) {
      // Handle rate limiting errors
      if (error.message.includes('Too many OTP requests')) {
        return BaseResponse.rateLimitExceeded(
          res,
          error.message,
          'OTP_RATE_LIMIT_EXCEEDED'
        );
      }
      
      return BaseResponse.error(
        res,
        'Failed to send OTP',
        400,
        error.message,
        'OTP_SEND_FAILED'
      );
    }
  }

  /**
   * Verify OTP code and create Stytch session
   * POST /auth/otp/verify
   */
  async verifyOTP(req, res) {
    try {
      const { medium, value, otp } = req.body;
      
      const result = await authService.verifyOTP(medium, value, otp);
      
      return BaseResponse.success(
        res,
        {
          valid: result.valid,
          user: result.user,
          session_token: result.session_token,
          session_jwt: result.session_jwt,
          message: 'OTP verified successfully. User authenticated.'
        },
        'OTP verified and session created'
      );
    } catch (error) {
      // Handle specific OTP verification errors
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
      
      if (error.message.includes('not found or expired')) {
        return BaseResponse.error(
          res,
          'OTP session expired',
          400,
          error.message,
          'OTP_EXPIRED'
        );
      }
      
      return BaseResponse.error(
        res,
        'OTP verification failed',
        400,
        error.message,
        'OTP_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Login user (create or get existing user and session)
   * POST /auth/login
   * Note: In Stytch flow, sessions are already created during OTP verification
   */
  async login(req, res) {
    try {
      const { phoneNumber, email } = req.body;
      
      // In the Stytch flow, actual login happens during OTP verification
      // This endpoint is mainly for compatibility or user lookup
      const result = await authService.login(phoneNumber, email);
      
      return BaseResponse.success(
        res,
        result,
        'User information retrieved successfully. Note: Active session should be from OTP verification.'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Login failed',
        400,
        error.message,
        'LOGIN_FAILED'
      );
    }
  }

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
      const userId = req.user.id;
      
      const sessions = await authService.getUserSessions(userId);
      
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
      const userId = req.user.id;
      
      const success = await authService.revokeAllSessions(userId);
      
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
}

module.exports = new AuthController(); 