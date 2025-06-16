import { describe, it, expect, beforeEach } from 'vitest';
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

describe('Wallet Model', () => {
  let testUser;
  let testWallet;

  beforeEach(async () => {
    // Create a test user with random phone number and unique email
    testUser = await User.create({
      phone: generateRandomPhone(),
      email: generateUniqueEmail(),
      phone_verified: true,
      email_verified: true,
      status: 'active',
      kyc_level: 'none'
    });

    // Create a test wallet with random address
    testWallet = await Wallet.create({
      userId: testUser.id,
      walletAddress: generateRandomWalletAddress(),
      walletType: 'custodial'
    });
  });

  describe('Create', () => {
    it('should create a new wallet successfully', async () => {
      const wallet = await Wallet.create({
        userId: testUser.id,
        walletAddress: generateRandomWalletAddress(),
        walletType: 'non_custodial'
      });

      expect(wallet).toBeDefined();
      expect(wallet.user_id).toBe(testUser.id);
      expect(wallet.wallet_address).toBeDefined();
      expect(wallet.wallet_type).toBe('non_custodial');
      expect(wallet.status).toBe('active');
    });

    it('should not create wallet with duplicate address', async () => {
      await expect(Wallet.create({
        userId: testUser.id,
        walletAddress: testWallet.wallet_address, // Duplicate address
        walletType: 'custodial'
      })).rejects.toThrow();
    });
  });

  describe('Read', () => {

    it('should find wallets by user id', async () => {
      const wallets = await Wallet.findByUserId(testUser.id);
      expect(Array.isArray(wallets)).toBe(true);
      expect(wallets.length).toBeGreaterThan(0);
      expect(wallets[0].user_id).toBe(testUser.id);
    });

    it('should get primary wallet for user', async () => {
      const primaryWallet = await Wallet.getPrimaryWallet(testUser.id);
      expect(primaryWallet).toBeDefined();
      expect(primaryWallet.user_id).toBe(testUser.id);
    });
  });

  describe('Update', () => {
    it('should update wallet successfully', async () => {
      const newStatus = 'frozen';
      const updatedWallet = await Wallet.update(testWallet.id, { status: newStatus });
      
      expect(updatedWallet.status).toBe(newStatus);
    });

    it('should update wallet type', async () => {
      const newType = 'non_custodial';
      const updatedWallet = await Wallet.update(testWallet.id, { wallet_type: newType });
      expect(updatedWallet.wallet_type).toBe(newType);
    });
  });


  describe('Statistics', () => {
    it('should get wallet statistics', async () => {
      const stats = await Wallet.getStatistics();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalActiveWallets');
      expect(stats).toHaveProperty('typeDistribution');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('User Operations', () => {
    it('should check if user has wallet', async () => {
      const hasWallet = await Wallet.userHasWallet(testUser.id);
      expect(hasWallet).toBe(true);
    });

    it('should return false for user without wallet', async () => {
      const newUser = await User.create({
        phone: generateRandomPhone(),
        email: generateUniqueEmail(),
        phone_verified: true,
        email_verified: true,
        status: 'active',
        kyc_level: 'none'
      });
      const hasWallet = await Wallet.userHasWallet(newUser.id);
      expect(hasWallet).toBe(false);
    });
  });
}); 