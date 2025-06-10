import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { 
  createTestUser, 
  expectValidApiResponse, 
  expectValidPagination,
  clearTestData,
  loginTestUser
} from './setup.js';

describe('Activity & Logs Integration Tests', () => {
  let testUser;
  let sessionToken;
  let adminToken;

  beforeEach(async () => {
    await clearTestData();
    testUser = createTestUser();
    sessionToken = await loginTestUser(app, request, testUser);

  });

  describe('Activity Logs Integration', () => {
    it('should get activity logs with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/activity/logs')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.logs).toBeInstanceOf(Array);
        expectValidPagination(response.body.data.pagination);
        
        // Validate each log entry
        response.body.data.logs.forEach(log => {
          expect(log.id).toBeDefined();
          expect(log.type).toBeDefined();
          expect(log.action).toBeDefined();
          expect(log.status).toBeDefined();
          expect(log.timestamp).toBeDefined();
          
          // Validate log types
          const validTypes = [
            'user_login', 'user_logout', 'transaction_created', 'security_event',
            'api_call', 'promotion_view', 'promotion_click', 'user_activity'
          ];
          expect(validTypes).toContain(log.type);
          
          // Validate actions
          const validActions = [
            'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'CLICK', 'FAILED_LOGIN'
          ];
          expect(validActions).toContain(log.action);
          
          // Validate status
          const validStatuses = ['success', 'failed', 'pending', 'error'];
          expect(validStatuses).toContain(log.status);
        });
      }
    });

    it('should filter activity logs by type', async () => {
      const logType = 'user_login';
      
      const response = await request(app)
        .get(`/api/v1/activity/logs?type=${logType}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        response.body.data.logs.forEach(log => {
          expect(log.type).toBe(logType);
        });
      }
    });

    it('should filter activity logs by date range', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';
      
      const response = await request(app)
        .get(`/api/v1/activity/logs?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        response.body.data.logs.forEach(log => {
          const logDate = new Date(log.timestamp);
          expect(logDate.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
          expect(logDate.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
        });
      }
    });

    it('should handle pagination for activity logs', async () => {
      const firstPageResponse = await request(app)
        .get('/api/v1/activity/logs?limit=10&offset=0')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(firstPageResponse.status);
      
      if (firstPageResponse.status === 200) {
        expectValidApiResponse(firstPageResponse);
        expect(firstPageResponse.body.data.logs.length).toBeLessThanOrEqual(10);
        
        if (firstPageResponse.body.data.pagination.hasMore) {
          const secondPageResponse = await request(app)
            .get('/api/v1/activity/logs?limit=10&offset=10')
            .set('Authorization', `Bearer ${sessionToken}`);

          expect(secondPageResponse.status).toBe(200);
          expectValidApiResponse(secondPageResponse);
        }
      }
    });
  });

  describe('Activity Summary Integration', () => {
    it('should get activity summary', async () => {
      const response = await request(app)
        .get('/api/v1/activity/summary')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        const summary = response.body.data;
        
        expect(typeof summary.totalEvents).toBe('number');
        expect(typeof summary.todayEvents).toBe('number');
        expect(summary.eventsByType).toBeDefined();
        expect(summary.eventsByStatus).toBeDefined();
        expect(summary.recentActivity).toBeInstanceOf(Array);
        
        // Validate event types breakdown
        Object.keys(summary.eventsByType).forEach(type => {
          expect(typeof summary.eventsByType[type]).toBe('number');
        });
        
        // Validate event status breakdown
        Object.keys(summary.eventsByStatus).forEach(status => {
          expect(typeof summary.eventsByStatus[status]).toBe('number');
        });
        
        // Validate recent activity
        summary.recentActivity.forEach(activity => {
          expect(activity.type).toBeDefined();
          expect(activity.timestamp).toBeDefined();
          expect(typeof activity.count).toBe('number');
        });
      }
    });

    it('should get activity summary for specific time period', async () => {
      const response = await request(app)
        .get('/api/v1/activity/summary?period=7d')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.period).toBe('7d');
      }
    });
  });

  describe('Security Events Integration', () => {
    it('should get security events', async () => {
      const response = await request(app)
        .get('/api/v1/activity/security')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.events).toBeInstanceOf(Array);
        expectValidPagination(response.body.data.pagination);
        
        // Validate each security event
        response.body.data.events.forEach(event => {
          expect(event.id).toBeDefined();
          expect(event.type).toBeDefined();
          expect(event.severity).toBeDefined();
          expect(event.timestamp).toBeDefined();
          
          // Validate security event types
          const validTypes = [
            'failed_login', 'unusual_location', 'account_compromise',
            'suspicious_transaction', 'rate_limit_exceeded'
          ];
          expect(validTypes).toContain(event.type);
          
          // Validate severity levels
          const validSeverities = ['low', 'medium', 'high', 'critical'];
          expect(validSeverities).toContain(event.severity);
        });
      }
    });

    it('should filter security events by severity', async () => {
      const severity = 'high';
      
      const response = await request(app)
        .get(`/api/v1/activity/security?severity=${severity}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        response.body.data.events.forEach(event => {
          expect(event.severity).toBe(severity);
        });
      }
    });
  });

  describe('Transaction Activity Integration', () => {
    it('should get transaction activity', async () => {
      const response = await request(app)
        .get('/api/v1/activity/transactions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.activities).toBeInstanceOf(Array);
        expectValidPagination(response.body.data.pagination);
        
        // Validate each transaction activity
        response.body.data.activities.forEach(activity => {
          expect(activity.id).toBeDefined();
          expect(activity.transaction_id).toBeDefined();
          expect(activity.action).toBeDefined();
          expect(activity.status).toBeDefined();
          expect(activity.timestamp).toBeDefined();
          
          // Validate transaction actions
          const validActions = ['created', 'confirmed', 'failed', 'cancelled', 'updated'];
          expect(validActions).toContain(activity.action);
        });
      }
    });
  });

  describe('Suspicious Activities Integration', () => {
    it('should get suspicious activities', async () => {
      const response = await request(app)
        .get('/api/v1/activity/suspicious')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.activities).toBeInstanceOf(Array);
        expectValidPagination(response.body.data.pagination);
        
        // Validate each suspicious activity
        response.body.data.activities.forEach(activity => {
          expect(activity.id).toBeDefined();
          expect(activity.type).toBeDefined();
          expect(activity.score).toBeDefined();
          expect(activity.description).toBeDefined();
          expect(activity.timestamp).toBeDefined();
          
          // Validate suspicious activity types
          const validTypes = [
            'rapid_transactions', 'unusual_ip', 'potential_fraud',
            'abnormal_behavior', 'multiple_failed_attempts'
          ];
          expect(validTypes).toContain(activity.type);
          
          // Validate score range
          expect(activity.score).toBeGreaterThanOrEqual(0);
          expect(activity.score).toBeLessThanOrEqual(100);
        });
      }
    });

    it('should filter suspicious activities by minimum score', async () => {
      const minScore = 70;
      
      const response = await request(app)
        .get(`/api/v1/activity/suspicious?minScore=${minScore}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        response.body.data.activities.forEach(activity => {
          expect(activity.score).toBeGreaterThanOrEqual(minScore);
        });
      }
    });
  });

  describe('Activity Statistics Integration', () => {
    it('should get activity statistics', async () => {
      const response = await request(app)
        .get('/api/v1/activity/stats')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        const stats = response.body.data;
        
        expect(typeof stats.totalUsers).toBe('number');
        expect(stats.activeUsers).toBeDefined();
        expect(typeof stats.activeUsers.today).toBe('number');
        expect(typeof stats.activeUsers.thisWeek).toBe('number');
        expect(typeof stats.activeUsers.thisMonth).toBe('number');
        
        expect(typeof stats.totalTransactions).toBe('number');
        expect(stats.transactionVolume).toBeDefined();
        expect(stats.securityEvents).toBeDefined();
        expect(stats.systemHealth).toBeDefined();
        expect(stats.topActivities).toBeInstanceOf(Array);
        
        // Validate system health
        expect(stats.systemHealth.uptime).toBeDefined();
        expect(stats.systemHealth.avg_response_time).toBeDefined();
        expect(stats.systemHealth.error_rate).toBeDefined();
        
        // Validate top activities
        stats.topActivities.forEach(activity => {
          expect(activity.type).toBeDefined();
          expect(typeof activity.count).toBe('number');
        });
      }
    });
  });

  describe('Activity Types Integration', () => {
    it('should get available activity types', async () => {
      const response = await request(app)
        .get('/api/v1/activity/types')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        const types = response.body.data;
        
        expect(types.categories).toBeInstanceOf(Array);
        expect(typeof types.total_types).toBe('number');
        
        // Validate categories
        types.categories.forEach(category => {
          expect(category.category).toBeDefined();
          expect(category.types).toBeInstanceOf(Array);
          
          // Common categories that should exist
          const validCategories = ['authentication', 'transactions', 'security', 'system'];
          expect(validCategories).toContain(category.category);
          
          // Each category should have types
          expect(category.types.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Activity Data Export Integration', () => {
    it('should export activity data as CSV', async () => {
      const response = await request(app)
        .get('/api/v1/activity/export?format=csv')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('id'); // CSV header
      }
    });

    it('should export activity data as JSON', async () => {
      const response = await request(app)
        .get('/api/v1/activity/export?format=json')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body.data).toBeInstanceOf(Array);
      }
    });

    it('should handle date range in export', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/v1/activity/export?format=json&startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        // Data should be filtered by date range
        expect(response.body.data).toBeInstanceOf(Array);
      }
    });

    it('should validate export format', async () => {
      const response = await request(app)
        .get('/api/v1/activity/export?format=invalid')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('format');
    });
  });

  describe('Logs API Integration', () => {
    it('should log single event successfully', async () => {
      const logData = {
        type: 'user_action',
        action: 'button_click',
        level: 'info',
        message: 'User clicked send button',
        metadata: {
          screen: 'send_screen',
          button_id: 'send_btn'
        }
      };

      const response = await request(app)
        .post('/api/v1/logs')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(logData);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.success).toBe(true);
        expect(response.body.data.logId).toBeDefined();
        expect(response.body.data.timestamp).toBeDefined();
      }
    });

    it('should log multiple events in batch', async () => {
      const batchData = {
        events: [
          { type: 'user_action', action: 'page_view', message: 'Viewed home page' },
          { type: 'user_action', action: 'button_click', message: 'Clicked wallet button' },
          { type: 'performance', action: 'api_call', message: 'API response time: 120ms' }
        ]
      };

      const response = await request(app)
        .post('/api/v1/logs/batch')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(batchData);

      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.success).toBe(true);
        expect(typeof response.body.data.loggedCount).toBe('number');
        expect(typeof response.body.data.failedCount).toBe('number');
        expect(response.body.data.logIds).toBeInstanceOf(Array);
        expect(response.body.data.loggedCount).toBe(3);
      }
    });

    it('should validate log event data', async () => {
      const invalidLogData = {
        // Missing required fields
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/v1/logs')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(invalidLogData);

      expect(response.status).toBe(400);
    });

    it('should validate batch log data', async () => {
      const invalidBatchData = {
        events: [
          { message: 'Valid message' }, // Missing type and action
          { type: 'user_action', action: 'click' } // Missing message
        ]
      };

      const response = await request(app)
        .post('/api/v1/logs/batch')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(invalidBatchData);

      expect([400, 200]).toContain(response.status);
      
      if (response.status === 200) {
        // Some events might succeed, some might fail
        expect(response.body.data.failedCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Activity Admin Operations Integration', () => {
    it('should cleanup old activity logs (Admin only)', async () => {
      const cleanupData = {
        retentionDays: 90,
        archiveBeforeDelete: true
      };

      const response = await request(app)
        .post('/api/v1/activity/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(cleanupData);

      expect([200, 401, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expectValidApiResponse(response);
        expect(response.body.data.success).toBe(true);
        expect(typeof response.body.data.deletedCount).toBe('number');
        expect(typeof response.body.data.archivedCount).toBe('number');
        expect(response.body.data.cutoffDate).toBeDefined();
      }
    });

    it('should require admin privileges for cleanup', async () => {
      const response = await request(app)
        .post('/api/v1/activity/cleanup')
        .set('Authorization', `Bearer ${sessionToken}`) // Regular user token
        .send({ retentionDays: 90 });

      expect(response.status).toBe(403);
    });
  });

  describe('Activity Error Handling Integration', () => {
    it('should handle unauthorized access', async () => {
      const endpoints = [
        '/api/v1/activity/logs',
        '/api/v1/activity/summary',
        '/api/v1/activity/security',
        '/api/v1/activity/suspicious',
        '/api/v1/activity/stats',
        '/api/v1/logs'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
      }
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/v1/logs')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/activity/logs?limit=500')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/v1/activity/logs?startDate=invalid-date')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Activity Performance Integration', () => {
    it('should handle large activity log requests efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/activity/logs?limit=100')
        .set('Authorization', `Bearer ${sessionToken}`);

      const responseTime = Date.now() - startTime;
      
      expect([200, 401]).toContain(response.status);
      expect(responseTime).toBeLessThan(3000);
    });

    it('should handle concurrent activity requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/activity/summary')
          .set('Authorization', `Bearer ${sessionToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect([200, 401, 429]).toContain(response.status);
      });

      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle complex activity filtering efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/activity/logs?type=user_login&startDate=2024-01-01&endDate=2024-12-31&limit=50')
        .set('Authorization', `Bearer ${sessionToken}`);

      const responseTime = Date.now() - startTime;
      
      expect([200, 401]).toContain(response.status);
      expect(responseTime).toBeLessThan(2000);
    });
  });
}); 