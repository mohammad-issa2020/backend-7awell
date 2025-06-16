import { describe, it, expect, beforeEach } from 'vitest';
import AssetBalance from '../../models/AssetBalance.js';
import Wallet from '../../models/Wallet.js';
import User from '../../models/User.js';

// Helper function to generate random phone number
function generateRandomPhone() {
  const random = Math.floor(Math.random() * 10000000000);
  return `+1${random.toString().padStart(10, '0')}`;
}

// Helper function to generate unique email
function generateUniqueEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test.${timestamp}.${random}@example.com`;
}

// Helper function to generate random wallet address
function generateRandomWalletAddress() {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

describe('AssetBalance Model', () => {
  let testUser;
  let testWallet;
  let testBalance;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      phone: generateRandomPhone(),
      email: generateUniqueEmail(),
      phone_verified: true,
      email_verified: true,
      status: 'active',
      kyc_level: 'none'
    });

    // Create a test wallet
    testWallet = await Wallet.create({
      userId: testUser.id,
      walletAddress: generateRandomWalletAddress(),
      walletType: 'custodial'
    });

    // Create a test balance
    testBalance = await AssetBalance.create({
      wallet_id: testWallet.id,
      asset_symbol: 'BTC',
      total: 1.5,
      available: 1.0,
      pending: 0.5
    });
  });

  describe('Create', () => {
    it('should create a new asset balance successfully', async () => {
      const balance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'ETH',
        total: 10.0,
        available: 8.0,
        pending: 2.0
      });

      expect(balance).toBeDefined();
      expect(balance.wallet_id).toBe(testWallet.id);
      expect(balance.asset_symbol).toBe('ETH');
      expect(balance.total).toBe(10.0);
      expect(balance.available).toBe(8.0);
      expect(balance.pending).toBe(2.0);
      expect(balance.last_updated).toBeDefined();
    });

    it('should not create balance with duplicate wallet and asset', async () => {
      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'BTC', // Duplicate asset for same wallet
        total: 2.0,
        available: 1.5,
        pending: 0.5
      })).rejects.toThrow();
    });

    it('should validate total equals available plus pending', async () => {
      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'USDT',
        total: 5.0,
        available: 3.0,
        pending: 1.0 // total (5.0) != available (3.0) + pending (1.0)
      })).rejects.toThrow();
    });

    it('should not allow negative balances', async () => {
      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'USDT',
        total: -1.0,
        available: -1.0,
        pending: 0.0
      })).rejects.toThrow();
    });

    it('should validate asset symbol length', async () => {
      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'A', // Too short
        total: 1.0,
        available: 1.0,
        pending: 0.0
      })).rejects.toThrow();

      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'ABCDEFGHIJK', // Too long
        total: 1.0,
        available: 1.0,
        pending: 0.0
      })).rejects.toThrow();
    });
  });

  describe('Read', () => {
    it('should find balance by id', async () => {
      const foundBalance = await AssetBalance.findById(testBalance.id);
      expect(foundBalance).toBeDefined();
      expect(foundBalance.id).toBe(testBalance.id);
      expect(foundBalance.wallet_id).toBe(testWallet.id);
      expect(foundBalance.asset_symbol).toBe('BTC');
      expect(foundBalance.total).toBe(1.5);
      expect(foundBalance.available).toBe(1.0);
      expect(foundBalance.pending).toBe(0.5);
    });

    it('should find balances by wallet id', async () => {
      const balances = await AssetBalance.findByWalletId(testWallet.id);
      expect(Array.isArray(balances)).toBe(true);
      expect(balances.length).toBeGreaterThan(0);
      expect(balances[0].wallet_id).toBe(testWallet.id);
      expect(balances[0].asset_symbol).toBe('BTC');
    });

    it('should find balance by wallet and asset', async () => {
      const balance = await AssetBalance.findByWalletAndAsset(testWallet.id, 'BTC');
      expect(balance).toBeDefined();
      expect(balance.wallet_id).toBe(testWallet.id);
      expect(balance.asset_symbol).toBe('BTC');
      expect(balance.total).toBe(1.5);
    });

  });

  describe('Update', () => {
    it('should update balance successfully', async () => {
      const newTotal = 2.0;
      const newAvailable = 1.5;
      const newPending = 0.5;
      
      const updatedBalance = await AssetBalance.update(testBalance.id, {
        total: newTotal,
        available: newAvailable,
        pending: newPending
      });
      
      expect(updatedBalance.total).toBe(newTotal);
      expect(updatedBalance.available).toBe(newAvailable);
      expect(updatedBalance.pending).toBe(newPending);
      expect(updatedBalance.last_updated).toBeDefined();
    });

    it('should not allow total to be less than available plus pending', async () => {
      await expect(AssetBalance.update(testBalance.id, {
        total: 1.0,
        available: 1.0,
        pending: 1.0 // total (1.0) < available (1.0) + pending (1.0)
      })).rejects.toThrow();
    });

    it('should not allow negative values', async () => {
      await expect(AssetBalance.update(testBalance.id, {
        total: -1.0,
        available: -1.0,
        pending: 0.0
      })).rejects.toThrow();
    });

    it('should maintain balance logic after update', async () => {
      const newAvailable = 2.0;
      const newPending = 1.0;
      const newTotal = newAvailable + newPending;

      const updatedBalance = await AssetBalance.update(testBalance.id, {
        total: newTotal,
        available: newAvailable,
        pending: newPending
      });

      expect(updatedBalance.total).toBe(newTotal);
      expect(updatedBalance.available).toBe(newAvailable);
      expect(updatedBalance.pending).toBe(newPending);
      expect(updatedBalance.total).toBe(updatedBalance.available + updatedBalance.pending);
    });
  });

  describe('Delete', () => {
    it('should delete balance successfully', async () => {
      const result = await AssetBalance.delete(testBalance.id);
      expect(result).toBe(true);

      // Verify balance is deleted
      await expect(AssetBalance.findById(testBalance.id)).rejects.toThrow();
    });

  });
}); 