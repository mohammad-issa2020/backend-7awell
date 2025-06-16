import stytchClient from '../config/stytch.js';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  constructor() {
    this.OTP_EXPIRY = 5 * 60; // 5 minutes in seconds
    this.MAX_OTP_ATTEMPTS = 5;
    this.OTP_RATE_LIMIT = 3; // 3 attempts per 5 minutes
    
    // In-memory rate limiting (simple implementation)
    this.rateLimitStore = new Map();
    this.otpAttempts = new Map();
    
    // Multi-step authentication tracking
    this.verificationSessions = new Map(); // Track verification progress
    
    // Clean up rate limits every 5 minutes
    setInterval(() => {
      this.cleanupRateLimits();
      this.cleanupVerificationSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Check availability (phone/email)
   * @param {string} medium - 'phone' or 'email'
   * @param {string} value - phone number or email address
   * @returns {Object} availability result
   */
  async checkAvailability(medium, value) {
    try {
      console.log(`🔍 Checking availability for ${medium}: ${value}`);
      
      let searchQuery = {};
      if (medium === 'phone') {
        searchQuery = {
          query: {
            operator: 'AND',
            operands: [{
              filter_name: 'phone_number',
              filter_value: [value]
            }]
          }
        };
      } else if (medium === 'email') {
        searchQuery = {
          query: {
            operator: 'AND',
            operands: [{
              filter_name: 'email',
              filter_value: [value]
            }]
          }
        };
      } else {
        throw new Error('Invalid medium. Must be phone or email.');
      }

      const result = await stytchClient.users.search(searchQuery);
      
      console.log(`📊 Search result:`, { 
        found: result.results?.length > 0,
        count: result.results?.length || 0 
      });

      return {
        available: !result.results || result.results.length === 0,
        medium,
        value,
        message: result.results?.length > 0 ? 
          `${medium === 'phone' ? 'Phone number' : 'Email'} is already registered` : 
          `${medium === 'phone' ? 'Phone number' : 'Email'} is available`
      };

    } catch (error) {
      console.error(`❌ Error checking availability: ${error.message}`);
      throw new Error(`Error checking availability: ${error.message}`);
    }
  }

  /**
   * Refresh Stytch session
   * @param {string} session_token - Stytch session token
   * @returns {Object} refreshed session data
   */
  async refreshSession(session_token) {
    try {
      const result = await stytchClient.sessions.authenticate({
        session_token: session_token
      });

      if (result.status_code !== 200) {
        throw new Error('Session authentication failed');
      }

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
        return null;
      }
      
      return decoded;
    } catch (error) {
      console.error('Failed to extract user info from JWT:', error.message);
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
        console.log('🔍 Validating custom verification token');
        
        // Initialize customSessions if not exists
        this.customSessions = this.customSessions || new Map();
        
        // Try to get stored session info first
        let storedInfo = this.customSessions.get(session_token);
        
        // If not in store but we have JWT, try to recover
        if (!storedInfo && session_jwt) {
          console.log('🔄 Attempting to recover session from JWT');
          const jwtInfo = this.extractUserInfoFromJWT(session_jwt);
          
          if (jwtInfo) {
            // Store the recovered info
            storedInfo = jwtInfo;
            this.customSessions.set(session_token, storedInfo);
            console.log('✅ Session recovered from JWT');
          }
        }
        
        if (storedInfo) {
          console.log('📋 Found stored session info');
          
          // Check if token is expired
          const expiresAt = new Date(storedInfo.expires_at).getTime();
          if (Date.now() > expiresAt) {
            this.customSessions.delete(session_token);
            throw new Error('Custom verification token expired');
          }
          
          // Validate that we have required user info
          if (!storedInfo.user_id || (!storedInfo.phone && !storedInfo.email)) {
            throw new Error('Invalid token: missing required user information');
          }
          
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
        // because we need phone/email info for Supabase user creation
        console.log('❌ No stored session info for custom token');
        throw new Error('Custom verification token not found in session store. Please provide session_jwt or login again.');
      }
      
      // Handle regular Stytch tokens
      console.log('🔍 Validating Stytch session token');
      const result = await stytchClient.sessions.authenticate({
        session_token: session_token
      });

      if (result.status_code !== 200) {
        throw new Error('Invalid session');
      }

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
      console.error('Session validation error:', error.message);
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
      console.log(`🔍 Getting sessions for Stytch user: ${stytch_user_id}`);
      
      // Get user data from Stytch which includes sessions
      const result = await stytchClient.users.get({
        user_id: stytch_user_id
      });

      console.log(`📊 Found ${result.sessions?.length || 0} sessions for user`);
      
      // Sessions are in the user object
      return result.sessions || [];
    } catch (error) {
      console.error(`❌ Error getting user sessions: ${error.message}`);
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
      console.log(`🔄 Revoking all sessions for Stytch user: ${stytch_user_id}`);
      
      // Get all user sessions first
      const sessions = await this.getUserSessions(stytch_user_id);
      
      console.log(`📋 Found ${sessions.length} sessions to revoke`);
      
      for (const session of sessions) {
        await this.revokeSession(session.session_id);
      }

      console.log(`✅ Successfully revoked all sessions`);
      return true;
    } catch (error) {
      console.error(`❌ Error revoking all sessions: ${error.message}`);
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
      console.log(`🧹 Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Start multi-step verification session
   * @param {string} phoneNumber - User's phone number
   * @param {string} email - User's email address  
   * @returns {Object} Verification session details
   */
  async startVerificationSession(phoneNumber, email) {
    try {
      if (!phoneNumber || !email) {
        throw new Error('Both phone number and email are required');
      }

      // Validate phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new Error('Invalid phone number format. Use international format: +1234567890');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      console.log(`🚀 Starting verification session for phone: ${phoneNumber}, email: ${email}`);

      const sessionId = uuidv4();
      const sessionData = {
        sessionId,
        phoneNumber,
        email,
        phoneVerified: false,
        emailVerified: false,
        phoneMethodId: null,
        emailMethodId: null,
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
        phoneOtpAttempts: 0,
        emailOtpAttempts: 0
      };

      this.verificationSessions.set(sessionId, sessionData);

      console.log(`🆔 Created verification session: ${sessionId}`);

      return {
        sessionId,
        phoneNumber,
        email,
        phoneVerified: false,
        emailVerified: false,
        expiresAt: sessionData.expiresAt,
        message: 'Verification session created. Please verify both phone and email.'
      };

    } catch (error) {
      console.error(`❌ Error starting verification session: ${error.message}`);
      throw new Error(`Error starting verification session: ${error.message}`);
    }
  }

  /**
   * Send OTP for multi-step verification
   * @param {string} sessionId - Verification session ID
   * @param {string} medium - 'phone' or 'email'
   * @param {string} channel - 'sms', 'whatsapp', or 'email'
   * @returns {Object} OTP send result
   */
  async sendVerificationOTP(sessionId, medium, channel = 'sms') {
    try {
      const sessionData = this.verificationSessions.get(sessionId);
      
      if (!sessionData) {
        throw new Error('Verification session not found or expired');
      }

      if (Date.now() > sessionData.expiresAt) {
        this.verificationSessions.delete(sessionId);
        throw new Error('Verification session expired');
      }

      let value;
      if (medium === 'phone') {
        value = sessionData.phoneNumber;
        if (sessionData.phoneVerified) {
          throw new Error('Phone number already verified in this session');
        }
      } else if (medium === 'email') {
        value = sessionData.email;
        if (sessionData.emailVerified) {
          throw new Error('Email already verified in this session');
        }
      } else {
        throw new Error('Invalid medium. Must be phone or email.');
      }

      // Check rate limiting
      const rateLimitKey = `${medium}:${value}`;
      const now = Date.now();
      const rateLimitData = this.rateLimitStore.get(rateLimitKey) || { count: 0, resetTime: now + 5 * 60 * 1000 };
      
      if (now < rateLimitData.resetTime && rateLimitData.count >= this.OTP_RATE_LIMIT) {
        throw new Error('Too many OTP requests. Please try again in 5 minutes.');
      }
      
      if (now >= rateLimitData.resetTime) {
        rateLimitData.count = 0;
        rateLimitData.resetTime = now + 5 * 60 * 1000;
      }

      let otpResult;
      console.log(`📱 Sending OTP to ${medium}:${value} via ${channel} for session ${sessionId}`);

      try {
        if (medium === 'phone') {
          if (channel === 'whatsapp') {
            otpResult = await stytchClient.otps.whatsapp.loginOrCreate({
              phone_number: value,
              expiration_minutes: 5
            });
          } else {
            otpResult = await stytchClient.otps.sms.loginOrCreate({
              phone_number: value,
              expiration_minutes: 5
            });
          }
        } else if (medium === 'email') {
          otpResult = await stytchClient.otps.email.loginOrCreate({
            email: value,
            expiration_minutes: 5
          });
        }

        console.log(`🔍 Stytch OTP Response Status: ${otpResult.status_code}`);
        
        if (otpResult.status_code !== 200) {
          throw new Error(`Stytch returned status ${otpResult.status_code}: ${otpResult.error_message || 'Unknown error'}`);
        }
        
      } catch (stytchError) {
        console.error(`❌ Stytch OTP Error:`, stytchError);
        
        // Handle specific Stytch errors
        if (stytchError.message.includes('phone_number_not_found')) {
          throw new Error('Phone number format is invalid or not supported');
        }
        if (stytchError.message.includes('email_not_found')) {
          throw new Error('Email format is invalid');
        }
        
        throw new Error(`Failed to send OTP: ${stytchError.message}`);
      }

      // Extract method_id
      let methodId = otpResult.method_id || otpResult.phone_id || otpResult.email_id;
      
      if (!methodId && otpResult.phone_numbers && otpResult.phone_numbers.length > 0) {
        methodId = otpResult.phone_numbers[0].phone_id;
      }
      if (!methodId && otpResult.emails && otpResult.emails.length > 0) {
        methodId = otpResult.emails[0].email_id;
      }

      if (!methodId) {
        throw new Error('Failed to get method_id from Stytch response');
      }

      // Update session data
      if (medium === 'phone') {
        sessionData.phoneMethodId = methodId;
      } else {
        sessionData.emailMethodId = methodId;
      }

      this.verificationSessions.set(sessionId, sessionData);

      // Update rate limiting
      rateLimitData.count++;
      this.rateLimitStore.set(rateLimitKey, rateLimitData);

      console.log(`✅ OTP sent successfully! Method ID: ${methodId}`);

      return {
        sessionId,
        medium,
        channel,
        methodId,
        expiresIn: 5 * 60, // 5 minutes
        message: `OTP sent to ${medium === 'phone' ? 'phone number' : 'email'}`
      };

    } catch (error) {
      console.error(`❌ Error sending verification OTP: ${error.message}`);
      throw new Error(`Error sending verification OTP: ${error.message}`);
    }
  }

  /**
   * Verify OTP for multi-step verification (doesn't create session)
   * @param {string} sessionId - Verification session ID
   * @param {string} medium - 'phone' or 'email'
   * @param {string} otp - 6-digit OTP code
   * @returns {Object} Verification result
   */
  async verifyVerificationOTP(sessionId, medium, otp) {
    try {
      const sessionData = this.verificationSessions.get(sessionId);
      
      if (!sessionData) {
        throw new Error('Verification session not found or expired');
      }

      if (Date.now() > sessionData.expiresAt) {
        this.verificationSessions.delete(sessionId);
        throw new Error('Verification session expired');
      }

      let methodId, attemptField;
      if (medium === 'phone') {
        methodId = sessionData.phoneMethodId;
        attemptField = 'phoneOtpAttempts';
        
        if (sessionData.phoneVerified) {
          throw new Error('Phone number already verified in this session');
        }
      } else if (medium === 'email') {
        methodId = sessionData.emailMethodId;
        attemptField = 'emailOtpAttempts';
        
        if (sessionData.emailVerified) {
          throw new Error('Email already verified in this session');
        }
      } else {
        throw new Error('Invalid medium. Must be phone or email.');
      }

      if (!methodId) {
        throw new Error(`No OTP request found for ${medium}. Please request OTP first.`);
      }

      // Check attempts
      if (sessionData[attemptField] >= this.MAX_OTP_ATTEMPTS) {
        throw new Error(`Too many failed attempts for ${medium}. Please start a new verification session.`);
      }

      try {
        console.log(`🔐 Verifying ${medium} OTP - Method ID: ${methodId}, Code: ${otp}`);
        
        // Authenticate with Stytch - but don't create session yet
        const authResult = await stytchClient.otps.authenticate({
          method_id: methodId,
          code: otp,
          session_duration_minutes: 5 // Short session just for verification
        });

        if (authResult.status_code !== 200) {
          sessionData[attemptField]++;
          this.verificationSessions.set(sessionId, sessionData);
          throw new Error('Invalid OTP code');
        }

        console.log(`✅ ${medium} OTP verification successful!`);

        // Mark as verified
        if (medium === 'phone') {
          sessionData.phoneVerified = true;
        } else {
          sessionData.emailVerified = true;
        }

        this.verificationSessions.set(sessionId, sessionData);

        // Check if both are verified
        const bothVerified = sessionData.phoneVerified && sessionData.emailVerified;

        return {
          sessionId,
          medium,
          verified: true,
          phoneVerified: sessionData.phoneVerified,
          emailVerified: sessionData.emailVerified,
          bothVerified,
          message: bothVerified ? 
            'Both phone and email verified! You can now login.' : 
            `${medium === 'phone' ? 'Phone number' : 'Email'} verified. Please verify ${medium === 'phone' ? 'email' : 'phone number'} to continue.`
        };

      } catch (error) {
        sessionData[attemptField]++;
        this.verificationSessions.set(sessionId, sessionData);
        throw error;
      }

    } catch (error) {
      console.error(`❌ Error verifying ${medium} OTP: ${error.message}`);
      throw new Error(`Error verifying ${medium} OTP: ${error.message}`);
    }
  }

  /**
   * Complete login after both phone and email verification
   * @param {string} sessionId - Verification session ID
   * @returns {Object} Stytch session data
   */
  async completeLogin(sessionId) {
    try {
      const sessionData = this.verificationSessions.get(sessionId);
      
      if (!sessionData) {
        throw new Error('Verification session not found or expired');
      }

      if (Date.now() > sessionData.expiresAt) {
        this.verificationSessions.delete(sessionId);
        throw new Error('Verification session expired');
      }

      if (!sessionData.phoneVerified || !sessionData.emailVerified) {
        throw new Error('Both phone and email must be verified before login');
      }

      console.log(`🎉 Completing login for verified session: ${sessionId}`);

      // Create or find user first
      let user = null;
      try {
        // Try to find by phone first
        const phoneSearchResult = await stytchClient.users.search({
          query: {
            operator: 'AND',
            operands: [{
              filter_name: 'phone_number',
              filter_value: [sessionData.phoneNumber]
            }]
          }
        });
        
        if (phoneSearchResult.results && phoneSearchResult.results.length > 0) {
          user = phoneSearchResult.results[0];
        }
      } catch (error) {
        console.log('User not found by phone, will create new one');
      }

      if (!user) {
        // Create new user with both phone and email
        console.log(`👤 Creating new user with phone: ${sessionData.phoneNumber} and email: ${sessionData.email}`);
        
        const createUserResult = await stytchClient.users.create({
          phone_number: sessionData.phoneNumber,
          email: sessionData.email
        });
        user = createUserResult.user;
      }

      // Create session using Magic Links loginOrCreate method
      let sessionResult;
      
      try {
        console.log('🔗 Creating session via Magic Links');
        
        sessionResult = await stytchClient.magicLinks.email.loginOrCreate({
          email: sessionData.email,
          session_duration_minutes: 60 * 24 * 7 // 7 days
        });
        
        console.log('✅ Session created successfully via Magic Links');
        
      } catch (magicLinkError) {
        console.log('🔄 Magic Links failed, creating enhanced custom verified session');
        console.error('Magic Link error:', magicLinkError.message);
        
        // Create an enhanced custom session token with embedded user info
        const timestamp = Date.now();
        const userInfo = {
          user_id: user.user_id,
          email: sessionData.email,
          phone: sessionData.phoneNumber,
          verified_at: new Date().toISOString(),
          session_id: sessionId,
          expires_at: new Date(timestamp + (60 * 24 * 7 * 60 * 1000)).toISOString(),
          created_at: user.created_at,
          status: user.status
        };
        
        const customSessionToken = `stytch_verified_${sessionId}_${timestamp}`;
        const customSessionJWT = Buffer.from(JSON.stringify(userInfo)).toString('base64');
        
        sessionResult = {
          user: user,
          session_token: customSessionToken,
          session_jwt: customSessionJWT,
          userInfo: userInfo, // Store user info for validation
          session: {
            session_id: sessionId,
            user_id: user.user_id,
            started_at: new Date().toISOString(),
            expires_at: new Date(timestamp + (60 * 24 * 7 * 60 * 1000)).toISOString(),
            attributes: {
              phone_verified: true,
              email_verified: true,
              verification_method: 'multi_step_otp'
            }
          }
        };
        
        // Store the session info for validation (in production, use database)
        this.customSessions = this.customSessions || new Map();
        this.customSessions.set(customSessionToken, userInfo);
        
        console.log('✅ Enhanced custom verified session created');
      }

      // Clean up verification session
      this.verificationSessions.delete(sessionId);

      console.log(`🎉 Login completed successfully for user: ${user.user_id}`);

      return {
        user: {
          id: user.user_id,
          phoneNumber: user.phone_numbers?.[0]?.phone_number || sessionData.phoneNumber,
          email: user.emails?.[0]?.email || sessionData.email,
          created_at: user.created_at,
          status: user.status
        },
        session: sessionResult.session,
        session_token: sessionResult.session_token,
        session_jwt: sessionResult.session_jwt,
        message: 'Login successful! Both phone and email verified.'
      };

    } catch (error) {
      console.error(`❌ Error completing login: ${error.message}`);
      throw new Error(`Error completing login: ${error.message}`);
    }
  }

  /**
   * Get verification session status
   * @param {string} sessionId - Verification session ID
   * @returns {Object} Session status
   */
  getVerificationSessionStatus(sessionId) {
    const sessionData = this.verificationSessions.get(sessionId);
    
    if (!sessionData) {
      throw new Error('Verification session not found');
    }

    if (Date.now() > sessionData.expiresAt) {
      this.verificationSessions.delete(sessionId);
      throw new Error('Verification session expired');
    }

    return {
      sessionId,
      phoneNumber: sessionData.phoneNumber,
      email: sessionData.email,
      phoneVerified: sessionData.phoneVerified,
      emailVerified: sessionData.emailVerified,
      bothVerified: sessionData.phoneVerified && sessionData.emailVerified,
      expiresAt: sessionData.expiresAt,
      timeRemaining: Math.max(0, sessionData.expiresAt - Date.now())
    };
  }

  /**
   * Clean up expired verification sessions
   */
  cleanupVerificationSessions() {
    const now = Date.now();
    for (const [sessionId, sessionData] of this.verificationSessions.entries()) {
      if (now > sessionData.expiresAt) {
        this.verificationSessions.delete(sessionId);
        console.log(`🧹 Cleaned up expired verification session: ${sessionId}`);
      }
    }
  }
}

export default new AuthService(); 