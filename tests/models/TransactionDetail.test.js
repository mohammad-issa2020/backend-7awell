import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import TransactionDetail from '../../models/TransactionDetail.js';
import Transaction from '../../models/Transaction.js';
import User from '../../models/User.js';
import { supabaseAdmin } from '../../database/supabase.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('TransactionDetail Model', () => {
  let setup;
  let testUsers;
  let testTransactions;
  let testUser;
  let testTransaction;
  let testTransactionDetail;

  // setup test data
  beforeAll(async () => {
    // load complete transaction system (users + wallets + transactions)
    setup = await quickSetups.transactions('integration');
    testUsers = setup.getData('users');
    testTransactions = setup.getData('transactions');
    
    // get test user and transaction from preset
    testUser = testUsers[0]; // Use first user from preset
    testTransaction = testTransactions.find(t => t.status === 'completed') || testTransactions[0]; // Find completed transaction or use first one
    
    // Verify we have the required test data
    if (!testUser) {
      throw new Error('No test user found in preset data');
    }
    if (!testTransaction) {
      throw new Error('No test transaction found in preset data');
    }
  });

  // cleanup test data
  afterAll(async () => {
    // cleanup preset data
    if (setup && setup.cleanup) {
      await setup.cleanup();
    }
  });

  describe('create()', () => {
    it('should create a new transaction detail', async () => {
      const testData = {
        transaction_id: testTransaction.id,
        network: 'Ethereum',
        tx_hash: `0x${Date.now().toString(16)}`,
        confirmations: 0,
        block_number: null,
        gas_fee: 0.001,
        error_message: null,
        raw_response: { test: 'data' }
      };

      const detail = await TransactionDetail.create(testData);
      expect(detail).toBeTypeOf('object');
      expect(detail.transaction_id).toBe(testTransaction.id);
      expect(detail.network).toBe(testData.network);
      expect(detail.tx_hash).toBe(testData.tx_hash);

      // clean up
      await TransactionDetail.delete(testTransaction.id);
    });

    it('should throw error when required fields are missing', async () => {
      await expect(TransactionDetail.create({})).rejects.toThrow('Missing required field');
    });
  });

  describe('findByTransactionId()', () => {
    it('should find transaction detail by transaction ID', async () => {
      // create test transaction detail
      const testData = {
        transaction_id: testTransaction.id,
        network: 'Bitcoin',
        tx_hash: `0x${Date.now().toString(16)}`,
        confirmations: 1,
        block_number: 123456,
        gas_fee: 0.0005,
        error_message: null,
        raw_response: { find: 'test' }
      };

      await TransactionDetail.create(testData);
      const detail = await TransactionDetail.findByTransactionId(testTransaction.id);
      expect(detail).toBeTypeOf('object');
      expect(detail.transaction_id).toBe(testTransaction.id);

      // clean up
      await TransactionDetail.delete(testTransaction.id);
    });

    it('should return null for non-existent transaction ID', async () => {
      const detail = await TransactionDetail.findByTransactionId(uuidv4());
      expect(detail).toBeNull();
    });
  });

  describe('findByTxHash()', () => {
    it('should find transaction detail by transaction hash', async () => {
      const txHash = `0x${Date.now().toString(16)}`;
      const testData = {
        transaction_id: testTransaction.id,
        network: 'Solana',
        tx_hash: txHash,
        confirmations: 5,
        block_number: 789012,
        gas_fee: 0.0001,
        error_message: null,
        raw_response: { hash: 'test' }
      };

      await TransactionDetail.create(testData);
      const detail = await TransactionDetail.findByTxHash(txHash);
      expect(detail).toBeTypeOf('object');
      expect(detail.tx_hash).toBe(txHash);

      // clean up
      await TransactionDetail.delete(testTransaction.id);
    });

    it('should return null for non-existent transaction hash', async () => {
      const detail = await TransactionDetail.findByTxHash('0x123');
      expect(detail).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update transaction detail', async () => {
      // create test transaction detail first
      const testData = {
        transaction_id: testTransaction.id,
        network: 'Ethereum',
        tx_hash: `0x${Date.now().toString(16)}`,
        confirmations: 0,
        block_number: null,
        gas_fee: 0.002,
        error_message: null,
        raw_response: { update: 'initial' }
      };

      await TransactionDetail.create(testData);

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

      // clean up
      await TransactionDetail.delete(testTransaction.id);
    });

    it('should throw error when updating non-existent transaction', async () => {
      await expect(
        TransactionDetail.update(uuidv4(), { network: 'Ethereum' })
      ).rejects.toThrow('Failed to update');
    });
  });

  describe('delete()', () => {
    it('should delete transaction detail', async () => {
      // create test transaction detail first
      const testData = {
        transaction_id: testTransaction.id,
        network: 'Ethereum',
        tx_hash: `0x${Date.now().toString(16)}`,
        confirmations: 0,
        block_number: null,
        gas_fee: 0.003,
        error_message: null,
        raw_response: { delete: 'test' }
      };

      await TransactionDetail.create(testData);
      const result = await TransactionDetail.delete(testTransaction.id);
      expect(result).toBe(true);

      // verify deletion
      const detail = await TransactionDetail.findByTransactionId(testTransaction.id);
      expect(detail).toBeNull();
    });

    it('should return true when deleting non-existent transaction detail', async () => {
      const result = await TransactionDetail.delete(uuidv4());
      expect(result).toBe(true);
    });
  });

  describe('Transaction Integration', () => {
    it('should validate transaction detail relationships from preset data', async () => {
      // verify transactions from preset have expected structure
      expect(testTransactions.length).toBeGreaterThan(0);
      expect(testUsers.length).toBeGreaterThan(0);
      
      // verify transactions have required fields
      testTransactions.forEach(transaction => {
        expect(transaction.id).toBeDefined();
        expect(transaction.sender_id).toBeDefined(); // transactions use sender_id not user_id
        expect(transaction.type).toBeDefined();
        expect(transaction.status).toBeDefined();
        expect(['send', 'receive', 'transfer'].includes(transaction.type)).toBe(true);
        expect(['pending', 'completed', 'failed'].includes(transaction.status)).toBe(true);
      });
    });

    it('should handle multiple transaction details for different networks', async () => {
      // get different transactions from preset
      const pendingTx = testTransactions.find(t => t.status === 'pending');
      const completedTx = testTransactions.find(t => t.status === 'completed');
      
      if (pendingTx && completedTx) {
        // create transaction details for different networks
        const ethDetail = await TransactionDetail.create({
          transaction_id: pendingTx.id,
          network: 'Ethereum',
          tx_hash: `0xeth${Date.now().toString(16)}`,
          confirmations: 0,
          block_number: null,
          gas_fee: 0.005,
          error_message: null,
          raw_response: { network: 'ethereum' }
        });

        const btcDetail = await TransactionDetail.create({
          transaction_id: completedTx.id,
          network: 'Bitcoin',
          tx_hash: `0xbtc${Date.now().toString(16)}`,
          confirmations: 6,
          block_number: 800000,
          gas_fee: 0.0001,
          error_message: null,
          raw_response: { network: 'bitcoin' }
        });

        // verify details exist
        expect(ethDetail.transaction_id).toBe(pendingTx.id);
        expect(btcDetail.transaction_id).toBe(completedTx.id);
        expect(ethDetail.network).toBe('Ethereum');
        expect(btcDetail.network).toBe('Bitcoin');

        // clean up
        await TransactionDetail.delete(pendingTx.id);
        await TransactionDetail.delete(completedTx.id);
      }
    });

    it('should validate transaction detail data consistency', async () => {
      const networks = ['Ethereum', 'Bitcoin', 'Solana'];
      const details = [];
      
      // create transaction details for multiple networks
      for (let i = 0; i < networks.length && i < testTransactions.length; i++) {
        const transaction = testTransactions[i];
        const network = networks[i];
        
        const detail = await TransactionDetail.create({
          transaction_id: transaction.id,
          network: network,
          tx_hash: `0x${network.toLowerCase()}${Date.now()}${i}`,
          confirmations: i * 2,
          block_number: i > 0 ? 100000 + i * 1000 : null,
          gas_fee: 0.001 * (i + 1),
          error_message: null,
          raw_response: { network: network.toLowerCase(), index: i }
        });
        
        details.push({ detail, transaction });
      }

      // verify all details are properly linked
      details.forEach(({ detail, transaction }, index) => {
        expect(detail.transaction_id).toBe(transaction.id);
        expect(detail.network).toBe(networks[index]);
        expect(detail.confirmations).toBe(index * 2);
        expect(detail.gas_fee).toBe(0.001 * (index + 1));
      });

      // verify different networks
      const networkSet = new Set(details.map(d => d.detail.network));
      expect(networkSet.size).toBe(details.length); // all unique

      // clean up
      await Promise.all(details.map(d => TransactionDetail.delete(d.transaction.id)));
    });

    it('should validate transaction status correlation with details', async () => {
      // get transactions with different statuses
      const pendingTx = testTransactions.find(t => t.status === 'pending');
      const completedTx = testTransactions.find(t => t.status === 'completed');
      const failedTx = testTransactions.find(t => t.status === 'failed');
      
      const testCases = [
        { tx: pendingTx, confirmations: 0, errorMsg: null, desc: 'pending transaction' },
        { tx: completedTx, confirmations: 6, errorMsg: null, desc: 'completed transaction' },
        { tx: failedTx, confirmations: 0, errorMsg: 'Transaction failed', desc: 'failed transaction' }
      ].filter(tc => tc.tx); // only include existing transactions

      const details = await Promise.all(
        testCases.map((tc, index) => TransactionDetail.create({
          transaction_id: tc.tx.id,
          network: 'Ethereum',
          tx_hash: `0xstatus${Date.now()}${index}`,
          confirmations: tc.confirmations,
          block_number: tc.confirmations > 0 ? 200000 + index * 1000 : null,
          gas_fee: 0.002,
          error_message: tc.errorMsg,
          raw_response: { status: tc.tx.status }
        }))
      );

      // verify status correlation
      details.forEach((detail, index) => {
        const testCase = testCases[index];
        expect(detail.transaction_id).toBe(testCase.tx.id);
        expect(detail.confirmations).toBe(testCase.confirmations);
        expect(detail.error_message).toBe(testCase.errorMsg);
        
        // pending transactions should have 0 confirmations
        if (testCase.tx.status === 'pending') {
          expect(detail.confirmations).toBe(0);
          expect(detail.block_number).toBeNull();
        }
        
        // completed transactions should have confirmations > 0
        if (testCase.tx.status === 'completed') {
          expect(detail.confirmations).toBeGreaterThan(0);
          expect(detail.block_number).not.toBeNull();
        }
        
        // failed transactions should have error message
        if (testCase.tx.status === 'failed') {
          expect(detail.error_message).not.toBeNull();
        }
      });

      // clean up
      await Promise.all(testCases.map(tc => TransactionDetail.delete(tc.tx.id)));
    });
  });
}); 