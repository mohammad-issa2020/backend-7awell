import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Activity & Logs API', () => {
  let authToken;
  let adminToken;
  
  beforeEach(async () => {
    // Setup authenticated user for activity tests
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

  describe('GET /api/v1/activity/logs', () => {
    it('should get activity logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-12345',
          type: 'user_login',
          action: 'LOGIN',
          status: 'success',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0...',
          timestamp: new Date().toISOString(),
          metadata: { method: 'otp' }
        },
        {
          id: 'log-67890',
          type: 'transaction_created',
          action: 'CREATE',
          status: 'success',
          timestamp: new Date().toISOString(),
          metadata: { amount: '1.5', asset: 'ETH' }
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivityLogs: vi.fn().mockResolvedValue({
            logs: mockLogs,
            pagination: {
              limit: 20,
              offset: 0,
              total: 2,
              hasMore: false
            }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/logs')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(2);
      expect(response.body.data.logs[0].type).toBe('user_login');
    });

    it('should filter activity logs by type', async () => {
      const mockLogs = [
        {
          id: 'log-12345',
          type: 'security_event',
          action: 'FAILED_LOGIN',
          status: 'failed',
          timestamp: new Date().toISOString()
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivityLogs: vi.fn().mockResolvedValue({
            logs: mockLogs,
            pagination: { limit: 20, offset: 0, total: 1, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/logs?type=security_event')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.logs[0].type).toBe('security_event');
    });

    it('should filter activity logs by date range', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';
      
      const mockLogs = [
        {
          id: 'log-12345',
          type: 'user_activity',
          timestamp: '2024-01-15T12:00:00Z'
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivityLogs: vi.fn().mockResolvedValue({
            logs: mockLogs,
            pagination: { limit: 20, offset: 0, total: 1, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get(`/api/v1/activity/logs?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(1);
    });
  });

  describe('GET /api/v1/activity/summary', () => {
    it('should get activity summary', async () => {
      const mockSummary = {
        totalEvents: 1250,
        todayEvents: 85,
        eventsByType: {
          user_login: 450,
          transaction_created: 320,
          security_event: 25,
          api_call: 455
        },
        eventsByStatus: {
          success: 1180,
          failed: 45,
          pending: 25
        },
        recentActivity: [
          {
            type: 'user_login',
            timestamp: new Date().toISOString(),
            count: 5
          }
        ],
        hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: Math.floor(Math.random() * 50)
        }))
      };

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivitySummary: vi.fn().mockResolvedValue(mockSummary)
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/summary')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.totalEvents).toBe(1250);
      expect(response.body.data.eventsByType.user_login).toBe(450);
      expect(response.body.data.hourlyActivity).toHaveLength(24);
    });

    it('should get activity summary for specific time period', async () => {
      const mockSummary = {
        totalEvents: 300,
        period: '7d',
        eventsByType: {
          user_login: 150,
          transaction_created: 100,
          security_event: 5,
          api_call: 45
        }
      };

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivitySummary: vi.fn().mockResolvedValue(mockSummary)
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/summary?period=7d')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.totalEvents).toBe(300);
      expect(response.body.data.period).toBe('7d');
    });
  });

  describe('GET /api/v1/activity/security', () => {
    it('should get security events', async () => {
      const mockSecurityEvents = [
        {
          id: 'sec-12345',
          type: 'failed_login',
          severity: 'medium',
          ip_address: '192.168.1.100',
          user_agent: 'Suspicious Bot',
          timestamp: new Date().toISOString(),
          details: {
            attempts: 5,
            blocked: true
          }
        },
        {
          id: 'sec-67890',
          type: 'unusual_location',
          severity: 'high',
          ip_address: '10.0.0.1',
          location: 'Unknown Location',
          timestamp: new Date().toISOString()
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getSecurityEvents: vi.fn().mockResolvedValue({
            events: mockSecurityEvents,
            pagination: { limit: 20, offset: 0, total: 2, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/security')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events[0].type).toBe('failed_login');
      expect(response.body.data.events[1].severity).toBe('high');
    });

    it('should filter security events by severity', async () => {
      const mockHighSeverityEvents = [
        {
          id: 'sec-critical-123',
          type: 'account_compromise',
          severity: 'high',
          timestamp: new Date().toISOString()
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getSecurityEvents: vi.fn().mockResolvedValue({
            events: mockHighSeverityEvents,
            pagination: { limit: 20, offset: 0, total: 1, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/security?severity=high')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.events[0].severity).toBe('high');
    });
  });

  describe('GET /api/v1/activity/transactions', () => {
    it('should get transaction activity', async () => {
      const mockTransactionActivity = [
        {
          id: 'tx-activity-123',
          transaction_id: 'txn-test-12345',
          action: 'created',
          status: 'success',
          amount: '1.5',
          asset_symbol: 'ETH',
          timestamp: new Date().toISOString(),
          metadata: {
            network: 'ethereum',
            gas_fee: '0.002'
          }
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getTransactionActivity: vi.fn().mockResolvedValue({
            activities: mockTransactionActivity,
            pagination: { limit: 20, offset: 0, total: 1, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/transactions')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.activities).toHaveLength(1);
      expect(response.body.data.activities[0].asset_symbol).toBe('ETH');
    });
  });

  describe('GET /api/v1/activity/suspicious', () => {
    it('should get suspicious activities', async () => {
      const mockSuspiciousActivities = [
        {
          id: 'sus-12345',
          type: 'rapid_transactions',
          score: 85,
          description: 'Multiple large transactions in short time',
          timestamp: new Date().toISOString(),
          details: {
            transaction_count: 15,
            time_window: '5 minutes',
            total_amount: '50.5 ETH'
          },
          action_taken: 'flagged_for_review'
        },
        {
          id: 'sus-67890',
          type: 'unusual_ip',
          score: 65,
          description: 'Login from new geographic location',
          timestamp: new Date().toISOString(),
          details: {
            ip_address: '203.0.113.1',
            location: 'Unknown',
            previous_locations: ['US', 'CA']
          }
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getSuspiciousActivities: vi.fn().mockResolvedValue({
            activities: mockSuspiciousActivities,
            pagination: { limit: 20, offset: 0, total: 2, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/suspicious')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.activities).toHaveLength(2);
      expect(response.body.data.activities[0].score).toBe(85);
      expect(response.body.data.activities[1].type).toBe('unusual_ip');
    });

    it('should filter suspicious activities by minimum score', async () => {
      const mockHighScoreActivities = [
        {
          id: 'sus-high-123',
          type: 'potential_fraud',
          score: 95,
          description: 'High-risk transaction pattern detected'
        }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          getSuspiciousActivities: vi.fn().mockResolvedValue({
            activities: mockHighScoreActivities,
            pagination: { limit: 20, offset: 0, total: 1, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/suspicious?minScore=90')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.activities[0].score).toBe(95);
    });
  });

  describe('GET /api/v1/activity/stats', () => {
    it('should get activity statistics', async () => {
      const mockStats = {
        totalUsers: 15420,
        activeUsers: {
          today: 1240,
          thisWeek: 8750,
          thisMonth: 12300
        },
        totalTransactions: 45680,
        transactionVolume: {
          today: '12500.50',
          thisWeek: '85000.75',
          thisMonth: '320000.25'
        },
        securityEvents: {
          total: 156,
          resolved: 142,
          pending: 14,
          high_severity: 8
        },
        systemHealth: {
          uptime: '99.8%',
          avg_response_time: '120ms',
          error_rate: '0.2%'
        },
        topActivities: [
          { type: 'user_login', count: 12450 },
          { type: 'transaction_created', count: 8750 },
          { type: 'api_call', count: 25600 }
        ]
      };

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivityStats: vi.fn().mockResolvedValue(mockStats)
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/stats')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.totalUsers).toBe(15420);
      expect(response.body.data.activeUsers.today).toBe(1240);
      expect(response.body.data.securityEvents.high_severity).toBe(8);
    });
  });

  describe('GET /api/v1/activity/types', () => {
    it('should get available activity types', async () => {
      const mockTypes = {
        categories: [
          {
            category: 'authentication',
            types: ['user_login', 'user_logout', 'otp_sent', 'otp_verified', 'session_created']
          },
          {
            category: 'transactions',
            types: ['transaction_created', 'transaction_confirmed', 'transaction_failed']
          },
          {
            category: 'security',
            types: ['failed_login', 'suspicious_activity', 'account_locked', 'ip_blocked']
          },
          {
            category: 'system',
            types: ['api_call', 'error_occurred', 'service_started', 'service_stopped']
          }
        ],
        total_types: 16
      };

      vi.doMock('../services/activityService', () => ({
        default: {
          getActivityTypes: vi.fn().mockResolvedValue(mockTypes)
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/types')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toHaveLength(4);
      expect(response.body.data.total_types).toBe(16);
    });
  });

  describe('GET /api/v1/activity/export', () => {
    it('should export activity data as CSV', async () => {
      const mockCsvData = 'id,type,timestamp,status\nlog-123,user_login,2024-01-01T12:00:00Z,success';

      vi.doMock('../services/activityService', () => ({
        default: {
          exportActivityData: vi.fn().mockResolvedValue({
            data: mockCsvData,
            filename: 'activity_export_2024-01-01.csv',
            format: 'csv'
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/export?format=csv')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('id,type,timestamp,status');
    });

    it('should export activity data as JSON', async () => {
      const mockJsonData = [
        { id: 'log-123', type: 'user_login', timestamp: '2024-01-01T12:00:00Z', status: 'success' }
      ];

      vi.doMock('../services/activityService', () => ({
        default: {
          exportActivityData: vi.fn().mockResolvedValue({
            data: mockJsonData,
            filename: 'activity_export_2024-01-01.json',
            format: 'json'
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/export?format=json')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0].type).toBe('user_login');
    });
  });

  describe('POST /api/v1/activity/cleanup', () => {
    it('should cleanup old activity logs (Admin only)', async () => {
      vi.doMock('../services/activityService', () => ({
        default: {
          cleanupOldLogs: vi.fn().mockResolvedValue({
            success: true,
            deletedCount: 5420,
            archivedCount: 1200,
            cutoffDate: '2024-01-01T00:00:00Z',
            cleanupDuration: '2.5s'
          })
        }
      }));

      const response = await request(app)
        .post('/api/v1/activity/cleanup')
        .set('Authorization', adminToken)
        .send({
          retentionDays: 90,
          archiveBeforeDelete: true
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(5420);
      expect(response.body.data.archivedCount).toBe(1200);
    });

    it('should require admin privileges for cleanup', async () => {
      const response = await request(app)
        .post('/api/v1/activity/cleanup')
        .set('Authorization', authToken) // Regular user token
        .send({ retentionDays: 90 });

      expect(response.status).toBe(403);
    });
  });

  describe('Logs API - POST /api/v1/logs', () => {
    it('should log single event successfully', async () => {
      vi.doMock('../services/logService', () => ({
        default: {
          logEvent: vi.fn().mockResolvedValue({
            success: true,
            logId: 'log-12345',
            timestamp: new Date().toISOString()
          })
        }
      }));

      const response = await request(app)
        .post('/api/v1/logs')
        .set('Authorization', authToken)
        .send({
          type: 'user_action',
          action: 'button_click',
          level: 'info',
          message: 'User clicked send button',
          metadata: {
            screen: 'send_screen',
            button_id: 'send_btn'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.logId).toBe('log-12345');
    });

    it('should validate required fields for logging', async () => {
      const response = await request(app)
        .post('/api/v1/logs')
        .set('Authorization', authToken)
        .send({
          // Missing required fields
          message: 'Test message'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Logs API - POST /api/v1/logs/batch', () => {
    it('should log multiple events in batch', async () => {
      vi.doMock('../services/logService', () => ({
        default: {
          logBatch: vi.fn().mockResolvedValue({
            success: true,
            loggedCount: 3,
            failedCount: 0,
            logIds: ['log-123', 'log-456', 'log-789']
          })
        }
      }));

      const response = await request(app)
        .post('/api/v1/logs/batch')
        .set('Authorization', authToken)
        .send({
          events: [
            { type: 'user_action', action: 'page_view', message: 'Viewed home page' },
            { type: 'user_action', action: 'button_click', message: 'Clicked wallet button' },
            { type: 'performance', action: 'api_call', message: 'API response time: 120ms' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.loggedCount).toBe(3);
      expect(response.body.data.logIds).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.doMock('../services/activityService', () => ({
        default: {
          getActivityLogs: vi.fn().mockRejectedValue(new Error('Database connection failed'))
        }
      }));

      const response = await request(app)
        .get('/api/v1/activity/logs')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('error');
    });

    it('should require authentication for all endpoints', async () => {
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
  });
}); 