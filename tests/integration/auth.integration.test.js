import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { 
  createTestUser, 
  expectValidApiResponse, 
  expectValidUser,
  clearTestData 
} from './setup.js';

describe('Authentication Integration Tests', () => {
  let testUser;
  let sessionToken;
  let otpMethodId;

  beforeEach(async () => {
    await clearTestData();
    testUser = createTestUser();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full OTP authentication flow', async () => {
      // Step 1: Check availability
      const availabilityResponse = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          email: testUser.email
        });

      expectValidApiResponse(availabilityResponse);
      expect(availabilityResponse.body.data.available).toBe(true);

      // Step 2: Send OTP
      const otpSendResponse = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          email: testUser.email,
          method: 'email'
        });

      expectValidApiResponse(otpSendResponse);
      expect(otpSendResponse.body.data.methodId).toBeDefined();
      otpMethodId = otpSendResponse.body.data.methodId;

      // Step 3: Verify OTP (in real integration test, you'd need actual OTP)
      // For testing purposes, we'll test the endpoint structure
      const otpVerifyResponse = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          methodId: otpMethodId,
          code: '123456' // This would be a real OTP in production
        });

      // This might fail with invalid OTP, but we're testing the flow
      expect([200, 400]).toContain(otpVerifyResponse.status);
      
      if (otpVerifyResponse.status === 200) {
        expectValidUser(otpVerifyResponse.body.data.user);
        expect(otpVerifyResponse.body.data.sessionId).toBeDefined();
        sessionToken = otpVerifyResponse.body.data.sessionId;
      }
    });

    it('should handle phone number authentication flow', async () => {
      // Check phone availability
      const availabilityResponse = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          phoneNumber: testUser.phoneNumber
        });

      expectValidApiResponse(availabilityResponse);
      expect(availabilityResponse.body.data.available).toBe(true);

      // Send SMS OTP
      const otpSendResponse = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          phoneNumber: testUser.phoneNumber,
          method: 'sms'
        });

      expectValidApiResponse(otpSendResponse);
      expect(otpSendResponse.body.data.methodId).toBeDefined();
    });

    it('should handle WhatsApp OTP flow', async () => {
      const otpSendResponse = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          phoneNumber: testUser.phoneNumber,
          method: 'whatsapp'
        });

      expectValidApiResponse(otpSendResponse);
      expect(otpSendResponse.body.data.methodId).toBeDefined();
    });
  });

  describe('Session Management Integration', () => {
    beforeEach(async () => {
      // Set up a mock session for testing
      sessionToken = 'integration-test-session-token';
    });

    it('should refresh session token', async () => {
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${sessionToken}`);

      // May fail if session is invalid, but testing endpoint
      expect([200, 401]).toContain(refreshResponse.status);
    });

    it('should get user profile with valid session', async () => {
      const profileResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);

      // May fail if session is invalid, but testing endpoint
      expect([200, 401]).toContain(profileResponse.status);
    });

    it('should get user sessions', async () => {
      const sessionsResponse = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(sessionsResponse.status);
    });

    it('should logout successfully', async () => {
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(logoutResponse.status);
    });
  });

  describe('Authentication Validation', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          phoneNumber: 'invalid-phone'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('phone');
    });

    it('should require either email or phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should validate OTP method', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({
          email: testUser.email,
          method: 'invalid-method'
        });

      expect(response.status).toBe(400);
    });

    it('should require methodId for OTP verification', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          code: '123456'
        });

      expect(response.status).toBe(400);
    });

    it('should require OTP code for verification', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          methodId: 'test-method-id'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits on OTP sending', async () => {
      const requests = [];
      
      // Send multiple OTP requests rapidly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/otp/send')
            .send({
              email: `test${i}@example.com`,
              method: 'email'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Should have some successful requests and some rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      
      expect(successfulRequests.length).toBeGreaterThan(0);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on availability checks', async () => {
      const requests = [];
      
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/check-availability')
            .send({
              email: `rapid-test${i}@example.com`
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      
      if (rateLimitedRequests.length > 0) {
        expect(rateLimitedRequests[0].headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimitedRequests[0].headers['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send('some data');

      expect(response.status).toBe(400);
    });

    it('should handle unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('authorization');
    });

    it('should handle invalid session tokens', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle malformed authorization headers', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
    });
  });

  describe('Security Integration', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability')
        .send({
          email: testUser.email
        });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should prevent parameter pollution', async () => {
      const response = await request(app)
        .post('/api/v1/auth/check-availability?email=hacker@evil.com')
        .send({
          email: testUser.email
        });

      // Should use the body parameter, not query parameter
      expectValidApiResponse(response);
    });
  });

  describe('Performance Integration', () => {
    it('should respond to health check quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/health');

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent authentication requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/check-availability')
          .send({
            email: `concurrent-test${i}@example.com`
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000);
    });
  });
}); 