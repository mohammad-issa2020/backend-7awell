import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import TransactionDetail from '../../models/TransactionDetail.js';
import Transaction from '../../models/Transaction.js';
import User from '../../models/User.js';
import { supabaseAdmin } from '../../database/supabase.js';

describe('TransactionDetail Model', () => {
  let testUser;
  let testTransaction;
  let testTransactionDetail;

  // Setup test data
  beforeAll(async () => {
    // Create test users using User model
    testUser = await User.create({
      phone: `+121111${Date.now().toString().slice(-4)}`,
      email: `test${Date.now()}@example.com`,
      status: 'active',
      kyc_level: 'basic',
      phone_verified: true,
      email_verified: true
    });

    // Create second test user
    const secondUser = await User.create({
      phone: `+121111${Date.now().toString().slice(-4)}`,
      email: `test2${Date.now()}@example.com`,
      status: 'active',
      kyc_level: 'basic',
      phone_verified: true,
      email_verified: true
    });

    // Create test transaction using Transaction model
    testTransaction = await Transaction.create({
      reference: Transaction.generateReference('transfer'),
      type: 'transfer',
      amount: 100.50,
      asset_symbol: 'USDT',
      sender_id: testUser.id,
      recipient_id: secondUser.id,
      fee: 0.50,
      note: 'Test transaction'
    });

    // Create test transaction detail
    testTransactionDetail = {
      transaction_id: testTransaction.id,
      network: 'Ethereum',
      tx_hash: `0x${Date.now().toString(16)}`,
      confirmations: 0,
      block_number: null,
      gas_fee: 0.001,
      error_message: null,
      raw_response: { test: 'data' }
    };
  });

  // Cleanup test data
  afterAll(async () => {
    if (testTransaction) {
      await Transaction.delete(testTransaction.id);
    }
    if (testUser) {
      await testUser.destroy();
    }
    if (secondUser) {
      await secondUser.destroy();
    }
  });

  describe('create()', () => {
    it('should create a new transaction detail', async () => {
      const detail = await TransactionDetail.create(testTransactionDetail);
      expect(detail).toBeTypeOf('object');
      expect(detail.transaction_id).toBe(testTransaction.id);
      expect(detail.network).toBe(testTransactionDetail.network);
      expect(detail.tx_hash).toBe(testTransactionDetail.tx_hash);
    });

    it('should throw error when required fields are missing', async () => {
      await expect(TransactionDetail.create({})).rejects.toThrow('Missing required field');
    });
  });

  describe('findByTransactionId()', () => {
    it('should find transaction detail by transaction ID', async () => {
      const detail = await TransactionDetail.findByTransactionId(testTransaction.id);
      expect(detail).toBeTypeOf('object');
      expect(detail.transaction_id).toBe(testTransaction.id);
    });

    it('should return null for non-existent transaction ID', async () => {
      const detail = await TransactionDetail.findByTransactionId(uuidv4());
      expect(detail).toBeNull();
    });
  });

  describe('findByTxHash()', () => {
    it('should find transaction detail by transaction hash', async () => {
      const detail = await TransactionDetail.findByTxHash(testTransactionDetail.tx_hash);
      expect(detail).toBeTypeOf('object');
      expect(detail.tx_hash).toBe(testTransactionDetail.tx_hash);
    });

    it('should return null for non-existent transaction hash', async () => {
      const detail = await TransactionDetail.findByTxHash('0x123');
      expect(detail).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update transaction detail', async () => {
      const updateData = {
        network: 'Bitcoin',
        confirmations: 3,
        block_number: 123456
      };

      const updated = await TransactionDetail.update(testTransaction.id, updateData);
      expect(updated).toBeTypeOf('object');
      expect(updated.network).toBe(updateData.network);
      expect(updated.confirmations).toBe(updateData.confirmations);
      expect(updated.block_number).toBe(updateData.block_number);
    });

    it('should throw error when updating non-existent transaction', async () => {
      await expect(
        TransactionDetail.update(uuidv4(), { network: 'Ethereum' })
      ).rejects.toThrow('Failed to update');
    });
  });

  describe('delete()', () => {
    it('should delete transaction detail', async () => {
      const result = await TransactionDetail.delete(testTransaction.id);
      expect(result).toBe(true);

      // Verify deletion
      const detail = await TransactionDetail.findByTransactionId(testTransaction.id);
      expect(detail).toBeNull();
    });


  });

}); 