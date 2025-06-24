import stytchClient from '../config/stytch.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    this.OTP_EXPIRY = 5 * 60; // 5 minutes in seconds
    this.MAX_OTP_ATTEMPTS = 5;
    this.OTP_RATE_LIMIT = 3; // 3 attempts per 5 minutes

    // In-memory rate limiting (simple implementation)
    this.rateLimitStore = new Map();
    this.otpAttempts = new Map();

    // Clean up rate limits every 5 minutes
    setInterval(() => {
      this.cleanupRateLimits();
      this.cleanupAuthSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Refresh Stytch session
   * @param {string} session_token - Stytch session token
   * @returns {Object} refreshed session data
   */
  async refreshSession(session_token) {
    try {
      logger.logAuth('Session refresh attempt', 'info', {
        hasToken: !!session_token
      });
      
      const result = await stytchClient.sessions.authenticate({
        session_token: session_token
      });

      if (result.status_code !== 200) {
        logger.logAuth('Session authentication failed', 'warn', {
          statusCode: result.status_code,
          reason: 'Invalid session token'
        });
        throw new Error('Session authentication failed');
      }

      logger.logAuth('Session refreshed successfully', 'info', {
        userId: result.user.user_id,
        sessionId: result.session?.session_id
      });

      return {
        user: {
          id: result.user.user_id,
          phoneNumber: result.user.phone_numbers?.[0]?.phone_number,
          email: result.user.emails?.[0]?.email,
          created_at: result.user.created_at,
          status: result.user.status
        },
        session: result.session,
        session_token: result.session_token,
        session_jwt: result.session_jwt
      };

    } catch (error) {
      logger.logError('Session refresh error', error, {
        hasToken: !!session_token,
        errorMessage: error.message
      });
      throw new Error(`Session refresh error: ${error.message}`);
    }
  }

  /**
   * Extract user info from session JWT (for recovery of custom tokens)
   * @param {string} session_jwt - Base64 encoded JWT with user info
   * @returns {Object|null} Decoded user info or null
   */
  extractUserInfoFromJWT(session_jwt) {
    try {
      if (!session_jwt) return null;

      const decoded = JSON.parse(Buffer.from(session_jwt, 'base64').toString());

      // Validate required fields
      if (!decoded.user_id || (!decoded.phone && !decoded.email)) {
        logger.warn('Invalid JWT: Missing required fields', {
          hasUserId: !!decoded.user_id,
          hasPhone: !!decoded.phone,
          hasEmail: !!decoded.email
        });
        return null;
      }

      logger.debug('JWT extracted successfully', {
        userId: decoded.user_id,
        hasPhone: !!decoded.phone,
        hasEmail: !!decoded.email
      });

      return decoded;
    } catch (error) {
      logger.logError('Failed to extract user info from JWT', error, {
        hasJWT: !!session_jwt
      });
      return null;
    }
  }

  /**
   * Validate Stytch session or custom verification session
   * @param {string} session_token - Stytch session token or custom verification token
   * @param {string} session_jwt - Optional JWT for recovery (from login response)
   * @returns {Object} session validation result
   */
  async validateSession(session_token, session_jwt = null) {
    try {
      // Check if it's a custom verification token
      if (session_token.startsWith('stytch_verified_')) {
        logger.logAuth('Validating custom verification token', 'info', {
          tokenType: 'custom_verification'
        });

        // Initialize customSessions if not exists
        this.customSessions = this.customSessions || new Map();

        // Try to get stored session info first
        let storedInfo = this.customSessions.get(session_token);

        // If not in store but we have JWT, try to recover
        if (!storedInfo && session_jwt) {
          logger.logAuth('Attempting to recover session from JWT', 'info', {
            hasJWT: !!session_jwt
          });
          const jwtInfo = this.extractUserInfoFromJWT(session_jwt);

          if (jwtInfo) {
            // Store the recovered info
            storedInfo = jwtInfo;
            this.customSessions.set(session_token, storedInfo);
            logger.logAuth('Session recovered from JWT', 'info', {
              userId: jwtInfo.user_id
            });
          }
        }

        if (storedInfo) {
          // Check if token is expired
          const expiresAt = new Date(storedInfo.expires_at).getTime();
          if (Date.now() > expiresAt) {
            this.customSessions.delete(session_token);
            logger.logAuth('Custom verification token expired', 'warn', {
              userId: storedInfo.user_id,
              expiresAt: storedInfo.expires_at
            });
            throw new Error('Custom verification token expired');
          }

          // Validate that we have required user info
          if (!storedInfo.user_id || (!storedInfo.phone && !storedInfo.email)) {
            logger.logAuth('Invalid token: missing required user information', 'warn', {
              hasUserId: !!storedInfo.user_id,
              hasPhone: !!storedInfo.phone,
              hasEmail: !!storedInfo.email
            });
            throw new Error('Invalid token: missing required user information');
          }

          logger.logAuth('Custom token validated successfully', 'info', {
            userId: storedInfo.user_id,
            tokenType: 'custom_verification'
          });

          return {
            valid: true,
            user: {
              id: storedInfo.user_id,
              phoneNumber: storedInfo.phone,
              email: storedInfo.email,
              created_at: storedInfo.created_at,
              status: storedInfo.status || 'active'
            },
            session: {
              session_id: storedInfo.session_id,
              started_at: storedInfo.verified_at,
              expires_at: storedInfo.expires_at
            },
            isCustomToken: true
          };
        }

        // For custom tokens without stored data, we can't safely proceed
        logger.logAuth('Custom verification token not found in session store', 'warn', {
          tokenType: 'custom_verification'
        });
        throw new Error('Custom verification token not found in session store. Please provide session_jwt or login again.');
      }

      // Handle regular Stytch tokens
      logger.logAuth('Validating Stytch session token', 'info', {
        tokenType: 'stytch_session'
      });
      
      const result = await stytchClient.sessions.authenticate({
        session_token: session_token
      });

      if (result.status_code !== 200) {
        logger.logAuth('Stytch session validation failed', 'warn', {
          statusCode: result.status_code
        });
        throw new Error('Invalid session');
      }

      logger.logAuth('Stytch session validated successfully', 'info', {
        userId: result.user.user_id,
        sessionId: result.session?.session_id
      });

      return {
        valid: true,
        user: {
          id: result.user.user_id,
          phoneNumber: result.user.phone_numbers?.[0]?.phone_number,
          email: result.user.emails?.[0]?.email,
          created_at: result.user.created_at,
          status: result.user.status
        },
        session: result.session,
        isCustomToken: false
      };

    } catch (error) {
      logger.logError('Session validation error', error, {
        tokenType: session_token?.startsWith('stytch_verified_') ? 'custom' : 'stytch',
        errorMessage: error.message
      });
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get user sessions
   * @param {string} user_id - Stytch user ID
   * @returns {Array} user sessions
   */
  async getUserSessions(stytch_user_id) {
    try {
      logger.logAuth('Getting sessions for Stytch user', 'info', {
        userId: stytch_user_id
      });

      // Get user data from Stytch which includes sessions
      const result = await stytchClient.users.get({
        user_id: stytch_user_id
      });

      logger.logAuth('Found sessions', 'info', {
        sessionCount: result.sessions?.length || 0
      });

      // Sessions are in the user object
      return result.sessions || [];
    } catch (error) {
      logger.logError('Error getting user sessions', error, {
        userId: stytch_user_id,
        errorMessage: error.message
      });
      throw new Error(`Error retrieving sessions: ${error.message}`);
    }
  }

  /**
   * Revoke specific session
   * @param {string} session_id - session identifier
   * @returns {boolean} success status
   */
  async revokeSession(session_id) {
    try {
      await stytchClient.sessions.revoke({
        session_id: session_id
      });
      return true;
    } catch (error) {
      throw new Error(`Error revoking session: ${error.message}`);
    }
  }

  /**
   * Revoke all user sessions
   * @param {string} user_id - user identifier
   * @returns {boolean} success status
   */
  async revokeAllSessions(stytch_user_id) {
    try {
      logger.logAuth('Revoking all sessions for Stytch user', 'info', {
        userId: stytch_user_id
      });

      // Get all user sessions first
      const sessions = await this.getUserSessions(stytch_user_id);

      logger.logAuth('Found sessions to revoke', 'info', {
        sessionCount: sessions.length
      });

      for (const session of sessions) {
        await this.revokeSession(session.session_id);
      }

      logger.logAuth('Successfully revoked all sessions', 'info', {
        userId: stytch_user_id
      });
      return true;
    } catch (error) {
      logger.logError('Error revoking all sessions', error, {
        userId: stytch_user_id,
        errorMessage: error.message
      });
      throw new Error(`Error revoking all sessions: ${error.message}`);
    }
  }

  /**
   * Logout current session
   * @param {string} session_token - current session token
   * @returns {boolean} success status
   */
  async logout(session_token) {
    try {
      await stytchClient.sessions.revoke({
        session_token: session_token
      });
      return true;
    } catch (error) {
      throw new Error(`Logout error: ${error.message}`);
    }
  }

  /**
   * Clean up expired rate limits and OTP attempts
   */
  cleanupRateLimits() {
    const now = Date.now();
    let cleaned = 0;

    // Clean rate limits
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now >= data.resetTime) {
        this.rateLimitStore.delete(key);
        cleaned++;
      }
    }

    // Clean OTP attempts
    for (const [key, data] of this.otpAttempts.entries()) {
      if (now > data.expires) {
        this.otpAttempts.delete(key);
        cleaned++;
      }
    }

    // Clean expired custom sessions
    if (this.customSessions) {
      for (const [token, data] of this.customSessions.entries()) {
        const expiresAt = new Date(data.expires_at).getTime();
        if (now > expiresAt) {
          this.customSessions.delete(token);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.logAuth('Cleaned up expired entries', 'info', {
        cleanedCount: cleaned
      });
    }
  }

  /**
   * Check if a key is rate limited
   * @param {string} key - Rate limit key (phone number, user ID, etc.)
   * @returns {boolean} True if rate limited
   */
  isRateLimited(key) {
    const now = Date.now();
    const rateLimit = this.rateLimitStore.get(key);

    if (!rateLimit) {
      return false;
    }

    // Check if rate limit window has expired
    if (now >= rateLimit.resetTime) {
      this.rateLimitStore.delete(key);
      return false;
    }

    // Check if we've exceeded the limit
    return rateLimit.count >= this.OTP_RATE_LIMIT;
  }

  /**
   * Update rate limit for a key
   * @param {string} key - Rate limit key
   */
  updateRateLimit(key) {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const existing = this.rateLimitStore.get(key);

    if (existing && now < existing.resetTime) {
      // Within same window, increment count
      existing.count++;
      this.rateLimitStore.set(key, existing);
    } else {
      // New window, reset count
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
    }
  }

  async checkAvailability(medium, value) {
    try {
      logger.logAuth('Checking availability for medium', 'info', {
        medium: medium,
        value: value
      });

      if (medium === 'phone') {
        // Use search API for phone numbers
        const searchQuery = {
          query: {
            operator: 'AND',
            operands: [{
              filter_name: 'phone_number',
              filter_value: [value]
            }]
          }
        };

        try {
          const result = await stytchClient.users.search(searchQuery);

          // Handle case where result or results might be undefined
          const hasResults = result && result.results && Array.isArray(result.results);
          const resultCount = hasResults ? result.results.length : 0;

          logger.logAuth('Phone search result', 'info', {
            found: resultCount > 0,
            count: resultCount,
            hasResults: hasResults
          });

          return {
            available: resultCount === 0,
            medium,
            value,
            message: resultCount > 0 ?
              'Phone number is already registered' :
              'Phone number is available'
          };
        } catch (stytchError) {
          logger.logError('Stytch search error', stytchError, {
            errorMessage: stytchError.message
          });
          
          // If Stytch search fails, assume phone is available for new registration
          // This is a fallback to prevent blocking the authentication flow
          logger.logAuth('Falling back to assuming phone is available due to search error', 'info');
          
          return {
            available: true,
            medium,
            value,
            message: 'Phone availability check failed - assuming available for registration'
          };
        }

      } else if (medium === 'email') {
        // For email, we'll skip the availability check since Stytch doesn't support email search filters
        // We'll let Stytch handle the duplicate email check during the actual OTP send process
        logger.logAuth('Skipping email availability check - will be handled by Stytch during OTP send', 'info');

        return {
          available: true, // We assume it's available and let Stytch handle duplicates
          medium,
          value,
          message: 'Email availability will be checked during OTP send'
        };

      } else {
        throw new Error('Invalid medium. Must be phone or email.');
      }

    } catch (error) {
      logger.logError('Error checking availability', error, {
        medium: medium,
        value: value,
        errorMessage: error.message
      });
      
      // For any other errors, provide a fallback response
      return {
        available: true,
        medium,
        value,
        message: `Availability check failed - assuming ${medium} is available`
      };
    }
  }

  /**
   * Send OTP to phone number via WhatsApp
   * @param {string} phoneNumber - Phone number
   * @returns {Object} Stytch response with method type
   */
  async sendPhoneOTP(phoneNumber) {
    try {
      logger.logAuth('Sending WhatsApp OTP to', 'info', {
        phoneNumber: phoneNumber
      });

      // Try WhatsApp first (better international coverage)
      const result = await stytchClient.otps.whatsapp.send({
        phone_number: phoneNumber,
        expiration_minutes: Math.floor(this.OTP_EXPIRY / 60)
      });

      if (result.status_code !== 200) {
        throw new Error('Failed to send WhatsApp OTP');
      }

      logger.logAuth('WhatsApp OTP sent successfully', 'info', {
        phoneNumber: phoneNumber
      });
      // WhatsApp returns phone_id, we need to map it to method_id for consistency
      return {
        ...result,
        method_type: 'whatsapp',
        method_id: result.phone_id // Map phone_id to method_id for authenticate
      };
    } catch (error) {
      logger.logError('WhatsApp OTP failed', error, {
        phoneNumber: phoneNumber,
        errorMessage: error.message
      });

      // Fallback to SMS if WhatsApp fails
      try {
        logger.logAuth('Falling back to SMS...', 'info');
        const smsResult = await stytchClient.otps.sms.send({
          phone_number: phoneNumber,
          expiration_minutes: Math.floor(this.OTP_EXPIRY / 60)
        });

        if (smsResult.status_code !== 200) {
          throw new Error('Failed to send SMS OTP');
        }

        logger.logAuth('SMS OTP sent as fallback', 'info', {
          phoneNumber: phoneNumber
        });
        // SMS returns phone_id, we need to map it to method_id for consistency
        return {
          ...smsResult,
          method_type: 'sms',
          method_id: smsResult.phone_id // Map phone_id to method_id for authenticate
        };
      } catch (smsError) {
        logger.logError('SMS fallback also failed', smsError, {
          phoneNumber: phoneNumber,
          errorMessage: smsError.message
        });
        throw new Error(`Failed to send OTP via WhatsApp or SMS: ${error.message}`);
      }
    }
  }

  /**
   * Send OTP to email
   * @param {string} email - Email address
   * @returns {Object} Stytch response with method_id
   */
  async sendEmailOTP(email) {
    try {
      const result = await stytchClient.otps.email.send({
        email: email,
        expiration_minutes: Math.floor(this.OTP_EXPIRY / 60)
      });

      if (result.status_code !== 200) {
        throw new Error('Failed to send email OTP');
      }

      logger.logAuth('Email OTP sent successfully', 'info', {
        email: email
      });
      // Email returns email_id, we need to map it to method_id for consistency
      return {
        ...result,
        method_id: result.email_id // Map email_id to method_id for authenticate
      };
    } catch (error) {
      throw new Error(`Email OTP error: ${error.message}`);
    }
  }

  /**
   * Clean up expired authentication sessions
   */
  cleanupAuthSessions() {
    const now = Date.now();

    // Clean up sequential authentication sessions
    if (this.sequentialAuthSessions) {
      for (const [sessionId, session] of this.sequentialAuthSessions.entries()) {
        if (now > session.expiresAt) {
          this.sequentialAuthSessions.delete(sessionId);
        }
      }
    }

    // Clean up phone change sessions
    if (this.phoneChangeSessions) {
      for (const [sessionId, session] of this.phoneChangeSessions.entries()) {
        if (now > session.expiresAt) {
          this.phoneChangeSessions.delete(sessionId);
        }
      }
    }
  }

  // NEW: Sequential Authentication Flow Methods

  /**
   * Step 1: Start phone login - Send OTP to phone
   * @param {string} phoneNumber - User's phone number
   * @returns {Object} Session information with phone availability
   */
  async startPhoneLogin(phoneNumber) {
    try {
      logger.logAuth('Starting phone login for', 'info', {
        phoneNumber: phoneNumber
      });

      // Check rate limiting
      if (this.isRateLimited(phoneNumber)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Check phone availability
      logger.logAuth('Checking phone availability...', 'info');
      const phoneAvailability = await this.checkAvailability('phone', phoneNumber);

      // Send OTP to phone
      logger.logAuth('Sending phone OTP...', 'info');
      const phoneResult = await this.sendPhoneOTP(phoneNumber);

      // Create session
      const sessionId = `seq_auth_${uuidv4()}`;
      const expiresAt = new Date(Date.now() + (this.OTP_EXPIRY * 1000));

      // Store sequential auth session
      this.sequentialAuthSessions = this.sequentialAuthSessions || new Map();
      this.sequentialAuthSessions.set(sessionId, {
        sessionId,
        phoneNumber,
        phoneAvailable: phoneAvailability.available,
        phoneVerified: false,
        phoneAttempts: 0,
        email: null,
        emailAvailable: null,
        emailVerified: false,
        emailAttempts: 0,
        step: 'phone_verification', // Current step
        createdAt: Date.now(),
        expiresAt: expiresAt.getTime(),
        stytchPhoneId: phoneResult.method_id, // Use method_id for authenticate
        phoneMethodType: phoneResult.method_type, // Store method type (whatsapp/sms)
        stytchEmailId: null
      });

      // Update rate limiting
      this.updateRateLimit(phoneNumber);

      logger.logAuth('Phone login session created', 'info', {
        sessionId: sessionId
      });

      return {
        sessionId,
        step: 'phone_verification',
        phoneAvailable: phoneAvailability.available,
        expiresAt: expiresAt.toISOString(),
        message: phoneAvailability.available
          ? 'New account will be created. OTP sent via WhatsApp.'
          : 'Login to existing account. OTP sent via WhatsApp.'
      };

    } catch (error) {
      logger.logError('Phone login error', error, {
        phoneNumber: phoneNumber,
        errorMessage: error.message
      });
      throw new Error(`Phone login failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Verify phone OTP
   * @param {string} sessionId - Sequential auth session ID
   * @param {string} otp - Phone OTP code
   * @returns {Object} Verification result
   */
  async verifyPhoneOTP(sessionId, otp) {
    try {
      logger.logAuth('Verifying phone OTP for session', 'info', {
        sessionId: sessionId
      });

      // Initialize if not exists
      this.sequentialAuthSessions = this.sequentialAuthSessions || new Map();

      // Get session
      const session = this.sequentialAuthSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.sequentialAuthSessions.delete(sessionId);
        throw new Error('Session expired');
      }

      // Check step
      if (session.step !== 'phone_verification') {
        throw new Error('Invalid step. Expected phone verification.');
      }

      // Check attempts
      if (session.phoneAttempts >= this.MAX_OTP_ATTEMPTS) {
        this.sequentialAuthSessions.delete(sessionId);
        throw new Error('Maximum phone OTP attempts exceeded');
      }

      // Verify phone OTP with Stytch - using unified authenticate method
      try {
        logger.logAuth('Verifying OTP using phone method', 'info', {
          methodType: session.phoneMethodType
        });

        // Stytch uses a single authenticate method for all OTP types
        const phoneResult = await stytchClient.otps.authenticate({
          method_id: session.stytchPhoneId,
          code: otp
        });

        if (phoneResult.status_code !== 200) {
          throw new Error('Invalid OTP');
        }

        logger.logAuth('Phone OTP verified successfully', 'info', {
          methodType: session.phoneMethodType
        });

        // Update session
        session.phoneVerified = true;
        session.step = 'email_input';
        session.phoneAttempts = 0; // Reset attempts after success
        this.sequentialAuthSessions.set(sessionId, session);

        return {
          sessionId,
          step: 'email_input',
          phoneVerified: true,
          message: 'Phone verified successfully via WhatsApp. Please provide your email address.'
        };

      } catch (error) {
        // Increment attempts
        session.phoneAttempts++;
        this.sequentialAuthSessions.set(sessionId, session);

        throw new Error(`Phone OTP verification failed: ${error.message}`);
      }

    } catch (error) {
      logger.logError('Phone OTP verification error', error, {
        sessionId: sessionId,
        errorMessage: error.message
      });
      throw new Error(`Phone OTP verification failed: ${error.message}`);
    }
  }

  /**
   * Step 3: Start email login - Send OTP to email
   * @param {string} sessionId - Sequential auth session ID
   * @param {string} email - User's email address
   * @returns {Object} Email verification information
   */
  async startEmailLogin(sessionId, email) {
    try {
      logger.logAuth('Starting email login for session', 'info', {
        sessionId: sessionId,
        email: email
      });

      // Initialize if not exists
      this.sequentialAuthSessions = this.sequentialAuthSessions || new Map();

      // Get session
      const session = this.sequentialAuthSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.sequentialAuthSessions.delete(sessionId);
        throw new Error('Session expired');
      }

      // Check step
      if (session.step !== 'email_input') {
        throw new Error('Invalid step. Phone must be verified first.');
      }

      // Check if phone was verified
      if (!session.phoneVerified) {
        throw new Error('Phone verification required before email step');
      }

      // Check email availability
      logger.logAuth('Checking email availability...', 'info');
      const emailAvailability = await this.checkAvailability('email', email);

      // Send OTP to email
      logger.logAuth('Sending email OTP...', 'info');
      const emailResult = await this.sendEmailOTP(email);

      // Update session
      session.email = email;
      session.emailAvailable = emailAvailability.available;
      session.step = 'email_verification';
      session.stytchEmailId = emailResult.method_id; // Use method_id for authenticate
      this.sequentialAuthSessions.set(sessionId, session);

      logger.logAuth('Email OTP sent for session', 'info', {
        sessionId: sessionId
      });

      return {
        sessionId,
        step: 'email_verification',
        emailAvailable: emailAvailability.available,
        message: emailAvailability.available
          ? 'Email OTP sent for new account creation.'
          : 'Email OTP sent for existing account login.'
      };

    } catch (error) {
      logger.logError('Email login error', error, {
        sessionId: sessionId,
        errorMessage: error.message
      });
      throw new Error(`Email login failed: ${error.message}`);
    }
  }

  /**
   * Step 4: Verify email OTP (without completing login)
   * @param {string} sessionId - Session ID
   * @param {string} otp - Email OTP code
   * @returns {Object} verification result
   */
  async verifyEmailOTP(sessionId, otp) {
    try {
      logger.logAuth('Verifying email OTP for session', 'info', {
        sessionId: sessionId
      });

      // Initialize if not exists
      this.sequentialAuthSessions = this.sequentialAuthSessions || new Map();

      // Get session
      const session = this.sequentialAuthSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.sequentialAuthSessions.delete(sessionId);
        throw new Error('Session expired');
      }

      // Check step
      if (session.step !== 'email_verification') {
        throw new Error('Invalid step. Expected email verification.');
      }

      // Check if phone was verified
      if (!session.phoneVerified) {
        throw new Error('Phone verification required');
      }

      // Check attempts
      if (session.emailAttempts >= this.MAX_OTP_ATTEMPTS) {
        this.sequentialAuthSessions.delete(sessionId);
        throw new Error('Maximum email OTP attempts exceeded');
      }

      // Verify email OTP with Stytch
      try {
        logger.logAuth('Verifying email OTP', 'info');

        const emailResult = await stytchClient.otps.authenticate({
          method_id: session.stytchEmailId,
          code: otp
        });

        if (emailResult.status_code !== 200) {
          throw new Error('Invalid OTP');
        }

        logger.logAuth('Email OTP verified successfully', 'info');

        // Update session to mark email as verified
        session.emailVerified = true;
        session.step = 'ready_to_complete';
        session.stytchUser = emailResult.user;
        this.sequentialAuthSessions.set(sessionId, session);

        logger.logAuth('Email verification completed, ready for login completion', 'info');

        return {
          sessionId,
          step: 'ready_to_complete',
          phoneVerified: true,
          emailVerified: true,
          message: 'Email OTP verified successfully. Ready to complete login.'
        };

      } catch (error) {
        // Increment attempts
        session.emailAttempts++;
        this.sequentialAuthSessions.set(sessionId, session);

        throw new Error(`Email OTP verification failed: ${error.message}`);
      }

    } catch (error) {
      logger.logError('Email OTP verification error', error, {
        sessionId: sessionId,
        errorMessage: error.message
      });
      throw new Error(`Email OTP verification failed: ${error.message}`);
    }
  }

  /**
   * Step 5: Complete login after both phone and email are verified
   * @param {string} sessionId - Session ID
   * @returns {Object} complete login result with session token
   */
  async completeLogin(sessionId) {
    try {
      logger.logAuth('Completing login for session', 'info', {
        sessionId: sessionId
      });

      // Initialize if not exists
      this.sequentialAuthSessions = this.sequentialAuthSessions || new Map();

      // Get session
      const session = this.sequentialAuthSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.sequentialAuthSessions.delete(sessionId);
        throw new Error('Session expired');
      }

      // Check step
      if (session.step !== 'ready_to_complete') {
        throw new Error('Invalid step. Both phone and email verification required.');
      }

      // Check if both phone and email were verified
      if (!session.phoneVerified || !session.emailVerified) {
        throw new Error('Both phone and email verification required');
      }

      // Validate that we have required user data
      if (!session.stytchUser || !session.stytchUser.user_id) {
        throw new Error('Invalid session: missing Stytch user data');
      }

      // Create Stytch session
      try {
        logger.logAuth('Creating Stytch session', 'info');

        // For the current Stytch version, we need to use a different approach
        // Since sessions.create is not available, we'll use the existing user session
        // or create a new authentication session
        
        let stytchSession;
        
        // Check if we already have a session token from the verification process
        if (session.stytchUser.session_token) {
          logger.logAuth('Using existing session token', 'info');
          // Use existing session token
          stytchSession = {
            session_token: session.stytchUser.session_token,
            session_jwt: session.stytchUser.session_jwt,
            session: {
              session_id: session.stytchUser.user_id,
              expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString() // 1 hour
            }
          };
        } else {
          logger.logAuth('Creating custom session token', 'info');
          // Create a new session using the user's existing session or create a custom one
          // For now, we'll create a custom session since Stytch sessions.create is not available
          const sessionToken = `stytch_session_${session.stytchUser.user_id}_${Date.now()}`;
          const sessionJwt = Buffer.from(JSON.stringify({
          user_id: session.stytchUser.user_id,
            phone: session.phoneNumber,
            email: session.email,
            created_at: session.stytchUser.created_at,
            status: session.stytchUser.status,
            session_id: sessionToken,
            verified_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString() // 1 hour
          })).toString('base64');
          
          stytchSession = {
            session_token: sessionToken,
            session_jwt: sessionJwt,
            session: {
              session_id: sessionToken,
              expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString()
            }
          };
        }

        logger.logAuth('Stytch session created successfully', 'info');

        const stytchUser = session.stytchUser;

        // Create or get user in Supabase
        logger.logAuth('Creating/updating user in Supabase', 'info');
        const UserMappingService = (await import('../services/userMappingService.js')).default;
        const supabaseUser = await UserMappingService.createOrGetUser({
          id: stytchUser.user_id,
          phoneNumber: stytchUser.phone_numbers?.[0]?.phone_number || session.phoneNumber,
          email: stytchUser.emails?.[0]?.email || session.email,
          created_at: stytchUser.created_at,
          status: stytchUser.status
        });

        // Clean up session
        this.sequentialAuthSessions.delete(sessionId);

        logger.logAuth('Sequential login completed successfully', 'info');

        return {
          user: {
            id: supabaseUser.id,
            stytch_user_id: stytchUser.user_id,
            phoneNumber: stytchUser.phone_numbers?.[0]?.phone_number || session.phoneNumber,
            email: stytchUser.emails?.[0]?.email || session.email,
            created_at: supabaseUser.created_at,
            status: supabaseUser.status
          },
          session: {
            session_id: stytchSession.session?.session_id,
            session_token: stytchSession.session_token,
            session_jwt: stytchSession.session_jwt,
            expires_at: stytchSession.session?.expires_at
          },
          isNewUser: session.phoneAvailable && session.emailAvailable,
          message: 'Login completed successfully'
        };

      } catch (error) {
        throw new Error(`Session creation failed: ${error.message}`);
      }

    } catch (error) {
      logger.logError('Login completion error', error, {
        sessionId: sessionId,
        errorMessage: error.message
      });
      throw new Error(`Login completion failed: ${error.message}`);
    }
  }

  // NEW: Phone Change Operations (Guarded Operations)

  /**
   * Step 1: Start phone change - Send OTP to current phone
   * @param {string} userId - User ID from auth token
   * @param {string} newPhoneNumber - New phone number to change to
   * @returns {Object} Phone change session information
   */
  async startPhoneChange(userId, newPhoneNumber) {
    try {
      logger.logAuth('Starting phone change for user', 'info', {
        userId: userId,
        newPhoneNumber: newPhoneNumber
      });

      // Get user's current phone number from Supabase
      const UserMappingService = (await import('../services/userMappingService.js')).default;
      const user = await UserMappingService.getUserById(userId);

      if (!user || !user.phone_number) {
        throw new Error('User not found or has no current phone number');
      }

      const currentPhoneNumber = user.phone_number;

      // Check if new phone number is different from current
      if (currentPhoneNumber === newPhoneNumber) {
        throw new Error('New phone number must be different from current phone number');
      }

      // Check rate limiting for phone changes
      const rateLimitKey = `phone_change_${userId}`;
      if (this.isRateLimited(rateLimitKey)) {
        throw new Error('Too many phone change attempts. Please try again later.');
      }

      // Check if new phone number is available (not used by another user)
      const newPhoneAvailability = await this.checkAvailability('phone', newPhoneNumber);
      if (!newPhoneAvailability.available) {
        throw new Error('New phone number is already registered by another user');
      }

      // Send OTP to current phone for verification
      logger.logAuth('Sending OTP to current phone', 'info', {
        currentPhoneNumber: currentPhoneNumber
      });
      const currentPhoneOTPResult = await this.sendPhoneOTP(currentPhoneNumber);

      // Create phone change session
      const sessionId = `phone_change_${uuidv4()}`;
      const expiresAt = new Date(Date.now() + (this.OTP_EXPIRY * 1000));

      // Initialize phone change sessions if not exists
      this.phoneChangeSessions = this.phoneChangeSessions || new Map();

      this.phoneChangeSessions.set(sessionId, {
        sessionId,
        userId,
        currentPhoneNumber,
        newPhoneNumber,
        step: 'verify_current_phone', // Current step
        currentPhoneVerified: false,
        newPhoneVerified: false,
        currentPhoneAttempts: 0,
        newPhoneAttempts: 0,
        createdAt: Date.now(),
        expiresAt: expiresAt.getTime(),
        stytchCurrentPhoneId: currentPhoneOTPResult.method_id, // Use method_id for authenticate
        currentPhoneMethodType: currentPhoneOTPResult.method_type,
        stytchNewPhoneId: null,
        newPhoneMethodType: null
      });

      // Update rate limiting
      this.updateRateLimit(rateLimitKey);

      logger.logAuth('Phone change session created', 'info', {
        sessionId: sessionId
      });

      return {
        sessionId,
        step: 'verify_current_phone',
        currentPhoneNumber,
        newPhoneNumber,
        expiresAt: expiresAt.toISOString(),
        message: 'Phone change initiated. OTP sent to your current phone via WhatsApp.'
      };

    } catch (error) {
      logger.logError('Phone change start error', error, {
        userId: userId,
        newPhoneNumber: newPhoneNumber,
        errorMessage: error.message
      });
      throw new Error(`Phone change start failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Verify current phone OTP - Send OTP to new phone
   * @param {string} userId - User ID from auth token
   * @param {string} sessionId - Phone change session ID
   * @param {string} otp - OTP code for current phone
   * @returns {Object} Verification result
   */
  async verifyOldPhoneOTP(userId, sessionId, otp) {
    try {
      logger.logAuth('Verifying old phone OTP for user', 'info', {
        userId: userId,
        sessionId: sessionId
      });

      // Initialize if not exists
      this.phoneChangeSessions = this.phoneChangeSessions || new Map();

      // Get session
      const session = this.phoneChangeSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid or expired phone change session');
      }

      // Check session ownership
      if (session.userId !== userId) {
        throw new Error('Session does not belong to this user');
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.phoneChangeSessions.delete(sessionId);
        throw new Error('Phone change session expired');
      }

      // Check step
      if (session.step !== 'verify_current_phone') {
        throw new Error('Invalid step. Expected current phone verification.');
      }

      // Check attempts
      if (session.currentPhoneAttempts >= this.MAX_OTP_ATTEMPTS) {
        this.phoneChangeSessions.delete(sessionId);
        throw new Error('Maximum current phone OTP attempts exceeded');
      }

      // Verify current phone OTP with Stytch - using unified authenticate method
      try {
        logger.logAuth('Verifying current phone OTP using phone method', 'info', {
          methodType: session.currentPhoneMethodType
        });

        // Stytch uses a single authenticate method for all OTP types
        const currentPhoneResult = await stytchClient.otps.authenticate({
          method_id: session.stytchCurrentPhoneId,
          code: otp
        });

        if (currentPhoneResult.status_code !== 200) {
          throw new Error('Invalid OTP');
        }

        logger.logAuth('Current phone OTP verified successfully', 'info', {
          methodType: session.currentPhoneMethodType
        });

        // Send OTP to new phone
        logger.logAuth('Sending OTP to new phone', 'info', {
          newPhoneNumber: session.newPhoneNumber
        });
        const newPhoneOTPResult = await this.sendPhoneOTP(session.newPhoneNumber);

        // Update session
        session.currentPhoneVerified = true;
        session.step = 'verify_new_phone';
        session.currentPhoneAttempts = 0; // Reset attempts after success
        session.stytchNewPhoneId = newPhoneOTPResult.method_id; // Use method_id for authenticate
        session.newPhoneMethodType = newPhoneOTPResult.method_type;
        this.phoneChangeSessions.set(sessionId, session);

        return {
          sessionId,
          step: 'verify_new_phone',
          currentPhoneVerified: true,
          newPhoneNumber: session.newPhoneNumber,
          message: 'Current phone verified successfully. OTP sent to your new phone via WhatsApp.'
        };

      } catch (error) {
        // Increment attempts
        session.currentPhoneAttempts++;
        this.phoneChangeSessions.set(sessionId, session);

        throw new Error(`Current phone OTP verification failed: ${error.message}`);
      }

    } catch (error) {
      logger.logError('Old phone OTP verification error', error, {
        userId: userId,
        sessionId: sessionId,
        errorMessage: error.message
      });
      throw new Error(`Old phone OTP verification failed: ${error.message}`);
    }
  }

  /**
   * Step 3: Verify new phone OTP and complete phone change
   * @param {string} userId - User ID from auth token
   * @param {string} sessionId - Phone change session ID
   * @param {string} otp - OTP code for new phone
   * @returns {Object} Phone change completion result
   */
  async verifyNewPhoneOTPAndComplete(userId, sessionId, otp) {
    try {
      logger.logAuth('Completing phone change for user', 'info', {
        userId: userId,
        sessionId: sessionId
      });

      // Initialize if not exists
      this.phoneChangeSessions = this.phoneChangeSessions || new Map();

      // Get session
      const session = this.phoneChangeSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid or expired phone change session');
      }

      // Check session ownership
      if (session.userId !== userId) {
        throw new Error('Session does not belong to this user');
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.phoneChangeSessions.delete(sessionId);
        throw new Error('Phone change session expired');
      }

      // Check step
      if (session.step !== 'verify_new_phone') {
        throw new Error('Invalid step. Expected new phone verification.');
      }

      // Check if current phone was verified
      if (!session.currentPhoneVerified) {
        throw new Error('Current phone verification required');
      }

      // Check attempts
      if (session.newPhoneAttempts >= this.MAX_OTP_ATTEMPTS) {
        this.phoneChangeSessions.delete(sessionId);
        throw new Error('Maximum new phone OTP attempts exceeded');
      }

      // Verify new phone OTP with Stytch - using unified authenticate method
      try {
        logger.logAuth('Verifying new phone OTP using phone method', 'info', {
          methodType: session.newPhoneMethodType
        });

        // Stytch uses a single authenticate method for all OTP types
        const newPhoneResult = await stytchClient.otps.authenticate({
          method_id: session.stytchNewPhoneId,
          code: otp
        });

        if (newPhoneResult.status_code !== 200) {
          throw new Error('Invalid OTP');
        }

        logger.logAuth('New phone OTP verified successfully', 'info', {
          methodType: session.newPhoneMethodType
        });

        // Both phones verified - update user's phone number in Stytch
        logger.logAuth('Updating phone number in Stytch', 'info');

        // Get user's Stytch ID
        const UserMappingService = (await import('../services/userMappingService.js')).default;
        const user = await UserMappingService.getUserById(userId);

        if (!user || !user.stytch_user_id) {
          throw new Error('User not found or missing Stytch ID');
        }

        // Update phone number in Stytch
        await stytchClient.users.update({
          user_id: user.stytch_user_id,
          phone_number: session.newPhoneNumber
        });

        // Update phone number in Supabase
        logger.logAuth('Updating phone number in Supabase', 'info');
        await UserMappingService.updateUserPhone(userId, session.newPhoneNumber);

        // Log activity
        const { logUserActivity } = await import('../services/activityService.js');
        await logUserActivity(
          userId,
          `Phone number changed from ${session.currentPhoneNumber} to ${session.newPhoneNumber}`,
          'phone_change',
          {
            old_phone: session.currentPhoneNumber,
            new_phone: session.newPhoneNumber,
            session_id: sessionId
          }
        );

        // Clean up session
        this.phoneChangeSessions.delete(sessionId);

        logger.logAuth('Phone change completed successfully', 'info');

        return {
          success: true,
          oldPhoneNumber: session.currentPhoneNumber,
          newPhoneNumber: session.newPhoneNumber,
          changedAt: new Date().toISOString(),
          message: 'Phone number changed successfully'
        };

      } catch (error) {
        // Increment attempts
        session.newPhoneAttempts++;
        this.phoneChangeSessions.set(sessionId, session);

        throw new Error(`New phone OTP verification failed: ${error.message}`);
      }

    } catch (error) {
      logger.logError('Phone change completion error', error, {
        userId: userId,
        sessionId: sessionId,
        errorMessage: error.message
      });
      throw new Error(`Phone change completion failed: ${error.message}`);
    }
  }
}

export default new AuthService(); 