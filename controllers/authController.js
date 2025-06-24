import authService from '../services/authService.js';
import BaseResponse from '../utils/baseResponse.js';
import logger from '../utils/logger.js';

class AuthController {

  async refreshSession(req, res) {
    try {
      const { refreshToken, session_token } = req.body;
      
      // Handle both parameter names for compatibility
      const sessionToken = session_token || refreshToken;
      
      if (!sessionToken) {
        logger.logAuth('Session refresh failed: Missing token', 'warn', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: '/refresh-session'
        });
        
        return BaseResponse.error(
          res,
          'Session token is required',
          400,
          'refreshToken or session_token field is required',
          'MISSING_SESSION_TOKEN'
        );
      }
      
      logger.logAuth('Session refresh attempt', 'info', {
        hasToken: !!sessionToken,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const result = await authService.refreshSession(sessionToken);
      
      logger.logAuth('Session refreshed successfully', 'info', {
        userId: result.user.id,
        ip: req.ip,
        sessionId: result.session?.session_id
      });
      
      return BaseResponse.success(
        res,
        result,
        'Session refreshed successfully'
      );
    } catch (error) {
      logger.logError('Session refresh failed', error, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: '/refresh-session'
      });
      
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


  async logout(req, res) {
    try {
      const sessionToken = req.sessionToken;
      const userId = req.user?.id;
      
      logger.logAuth('Logout attempt', 'info', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const success = await authService.logout(sessionToken);
      
      if (success) {
        logger.logAuth('Logout successful', 'info', {
          userId,
          ip: req.ip,
          success: true
        });
        
        logger.logUserAction(userId, 'logout', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: true
        });
        
        return BaseResponse.success(
          res,
          { loggedOut: true },
          'Logout successful'
        );
      } else {
        logger.logAuth('Logout failed: Session not found', 'warn', {
          userId,
          ip: req.ip
        });
        
        return BaseResponse.error(
          res,
          'Logout failed',
          400,
          'Session not found or already logged out',
          'LOGOUT_FAILED'
        );
      }
    } catch (error) {
      logger.logError('Logout failed', error, {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: '/logout'
      });
      
      return BaseResponse.error(
        res,
        'Logout failed',
        500,
        error.message,
        'LOGOUT_FAILED'
      );
    }
  }

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

  async refreshToken(req, res) {
    // Map old refreshToken request to new refreshSession
    if (req.body.refreshToken) {
      req.body.session_token = req.body.refreshToken;
    }
    return this.refreshSession(req, res);
  }


  async startPhoneLogin(req, res) {
    try {
      const { phoneNumber } = req.body;
      
      logger.logAuth('Phone login started', 'info', {
        phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const result = await authService.startPhoneLogin(phoneNumber);
      
      logger.logAuth('Phone OTP sent successfully', 'info', {
        phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
        sessionId: result.sessionId,
        ip: req.ip
      });
      
      return BaseResponse.success(
        res,
        result,
        'OTP sent to phone number'
      );
    } catch (error) {
      logger.logError('Phone login start failed', error, {
        phoneNumber: req.body.phoneNumber ? `***${req.body.phoneNumber.slice(-4)}` : 'undefined',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: '/start-phone-login'
      });
      
      return BaseResponse.error(
        res,
        'Failed to start phone login',
        400,
        error.message,
        'PHONE_LOGIN_START_FAILED'
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
      
      logger.logAuth('Phone OTP verification attempt', 'info', {
        sessionId,
        hasOTP: !!otp,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const result = await authService.verifyPhoneOTP(sessionId, otp);
      
      logger.logAuth('Phone OTP verified successfully', 'info', {
        sessionId,
        userId: result.user?.id,
        ip: req.ip,
        success: true
      });
      
      if (result.user?.id) {
        logger.logUserAction(result.user.id, 'phone_login_success', {
          phoneNumber: result.user.phoneNumber ? `***${result.user.phoneNumber.slice(-4)}` : 'undefined',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      
      return BaseResponse.success(
        res,
        result,
        'Phone OTP verified successfully'
      );
    } catch (error) {
      logger.logAuth('Phone OTP verification failed', 'warn', {
        sessionId: req.body.sessionId,
        hasOTP: !!req.body.otp,
        errorMessage: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Log security event for multiple failed attempts
      if (error.message.includes('Too many attempts') || error.message.includes('rate limit')) {
        logger.logSecurity('Multiple failed OTP attempts detected', 'warning', {
          sessionId: req.body.sessionId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          attemptType: 'phone_otp',
          requiresInvestigation: true
        });
      }
      
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
      
      logger.logAuth('Email login started', 'info', {
        sessionId,
        email: email ? `***${email.split('@')[1]}` : 'undefined',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const result = await authService.startEmailLogin(sessionId, email);
      
      logger.logAuth('Email OTP sent successfully', 'info', {
        sessionId,
        email: email ? `***${email.split('@')[1]}` : 'undefined',
        ip: req.ip
      });
      
      return BaseResponse.success(
        res,
        result,
        'OTP sent to email successfully'
      );
    } catch (error) {
      logger.logError('Email login start failed', error, {
        sessionId: req.body.sessionId,
        email: req.body.email ? `***${req.body.email.split('@')[1]}` : 'undefined',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: '/start-email-login'
      });
      
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
   * Step 4: Verify email OTP (without completing login)
   * POST /auth/login/email/verify
   */
  async verifyEmailOTP(req, res) {
    try {
      const { sessionId, otp } = req.body;
      
      logger.logAuth('Email OTP verification attempt', 'info', {
        sessionId,
        hasOTP: !!otp,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const result = await authService.verifyEmailOTP(sessionId, otp);
      
      logger.logAuth('Email OTP verified successfully', 'info', {
        sessionId,
        ip: req.ip,
        success: true
      });
      
      return BaseResponse.success(
        res,
        result,
        'Email OTP verified successfully'
      );
    } catch (error) {
      logger.logAuth('Email OTP verification failed', 'warn', {
        sessionId: req.body.sessionId,
        hasOTP: !!req.body.otp,
        errorMessage: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Log security event for multiple failed attempts
      if (error.message.includes('Too many attempts') || error.message.includes('rate limit')) {
        logger.logSecurity('Multiple failed email OTP attempts detected', 'warning', {
          sessionId: req.body.sessionId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          attemptType: 'email_otp',
          requiresInvestigation: true
        });
      }
      
      return BaseResponse.error(
        res,
        'Email OTP verification failed',
        400,
        error.message,
        'EMAIL_OTP_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Step 5: Complete login after both phone and email are verified
   * POST /auth/login/complete
   */
  async completeLogin(req, res) {
    try {
      const { sessionId } = req.body;
      
      logger.logAuth('Login completion attempt', 'info', {
        sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      const result = await authService.completeLogin(sessionId);
      
      logger.logAuth('Login completed successfully', 'info', {
        sessionId,
        userId: result.user?.id,
        ip: req.ip,
        success: true
      });
      
      if (result.user?.id) {
        logger.logUserAction(result.user.id, 'login_completed', {
          sessionId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          loginMethod: 'phone_email_combined'
        });
      }
      
      return BaseResponse.success(
        res,
        result,
        'Login completed successfully'
      );
    } catch (error) {
      logger.logError('Login completion failed', error, {
        sessionId: req.body.sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: '/complete-login'
      });
      
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