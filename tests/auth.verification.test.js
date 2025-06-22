import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Authentication Verification API', () => {
  let server;
  let createdSessionId;
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    createdSessionId = null;
  });

  describe('POST /api/auth/verification/start', () => {
    it('should start verification session successfully', async () => {
      const response = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.phoneNumber).toBe('+1234567890');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.phoneVerified).toBe(false);
      expect(response.body.data.emailVerified).toBe(false);
      
      // Store session ID for other tests
      createdSessionId = response.body.data.sessionId;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/verification/start')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '1234567890', // Invalid format (missing +)
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'invalid-email' // Invalid email format
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/verification/send-otp', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a session first
      const sessionResponse = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'test@example.com'
        });
      sessionId = sessionResponse.body.data.sessionId;
    });

    it('should send OTP for phone verification', async () => {
      mockStytchClient.otps.sms.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-12345',
        status_code: 200
      });

      const response = await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          channel: 'sms'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.methodId).toBe('otp-method-12345');
    });

    it('should send OTP for email verification', async () => {
      mockStytchClient.otps.email.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-email-123',
        status_code: 200
      });

      const response = await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          channel: 'email'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.methodId).toBe('otp-method-email-123');
    });

    it('should handle expired session', async () => {
      const response = await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: 'expired-session-id',
          medium: 'phone',
          channel: 'sms'
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/verification/verify-otp', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a session and send OTP first
      const sessionResponse = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'test@example.com'
        });
      sessionId = sessionResponse.body.data.sessionId;

      // Mock OTP sending to get method_id
      mockStytchClient.otps.sms.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-12345',
        status_code: 200
      });

      // Send OTP to get method_id stored in session
      await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          channel: 'sms'
        });
    });

    it('should verify phone OTP successfully', async () => {
      mockStytchClient.otps.authenticate.mockResolvedValue({
        status_code: 200,
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          otp: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.verified).toBe(true);
      expect(response.body.data.phoneVerified).toBe(true);
    });

    it('should verify email OTP successfully', async () => {
      // Setup email OTP first
      mockStytchClient.otps.email.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-email-123',
        status_code: 200
      });

      await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          channel: 'email'
        });

      mockStytchClient.otps.authenticate.mockResolvedValue({
        status_code: 200,
        verified: true
      });

      const response = await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          otp: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.verified).toBe(true);
      expect(response.body.data.emailVerified).toBe(true);
    });

    it('should handle invalid OTP', async () => {
      mockStytchClient.otps.authenticate.mockRejectedValue(new Error('Invalid OTP'));

      const response = await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          otp: '999999'
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/verification/complete-login', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a session
      const sessionResponse = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'test@example.com'
        });
      sessionId = sessionResponse.body.data.sessionId;
    });

    it('should complete login successfully after both verifications', async () => {
      // Setup mocks for user creation and session
      mockStytchClient.users.search.mockResolvedValue({
        results: []
      });

      mockStytchClient.users.create.mockResolvedValue({
        user: {
          user_id: 'user-test-12345',
          phone_numbers: [{ phone_number: '+1234567890' }],
          emails: [{ email: 'test@example.com' }],
          created_at: new Date().toISOString(),
          status: 'active'
        }
      });

      mockStytchClient.magicLinks.email.loginOrCreate.mockRejectedValue(
        new Error('Magic link failed')
      );

      // First verify phone
      mockStytchClient.otps.sms.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-12345',
        status_code: 200
      });

      await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          channel: 'sms'
        });

      mockStytchClient.otps.authenticate.mockResolvedValue({
        status_code: 200,
        verified: true
      });

      await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          otp: '123456'
        });

      // Then verify email
      mockStytchClient.otps.email.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-email-123',
        status_code: 200
      });

      await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          channel: 'email'
        });

      await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          otp: '123456'
        });

      // Now complete login
      const response = await request(app)
        .post('/api/auth/verification/complete-login')
        .send({
          sessionId: sessionId
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.session_token).toBeDefined();
      expect(response.body.data.session_jwt).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.phoneNumber).toBe('+1234567890');

      // Store token for other API tests
      const sessionToken = response.body.data.session_token;
      expect(sessionToken).toContain('stytch_verified_');
    });

    it('should handle incomplete verification', async () => {
      const response = await request(app)
        .post('/api/auth/verification/complete-login')
        .send({
          sessionId: sessionId
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Complete verification required');
    });

    it('should handle non-existent session', async () => {
      const response = await request(app)
        .post('/api/auth/verification/complete-login')
        .send({
          sessionId: 'non-existent-session'
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/auth/verification/status/:sessionId', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a session
      const sessionResponse = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'test@example.com'
        });
      sessionId = sessionResponse.body.data.sessionId;
    });

    it('should get verification status successfully', async () => {
      const response = await request(app)
        .get(`/api/auth/verification/status/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.phoneVerified).toBe(false);
      expect(response.body.data.emailVerified).toBe(false);
      expect(response.body.data.bothVerified).toBe(false);
    });

    it('should handle non-existent session', async () => {
      const response = await request(app)
        .get('/api/auth/verification/status/non-existent-session');

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('Complete Flow Integration Test', () => {
    it('should complete the entire verification flow and return session token', async () => {
      // Setup all mocks
      mockStytchClient.users.search.mockResolvedValue({
        results: []
      });

      mockStytchClient.users.create.mockResolvedValue({
        user: {
          user_id: 'user-test-12345',
          phone_numbers: [{ phone_number: '+1234567890' }],
          emails: [{ email: 'test@example.com' }],
          created_at: new Date().toISOString(),
          status: 'active'
        }
      });

      mockStytchClient.magicLinks.email.loginOrCreate.mockRejectedValue(
        new Error('Magic link failed')
      );

      // 1. Start verification session
      const sessionResponse = await request(app)
        .post('/api/auth/verification/start')
        .send({
          phoneNumber: '+1234567890',
          email: 'test@example.com'
        });

      expect(sessionResponse.status).toBe(200);
      const sessionId = sessionResponse.body.data.sessionId;

      // 2. Send OTP to phone
      mockStytchClient.otps.sms.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-12345',
        status_code: 200
      });

      const phoneOtpResponse = await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          channel: 'sms'
        });

      expect(phoneOtpResponse.status).toBe(200);

      // 3. Verify phone OTP
      mockStytchClient.otps.authenticate.mockResolvedValue({
        status_code: 200,
        verified: true
      });

      const phoneVerifyResponse = await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'phone',
          otp: '123456'
        });

      expect(phoneVerifyResponse.status).toBe(200);
      expect(phoneVerifyResponse.body.data.phoneVerified).toBe(true);

      // 4. Send OTP to email
      mockStytchClient.otps.email.loginOrCreate.mockResolvedValue({
        method_id: 'otp-method-email-123',
        status_code: 200
      });

      const emailOtpResponse = await request(app)
        .post('/api/auth/verification/send-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          channel: 'email'
        });

      expect(emailOtpResponse.status).toBe(200);

      // 5. Verify email OTP
      const emailVerifyResponse = await request(app)
        .post('/api/auth/verification/verify-otp')
        .send({
          sessionId: sessionId,
          medium: 'email',
          otp: '123456'
        });

      expect(emailVerifyResponse.status).toBe(200);
      expect(emailVerifyResponse.body.data.emailVerified).toBe(true);
      expect(emailVerifyResponse.body.data.bothVerified).toBe(true);

      // 6. Complete login and get session token
      const loginResponse = await request(app)
        .post('/api/auth/verification/complete-login')
        .send({
          sessionId: sessionId
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.session_token).toBeDefined();
      expect(loginResponse.body.data.session_jwt).toBeDefined();
      expect(loginResponse.body.data.user.email).toBe('test@example.com');
      
      // The session token should be usable for authenticated APIs
      const sessionToken = loginResponse.body.data.session_token;
      expect(sessionToken).toContain('stytch_verified_');
      
      console.log('✅ Session Token Generated:', sessionToken);
      console.log('✅ Session JWT Generated:', loginResponse.body.data.session_jwt);
    });
  });
});

// Helper functions
function createMockUser() {
  return {
    user_id: 'user-123',
    email: 'test@example.com',
    phone_number: '+1234567890',
    created_at: new Date().toISOString()
  };
}

function createMockSession() {
  return {
    session_id: 'session-123',
    session_token: 'session-token-123',
    user_id: 'user-123',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
} 