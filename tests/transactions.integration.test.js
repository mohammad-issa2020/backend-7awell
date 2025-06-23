import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Transaction API Integration Tests', () => {
  let sessionToken;
  let userId;
  let createdTransactionId;

  beforeAll(async () => {
    // Mock successful authentication flow to get session token
    mockStytchClient.users.search.mockResolvedValue({
      results: []
    });

    mockStytchClient.users.create.mockResolvedValue({
      user: {
        user_id: 'user-test-transactions-123',
        phone_numbers: [{ phone_number: '+1234567890' }],
        emails: [{ email: 'test@transactions.com' }],
        created_at: new Date().toISOString(),
        status: 'active'
      }
    });

    mockStytchClient.magicLinks.email.loginOrCreate.mockRejectedValue(
      new Error('Magic link failed')
    );

    // Complete authentication flow
    const sessionResponse = await request(app)
      .post('/api/auth/verification/start')
      .send({
        phoneNumber: '+1234567890',
        email: 'test@transactions.com'
      });

    const sessionId = sessionResponse.body.data.sessionId;

    // Mock OTP sending and verification
    mockStytchClient.otps.sms.loginOrCreate.mockResolvedValue({
      method_id: 'otp-method-12345',
      status_code: 200
    });

    mockStytchClient.otps.email.loginOrCreate.mockResolvedValue({
      method_id: 'otp-method-email-123',
      status_code: 200
    });

    mockStytchClient.otps.authenticate.mockResolvedValue({
      status_code: 200,
      verified: true
    });

    // Send and verify phone OTP
    await request(app)
      .post('/api/auth/verification/send-otp')
      .send({
        sessionId: sessionId,
        medium: 'phone',
        channel: 'sms'
      });

    await request(app)
      .post('/api/auth/verification/verify-otp')
      .send({
        sessionId: sessionId,
        medium: 'phone',
        otp: '123456'
      });

    // Send and verify email OTP
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

    // Complete login to get session token
    const loginResponse = await request(app)
      .post('/api/auth/verification/complete-login')
      .send({
        sessionId: sessionId
      });

    sessionToken = loginResponse.body.data.session_token;
    userId = loginResponse.body.data.user.id;

    console.log('✅ Authentication setup complete for transactions tests');
    console.log('📋 Session Token:', sessionToken);
    console.log('👤 User ID:', userId);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    createdTransactionId = null;
  });

  describe('GET /api/transactions/options', () => {
    it('should get transaction options with authentication', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.types).toBeDefined();
      expect(response.body.data.statuses).toBeDefined();
      expect(response.body.data.assetTypes).toBeDefined();
    });

    it('should include all expected transaction types', async () => {
      const response = await request(app)
        .get('/api/transactions/options')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      const types = response.body.data.types;
      expect(types).toContain('transfer');
      expect(types).toContain('cash_in');
      expect(types).toContain('cash_out');
      expect(types).toContain('payment');
      expect(types).toContain('exchange');
      
    });

    it('should include all expected transaction statuses', async () => {
      const response = await request(app)
        .get('/api/transactions/options')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      const statuses = response.body.data.statuses;
      expect(statuses).toContain('pending');
      expect(statuses).toContain('processing');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('cancelled');
    });
  });

  describe('POST /api/transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'send',
          amount: 100,
          assetSymbol: 'SOL',
          network: 'solana'
        });

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('should create a transaction successfully', async () => {
      const transactionData = {
        type: 'transfer',
        amount: 100.5,
        assetSymbol: 'SOL',
        assetName: 'Solana',
        network: 'solana',
        fromAddress: '7Np41oeYqM1ufnhBPwhCfNFth1dUr7Xh8uJYzVmfkqhP',
        toAddress: '8Np41oeYqM1ufnhBPwhCfNFth1dUr7Xh8uJYzVmfkqhQ',
        description: 'Test transaction',
        metadata: {
          testFlag: true,
          source: 'integration_test'
        }
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);

      expect(response.status).toBe(201);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.type).toBe('transfer');
      expect(response.body.data.amount).toBe(100.5);
      expect(response.body.data.assetSymbol).toBe('SOL');
      expect(response.body.data.status).toBe('pending');
      
      // Store for other tests
      createdTransactionId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });

    it('should validate transaction type', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          type: 'invalid_type',
          amount: 100,
          assetSymbol: 'SOL',
          network: 'solana'
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });

    it('should validate amount is positive', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          type: 'transfer',
          amount: -100,
          assetSymbol: 'SOL',
          network: 'solana'
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create a test transaction for listing tests
      const transactionData = {
        type: 'cash_in',
        amount: 50.25,
        assetSymbol: 'USDC',
        assetName: 'USD Coin',
        network: 'solana',
        fromAddress: '9Np41oeYqM1ufnhBPwhCfNFth1dUr7Xh8uJYzVmfkqhR',
        description: 'Test receive transaction'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);

      createdTransactionId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/transactions');

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('should get user transactions successfully', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.limit).toBeDefined();
      expect(response.body.data.pagination.hasMore).toBeDefined();
    });

    it('should support pagination with limit', async () => {
      const response = await request(app)
        .get('/api/transactions?limit=5')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/transactions?limit=150') // Over max limit
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid limit parameter');
    });

    it('should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/transactions?type=cash_in')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filters.type).toBe('cash_in');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/transactions?status=pending')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filters.status).toBe('pending');
    });

    it('should filter by asset symbol', async () => {
      const response = await request(app)
        .get('/api/transactions?assetSymbol=USDC')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filters.assetSymbol).toBe('USDC');
    });

    it('should validate invalid transaction type filter', async () => {
      const response = await request(app)
        .get('/api/transactions?type=invalid_type')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid transaction type');
    });

    it('should validate invalid status filter', async () => {
      const response = await request(app)
        .get('/api/transactions?status=invalid_status')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid transaction status');
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/transactions?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filters.startDate).toBe(startDate);
      expect(response.body.data.filters.endDate).toBe(endDate);
    });

    it('should validate invalid date format', async () => {
      const response = await request(app)
        .get('/api/transactions?startDate=invalid-date')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid startDate format');
    });

    it('should validate date range logic', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

      const response = await request(app)
        .get(`/api/transactions?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('endDate must be after startDate');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/transactions?search=test')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.filters.search).toBe('test');
    });
  });

  describe('GET /api/transactions/:id', () => {
    beforeEach(async () => {
      // Create a test transaction
      const transactionData = {
        type: 'exchange',
        amount: 200,
        assetSymbol: 'BTC',
        assetName: 'Bitcoin',
        network: 'bitcoin',
        description: 'Test exchange transaction'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);

      createdTransactionId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/transactions/${createdTransactionId}`);

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('should get transaction by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(createdTransactionId);
      expect(response.body.data.type).toBe('exchange');
      expect(response.body.data.amount).toBe(200);
    });

    it('should handle non-existent transaction', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Transaction not found');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/transactions/invalid-uuid')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid transaction ID format');
    });

    it('should not allow access to other user transactions', async () => {
      // This would require creating another user and transaction
      // For now, we test with a valid UUID that doesn't belong to our user
      const otherUserTransactionId = '550e8400-e29b-41d4-a716-446655440001';
      
      const response = await request(app)
        .get(`/api/transactions/${otherUserTransactionId}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/transactions/:id/status', () => {
    beforeEach(async () => {
      // Create a test transaction
      const transactionData = {
        type: 'cash_out',
        amount: 150,
        assetSymbol: 'ETH',
        assetName: 'Ethereum',
        network: 'ethereum',
        description: 'Test cash out transaction'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);

      createdTransactionId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .send({ status: 'completed' });

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
    });

    it('should update transaction status successfully', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ 
          status: 'completed',
          txHash: '0x1234567890abcdef',
          blockNumber: 12345
        });

      expect(response.status).toBe(200);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('completed');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          // Missing status
        });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should handle non-existent transaction', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .patch(`/api/transactions/${fakeId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toContain('Transaction not found');
    });

    it('should update status from pending to processing', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ status: 'processing' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('processing');
    });

    it('should update status to completed with additional data', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ 
          status: 'completed',
          txHash: '0xabcdef1234567890',
          blockNumber: 54321,
          gasUsed: 21000,
          gasPrice: '20000000000'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });

    it('should update status to failed with error reason', async () => {
      const response = await request(app)
        .patch(`/api/transactions/${createdTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ 
          status: 'failed',
          errorReason: 'Insufficient funds',
          errorCode: 'INSUFFICIENT_FUNDS'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('failed');
    });
  });

  describe('Transaction Workflow Integration', () => {
    it('should complete a full transaction lifecycle', async () => {
      // 1. Create transaction
      const createResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          type: 'exchange',
          amount: 1000,
          assetSymbol: 'USDC',
          assetName: 'USD Coin',
          network: 'solana',
          fromAddress: '7Np41oeYqM1ufnhBPwhCfNFth1dUr7Xh8uJYzVmfkqhP',
          toAddress: '8Np41oeYqM1ufnhBPwhCfNFth1dUr7Xh8uJYzVmfkqhQ',
          description: 'USDC to SOL exchange'
        });

      expect(createResponse.status).toBe(201);
      const transactionId = createResponse.body.data.id;
      expect(createResponse.body.data.status).toBe('pending');

      // 2. Update to processing
      const processingResponse = await request(app)
        .patch(`/api/transactions/${transactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ status: 'processing' });

      expect(processingResponse.status).toBe(200);
      expect(processingResponse.body.data.status).toBe('processing');

      // 3. Update to completed
      const completedResponse = await request(app)
        .patch(`/api/transactions/${transactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ 
          status: 'completed',
          txHash: '0x1234567890abcdef1234567890abcdef12345678'
        });

      expect(completedResponse.status).toBe(200);
      expect(completedResponse.body.data.status).toBe('completed');

      // 4. Verify final state
      const finalResponse = await request(app)
        .get(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(finalResponse.status).toBe(200);
      expect(finalResponse.body.data.status).toBe('completed');
      expect(finalResponse.body.data.type).toBe('exchange');
      expect(finalResponse.body.data.amount).toBe(1000);
    });
  });
}); 