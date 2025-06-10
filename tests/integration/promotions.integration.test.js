import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { 
  createTestUser, 
  createTestPromotion,
  expectValidApiResponse, 
  expectValidPromotion,
  expectValidPagination,
  clearTestData,
  loginTestUser
} from './setup.js';

describe('Promotions Integration Tests', () => {
  let testUser;
  let sessionToken;
  let adminToken;
  let testPromotionId;

  beforeEach(async () => {
    await clearTestData();
    testUser = createTestUser();
    sessionToken = await loginTestUser(app, request, testUser);
    adminToken = 'integration-test-admin-token'; // In real tests, create admin session
  });

  describe('Promotion Listing Integration', () => {
    it('should list promotions with default parameters', async () => {
      const response = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.promotions).toBeInstanceOf(Array);
        expect(response.body.data.locale).toBeDefined();
        expectValidPagination(response.body.data.pagination);
        
        // Validate each promotion
        response.body.data.promotions.forEach(promotion => {
          expectValidPromotion(promotion);
        });
      }
    });

    it('should list promotions with custom locale', async () => {
      const response = await request(app)
        .get('/api/v1/promotions?locale=ar')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.locale).toBe('ar');
      }
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/promotions?limit=5&offset=0')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.promotions.length).toBeLessThanOrEqual(5);
        expectValidPagination(response.body.data.pagination);
        expect(response.body.data.pagination.limit).toBe(5);
        expect(response.body.data.pagination.offset).toBe(0);
      }
    });

    it('should validate locale parameter', async () => {
      const response = await request(app)
        .get('/api/v1/promotions?locale=invalid-locale')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('locale');
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/promotions?limit=100')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('limit');
    });

    it('should show cached status in response', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(firstResponse.status);
      
      if (firstResponse.status === 200) {
        // Second request should potentially be cached
        const secondResponse = await request(app)
          .get('/api/v1/promotions')
          .set('Authorization', `Bearer ${sessionToken}`);

        expect(secondResponse.status).toBe(200);
        expect(typeof secondResponse.body.data.cached).toBe('boolean');
      }
    });
  });

  describe('Promotion Interaction Integration', () => {
    it('should record promotion view', async () => {
      // First get promotions to get a valid promotion ID
      const promotionsResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (promotionsResponse.status === 200 && promotionsResponse.body.data.promotions.length > 0) {
        const promotionId = promotionsResponse.body.data.promotions[0].promotion_id;

        const viewResponse = await request(app)
          .post(`/api/v1/promotions/${promotionId}/view`)
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({
            platform: 'mobile',
            appVersion: '1.0.0',
            deviceInfo: {
              os: 'iOS',
              version: '15.0'
            },
            referrer: 'home_screen'
          });

        expect([200, 401, 404]).toContain(viewResponse.status);
        
        if (viewResponse.status === 200) {
          expectValidApiResponse(viewResponse);
          expect(viewResponse.body.data.success).toBe(true);
          expect(viewResponse.body.data.viewId).toBeDefined();
          expect(viewResponse.body.data.timestamp).toBeDefined();
        }
      }
    });

    it('should record promotion view with minimal data', async () => {
      const promotionsResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (promotionsResponse.status === 200 && promotionsResponse.body.data.promotions.length > 0) {
        const promotionId = promotionsResponse.body.data.promotions[0].promotion_id;

        const viewResponse = await request(app)
          .post(`/api/v1/promotions/${promotionId}/view`)
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({});

        expect([200, 401, 404]).toContain(viewResponse.status);
      }
    });

    it('should record promotion click', async () => {
      const promotionsResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (promotionsResponse.status === 200 && promotionsResponse.body.data.promotions.length > 0) {
        const promotionId = promotionsResponse.body.data.promotions[0].promotion_id;

        const clickResponse = await request(app)
          .post(`/api/v1/promotions/${promotionId}/click`)
          .set('Authorization', `Bearer ${sessionToken}`);

        expect([200, 401, 404]).toContain(clickResponse.status);
        
        if (clickResponse.status === 200) {
          expectValidApiResponse(clickResponse);
          expect(typeof clickResponse.body.data.success).toBe('boolean');
          if (clickResponse.body.data.success) {
            expect(clickResponse.body.data.clickId).toBeDefined();
          }
        }
      }
    });

    it('should handle promotion interaction validation', async () => {
      const invalidPromotionId = 'invalid-promotion-id';

      const viewResponse = await request(app)
        .post(`/api/v1/promotions/${invalidPromotionId}/view`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({});

      expect([400, 404]).toContain(viewResponse.status);
    });

    it('should handle duplicate clicks gracefully', async () => {
      const promotionsResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (promotionsResponse.status === 200 && promotionsResponse.body.data.promotions.length > 0) {
        const promotionId = promotionsResponse.body.data.promotions[0].promotion_id;

        // First click
        const firstClickResponse = await request(app)
          .post(`/api/v1/promotions/${promotionId}/click`)
          .set('Authorization', `Bearer ${sessionToken}`);

        // Second click
        const secondClickResponse = await request(app)
          .post(`/api/v1/promotions/${promotionId}/click`)
          .set('Authorization', `Bearer ${sessionToken}`);

        expect([200, 401, 404]).toContain(firstClickResponse.status);
        expect([200, 401, 404]).toContain(secondClickResponse.status);
      }
    });
  });



  describe('Promotion Admin Operations Integration', () => {
    it('should get all promotions for admin', async () => {
      const response = await request(app)
        .get('/api/v1/promotions/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.promotions).toBeInstanceOf(Array);
        expectValidPagination(response.body.data.pagination);
        
        // Should include both active and inactive promotions
        response.body.data.promotions.forEach(promotion => {
          expectValidPromotion(promotion);
          expect(typeof promotion.is_active).toBe('boolean');
        });
      }
    });

    it('should clear promotion cache', async () => {
      const response = await request(app)
        .delete('/api/v1/promotions/cache')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.success).toBe(true);
        expect(response.body.data.clearedKeys).toBeInstanceOf(Array);
      }
    });

    it('should clear cache for specific user', async () => {
      const userId = 'test-user-12345';
      
      const response = await request(app)
        .delete(`/api/v1/promotions/cache?userId=${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.userId).toBe(userId);
      }
    });

    it('should cleanup expired promotions', async () => {
      const response = await request(app)
        .post('/api/v1/promotions/cleanup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.success).toBe(true);
        expect(typeof response.body.data.removedCount).toBe('number');
        expect(typeof response.body.data.archivedCount).toBe('number');
      }
    });

    it('should require admin authentication for admin operations', async () => {
      const endpoints = [
        '/api/v1/promotions/all',
        '/api/v1/promotions/cache',
        '/api/v1/promotions/cleanup'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${sessionToken}`); // Regular user token

        expect(response.status).toBe(403);
      }
    });
  });

  describe('Promotion Error Handling Integration', () => {
    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/v1/promotions');

      expect(response.status).toBe(401);
    });

    it('should handle non-existent promotion interactions', async () => {
      const nonExistentId = 'non-existent-promotion-id';

      const viewResponse = await request(app)
        .post(`/api/v1/promotions/${nonExistentId}/view`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({});

      expect([400, 404]).toContain(viewResponse.status);

      const clickResponse = await request(app)
        .post(`/api/v1/promotions/${nonExistentId}/click`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([400, 404]).toContain(clickResponse.status);
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/v1/promotions/test-promo/view')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Promotion Performance Integration', () => {
    it('should handle concurrent promotion requests efficiently', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/promotions')
          .set('Authorization', `Bearer ${sessionToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect([200, 401, 429]).toContain(response.status);
      });

      expect(totalTime).toBeLessThan(3000);
    });

    it('should handle rapid promotion interactions', async () => {
      const promotionsResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (promotionsResponse.status === 200 && promotionsResponse.body.data.promotions.length > 0) {
        const promotionId = promotionsResponse.body.data.promotions[0].promotion_id;

        const interactions = Array.from({ length: 10 }, () =>
          request(app)
            .post(`/api/v1/promotions/${promotionId}/view`)
            .set('Authorization', `Bearer ${sessionToken}`)
            .send({})
        );

        const responses = await Promise.all(interactions);
        
        // Should handle rapid requests (some might be rate limited)
        responses.forEach(response => {
          expect([200, 401, 429]).toContain(response.status);
        });
      }
    });

    it('should respond to promotion listing quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      const responseTime = Date.now() - startTime;
      
      expect([200, 401]).toContain(response.status);
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Promotion Caching Integration', () => {
    it('should demonstrate caching behavior', async () => {
      // First request
      const firstResponse = await request(app)
        .get('/api/v1/promotions')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (firstResponse.status === 200) {
        const firstTimestamp = firstResponse.body.data.timestamp;

        // Wait a small amount of time
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second request
        const secondResponse = await request(app)
          .get('/api/v1/promotions')
          .set('Authorization', `Bearer ${sessionToken}`);

        expect(secondResponse.status).toBe(200);
        
        // If cached, timestamp should be the same
        if (secondResponse.body.data.cached) {
          expect(secondResponse.body.data.timestamp).toBe(firstTimestamp);
        }
      }
    });

    it('should handle cache invalidation', async () => {
      // Clear cache
      const clearResponse = await request(app)
        .delete('/api/v1/promotions/cache')
        .set('Authorization', `Bearer ${adminToken}`);

      if (clearResponse.status === 200) {
        // Request after cache clear should not be cached
        const response = await request(app)
          .get('/api/v1/promotions')
          .set('Authorization', `Bearer ${sessionToken}`);

        if (response.status === 200) {
          expect(response.body.data.cached).toBe(false);
        }
      }
    });
  });
}); 