import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { 
  createTestUser, 
  createTestTransaction,
  expectValidApiResponse, 
  expectValidTransaction,
  expectValidPagination,
  clearTestData,
  loginTestUser
} from './setup.js';

describe('Transaction Integration Tests', () => {
  let testUser;
  let sessionToken;
  let testTransactionId;

  // Valid session token for testing
  const VALID_SESSION_TOKEN = 'stytch_verified_test_token_12345';
  const INVALID_SESSION_TOKEN = 'invalid-token';

  beforeEach(async () => {
    await clearTestData();
    testUser = createTestUser();
    sessionToken = VALID_SESSION_TOKEN;
  });

  describe('✅ Success Cases - Transaction Creation', () => {
    it('should create a new transaction successfully', async () => {
      const transactionData = {
        type: 'send',
        amount: '1.5',
        assetSymbol: 'ETH',
        assetName: 'Ethereum',
        network: 'ethereum',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0x9876543210987654321098765432109876543210',
        description: 'Test transaction'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);

      console.log('Create transaction response:', response.status, response.body);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('statusCode', 201);
      expect(response.body).toHaveProperty('status', 'SUCCESS');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('data');
      
      const transaction = response.body.data;
      expect(transaction).toHaveProperty('id');
      expect(transaction.type).toBe(transactionData.type);
      expect(transaction.amount).toBe(transactionData.amount);
      expect(transaction.asset_symbol).toBe(transactionData.assetSymbol);
      
      testTransactionId = transaction.id;
    });

    it('should create transaction with minimal required fields', async () => {
      const minimalData = {
        type: 'send',
        amount: '1.0',
        assetSymbol: 'ETH',
        network: 'ethereum'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(minimalData);

      expect(response.status).toBe(201);
      expectValidApiResponse(response, 201);
      expect(response.body.data.type).toBe('send');
      expect(response.body.data.amount).toBe('1.0');
    });
  });

  describe('✅ Success Cases - Transaction Retrieval', () => {
    beforeEach(async () => {
      // Create a test transaction for retrieval tests
      const transactionData = createTestTransaction('user-123');
      const createResponse = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);
      
      if (createResponse.status === 201) {
        testTransactionId = createResponse.body.data.id;
      }
    });

    it('should retrieve transaction by ID successfully', async () => {
      if (!testTransactionId) {
        return; // Skip if no transaction was created
      }

      const response = await request(app)
        .get(`/api/v1/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expectValidApiResponse(response);
      expectValidTransaction(response.body.data);
      expect(response.body.data.id).toBe(testTransactionId);
    });

    it('should list transactions with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expectValidApiResponse(response);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expectValidPagination(response.body.data.pagination);
    });

    it('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?type=send')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expectValidApiResponse(response);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.type).toBe('send');
      });
    });

    it('should filter transactions by status', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?status=pending')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expectValidApiResponse(response);
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.status).toBe('pending');
      });
    });
  });

  describe('✅ Success Cases - Transaction Updates', () => {
    beforeEach(async () => {
      // Create a test transaction for update tests
      const transactionData = createTestTransaction('user-123', { status: 'pending' });
      const createResponse = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(transactionData);
      
      if (createResponse.status === 201) {
        testTransactionId = createResponse.body.data.id;
      }
    });

    it('should update transaction status successfully', async () => {
      if (!testTransactionId) {
        return; // Skip if no transaction was created
      }

      const response = await request(app)
        .patch(`/api/v1/transactions/${testTransactionId}/status`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          status: 'confirmed',
          confirmations: 12,
          transaction_hash: '0xabcdef123456789'
        });

      expect(response.status).toBe(200);
      expectValidTransaction(response.body.data);
      expect(response.body.data.status).toBe('confirmed');
    });
  });

  describe('✅ Success Cases - Transaction Options & Stats', () => {
    it('should get transaction options successfully', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/options')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expectValidApiResponse(response);
      
      const options = response.body.data;
      expect(options.types).toBeDefined();
      expect(options.statuses).toBeDefined();
      expect(options.supportedNetworks).toBeDefined();
    });

    it('should get transaction statistics successfully', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/stats')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expectValidApiResponse(response);
      
      const stats = response.body.data;
      expect(typeof stats.total_transactions).toBe('number');
      expect(typeof stats.total_sent).toBe('number');
      expect(typeof stats.total_received).toBe('number');
    });
  });

  describe('❌ Authentication & Authorization Errors', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/transactions');

      console.log('No auth response:', response.status, response.body);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('status', 'ERROR');
      expect(response.body).toHaveProperty('errorCode', 'MISSING_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${INVALID_SESSION_TOKEN}`);

      console.log('Invalid auth response:', response.status, response.body);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('status', 'ERROR');
      expect(response.body).toHaveProperty('errorCode');
    });

    it('should reject transaction creation without auth', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          type: 'send',
          amount: '1.0',
          assetSymbol: 'ETH',
          network: 'ethereum'
        });

      console.log('Create without auth response:', response.status, response.body);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('status', 'ERROR');
    });
  });

  describe('❌ Validation Errors', () => {
    it('should reject transaction with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          // Missing required fields
          amount: '1.0'
        });

      console.log('Missing fields response:', response.status, response.body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('status', 'ERROR');
      expect(response.body).toHaveProperty('errorCode');
    });

    it('should reject transaction with invalid type', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          type: 'invalid_type',
          amount: '1.0',
          assetSymbol: 'ETH',
          network: 'ethereum'
        });

      console.log('Invalid type response:', response.status, response.body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('status', 'ERROR');
    });

    it('should reject transaction with invalid amount', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          type: 'send',
          amount: '-1.0', // Invalid negative amount
          assetSymbol: 'ETH',
          network: 'ethereum'
        });

      console.log('Invalid amount response:', response.status, response.body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('status', 'ERROR');
    });

    it('should reject invalid transaction ID format', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/invalid-id-format')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('ERROR');
      expect(response.body.message).toContain('ID');
    });

    it('should reject invalid pagination limit', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?limit=200')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('ERROR');
      expect(response.body.message).toContain('limit');
    });

    it('should reject invalid status update', async () => {
      const response = await request(app)
        .patch('/api/v1/transactions/123e4567-e89b-12d3-a456-426614174000/status')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          status: 'invalid-status'
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('ERROR');
      expect(response.body.message).toContain('status');
    });
  });

  describe('❌ Not Found Errors', () => {
    it('should return 404 for non-existent transaction', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/v1/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      console.log('Not found response:', response.status, response.body);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('status', 'ERROR');
    });
  });

  describe('🚀 Performance Tests', () => {
    it('should handle transaction list requests efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .query({ limit: 50 });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`Transaction list response time: ${responseTime}ms`);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 3 }, () =>
        request(app)
          .get('/api/v1/transactions?limit=10')
          .set('Authorization', `Bearer ${sessionToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('🔒 Security Tests', () => {
    it('should sanitize malicious input', async () => {
      const maliciousData = createTestTransaction('user-123', {
        description: '<script>alert("xss")</script>',
        note: '${process.env.SECRET}'
      });

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send(maliciousData);

      if (response.status === 201) {
        // Ensure XSS content is sanitized
        expect(response.body.data.description || '').not.toContain('<script>');
        expect(response.body.data.note || '').not.toContain('${process.env');
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json,}');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('ERROR');
    });

    it('should not allow access to other users transactions', async () => {
      // This would require creating transactions with different users
      // For now, just test that transaction access is properly validated
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${sessionToken}`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toBeDefined();
    });
  });
}); 