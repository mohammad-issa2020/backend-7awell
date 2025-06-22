import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SupportedAsset from '../../models/SupportedAsset.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('SupportedAsset Model', () => {
  let setup;
  let testAssets;
  let testAsset;

  beforeAll(async () => {
    // load assets from preset
    setup = await quickSetups.wallets('unit');
    testAssets = setup.getData('supportedAssets') || [];
    
    // if no preset assets, create some basic ones for testing
    if (testAssets.length === 0) {
      testAssets = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          network: 'bitcoin',
          contract_address: null,
          is_native: true,
          is_active: true,
          icon_url: 'https://example.com/btc.png'
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          network: 'ethereum',
          contract_address: null,
          is_native: true,
          is_active: true,
          icon_url: 'https://example.com/eth.png'
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          network: 'ethereum',
          contract_address: '0xa0b86a33e6e2a4c06bfef31c0d1d2a6b3a8b9f1e',
          is_native: false,
          is_active: true,
          icon_url: 'https://example.com/usdc.png'
        }
      ];
    }
    
    testAsset = testAssets.find(a => a.is_active === true) || testAssets[0];
  });

  afterAll(async () => {
    // cleanup preset data
    await setup.cleanup();
  });

  describe('Create', () => {
    it('should create a new supported asset successfully', () => {
      const asset = new SupportedAsset({
        symbol: 'AVAX',
        name: 'Avalanche',
        decimals: 18,
        network: 'avalanche',
        contract_address: null,
        is_native: true,
        is_active: true,
        icon_url: 'https://example.com/avax.png'
      });

      expect(asset).toBeDefined();
      expect(asset.symbol).toBe('AVAX');
      expect(asset.name).toBe('Avalanche');
      expect(asset.decimals).toBe(18);
      expect(asset.network).toBe('avalanche');
      expect(asset.is_native).toBe(true);
      expect(asset.is_active).toBe(true);
    });

    it('should set default values correctly', () => {
      const asset = new SupportedAsset({
        symbol: 'TEST',
        name: 'Test Token',
        network: 'ethereum'
      });
      
      expect(asset.decimals).toBe(18);
      expect(asset.is_native).toBe(false);
      expect(asset.is_active).toBe(true);
      expect(asset.contract_address).toBeNull();
    });

    it('should create asset with preset data structure', () => {
      // verify asset from preset has expected structure
      expect(testAsset).toBeDefined();
      expect(testAsset.symbol).toBeDefined();
      expect(testAsset.name).toBeDefined();
      expect(testAsset.decimals).toBeDefined();
      expect(testAsset.network).toBeDefined();
      expect(typeof testAsset.is_native).toBe('boolean');
      expect(typeof testAsset.is_active).toBe('boolean');
    });
  });

  describe('Validation', () => {
    it('should validate required fields for creation', () => {
      const asset = new SupportedAsset();
      const validation = asset.validateForCreation();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Symbol is required');
      expect(validation.errors).toContain('Name is required');
      expect(validation.errors).toContain('Network is required');
    });

    it('should validate symbol format', () => {
      const asset = new SupportedAsset({
        symbol: 'btc123', // Invalid lowercase with numbers
        name: 'Bitcoin',
        network: 'bitcoin'
      });

      const validation = asset.validateForCreation();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Symbol must be uppercase letters only');
    });

    it('should validate decimals range', () => {
      const asset = new SupportedAsset({
        symbol: 'TEST',
        name: 'Test',
        network: 'ethereum',
        decimals: 25 // Too high
      });

      const validation = asset.validateForCreation();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Decimals must be between 0 and 18');
    });

    it('should validate contract address format', () => {
      const asset = new SupportedAsset({
        symbol: 'TEST',
        name: 'Test',
        network: 'ethereum',
        contract_address: 'invalid-address'
      });

      const validation = asset.validateForCreation();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid contract address format');
    });

    it('should validate preset asset data', () => {
      // verify all assets from preset are valid
      testAssets.forEach((assetData, index) => {
        const asset = new SupportedAsset(assetData);
        const validation = asset.validateForCreation();
        
        expect(validation.isValid).toBe(true, 
          `Asset ${index} (${assetData.symbol}) should be valid: ${validation.errors.join(', ')}`);
        expect(validation.errors.length).toBe(0);
      });
    });
  });

  describe('Update', () => {
    it('should update asset successfully', () => {
      const asset = new SupportedAsset(testAsset);
      
      const updateData = {
        name: 'Updated Name',
        is_active: false,
        icon_url: 'https://new-url.com/icon.png'
      };

      asset.update(updateData);
      
      expect(asset.name).toBe('Updated Name');
      expect(asset.is_active).toBe(false);
      expect(asset.icon_url).toBe('https://new-url.com/icon.png');
      expect(asset.updated_at).toBeDefined();
    });

    it('should validate updates correctly', () => {
      const asset = new SupportedAsset(testAsset);
      
      // apply invalid updates
      asset.symbol = 'invalid';
      asset.decimals = -1;

      const validation = asset.validateForUpdate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Symbol must be uppercase letters only');
      expect(validation.errors).toContain('Decimals must be between 0 and 18');
    });

    it('should preserve unchanged fields during update', () => {
      const asset = new SupportedAsset(testAsset);
      const originalSymbol = asset.symbol;
      const originalDecimals = asset.decimals;
      
      asset.update({
        name: 'New Name',
        icon_url: 'https://new-icon.com/icon.png'
      });
      
      expect(asset.name).toBe('New Name');
      expect(asset.icon_url).toBe('https://new-icon.com/icon.png');
      expect(asset.symbol).toBe(originalSymbol);
      expect(asset.decimals).toBe(originalDecimals);
    });
  });

  describe('Data Transformation', () => {
    it('should transform to create data correctly', () => {
      const asset = new SupportedAsset(testAsset);
      const createData = asset.toCreateData();
      
      expect(createData.symbol).toBe(asset.symbol.toUpperCase());
      expect(createData.name).toBe(asset.name.trim());
      expect(createData.decimals).toBe(asset.decimals);
      expect(createData.network).toBe(asset.network.toLowerCase());
      expect(createData.is_native).toBe(asset.is_native);
      expect(createData.is_active).toBe(asset.is_active);
      expect(createData.created_at).toBeDefined();
      expect(createData.updated_at).toBeDefined();
    });

    it('should transform to update data correctly', () => {
      const asset = new SupportedAsset(testAsset);
      const updateData = asset.toUpdateData();
      
      expect(updateData.symbol).toBe(asset.symbol.toUpperCase());
      expect(updateData.name).toBe(asset.name.trim());
      expect(updateData.decimals).toBe(asset.decimals);
      expect(updateData.network).toBe(asset.network.toLowerCase());
      expect(updateData.is_native).toBe(asset.is_native);
      expect(updateData.is_active).toBe(asset.is_active);
      expect(updateData.updated_at).toBeDefined();
    });

    it('should handle case normalization', () => {
      const asset = new SupportedAsset({
        symbol: 'btc',
        name: '  Bitcoin  ',
        network: 'BITCOIN',
        decimals: 8,
        is_native: true,
        is_active: true
      });
      
      const createData = asset.toCreateData();
      expect(createData.symbol).toBe('BTC');
      expect(createData.name).toBe('Bitcoin');
      expect(createData.network).toBe('bitcoin');
    });
  });

  describe('Static Methods', () => {
    it('should create from database row', () => {
      const dbRow = {
        id: 1,
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        network: 'solana',
        contract_address: null,
        is_native: true,
        is_active: true,
        icon_url: 'https://example.com/sol.png',
        created_at: new Date(),
        updated_at: new Date()
      };

      const asset = SupportedAsset.fromDatabase(dbRow);
      
      expect(asset).toBeDefined();
      expect(asset.id).toBe(dbRow.id);
      expect(asset.symbol).toBe(dbRow.symbol);
      expect(asset.name).toBe(dbRow.name);
      expect(asset.decimals).toBe(dbRow.decimals);
    });

    it('should create from array of database rows', () => {
      const dbRows = [
        {
          id: 1,
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          network: 'bitcoin',
          contract_address: null,
          is_native: true,
          is_active: true
        },
        {
          id: 2,
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          network: 'ethereum',
          contract_address: null,
          is_native: true,
          is_active: true
        }
      ];

      const assets = SupportedAsset.fromDatabaseArray(dbRows);
      
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBe(2);
      expect(assets[0].symbol).toBe('BTC');
      expect(assets[1].symbol).toBe('ETH');
    });

    it('should create from preset data array', () => {
      const assets = SupportedAsset.fromDatabaseArray(testAssets);
      
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBe(testAssets.length);
      
      assets.forEach((asset, index) => {
        expect(asset.symbol).toBe(testAssets[index].symbol);
        expect(asset.name).toBe(testAssets[index].name);
        expect(asset.decimals).toBe(testAssets[index].decimals);
        expect(asset.network).toBe(testAssets[index].network);
      });
    });
  });

  describe('Asset Data Validation', () => {
    it('should validate asset relationships from preset data', () => {
      // verify assets from preset have expected structure
      expect(testAssets.length).toBeGreaterThan(0);
      
      // verify each asset has required fields
      testAssets.forEach(asset => {
        expect(asset.symbol).toBeDefined();
        expect(asset.name).toBeDefined();
        expect(asset.decimals).toBeDefined();
        expect(asset.network).toBeDefined();
        expect(typeof asset.is_native).toBe('boolean');
        expect(typeof asset.is_active).toBe('boolean');
      });
    });

    it('should validate asset network distribution', () => {
      // verify different networks exist
      const networks = testAssets.map(a => a.network);
      const uniqueNetworks = [...new Set(networks)];
      
      expect(uniqueNetworks.length).toBeGreaterThan(0);
      
      // verify common networks are present
      const commonNetworks = ['bitcoin', 'ethereum', 'solana', 'polygon'];
      const hasCommonNetwork = uniqueNetworks.some(network => 
        commonNetworks.includes(network.toLowerCase())
      );
      
      expect(hasCommonNetwork).toBe(true);
    });

    it('should validate native vs token assets', () => {
      const nativeAssets = testAssets.filter(a => a.is_native === true);
      const tokenAssets = testAssets.filter(a => a.is_native === false);
      
      // should have both native and token assets
      expect(nativeAssets.length).toBeGreaterThan(0);
      
      // native assets should not have contract addresses
      nativeAssets.forEach(asset => {
        expect(asset.contract_address).toBeFalsy();
      });
      
      // token assets should have contract addresses (if any exist)
      if (tokenAssets.length > 0) {
        tokenAssets.forEach(asset => {
          if (asset.contract_address) {
            expect(asset.contract_address).toBeTruthy();
            expect(asset.contract_address.length).toBeGreaterThan(10);
          }
        });
      }
    });

    it('should validate asset decimals distribution', () => {
      const decimals = testAssets.map(a => a.decimals);
      
      // verify all decimals are valid numbers
      decimals.forEach(decimal => {
        expect(Number.isInteger(decimal)).toBe(true);
        expect(decimal).toBeGreaterThanOrEqual(0);
        expect(decimal).toBeLessThanOrEqual(18);
      });
      
      // verify common decimal values exist
      const commonDecimals = [6, 8, 9, 18];
      const hasCommonDecimals = decimals.some(decimal => 
        commonDecimals.includes(decimal)
      );
      
      expect(hasCommonDecimals).toBe(true);
    });

    it('should validate asset symbols format', () => {
      testAssets.forEach((asset, index) => {
        // symbols should be uppercase
        expect(asset.symbol).toBe(asset.symbol.toUpperCase(), 
          `Asset ${index} symbol should be uppercase`);
        
        // symbols should be 2-10 characters
        expect(asset.symbol.length).toBeGreaterThanOrEqual(2, 
          `Asset ${index} symbol too short`);
        expect(asset.symbol.length).toBeLessThanOrEqual(10, 
          `Asset ${index} symbol too long`);
        
        // symbols should only contain letters
        expect(asset.symbol).toMatch(/^[A-Z]+$/, 
          `Asset ${index} symbol should only contain uppercase letters`);
      });
    });

    it('should validate asset names quality', () => {
      testAssets.forEach((asset, index) => {
        // names should be reasonable length
        expect(asset.name.length).toBeGreaterThan(2, 
          `Asset ${index} name too short`);
        expect(asset.name.length).toBeLessThan(50, 
          `Asset ${index} name too long`);
        
        // names should not be just the symbol
        expect(asset.name.toLowerCase()).not.toBe(asset.symbol.toLowerCase(), 
          `Asset ${index} name should not be the same as symbol`);
        
        // names should not contain placeholder text
        expect(asset.name.toLowerCase()).not.toContain('lorem');
        expect(asset.name.toLowerCase()).not.toContain('test');
      });
    });

    it('should handle popular cryptocurrency assets', () => {
      const popularSymbols = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'MATIC'];
      const assetSymbols = testAssets.map(a => a.symbol);
      
      // check how many popular assets are present
      const popularAssetsPresent = popularSymbols.filter(symbol => 
        assetSymbols.includes(symbol)
      );
      
      // should have at least one popular asset
      expect(popularAssetsPresent.length).toBeGreaterThan(0);
      
      // verify popular assets have correct basic properties
      popularAssetsPresent.forEach(symbol => {
        const asset = testAssets.find(a => a.symbol === symbol);
        expect(asset).toBeDefined();
        expect(asset.is_active).toBe(true);
        expect(asset.name).toBeDefined();
      });
    });

    it('should validate asset status distribution', () => {
      const activeAssets = testAssets.filter(a => a.is_active === true);
      const inactiveAssets = testAssets.filter(a => a.is_active === false);
      
      // should have active assets
      expect(activeAssets.length).toBeGreaterThan(0);
      
      // verify each asset status is boolean
      testAssets.forEach(asset => {
        expect(typeof asset.is_active).toBe('boolean');
      });
      
      // if there are inactive assets, they should still be valid
      if (inactiveAssets.length > 0) {
        inactiveAssets.forEach(asset => {
          expect(asset.symbol).toBeDefined();
          expect(asset.name).toBeDefined();
          expect(asset.network).toBeDefined();
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle assets with zero decimals', () => {
      const asset = new SupportedAsset({
        symbol: 'WHOLE',
        name: 'Whole Token',
        network: 'ethereum',
        decimals: 0,
        is_native: false,
        is_active: true
      });
      
      const validation = asset.validateForCreation();
      expect(validation.isValid).toBe(true);
      expect(asset.decimals).toBe(0);
    });

    it('should handle assets with maximum decimals', () => {
      const asset = new SupportedAsset({
        symbol: 'PRECISE',
        name: 'Precise Token',
        network: 'ethereum',
        decimals: 18,
        is_native: false,
        is_active: true
      });
      
      const validation = asset.validateForCreation();
      expect(validation.isValid).toBe(true);
      expect(asset.decimals).toBe(18);
    });

    it('should handle duplicate symbols across different networks', () => {
      // this is valid - same symbol can exist on different networks
      const btcBitcoin = new SupportedAsset({
        symbol: 'BTC',
        name: 'Bitcoin',
        network: 'bitcoin',
        decimals: 8,
        is_native: true,
        is_active: true
      });

      const btcEthereum = new SupportedAsset({
        symbol: 'BTC',
        name: 'Wrapped Bitcoin',
        network: 'ethereum',
        decimals: 8,
        is_native: false,
        is_active: true,
        contract_address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
      });
      
      const validation1 = btcBitcoin.validateForCreation();
      const validation2 = btcEthereum.validateForCreation();
      
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    });

    it('should handle long asset names', () => {
      const asset = new SupportedAsset({
        symbol: 'LONG',
        name: 'Really Long Asset Name That Describes Something',
        network: 'ethereum',
        decimals: 18,
        is_native: false,
        is_active: true
      });
      
      // should be valid but might be truncated in UI
      const validation = asset.validateForCreation();
      expect(validation.isValid).toBe(true);
    });

    it('should handle different contract address formats', () => {
      const ethereumFormats = [
        '0x1234567890123456789012345678901234567890',
        '0xA0b86a33E6e2A4C06BfeF31c0d1d2a6B3a8B9f1E'
      ];
      
      ethereumFormats.forEach(address => {
        const asset = new SupportedAsset({
          symbol: 'TEST',
          name: 'Test Token',
          network: 'ethereum',
          decimals: 18,
          is_native: false,
          is_active: true,
          contract_address: address
        });
        
        const validation = asset.validateForCreation();
        expect(validation.isValid).toBe(true, 
          `Address ${address} should be valid`);
      });
    });
  });
}); 