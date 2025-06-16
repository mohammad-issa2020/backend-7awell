import authService from '../services/authService.js';
// import web3AuthService from '../services/web3AuthService.js';
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



  async handleWalletCreation(user) {
    try {
      const Wallet = require('../models/Wallet');
      const { logUserActivity } = require('../services/activityService');
      
      // Only check if user has an existing wallet - don't create new ones
      const existingWallet = await Wallet.getPrimaryWallet(user.id);
      
      if (existingWallet) {
        // Wallet exists - retrieve data and create JWT
        console.log('✅ Existing wallet found for user:', user.id);
        
        // Update last used
        await Wallet.updateLastUsed(existingWallet.id);
        
        // Determine login method based on user data
        const loginMethod = user.email ? 'email' : 'phone';
        
        // Create JWT for Web3Auth
        // const web3AuthToken = web3AuthService.createCustomJWT(user, loginMethod);
        
        // Log activity
        await logUserActivity(
          user.id,
          'Wallet accessed during login',
          'auth_login',
          { wallet_address: existingWallet.address, login_method: loginMethod }
        );
        
        return {
          success: true,
          isNewWallet: false,
          wallet: {
            id: existingWallet.id,
            address: existingWallet.address,
            network: existingWallet.network,
            provider: existingWallet.provider,
            status: existingWallet.status,
            createdAt: existingWallet.created_at,
            lastUsed: existingWallet.last_used,
            isPrimary: true
          },
          web3auth: {
            token: web3AuthToken,
            // verifier: web3AuthService.verifiers[loginMethod],
            // clientId: web3AuthService.web3AuthClientId,
            expiresIn: 24 * 60 * 60, // 24 hours
            loginMethod: loginMethod
          }
        };
      } else {
        // No wallet found - return Web3Auth config for frontend wallet creation
        console.log('ℹ️ No wallet found for user:', user.id, '- Frontend should handle wallet creation');
        
        // Determine login method based on user data
        const loginMethod = user.email ? 'email' : 'phone';
        
        // Create integration data for frontend
        // const integrationData = web3AuthService.createWalletIntegration(user, loginMethod);
        
        return {
          success: true,
          isNewWallet: false,
          hasWallet: false,
          message: 'No wallet found. Use Web3Auth in frontend to create wallet.',
          ...integrationData
        };
      }
    } catch (error) {
      console.error('❌ Error in wallet retrieval:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create placeholder address for wallet
   * @param {string} userId - user id
   * @returns {string} placeholder address
   */
  generatePlaceholderAddress(userId) {
    // إنشاء عنوان deterministic بناءً على userId
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(`7awel_${userId}_${Date.now()}`).digest('hex');
    return `0x${hash.substring(0, 40)}`;
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

  /**
   * Create wallet for authenticated user
   * POST /auth/create-wallet
   * This endpoint saves wallet data after Web3Auth creates it in the frontend
   */
  async createWallet(req, res) {
    try {
      // User must be authenticated
      if (!req.user) {
        return BaseResponse.unauthorized(
          res,
          'Authentication required to create wallet',
          'AUTH_REQUIRED'
        );
      }

      const { address, network = 'ethereum', provider = 'web3auth', publicKey, backupMethods = ['device'] } = req.body;

      // Validate required fields
      if (!address) {
        return BaseResponse.error(
          res,
          'Wallet address is required',
          400,
          'address field is required when saving wallet data',
          'MISSING_WALLET_ADDRESS'
        );
      }

      // Check if user already has a wallet
      const Wallet = require('../models/Wallet');
      const existingWallet = await Wallet.getPrimaryWallet(req.user.id);
      
      if (existingWallet) {
        return BaseResponse.error(
          res,
          'User already has a wallet',
          400,
          'A primary wallet already exists for this user',
          'WALLET_ALREADY_EXISTS'
        );
      }

      // Save wallet data (created by Web3Auth in frontend)
      const newWallet = await Wallet.create({
        userId: req.user.id,
        address: address,
        network: network,
        provider: provider,
        publicKey: publicKey,
        backupMethods: backupMethods
      });

      // Log activity
      const { logUserActivity } = require('../services/activityService');
      await logUserActivity(
        req.user.id,
        'Wallet created and saved',
        'wallet_created',
        {
          wallet_address: address,
          network: network,
          provider: provider
        }
      );

      // Create Web3Auth token
      // const web3AuthToken = web3AuthService.createCustomJWT(req.user, req.user);

      return BaseResponse.success(
        res,
        {
          wallet: {
            id: newWallet.id,
            address: newWallet.address,
            network: newWallet.network,
            provider: newWallet.provider,
            status: newWallet.status,
            createdAt: newWallet.created_at,
            lastUsed: newWallet.last_used,
            isPrimary: true
          },
          web3auth: {
            token: web3AuthToken,
            // verifier: web3AuthService.web3AuthVerifier,
            // clientId: web3AuthService.web3AuthClientId,
            expiresIn: 24 * 60 * 60
          }
        },
        'Wallet saved successfully'
      );
    } catch (error) {
      console.error('❌ Error saving wallet:', error);
      return BaseResponse.error(
        res,
        'Failed to save wallet',
        500,
        error.message,
        'WALLET_SAVE_ERROR'
      );
    }
  }

  /**
   * Get user's wallet information
   * GET /auth/wallet
   */
  async getWallet(req, res) {
    try {
      // User must be authenticated
      if (!req.user) {
        return BaseResponse.unauthorized(
          res,
          'Authentication required to access wallet',
          'AUTH_REQUIRED'
        );
      }

      const Wallet = require('../models/Wallet');
      const wallet = await Wallet.getPrimaryWallet(req.user.id);
      
      if (!wallet) {
        // Determine login method based on user data
        const loginMethod = req.user.email ? 'email' : 'phone';
        
        // Create integration data for frontend wallet creation
        // const integrationData = web3AuthService.createWalletIntegration(req.user, loginMethod);
        
        return BaseResponse.success(
          res,
          {
            hasWallet: false,
            message: 'No wallet found for this user',
            ...integrationData
          },
          'Wallet status retrieved - ready for creation'
        );
      }

      // Update last used
      await Wallet.updateLastUsed(wallet.id);

      // Determine login method based on user data
      const loginMethod = req.user.email ? 'email' : 'phone';

      // Create Web3Auth token if needed
      // const web3AuthToken = web3AuthService.createCustomJWT(req.user, loginMethod);

      return BaseResponse.success(
        res,
        {
          hasWallet: true,
          wallet: {
            id: wallet.id,
            address: wallet.address,
            network: wallet.network,
            provider: wallet.provider,
            status: wallet.status,
            createdAt: wallet.created_at,
            lastUsed: wallet.last_used,
            isPrimary: true
          },
          web3auth: {
            token: web3AuthToken,
            // verifier: web3AuthService.verifiers[loginMethod],
            // clientId: web3AuthService.web3AuthClientId,
            expiresIn: 24 * 60 * 60,
            loginMethod: loginMethod
          }
        },
        'Wallet information retrieved successfully'
      );
    } catch (error) {
      console.error('❌ Error retrieving wallet:', error);
      return BaseResponse.error(
        res,
        'Failed to retrieve wallet information',
        500,
        error.message,
        'WALLET_RETRIEVAL_ERROR'
      );
    }
  }
}

export default new AuthController(); 