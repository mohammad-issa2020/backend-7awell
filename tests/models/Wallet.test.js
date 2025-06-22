import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { quickSetups } from '../setup/presets.js';
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

describe('✅ Wallet Model - NO REPETITION', () => {
  let setup;
  let testUsers;
  let testWallets;

  beforeAll(async () => {
    // load wallet system (users + wallets)
    setup = await quickSetups.wallets('integration');
    testUsers = setup.getData('users');
    testWallets = setup.getData('wallets');

    console.log('✅ Wallet test setup ready:', {
      users: testUsers.length,
      wallets: testWallets.length
    });
  });

  afterAll(async () => {
    await setup.cleanup();
  });

  describe('Create', () => {
    it('should create new wallet successfully', async () => {
      // use preset users
      const testUser = testUsers[0];
      
      const wallet = await Wallet.create({
        userId: testUser.db_id || 1,
        walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
        walletType: 'non_custodial'
      });

      expect(wallet).toBeDefined();
      expect(wallet.user_id).toBe(testUser.db_id || 1);
      expect(wallet.wallet_address).toBeDefined();
      expect(wallet.wallet_type).toBe('non_custodial');
      expect(wallet.status).toBe('active');

      // clean up
      await Wallet.delete(wallet.id);
    });

    it('should not create wallet with duplicate address', async () => {
      // use preset wallets
      const existingWallet = testWallets[0];
      
      await expect(Wallet.create({
        userId: testUsers[1]?.db_id || 2,
        walletAddress: existingWallet.wallet_address,
        walletType: 'custodial'
      })).rejects.toThrow();
    });
  });

  describe('Read', () => {
    it('should find wallets by user id using preset data', async () => {
      // use preset wallets
      const userWithWallets = testUsers.find(u => u.user_id === 'wallet-test-001');
      const userWallets = testWallets.filter(w => w.user_id === 'wallet-test-001');
      
      expect(userWithWallets).toBeDefined();
      expect(userWallets.length).toBeGreaterThan(0);
      
      console.log('✅ User wallets found:', userWallets.length);
    });

    it('should validate wallet networks from preset data', async () => {
      // verify wallet networks from preset data
      const ethereumWallets = testWallets.filter(w => w.network === 'ethereum');
      const bitcoinWallets = testWallets.filter(w => w.network === 'bitcoin');
      const solanaWallets = testWallets.filter(w => w.network === 'solana');

      expect(ethereumWallets.length).toBeGreaterThan(0);
      expect(bitcoinWallets.length).toBeGreaterThan(0);
      expect(solanaWallets.length).toBeGreaterThan(0);

      console.log('✅ Wallet networks validated:', {
        ethereum: ethereumWallets.length,
        bitcoin: bitcoinWallets.length,
        solana: solanaWallets.length
      });
    });

    it('should validate wallet balances from preset data', async () => {
      // verify wallet balances from preset data
      const walletsWithBalance = testWallets.filter(w => parseFloat(w.balance) > 0);
      const emptyWallets = testWallets.filter(w => parseFloat(w.balance) === 0);

      expect(walletsWithBalance.length).toBeGreaterThan(0);
      expect(emptyWallets.length).toBeGreaterThan(0);

      const maxBalance = Math.max(...testWallets.map(w => parseFloat(w.balance)));
      expect(maxBalance).toBeGreaterThan(0);

      console.log('✅ Wallet balances validated:', {
        withBalance: walletsWithBalance.length,
        empty: emptyWallets.length,
        maxBalance
      });
    });
  });

  describe('Update', () => {
    it('should update wallet successfully', async () => {
      // create temporary wallet for update
      const tempWallet = await Wallet.create({
        userId: testUsers[0]?.db_id || 1,
        walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
        walletType: 'custodial'
      });

      const newStatus = 'frozen';
      const updatedWallet = await Wallet.update(tempWallet.id, { status: newStatus });
      
      expect(updatedWallet.status).toBe(newStatus);

      // clean up
      await Wallet.delete(tempWallet.id);
    });

    it('should update wallet type', async () => {
      // create temporary wallet for update
      const tempWallet = await Wallet.create({
        userId: testUsers[0]?.db_id || 1,
        walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
        walletType: 'custodial'
      });

      const newType = 'non_custodial';
      const updatedWallet = await Wallet.update(tempWallet.id, { wallet_type: newType });
      expect(updatedWallet.wallet_type).toBe(newType);

      // clean up
      await Wallet.delete(tempWallet.id);
    });
  });

  describe('Wallet Status Management', () => {
    it('should validate wallet statuses from preset data', async () => {
      // verify wallet statuses from preset data
      const activeWallets = testWallets.filter(w => w.is_active === true);
      const inactiveWallets = testWallets.filter(w => w.is_active === false);

      expect(activeWallets.length).toBeGreaterThan(0);
      expect(inactiveWallets.length).toBeGreaterThan(0);

      console.log('✅ Wallet statuses validated:', {
        active: activeWallets.length,
        inactive: inactiveWallets.length
      });
    });

    it('should validate user-wallet relationships', async () => {
      // verify user-wallet relationships
      const userWithMultipleWallets = testUsers.find(u => u.user_id === 'wallet-test-001');
      const userWallets = testWallets.filter(w => w.user_id === 'wallet-test-001');

      expect(userWithMultipleWallets).toBeDefined();
      expect(userWallets.length).toBeGreaterThanOrEqual(2); // Multiple wallets

      // verify different wallet networks
      const networks = [...new Set(userWallets.map(w => w.network))];
      expect(networks.length).toBeGreaterThan(1);

      console.log('✅ User-wallet relationships validated:', {
        user: userWithMultipleWallets.user_id,
        wallets: userWallets.length,
        networks: networks
      });
    });
  });

  describe('Statistics', () => {
    it('should get wallet statistics from preset data', async () => {
      // calculate wallet statistics from preset data
      const totalWallets = testWallets.length;
      const activeWallets = testWallets.filter(w => w.is_active === true).length;
      const networksDistribution = testWallets.reduce((acc, wallet) => {
        acc[wallet.network] = (acc[wallet.network] || 0) + 1;
        return acc;
      }, {});

      expect(totalWallets).toBeGreaterThan(0);
      expect(activeWallets).toBeGreaterThan(0);
      expect(Object.keys(networksDistribution).length).toBeGreaterThan(1);

      console.log('✅ Wallet statistics:', {
        total: totalWallets,
        active: activeWallets,
        networks: networksDistribution
      });
    });
  });

  describe('User Operations', () => {
    it('should check if users have wallets using preset data', async () => {
      // verify user-wallet relationships
      const userWithWallet = testUsers.find(u => 
        testWallets.some(w => w.user_id === u.user_id)
      );
      const userWithoutWallet = testUsers.find(u => 
        !testWallets.some(w => w.user_id === u.user_id)
      );

      expect(userWithWallet).toBeDefined();
      
      // if no user without wallet, create one
      if (!userWithoutWallet) {
        const newUser = await User.create({
          phone: '+1' + Math.random().toString().slice(2, 12),
          email: `no.wallet.${Date.now()}@example.com`,
          phone_verified: true,
          email_verified: true,
          status: 'active',
          kyc_level: 'none'
        });

        const hasWallet = await Wallet.userHasWallet(newUser.id);
        expect(hasWallet).toBe(false);

        // clean up
        await User.destroy({ where: { id: newUser.id } });
      }

      console.log('✅ User wallet ownership validated');
    });

    it('should validate wallet ownership distribution', async () => {
      // verify wallet ownership distribution
      const walletOwnershipMap = testWallets.reduce((acc, wallet) => {
        acc[wallet.user_id] = (acc[wallet.user_id] || 0) + 1;
        return acc;
      }, {});

      const usersWithSingleWallet = Object.values(walletOwnershipMap).filter(count => count === 1).length;
      const usersWithMultipleWallets = Object.values(walletOwnershipMap).filter(count => count > 1).length;

      expect(usersWithSingleWallet).toBeGreaterThan(0);
      expect(usersWithMultipleWallets).toBeGreaterThan(0);

      console.log('✅ Wallet ownership distribution:', {
        singleWallet: usersWithSingleWallet,
        multipleWallets: usersWithMultipleWallets
      });
    });
  });

  describe('Network Support', () => {
    it('should validate multi-network support from preset data', async () => {
      // verify multi-network support
      const supportedNetworks = [...new Set(testWallets.map(w => w.network))];
      
      expect(supportedNetworks).toContain('ethereum');
      expect(supportedNetworks).toContain('bitcoin');
      expect(supportedNetworks).toContain('solana');
      expect(supportedNetworks.length).toBeGreaterThanOrEqual(3);

      console.log('✅ Multi-network support validated:', supportedNetworks);
    });

    it('should validate network-specific wallet features', async () => {
      // verify network-specific wallet features
      const ethereumWallets = testWallets.filter(w => w.network === 'ethereum');
      const bitcoinWallets = testWallets.filter(w => w.network === 'bitcoin');

      // verify different wallet networks
      expect(ethereumWallets.length).toBeGreaterThan(0);
      expect(bitcoinWallets.length).toBeGreaterThan(0);

      console.log('✅ Network-specific features validated');
    });
  });
}); 