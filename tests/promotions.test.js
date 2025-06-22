import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Promotions API', () => {
  let authToken;
  let adminToken;
  
  beforeEach(async () => {
    // Setup authenticated user for promotion tests
    const mockUser = createMockUser();
    const mockSession = createMockSession();

    mockStytchClient.sessions.authenticate.mockResolvedValue({
      user: mockUser,
      session: mockSession,
      status_code: 200
    });

    authToken = 'Bearer session-token-12345';
    adminToken = 'Bearer admin-session-token-67890';
    vi.clearAllMocks();
  });

  describe('GET /api/v1/promotions', () => {
    it('should get promotions with default parameters', async () => {
      const mockPromotions = [
        createMockPromotion(),
        createMockPromotion({ 
          promotion_id: 'promo-test-67890',
          title: 'Another Promotion'
        })
      ];

      vi.doMock('../services/promotionService', () => ({
        default: {
          getPromotions: vi.fn().mockResolvedValue({
            promotions: mockPromotions,
            pagination: {
              limit: 10,
              offset: 0,
              hasMore: false
            },
            locale: 'en',
            cached: false,
            timestamp: new Date().toISOString()
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.promotions).toHaveLength(2);
      expect(response.body.data.locale).toBe('en');
    });

    it('should get promotions with custom locale', async () => {
      const mockPromotions = [
        createMockPromotion({ title: 'offer 1' })
      ];

      vi.doMock('../services/promotionService', () => ({
        default: {
          getPromotions: vi.fn().mockResolvedValue({
            promotions: mockPromotions,
            pagination: { limit: 10, offset: 0, hasMore: false },
            locale: 'ar',
            cached: false,
            timestamp: new Date().toISOString()
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions?locale=ar')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.locale).toBe('ar');
      expect(response.body.data.promotions[0].title).toBe('offer 1');
    });

    it('should handle pagination parameters', async () => {
      const mockPromotions = [createMockPromotion()];

      vi.doMock('../services/promotionService', () => ({
        default: {
          getPromotions: vi.fn().mockResolvedValue({
            promotions: mockPromotions,
            pagination: {
              limit: 5,
              offset: 10,
              hasMore: true
            },
            locale: 'en',
            cached: false,
            timestamp: new Date().toISOString()
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions?limit=5&offset=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.offset).toBe(10);
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/promotions?limit=100')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('limit');
    });

    it('should return cached results when available', async () => {
      const mockPromotions = [createMockPromotion()];

      vi.doMock('../services/promotionService', () => ({
        default: {
          getPromotions: vi.fn().mockResolvedValue({
            promotions: mockPromotions,
            pagination: { limit: 10, offset: 0, hasMore: false },
            locale: 'en',
            cached: true,
            timestamp: new Date().toISOString()
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.cached).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/promotions');

      expect(response.status).toBe(401);
    });
  });



  describe('GET /api/v1/promotions/all (Admin)', () => {
    it('should get all promotions for admin', async () => {
      const mockPromotions = [
        createMockPromotion({ is_active: true }),
        createMockPromotion({ 
          promotion_id: 'promo-test-67890',
          is_active: false,
          title: 'Inactive Promotion'
        })
      ];

      vi.doMock('../services/promotionService', () => ({
        default: {
          getAllPromotions: vi.fn().mockResolvedValue({
            promotions: mockPromotions,
            pagination: {
              limit: 50,
              offset: 0,
              total: 2,
              hasMore: false
            }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions/all')
        .set('Authorization', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.promotions).toHaveLength(2);
      expect(response.body.data.promotions[0].is_active).toBe(true);
      expect(response.body.data.promotions[1].is_active).toBe(false);
    });

    it('should handle pagination for admin view', async () => {
      const mockPromotions = [createMockPromotion()];

      vi.doMock('../services/promotionService', () => ({
        default: {
          getAllPromotions: vi.fn().mockResolvedValue({
            promotions: mockPromotions,
            pagination: {
              limit: 25,
              offset: 25,
              total: 100,
              hasMore: true
            }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions/all?limit=25&offset=25')
        .set('Authorization', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.hasMore).toBe(true);
      expect(response.body.data.pagination.total).toBe(100);
    });
  });

  describe('DELETE /api/v1/promotions/cache (Admin)', () => {
    it('should clear promotion cache successfully', async () => {
      vi.doMock('../services/promotionService', () => ({
        default: {
          clearCache: vi.fn().mockResolvedValue({
            success: true,
            clearedKeys: ['user:123:promotions:en', 'user:456:promotions:ar'],
            timestamp: new Date().toISOString()
          })
        }
      }));

      const response = await request(app)
        .delete('/api/v1/promotions/cache')
        .set('Authorization', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.clearedKeys).toHaveLength(2);
    });

    it('should clear cache for specific user', async () => {
      vi.doMock('../services/promotionService', () => ({
        default: {
          clearCache: vi.fn().mockResolvedValue({
            success: true,
            clearedKeys: ['user:123:promotions:en'],
            userId: 'user-test-12345'
          })
        }
      }));

      const response = await request(app)
        .delete('/api/v1/promotions/cache?userId=user-test-12345')
        .set('Authorization', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.userId).toBe('user-test-12345');
    });
  });


  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.doMock('../services/promotionService', () => ({
        default: {
          getPromotions: vi.fn().mockRejectedValue(new Error('Redis connection failed'))
        }
      }));

      const response = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('error');
    });

    it('should handle invalid promotion ID format', async () => {
      const response = await request(app)
        .post('/api/v1/promotions/invalid-id-format/view')
        .set('Authorization', authToken)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should handle rate limiting for promotion interactions', async () => {
      // Simulate multiple rapid view requests
      const requests = Array.from({ length: 15 }, () =>
        request(app)
          .post('/api/v1/promotions/promo-test-12345/view')
          .set('Authorization', authToken)
          .send({})
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate locale parameter', async () => {
      const response = await request(app)
        .get('/api/v1/promotions?locale=invalid-locale-code')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('locale');
    });
  });
}); 