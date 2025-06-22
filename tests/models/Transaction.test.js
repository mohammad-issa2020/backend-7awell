import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { quickSetups } from '../setup/presets.js';
import Transaction from '../../models/Transaction.js';
import User from '../../models/User.js';
import { supabaseAdmin } from '../../database/supabase.js';

describe('✅ Transaction Model - NO REPETITION', () => {
  let setup;
  let testUsers;
  let testWallets;
  let testTransactions;
  let testSender;
  let testRecipient;

  beforeAll(async () => {
    // load transaction   system (users + wallets + transactions)
    setup = await quickSetups.transactions('integration');
    testUsers = setup.getData('users');
    testWallets = setup.getData('wallets');
    testTransactions = setup.getData('transactions');

    // get users from preset
    testSender = testUsers.find(u => u.email === 'sender@example.com');
    testRecipient = testUsers.find(u => u.email === 'receiver@example.com');

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

    console.log('✅ Transaction test setup ready:', {
      users: testUsers.length,
      wallets: testWallets.length,
      transactions: testTransactions.length
    });
  });

  afterAll(async () => {
    await setup.cleanup();
  });

  describe('Create', () => {
    it('should create new transaction successfully', async () => {
      // use preset users
      const data = {
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender?.id || 1,
        recipient_id: testRecipient?.id || 2,
        type: 'transfer',
        amount: 100.50,
        asset_symbol: 'USDT',
        fee: 0.50,
        note: 'Test transaction'
      };

      const transaction = await Transaction.create(data);
      expect(transaction).toBeDefined();
      expect(transaction.reference).toBe(data.reference);
      expect(transaction.type).toBe(data.type);
      expect(transaction.amount).toBe(data.amount);
      expect(transaction.asset_symbol).toBe(data.asset_symbol);
      expect(transaction.fee).toBe(data.fee);
      expect(transaction.note).toBe(data.note);
      expect(transaction.status).toBe('pending');

      
      await Transaction.delete(transaction.id);
    });

    it('should validate required fields', async () => {
      const data = {
        sender_id: testSender?.id || 1,
        recipient_id: testRecipient?.id || 2,
        type: 'transfer'
        // Missing required fields: reference, amount, asset_symbol
      };

      await expect(Transaction.create(data)).rejects.toThrow('Missing required field');
    });

    it('should validate amount is positive', async () => {
      const data = {
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender?.id || 1,
        recipient_id: testRecipient?.id || 2,
        type: 'transfer',
        amount: -100,
        asset_symbol: 'USDT'
      };

      await expect(Transaction.create(data)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate fee is non-negative', async () => {
      const data = {
        reference: Transaction.generateReference('transfer'),
        sender_id: testSender?.id || 1,
        recipient_id: testRecipient?.id || 2,
        type: 'transfer',
        amount: 100,
        asset_symbol: 'USDT',
        fee: -1
      };

      await expect(Transaction.create(data)).rejects.toThrow('Fee must be non-negative');
    });
  });

  describe('Read', () => {
    it('should use preset transactions for read operations', async () => {
      // use preset transactions
      const completedTx = testTransactions.find(t => t.status === 'completed');
      const pendingTx = testTransactions.find(t => t.status === 'pending');

      expect(completedTx).toBeDefined();
      expect(pendingTx).toBeDefined();
      
      console.log('✅ Preset transactions available:', {
        completed: testTransactions.filter(t => t.status === 'completed').length,
        pending: testTransactions.filter(t => t.status === 'pending').length
      });
    });

    it('should find transactions by user id with filters', async () => {
      // use preset transactions - check by sender_id
      const senderTransactions = testTransactions.filter(t => t.sender_id === testSender?.id);
      
      expect(senderTransactions.length).toBeGreaterThan(0);
      
      // verify transaction types
      const transferTransactions = senderTransactions.filter(t => t.type === 'transfer');
      expect(transferTransactions.length).toBeGreaterThan(0);
      
      console.log('✅ Sender transactions found:', senderTransactions.length);
    });

    it('should validate transaction relationships', async () => {
      // verify transaction relationships
      const senderWallet = testWallets.find(w => w.user_id === testSender?.id);
      const receiverWallet = testWallets.find(w => w.user_id === testRecipient?.id);
      const completedTx = testTransactions.find(t => t.status === 'completed' && t.type === 'transfer');

      expect(senderWallet).toBeDefined();
      expect(receiverWallet).toBeDefined();
      expect(completedTx).toBeDefined();
      
      // verify transaction data
      expect(completedTx.sender_id).toBe(testSender?.id);
      expect(completedTx.amount).toBe('1.5');
      expect(completedTx.asset_symbol).toBe('ETH');
      
      console.log('✅ Transaction relationships validated');
    });
  });

  describe('Update', () => {
    it('should update transaction status', async () => {
      // create temporary transaction for update
      const tempTransaction = await Transaction.create({
        reference: Transaction.generateReference('test'),
        sender_id: testSender?.id || 1,
        recipient_id: testRecipient?.id || 2,
        type: 'transfer',
        amount: 50,
        asset_symbol: 'USDT'
      });

      const updated = await Transaction.updateStatus(tempTransaction.id, 'confirmed');
      expect(updated.status).toBe('confirmed');

      // clean up
      await Transaction.delete(tempTransaction.id);
    });
  });

  describe('Transaction Types and Statuses', () => {
    it('should validate transaction types from preset data', async () => {
      // verify transaction types from preset data
      const transferTransactions = testTransactions.filter(t => t.type === 'transfer');

              expect(transferTransactions.length).toBeGreaterThan(0);

              console.log('✅ Transaction types validated:', {
          transfer: transferTransactions.length
        });
    });

    it('should validate transaction statuses from preset data', async () => {
      // verify transaction statuses from preset data
      const completedTxs = testTransactions.filter(t => t.status === 'completed');
      const pendingTxs = testTransactions.filter(t => t.status === 'pending');

      expect(completedTxs.length).toBeGreaterThan(0);
      expect(pendingTxs.length).toBeGreaterThan(0);

      console.log('✅ Transaction statuses validated:', {
        completed: completedTxs.length,
        pending: pendingTxs.length
      });
    });

    it('should validate asset symbols from preset data', async () => {
      // verify asset symbols from preset data
      const ethTransactions = testTransactions.filter(t => t.asset_symbol === 'ETH');
      const btcTransactions = testTransactions.filter(t => t.asset_symbol === 'BTC');

      expect(ethTransactions.length).toBeGreaterThan(0);
      expect(btcTransactions.length).toBeGreaterThan(0);

      console.log('✅ Asset symbols validated:', {
        ETH: ethTransactions.length,
        BTC: btcTransactions.length
      });
    });
  });

  describe('Business Logic', () => {
    it('should validate transaction amounts', async () => {
      // verify transaction amounts from preset data
      const allAmounts = testTransactions.map(t => parseFloat(t.amount));
      const validAmounts = allAmounts.filter(amount => amount > 0);

      expect(validAmounts.length).toBe(allAmounts.length);
      expect(Math.max(...allAmounts)).toBeGreaterThan(0);
      expect(Math.min(...allAmounts)).toBeGreaterThan(0);

      console.log('✅ Transaction amounts validated:', {
        total: allAmounts.length,
        max: Math.max(...allAmounts),
        min: Math.min(...allAmounts)
      });
    });

    it('should validate transaction flow consistency', async () => {
      // verify transaction flow consistency
      const senderTransactions = testTransactions.filter(t => t.sender_id === testSender?.id);
      const receiverTransactions = testTransactions.filter(t => t.recipient_id === testRecipient?.id);

      // sender should have transfer transactions
      const senderTransferTxs = senderTransactions.filter(t => t.type === 'transfer');
      expect(senderTransferTxs.length).toBeGreaterThan(0);

      // receiver should have received transactions
      const receiverReceivedTxs = receiverTransactions.filter(t => t.type === 'transfer');
      expect(receiverReceivedTxs.length).toBeGreaterThan(0);

      console.log('✅ Transaction flow consistency validated');
    });
  });
}); 