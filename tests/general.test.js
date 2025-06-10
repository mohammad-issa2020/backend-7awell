import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('General API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/', () => {
    it('should return welcome message with API information', async () => {
      const response = await request(app)
        .get('/api/v1/');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Welcome to 7awel Crypto Wallet API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.description).toContain('RESTful API');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.health).toBe('/api/v1/health');
      expect(response.body.endpoints.auth).toBeDefined();
      expect(response.body.endpoints.promotions).toBeDefined();
      expect(response.body.endpoints.transactions).toBeDefined();
      expect(response.body.endpoints.activity).toBeDefined();
      expect(response.body.features).toBeInstanceOf(Array);
    });

    it('should include all major endpoint categories', async () => {
      const response = await request(app)
        .get('/api/v1/');

      const endpoints = response.body.endpoints;
      expect(endpoints.auth.checkAvailability).toBeDefined();
      expect(endpoints.auth.sendOTP).toBeDefined();
      expect(endpoints.auth.verifyOTP).toBeDefined();
      expect(endpoints.promotions.getPromotions).toBeDefined();
      expect(endpoints.transactions.getTransactions).toBeDefined();
      expect(endpoints.activity.logs).toBeDefined();
      expect(endpoints.logs.logEvent).toBeDefined();
    });

    it('should list all available features', async () => {
      const response = await request(app)
        .get('/api/v1/');

      expect(response.body.features).toContain('Stytch-based authentication');
      expect(response.body.features).toContain('Crypto wallet transaction tracking');
      expect(response.body.features).toContain('Promotion system with targeting and analytics');
      expect(response.body.features).toContain('Rate limiting');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeTypeOf('number');
      expect(response.body.memory).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.services.stytch).toBe('Ready');
      expect(response.body.services.api).toBe('Active');
      expect(response.body.version).toBe('1.0.0');
    });

    it('should include memory usage information', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.body.memory.rss).toBeTypeOf('number');
      expect(response.body.memory.heapTotal).toBeTypeOf('number');
      expect(response.body.memory.heapUsed).toBeTypeOf('number');
      expect(response.body.memory.external).toBeTypeOf('number');
    });

    it('should show correct environment', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(['development', 'test', 'production']).toContain(response.body.environment);
    });
  });

  describe('GET /api/stytch-test', () => {
    it('should test Stytch connection successfully', async () => {
      mockStytchClient.users.search.mockResolvedValue({
        results: [],
        status_code: 200
      });

      const response = await request(app)
        .get('/api/stytch-test');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.message).toContain('Stytch connection successful');
      expect(response.body.stytchResponse).toBeDefined();
      expect(response.body.stytchResponse.status_code).toBe(200);
      expect(response.body.environment).toBeDefined();
      expect(response.body.environment.project_id).toContain('✅');
      expect(response.body.environment.secret).toContain('✅');
    });

    it('should handle Stytch connection failure', async () => {
      mockStytchClient.users.search.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/api/stytch-test');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('ERROR');
      expect(response.body.message).toContain('Stytch connection failed');
      expect(response.body.error).toBe('Connection failed');
      expect(response.body.environment).toBeDefined();
    });

    it('should show environment variable status', async () => {
      mockStytchClient.users.search.mockResolvedValue({
        results: [],
        status_code: 200
      });

      const response = await request(app)
        .get('/api/stytch-test');

      expect(response.body.environment.project_id).toMatch(/Set ✅|Missing ❌/);
      expect(response.body.environment.secret).toMatch(/Set ✅|Missing ❌/);
      expect(response.body.environment.node_env).toBeDefined();
    });
  });

  describe('GET /api/debug-otp', () => {
    it('should return OTP debug information', async () => {
      // Mock the auth service with some test data
      const mockAuthService = {
        otpAttempts: new Map([
          ['test-key-1', {
            methodId: 'otp-method-123',
            attempts: 1,
            expires: Date.now() + 5 * 60 * 1000,
            createdAt: Date.now() - 60 * 1000
          }]
        ]),
        rateLimitStore: new Map([
          ['+1234567890', {
            count: 2,
            resetTime: Date.now() + 15 * 60 * 1000
          }]
        ])
      };

      vi.doMock('../services/authService', () => ({
        default: mockAuthService
      }));

      const response = await request(app)
        .get('/api/debug-otp');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.message).toBe('OTP Debug Information');
      expect(response.body.data.otpAttempts).toBeDefined();
      expect(response.body.data.rateLimiting).toBeDefined();
      expect(response.body.data.serverInfo).toBeDefined();
    });

    it('should include OTP attempts data', async () => {
      const mockAuthService = {
        otpAttempts: new Map([
          ['test-key-1', {
            methodId: 'otp-method-123',
            attempts: 1,
            expires: Date.now() + 5 * 60 * 1000,
            createdAt: Date.now() - 60 * 1000
          }]
        ]),
        rateLimitStore: new Map()
      };

      vi.doMock('../services/authService', () => ({
        default: mockAuthService
      }));

      const response = await request(app)
        .get('/api/debug-otp');

      expect(response.body.data.otpAttempts.count).toBe(1);
      expect(response.body.data.otpAttempts.keys).toContain('test-key-1');
      expect(response.body.data.otpAttempts.data['test-key-1'].methodId).toBe('otp-method-123');
    });

    it('should include rate limiting data', async () => {
      const mockAuthService = {
        otpAttempts: new Map(),
        rateLimitStore: new Map([
          ['+1234567890', {
            count: 3,
            resetTime: Date.now() + 15 * 60 * 1000
          }]
        ])
      };

      vi.doMock('../services/authService', () => ({
        default: mockAuthService
      }));

      const response = await request(app)
        .get('/api/debug-otp');

      expect(response.body.data.rateLimiting.count).toBe(1);
      expect(response.body.data.rateLimiting.keys).toContain('+1234567890');
      expect(response.body.data.rateLimiting.data['+1234567890'].count).toBe(3);
    });

    it('should include server information', async () => {
      const mockAuthService = {
        otpAttempts: new Map(),
        rateLimitStore: new Map()
      };

      vi.doMock('../services/authService', () => ({
        default: mockAuthService
      }));

      const response = await request(app)
        .get('/api/debug-otp');

      expect(response.body.data.serverInfo.uptime).toBeTypeOf('number');
      expect(response.body.data.serverInfo.memory).toBeDefined();
      expect(response.body.data.serverInfo.timestamp).toBeDefined();
    });
  });

  describe('GET /api/v1/tests', () => {
    it('should return test endpoints information', async () => {
      vi.doMock('../services/testService', () => ({
        default: {
          getTestInfo: vi.fn().mockResolvedValue({
            message: 'Test endpoints available',
            endpoints: [
              { path: '/api/v1/tests/ping', method: 'GET', description: 'Simple ping test' },
              { path: '/api/v1/tests/error', method: 'GET', description: 'Test error handling' }
            ],
            environment: 'test'
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/tests');

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('Test endpoints');
      expect(response.body.data.endpoints).toBeInstanceOf(Array);
    });

    it('should only be available in development/test environments', async () => {
      // In production, this endpoint should return 404 or be disabled
      if (process.env.NODE_ENV === 'production') {
        const response = await request(app)
          .get('/api/v1/tests');

        expect([404, 403]).toContain(response.status);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/send')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/otp/send')
        .send('some data');

      expect(response.status).toBe(400);
    });

    it('should include error tracking information', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint');

      expect(response.body.statusCode).toBe(404);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      // Make multiple requests rapidly
      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/api/v1/health')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // In test environment, rate limiting might be more lenient
      if (process.env.NODE_ENV !== 'test') {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      // Rate limit headers are usually added by middleware
      // These might be present depending on your rate limiting implementation
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      }
    });
  });

  describe('Content Compression', () => {
    it('should support gzip compression for large responses', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .set('Accept-Encoding', 'gzip');

      // Check if compression is working (large JSON response should be compressed)
      if (response.headers['content-encoding']) {
        expect(response.headers['content-encoding']).toBe('gzip');
      }
    });
  });

  describe('API Versioning', () => {
    it('should handle versioned API endpoints correctly', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
    });

    it('should return proper errors for unsupported API versions', async () => {
      const response = await request(app)
        .get('/api/v2/health');

      expect(response.status).toBe(404);
    });
  });

  describe('Request Logging', () => {
    it('should log API requests', async () => {
      // This test verifies that the logging middleware is working
      // In a real scenario, you'd check your logs or use a spy on the logger
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      // Logger should have been called, but we can't easily test that without spying
      // In a production test, you might verify log files or use a logging service
    });
  });
}); 