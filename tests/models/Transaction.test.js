import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Transaction from '../../models/Transaction.js';
import User from '../../models/User.js';
import { supabaseAdmin } from '../../database/supabase.js';

describe('Transaction Model', () => {
  let testTransaction;
  let testSender;
  let testRecipient;

  // Create test users and assets before all tests
  beforeAll(async () => {
    // Create test sender
    testSender = await User.create({
      email: `test.sender.${Date.now()}@example.com`,
      phone: `+1234567${Date.now().toString().slice(-4)}`,
      first_name: 'Test',
      last_name: 'Sender',
      status: 'active',
      kyc_level: 'none',
      phone_verified: true,
      email_verified: true
    });

    // Create test recipient
    testRecipient = await User.create({
      email: `test.recipient.${Date.now()}@example.com`,
      phone: `+9876543${Date.now().toString().slice(-4)}`,
      first_name: 'Test',
      last_name: 'Recipient',
      status: 'active',
      kyc_level: 'none',
      phone_verified: true,
      email_verified: true
    });

    // Ensure USDT asset exists
    const { error: assetError } = await supabaseAdmin
      .from('supported_assets')
      .upsert({
        symbol: 'USDT',
        name: 'Tether',
        asset_type: 'crypto',
        decimals: 6,
        is_active: true,
        network: 'Multiple'
      }, {
        onConflict: 'symbol'
      });

    if (assetError) {
      console.error('Error creating test asset:', assetError);
      throw assetError;
    }
  });

  // Clean up test users and assets after all tests
  afterAll(async () => {
    if (testSender) {
      try {
        await User.destroy({ where: { id: testSender.id } });
      } catch (error) {
        console.error('Error cleaning up test sender:', error);
      }
    }
    if (testRecipient) {
      try {
        await User.destroy({ where: { id: testRecipient.id } });
      } catch (error) {
        console.error('Error cleaning up test recipient:', error);
      }
    }
  });

  beforeEach(async () => {
    // Clean up any existing test transaction
    if (testTransaction) {
      try {
        await Transaction.delete(testTransaction.id);
      } catch (error) {
        // Ignore error if transaction doesn't exist
      }
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (testTransaction) {
      try {
        await Transaction.delete(testTransaction.id);
      } catch (error) {
        // Ignore error if transaction doesn't exist
      }
    }
  });

  describe('Create', () => {
    it('should create a new transaction successfully', async () => {
      const data = {
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer',
        amount: 100.50,
        asset_symbol: 'USDT',
        fee: 0.50,
        note: 'Test transaction'
      };

      testTransaction = await Transaction.create(data);
      expect(testTransaction).toBeDefined();
      expect(testTransaction.reference).toBe(data.reference);
      expect(testTransaction.type).toBe(data.type);
      expect(testTransaction.amount).toBe(data.amount);
      expect(testTransaction.asset_symbol).toBe(data.asset_symbol);
      expect(testTransaction.fee).toBe(data.fee);
      expect(testTransaction.note).toBe(data.note);
      expect(testTransaction.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      const data = {
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer'
        // Missing required fields: reference, amount, asset_symbol
      };

      await expect(Transaction.create(data)).rejects.toThrow('Missing required field');
    });

    it('should validate amount is positive', async () => {
      const data = {
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer',
        amount: -100,
        asset_symbol: 'USDT'
      };
      // error code 
      await expect(Transaction.create(data)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate fee is non-negative', async () => {
      const data = {
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer',
        amount: 100,
        asset_symbol: 'USDT',
        fee: -1
      };

      await expect(Transaction.create(data)).rejects.toThrow('Fee must be non-negative');
    });
  });

  describe('Read', () => {
    beforeEach(async () => {
      // Create a test transaction for read operations
      testTransaction = await Transaction.create({
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer',
        amount: 100,
        asset_symbol: 'USDT'
      });
    });

    it('should find transaction by id', async () => {
      const found = await Transaction.findById(testTransaction.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(testTransaction.id);
      expect(found.reference).toBe(testTransaction.reference);
    });

    it('should find transaction by reference', async () => {
      const found = await Transaction.findByReference(testTransaction.reference);
      expect(found).toBeDefined();
      expect(found.reference).toBe(testTransaction.reference);
      expect(found.id).toBe(testTransaction.id);
    });

    it('should find transactions by user id with filters', async () => {
      const found = await Transaction.findByUserId(testSender.id, {
        status: 'pending',
        type: 'transfer',
        asset_symbol: 'USDT',
        limit: 10,
        offset: 0
      });

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].sender_id).toBe(testSender.id);
      expect(found[0].status).toBe('pending');
      expect(found[0].type).toBe('transfer');
      expect(found[0].asset_symbol).toBe('USDT');
    });
  });

  describe('Update', () => {
    beforeEach(async () => {
      // Create a test transaction for update operations
      testTransaction = await Transaction.create({
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer',
        amount: 100,
        asset_symbol: 'USDT'
      });
    });

    it('should update transaction status', async () => {
      const updated = await Transaction.update(testTransaction.id, { status: 'completed' });
      expect(updated.status).toBe('completed');
      expect(updated.completed_at).toBeDefined();
    });

    it('should update transaction amount', async () => {
      const newAmount = 200;
      const updated = await Transaction.update(testTransaction.id, { amount: newAmount });
      expect(updated.amount).toBe(newAmount);
    });

    it('should validate amount is positive on update', async () => {
      await expect(Transaction.update(testTransaction.id, { amount: -100 }))
        .rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate fee is non-negative on update', async () => {
      await expect(Transaction.update(testTransaction.id, { fee: -1 }))
        .rejects.toThrow('Fee must be non-negative');
    });
  });

  describe('Delete', () => {
    beforeEach(async () => {
      // Create a test transaction for delete operations
      testTransaction = await Transaction.create({
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender.id,
        recipient_id: testRecipient.id,
        type: 'transfer',
        amount: 100,
        asset_symbol: 'USDT'
      });
    });

    it('should delete transaction successfully', async () => {
      const deleted = await Transaction.delete(testTransaction.id);
      expect(deleted).toBe(true);

      // Verify transaction is deleted
      await expect(Transaction.findById(testTransaction.id))
        .rejects.toThrow('Failed to find transaction');
    });
  });

  describe('Reference Generation', () => {
    it('should generate unique references for different types', () => {
      const transferRef = Transaction.generateReference('transfer');
      const paymentRef = Transaction.generateReference('payment');
      const cashOutRef = Transaction.generateReference('cash_out');
      const cashInRef = Transaction.generateReference('cash_in');
      const exchangeRef = Transaction.generateReference('exchange');

      expect(transferRef.startsWith('TXF')).toBe(true);
      expect(paymentRef.startsWith('PAY')).toBe(true);
      expect(cashOutRef.startsWith('OUT')).toBe(true);
      expect(cashInRef.startsWith('CIN')).toBe(true);
      expect(exchangeRef.startsWith('EXC')).toBe(true);
    });

    it('should generate unique references for same type', () => {
      const ref1 = Transaction.generateReference('transfer');
      const ref2 = Transaction.generateReference('transfer');
      expect(ref1).not.toBe(ref2);
    });
  });
}); 