import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Authentication API', () => {
  let server;
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/check-availability', () => {
    it('should check email availability successfully', async () => {
      mockStytchClient.users.search.mockResolvedValue({
        results: [],
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.available).toBe(true);
      expect(mockStytchClient.users.search).toHaveBeenCalledWith({
        query: {
          operator: 'AND',
          operands: [{
            filter_name: 'email',
            filter_value: ['test@example.com']
          }]
        }
      });
    });

    it('should check phone availability successfully', async () => {
      mockStytchClient.users.search.mockResolvedValue({
        results: [],
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          phoneNumber: '+1234567890'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.available).toBe(true);
    });

    it('should return unavailable when email exists', async () => {
      mockStytchClient.users.search.mockResolvedValue({
        results: [createMockUser()],
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          email: 'existing@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.available).toBe(false);
    });

    it('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/otp/send', () => {
    it('should send SMS OTP successfully', async () => {
      mockStytchClient.otps.sms.send.mockResolvedValue({
        method_id: 'otp-method-12345',
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          phoneNumber: '+1234567890',
          method: 'sms'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.methodId).toBe('otp-method-12345');
      expect(mockStytchClient.otps.sms.send).toHaveBeenCalled();
    });

    it('should send WhatsApp OTP successfully', async () => {
      mockStytchClient.otps.whatsapp.send.mockResolvedValue({
        method_id: 'otp-method-67890',
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          phoneNumber: '+1234567890',
          method: 'whatsapp'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.methodId).toBe('otp-method-67890');
      expect(mockStytchClient.otps.whatsapp.send).toHaveBeenCalled();
    });

    it('should send Email OTP successfully', async () => {
      mockStytchClient.otps.email.send.mockResolvedValue({
        method_id: 'otp-method-email-123',
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          email: 'test@example.com',
          method: 'email'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.methodId).toBe('otp-method-email-123');
      expect(mockStytchClient.otps.email.send).toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      // First request should succeed
      mockStytchClient.otps.sms.send.mockResolvedValue({
        method_id: 'otp-method-12345',
        status_code: 200
      });

      const firstResponse = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          phoneNumber: '+1234567890',
          method: 'sms'
        });

      expect(firstResponse.status).toBe(200);

      // Multiple rapid requests should be rate limited
      const responses = await Promise.all([
        request(app).post('/api/v1/auth/otp/send').send({ phoneNumber: '+1234567890', method: 'sms' }),
        request(app).post('/api/v1/auth/otp/send').send({ phoneNumber: '+1234567890', method: 'sms' }),
        request(app).post('/api/v1/auth/otp/send').send({ phoneNumber: '+1234567890', method: 'sms' })
      ]);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/otp/verify', () => {
    it('should verify OTP and create session successfully', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockStytchClient.otps.sms.authenticate.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          methodId: 'otp-method-12345',
          code: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.user.user_id).toBe(mockUser.user_id);
      expect(response.body.data.sessionId).toBe(mockSession.session_id);
    });

    it('should handle invalid OTP code', async () => {
      mockStytchClient.otps.sms.authenticate.mockRejectedValue({
        status_code: 400,
        error_message: 'Invalid OTP code'
      });

      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          methodId: 'otp-method-12345',
          code: '999999'
        });

      expect(response.status).toBe(400);
    });

    it('should handle expired OTP', async () => {
      mockStytchClient.otps.sms.authenticate.mockRejectedValue({
        status_code: 400,
        error_message: 'OTP has expired'
      });

      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          methodId: 'otp-method-12345',
          code: '123456'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with session token successfully', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockStytchClient.sessions.authenticate.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          sessionToken: 'session-token-12345'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.user_id).toBe(mockUser.user_id);
    });

    it('should handle invalid session token', async () => {
      mockStytchClient.sessions.authenticate.mockRejectedValue({
        status_code: 401,
        error_message: 'Invalid session token'
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          sessionToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh session successfully', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockStytchClient.sessions.authenticate.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer session-token-12345');

      expect(response.status).toBe(200);
      expect(response.body.data.sessionId).toBe(mockSession.session_id);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      mockStytchClient.sessions.revoke.mockResolvedValue({
        status_code: 200
      });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer session-token-12345');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successfully');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get user profile successfully', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession();

      mockStytchClient.sessions.authenticate.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        status_code: 200
      });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer session-token-12345');

      expect(response.status).toBe(200);
      expect(response.body.data.user.user_id).toBe(mockUser.user_id);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/sessions', () => {
    it('should get user sessions successfully', async () => {
      const mockUser = createMockUser();
      mockUser.sessions = [createMockSession(), createMockSession()];

      mockStytchClient.sessions.authenticate.mockResolvedValue({
        user: mockUser,
        session: createMockSession(),
        status_code: 200
      });

      const response = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', 'Bearer session-token-12345');

      expect(response.status).toBe(200);
      expect(response.body.data.sessions).toHaveLength(2);
    });
  });

  describe('DELETE /api/v1/auth/sessions/:sessionId', () => {
    it('should revoke specific session successfully', async () => {
      mockStytchClient.sessions.revoke.mockResolvedValue({
        status_code: 200
      });

      const response = await request(app)
        .delete('/api/v1/auth/sessions/session-to-revoke-123')
        .set('Authorization', 'Bearer session-token-12345');

      expect(response.status).toBe(200);
      expect(mockStytchClient.sessions.revoke).toHaveBeenCalledWith({
        session_id: 'session-to-revoke-123'
      });
    });
  });

  describe('DELETE /api/v1/auth/sessions', () => {
    it('should revoke all sessions successfully', async () => {
      const mockUser = createMockUser();

      mockStytchClient.sessions.authenticate.mockResolvedValue({
        user: mockUser,
        session: createMockSession(),
        status_code: 200
      });

      mockStytchClient.sessions.revoke_all.mockResolvedValue({
        status_code: 200
      });

      const response = await request(app)
        .delete('/api/v1/auth/sessions')
        .set('Authorization', 'Bearer session-token-12345');

      expect(response.status).toBe(200);
      expect(mockStytchClient.sessions.revoke_all).toHaveBeenCalledWith({
        user_id: mockUser.user_id
      });
    });
  });
}); 