import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SupportedAsset from '../../models/SupportedAsset.js';

describe('SupportedAsset Model', () => {
  let testAsset;

  // Clean up before each test
  beforeEach(async () => {
    // Delete any existing test assets
    try {
      await SupportedAsset.delete('TEST');
      await SupportedAsset.delete('NEW');
    } catch (error) {
      // Ignore error if asset doesn't exist
    }

    // Create a test asset
    testAsset = await SupportedAsset.create({
      symbol: 'TEST',
      name: 'Test Asset',
      asset_type: 'crypto',
      decimals: 8,
      min_amount: 0.00000001,
      max_amount: 1000.00000000,
      network: 'Test Network',
      contract_address: '0x1234567890abcdef'
    });
  });

  // Clean up after each test
  afterEach(async () => {
    if (testAsset && testAsset.symbol) {
      try {
        await SupportedAsset.delete(testAsset.symbol);
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    }
  });

  describe('Create', () => {
    it('should create a new supported asset successfully', async () => {
      // Delete NEW asset if it exists
      try {
        await SupportedAsset.delete('NEW');
      } catch (error) {
        // Ignore error if asset doesn't exist
      }

      const asset = await SupportedAsset.create({
        symbol: 'NEW',
        name: 'New Asset',
        asset_type: 'fiat',
        decimals: 2,
        min_amount: 0.01,
        max_amount: 1000000.00
      });

      expect(asset).toBeDefined();
      expect(asset.symbol).toBe('NEW');
      expect(asset.name).toBe('New Asset');
      expect(asset.asset_type).toBe('fiat');
      expect(asset.decimals).toBe(2);
      expect(asset.min_amount).toBe(0.01);
      expect(asset.max_amount).toBe(1000000.00);
      expect(asset.is_active).toBe(true);

      // Clean up
      await SupportedAsset.delete(asset.symbol);
    });

    it('should not create asset with duplicate symbol', async () => {
      await expect(SupportedAsset.create({
        symbol: 'TEST', // Duplicate symbol
        name: 'Another Test Asset',
        asset_type: 'crypto'
      })).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      await expect(SupportedAsset.create({
        symbol: 'MISSING',
        // Missing required fields
      })).rejects.toThrow();
    });

    it('should validate asset type enum', async () => {
      await expect(SupportedAsset.create({
        symbol: 'INVALID',
        name: 'Invalid Asset',
        asset_type: 'invalid_type' // Invalid enum value
      })).rejects.toThrow();
    });
  });

  describe('Read', () => {
    it('should find asset by symbol', async () => {
      const foundAsset = await SupportedAsset.findById(testAsset.symbol);
      expect(foundAsset).toBeDefined();
      expect(foundAsset.symbol).toBe(testAsset.symbol);
      expect(foundAsset.name).toBe(testAsset.name);
      expect(foundAsset.asset_type).toBe(testAsset.asset_type);
    });

    it('should find all assets with filters', async () => {
      const cryptoAssets = await SupportedAsset.findAll({ asset_type: 'crypto' });
      expect(Array.isArray(cryptoAssets)).toBe(true);
      expect(cryptoAssets.length).toBeGreaterThan(0);
      expect(cryptoAssets[0].asset_type).toBe('crypto');

      const activeAssets = await SupportedAsset.findAll({ is_active: true });
      expect(Array.isArray(activeAssets)).toBe(true);
      expect(activeAssets.length).toBeGreaterThan(0);
      expect(activeAssets[0].is_active).toBe(true);
    });
  });

  describe('Update', () => {
    it('should update asset successfully', async () => {
      const updates = {
        name: 'Updated Test Asset',
        decimals: 6,
        min_amount: 0.000001,
        max_amount: 1000000.000000
      };

      const updatedAsset = await SupportedAsset.update(testAsset.symbol, updates);
      expect(updatedAsset.name).toBe(updates.name);
      expect(updatedAsset.decimals).toBe(updates.decimals);
      expect(updatedAsset.min_amount).toBe(updates.min_amount);
      expect(updatedAsset.max_amount).toBe(updates.max_amount);
    });

    

    it('should validate asset type enum on update', async () => {
      // First verify the asset exists
      const asset = await SupportedAsset.findById(testAsset.symbol);
      expect(asset).toBeDefined();

      await expect(SupportedAsset.update(testAsset.symbol, {
        asset_type: 'invalid_type'
      })).rejects.toThrow();
    });
  });

  describe('Delete', () => {
    it('should delete asset successfully', async () => {
      // First verify the asset exists
      const asset = await SupportedAsset.findById(testAsset.symbol);
      expect(asset).toBeDefined();

      const result = await SupportedAsset.delete(testAsset.symbol);
      expect(result).toBe(true);

      // Verify asset is deleted
      await expect(SupportedAsset.findById(testAsset.symbol)).rejects.toThrow();
    });
  });
}); 