import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import AssetBalance from '../../models/AssetBalance.js';
import Wallet from '../../models/Wallet.js';
import User from '../../models/User.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('AssetBalance Model', () => {
  let setup;
  let testUsers;
  let testWallets;
  let testUser;
  let testWallet;
  let testBalance;

  beforeAll(async () => {
    // load wallet system (users + wallets)
    setup = await quickSetups.wallets('integration');
    testUsers = setup.getData('users');
    testWallets = setup.getData('wallets');
    
    // get specific test data
    testUser = testUsers[0]; // Use first user instead of searching by status
    testWallet = testWallets.find(w => w.user_id === testUser.id); // Fix property name
  });

  afterAll(async () => {
    // cleanup preset data
    if (setup && setup.cleanup) {
      await setup.cleanup();
    }
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

      // clean up
      await AssetBalance.delete(balance.id);
    });

    it('should not create balance with duplicate wallet and asset', async () => {
      // create initial balance
      const initialBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'BTC',
        total: 1.5,
        available: 1.0,
        pending: 0.5
      });

      // try to create duplicate
      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'BTC', // duplicate asset for same wallet
        total: 2.0,
        available: 1.5,
        pending: 0.5
      })).rejects.toThrow();

      // clean up
      await AssetBalance.delete(initialBalance.id);
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
        asset_symbol: 'A', // too short
        total: 1.0,
        available: 1.0,
        pending: 0.0
      })).rejects.toThrow();

      await expect(AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'ABCDEFGHIJK', // too long
        total: 1.0,
        available: 1.0,
        pending: 0.0
      })).rejects.toThrow();
    });
  });

  describe('Read', () => {
    it('should find balance by id', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'BTC',
        total: 1.5,
        available: 1.0,
        pending: 0.5
      });

      const foundBalance = await AssetBalance.findById(testBalance.id);
      expect(foundBalance).toBeDefined();
      expect(foundBalance.id).toBe(testBalance.id);
      expect(foundBalance.wallet_id).toBe(testWallet.id);
      expect(foundBalance.asset_symbol).toBe('BTC');
      expect(foundBalance.total).toBe(1.5);
      expect(foundBalance.available).toBe(1.0);
      expect(foundBalance.pending).toBe(0.5);

      // clean up
      await AssetBalance.delete(testBalance.id);
    });

    it('should find balances by wallet id', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'ETH',
        total: 2.0,
        available: 2.0,
        pending: 0.0
      });

      const balances = await AssetBalance.findByWalletId(testWallet.id);
      expect(Array.isArray(balances)).toBe(true);
      expect(balances.length).toBeGreaterThan(0);
      
      const foundBalance = balances.find(b => b.id === testBalance.id);
      expect(foundBalance).toBeDefined();
      expect(foundBalance.wallet_id).toBe(testWallet.id);

      // clean up
      await AssetBalance.delete(testBalance.id);
    });

    it('should find balance by wallet and asset', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'USDC',
        total: 3.0,
        available: 3.0,
        pending: 0.0
      });

      const balance = await AssetBalance.findByWalletAndAsset(testWallet.id, 'USDC');
      expect(balance).toBeDefined();
      expect(balance.wallet_id).toBe(testWallet.id);
      expect(balance.asset_symbol).toBe('USDC');
      expect(balance.total).toBe(3.0);

      // clean up
      await AssetBalance.delete(testBalance.id);
    });
  });

  describe('Update', () => {
    it('should update balance successfully', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'LTC',
        total: 1.0,
        available: 1.0,
        pending: 0.0
      });

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

      // clean up
      await AssetBalance.delete(testBalance.id);
    });

    it('should not allow total to be less than available plus pending', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'ADA',
        total: 1.0,
        available: 1.0,
        pending: 0.0
      });

      await expect(AssetBalance.update(testBalance.id, {
        total: 1.0,
        available: 1.0,
        pending: 1.0 // total (1.0) < available (1.0) + pending (1.0)
      })).rejects.toThrow();

      // clean up
      await AssetBalance.delete(testBalance.id);
    });

    it('should not allow negative values', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'DOT',
        total: 1.0,
        available: 1.0,
        pending: 0.0
      });

      await expect(AssetBalance.update(testBalance.id, {
        total: -1.0,
        available: -1.0,
        pending: 0.0
      })).rejects.toThrow();

      // clean up
      await AssetBalance.delete(testBalance.id);
    });

    it('should maintain balance logic after update', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'LINK',
        total: 2.0,
        available: 2.0,
        pending: 0.0
      });

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

      // clean up
      await AssetBalance.delete(testBalance.id);
    });
  });

  describe('Delete', () => {
    it('should delete balance successfully', async () => {
      // create test balance
      testBalance = await AssetBalance.create({
        wallet_id: testWallet.id,
        asset_symbol: 'XRP',
        total: 1.0,
        available: 1.0,
        pending: 0.0
      });

      const result = await AssetBalance.delete(testBalance.id);
      expect(result).toBe(true);

      const foundBalance = await AssetBalance.findById(testBalance.id);
      expect(foundBalance).toBeNull();
    });

    it('should return true when deleting non-existent balance', async () => {
      const result = await AssetBalance.delete('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(true);
    });
  });

  describe('Wallet Integration', () => {
    it('should validate wallet-balance relationships from preset data', async () => {
      // verify wallet structure from preset
      expect(testWallets.length).toBeGreaterThan(0);
      expect(testUsers.length).toBeGreaterThan(0);
      
      // verify wallet belongs to user
      const userWallets = testWallets.filter(w => w.user_id === testUser.id);
      expect(userWallets.length).toBeGreaterThan(0);
      
      // verify wallet has required fields
      testWallets.forEach(wallet => {
        expect(wallet.id).toBeDefined();
        expect(wallet.user_id).toBeDefined();
        expect(wallet.network).toBeDefined();
        expect(['ethereum', 'bitcoin', 'solana'].includes(wallet.network)).toBe(true);
      });
    });

    it('should handle multiple wallets with different balances', async () => {
      // get different wallets from preset
      const ethereumWallet = testWallets.find(w => w.network === 'ethereum');
      const bitcoinWallet = testWallets.find(w => w.network === 'bitcoin');
      
      if (ethereumWallet && bitcoinWallet) {
        // create balances for different networks
        const ethBalance = await AssetBalance.create({
          wallet_id: ethereumWallet.id,
          asset_symbol: 'ETH',
          total: 5.0,
          available: 5.0,
          pending: 0.0
        });

        const btcBalance = await AssetBalance.create({
          wallet_id: bitcoinWallet.id,
          asset_symbol: 'BTC',
          total: 0.1,
          available: 0.1,
          pending: 0.0
        });

        // verify balances exist
        expect(ethBalance.wallet_id).toBe(ethereumWallet.id);
        expect(btcBalance.wallet_id).toBe(bitcoinWallet.id);
        
        // verify different networks
        expect(ethereumWallet.network).toBe('ethereum');
        expect(bitcoinWallet.network).toBe('bitcoin');

        // clean up
        await AssetBalance.delete(ethBalance.id);
        await AssetBalance.delete(btcBalance.id);
      }
    });

    it('should validate asset distribution across wallets', async () => {
      // create balances for multiple assets in same wallet
      const balances = await Promise.all([
        AssetBalance.create({
          wallet_id: testWallet.id,
          asset_symbol: 'BTC',
          total: 1.0,
          available: 1.0,
          pending: 0.0
        }),
        AssetBalance.create({
          wallet_id: testWallet.id,
          asset_symbol: 'ETH',
          total: 10.0,
          available: 10.0,
          pending: 0.0
        }),
        AssetBalance.create({
          wallet_id: testWallet.id,
          asset_symbol: 'USDT',
          total: 1000.0,
          available: 1000.0,
          pending: 0.0
        })
      ]);

      // verify all balances belong to same wallet
      balances.forEach(balance => {
        expect(balance.wallet_id).toBe(testWallet.id);
        expect(balance.asset_symbol).toBeDefined();
        expect(balance.total).toBeGreaterThan(0);
      });

      // verify different asset symbols
      const assetSymbols = balances.map(b => b.asset_symbol);
      expect(new Set(assetSymbols).size).toBe(3); // all unique

      // clean up
      await Promise.all(balances.map(b => AssetBalance.delete(b.id)));
    });
  });
}); 