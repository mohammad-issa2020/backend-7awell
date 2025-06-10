import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Transaction API', () => {
  let authToken;
  
  beforeEach(async () => {
    // Setup authenticated user for transaction tests
    const mockUser = createMockUser();
    const mockSession = createMockSession();

    mockStytchClient.sessions.authenticate.mockResolvedValue({
      user: mockUser,
      session: mockSession,
      status_code: 200
    });

    authToken = 'Bearer session-token-12345';
    vi.clearAllMocks();
  });

  describe('GET /api/v1/transactions', () => {
    it('should get transactions with default pagination', async () => {
      const mockTransactions = [
        createMockTransaction(),
        createMockTransaction({ id: 'txn-test-67890', type: 'receive' })
      ];

      // Mock the transaction service
      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: {
              limit: 20,
              cursor: null,
              nextCursor: 'next-cursor-123',
              hasMore: false
            }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.pagination.limit).toBe(20);
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        createMockTransaction({ type: 'send' })
      ];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: { limit: 20, cursor: null, nextCursor: null, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions?type=send')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].type).toBe('send');
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        createMockTransaction({ status: 'confirmed' })
      ];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: { limit: 20, cursor: null, nextCursor: null, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions?status=confirmed')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions[0].status).toBe('confirmed');
    });

    it('should filter transactions by asset symbol', async () => {
      const mockTransactions = [
        createMockTransaction({ asset_symbol: 'BTC' })
      ];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: { limit: 20, cursor: null, nextCursor: null, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions?assetSymbol=BTC')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions[0].asset_symbol).toBe('BTC');
    });

    it('should filter transactions by network', async () => {
      const mockTransactions = [
        createMockTransaction({ network: 'bitcoin' })
      ];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: { limit: 20, cursor: null, nextCursor: null, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions?network=bitcoin')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions[0].network).toBe('bitcoin');
    });

    it('should filter transactions by date range', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';
      
      const mockTransactions = [
        createMockTransaction({ created_at: '2024-06-15T12:00:00Z' })
      ];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: { limit: 20, cursor: null, nextCursor: null, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get(`/api/v1/transactions?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(1);
    });

    it('should search transactions', async () => {
      const mockTransactions = [
        createMockTransaction({ description: 'Payment to John' })
      ];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: { limit: 20, cursor: null, nextCursor: null, hasMore: false }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions?search=John')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions[0].description).toContain('John');
    });

    it('should handle cursor-based pagination', async () => {
      const mockTransactions = [createMockTransaction()];

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockResolvedValue({
            transactions: mockTransactions,
            pagination: {
              limit: 10,
              cursor: 'current-cursor-123',
              nextCursor: 'next-cursor-456',
              hasMore: true
            }
          })
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions?cursor=current-cursor-123&limit=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.cursor).toBe('current-cursor-123');
      expect(response.body.data.pagination.nextCursor).toBe('next-cursor-456');
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?limit=150')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('limit');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/transactions');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('should get transaction by ID successfully', async () => {
      const mockTransaction = createMockTransaction();

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactionById: vi.fn().mockResolvedValue(mockTransaction)
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions/txn-test-12345')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.id).toBe(mockTransaction.id);
    });

    it('should handle transaction not found', async () => {
      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactionById: vi.fn().mockResolvedValue(null)
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions/non-existent-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });

    it('should validate transaction ID format', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/invalid-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/transactions/stats', () => {
    it('should get transaction statistics', async () => {
      const mockStats = {
        totalTransactions: 150,
        totalVolume: '10500.50',
        totalVolumeUSD: '45000000.00',
        transactionsByType: {
          send: 80,
          receive: 60,
          buy: 10
        },
        transactionsByStatus: {
          confirmed: 140,
          pending: 8,
          failed: 2
        },
        topAssets: [
          { symbol: 'BTC', count: 50, volume: '2.5' },
          { symbol: 'ETH', count: 45, volume: '150.0' }
        ],
        dailyStats: [
          { date: '2024-01-01', count: 10, volume: '500.00' }
        ]
      };

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactionStats: vi.fn().mockResolvedValue(mockStats)
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions/stats')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.totalTransactions).toBe(150);
      expect(response.body.data.transactionsByType.send).toBe(80);
    });

    it('should get stats for specific day range', async () => {
      const mockStats = {
        totalTransactions: 30,
        totalVolume: '2100.50'
      };

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactionStats: vi.fn().mockResolvedValue(mockStats)
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions/stats?days=7')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.totalTransactions).toBe(30);
    });
  });

  describe('GET /api/v1/transactions/options', () => {
    it('should get transaction filter options', async () => {
      const mockOptions = {
        types: ['send', 'receive', 'buy', 'sell', 'swap'],
        statuses: ['pending', 'confirmed', 'failed', 'cancelled'],
        assets: [
          { symbol: 'BTC', name: 'Bitcoin' },
          { symbol: 'ETH', name: 'Ethereum' }
        ],
        networks: ['bitcoin', 'ethereum', 'polygon']
      };

      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactionOptions: vi.fn().mockResolvedValue(mockOptions)
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions/options')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.types).toContain('send');
      expect(response.body.data.statuses).toContain('confirmed');
      expect(response.body.data.networks).toContain('ethereum');
    });
  });

  describe('POST /api/v1/transactions (Internal)', () => {
    it('should create transaction successfully', async () => {
      const transactionData = {
        type: 'send',
        amount: '1.5',
        asset_symbol: 'ETH',
        to_address: '0x456...',
        from_address: '0x123...',
        network: 'ethereum'
      };

      const mockTransaction = createMockTransaction(transactionData);

      vi.doMock('../services/transactionService', () => ({
        default: {
          createTransaction: vi.fn().mockResolvedValue(mockTransaction)
        }
      }));

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', authToken)
        .send(transactionData);

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.type).toBe('send');
      expect(response.body.data.transaction.amount).toBe('1.5');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', authToken)
        .send({
          type: 'send'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should validate transaction type', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', authToken)
        .send({
          type: 'invalid-type',
          amount: '1.0',
          asset_symbol: 'BTC'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/transactions/:id/status', () => {
    it('should update transaction status successfully', async () => {
      const mockTransaction = createMockTransaction({ 
        id: 'txn-test-12345',
        status: 'confirmed' 
      });

      vi.doMock('../services/transactionService', () => ({
        default: {
          updateTransactionStatus: vi.fn().mockResolvedValue(mockTransaction)
        }
      }));

      const response = await request(app)
        .patch('/api/v1/transactions/txn-test-12345/status')
        .set('Authorization', authToken)
        .send({
          status: 'confirmed',
          confirmations: 15,
          transaction_hash: '0xabc123...'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.status).toBe('confirmed');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .patch('/api/v1/transactions/txn-test-12345/status')
        .set('Authorization', authToken)
        .send({
          status: 'invalid-status'
        });

      expect(response.status).toBe(400);
    });

    it('should handle transaction not found for status update', async () => {
      vi.doMock('../services/transactionService', () => ({
        default: {
          updateTransactionStatus: vi.fn().mockResolvedValue(null)
        }
      }));

      const response = await request(app)
        .patch('/api/v1/transactions/non-existent-id/status')
        .set('Authorization', authToken)
        .send({
          status: 'confirmed'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.doMock('../services/transactionService', () => ({
        default: {
          getTransactions: vi.fn().mockRejectedValue(new Error('Database connection failed'))
        }
      }));

      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('error');
    });

    it('should handle rate limiting', async () => {
      // Simulate multiple rapid requests
      const requests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/v1/transactions')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
}); 