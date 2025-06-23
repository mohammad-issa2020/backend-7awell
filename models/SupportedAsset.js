import { supabase } from '../database/supabase.js';

class SupportedAsset {
  constructor(data = {}) {
    // Set properties with defaults
    this.id = data.id || null; // Include id for database rows
    this.symbol = data.symbol ? data.symbol.toUpperCase() : null;
    this.name = data.name ? data.name.trim() : null;
    this.decimals = data.decimals !== undefined ? data.decimals : 18;
    this.network = data.network ? data.network.toLowerCase() : null;
    this.contract_address = data.contract_address || null;
    this.is_native = data.is_native !== undefined ? data.is_native : false;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.icon_url = data.icon_url || null;
    this.min_amount = data.min_amount || null;
    this.max_amount = data.max_amount || null;
    this.asset_type = data.asset_type || 'token';
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  /**
   * Validate asset data for creation
   */
  validateForCreation() {
    const errors = [];

    // Required fields
    if (!this.symbol) {
      errors.push('Symbol is required');
    } else if (!/^[A-Z]+$/.test(this.symbol)) {
      errors.push('Symbol must be uppercase letters only');
    }

    if (!this.name) {
      errors.push('Name is required');
    }

    if (!this.network) {
      errors.push('Network is required');
    }

    // Decimals validation
    if (this.decimals < 0 || this.decimals > 18) {
      errors.push('Decimals must be between 0 and 18');
    }

    // Contract address validation for non-native tokens
    if (!this.is_native && this.contract_address && this.contract_address !== null) {
      if (!this.isValidContractAddress(this.contract_address)) {
        errors.push('Invalid contract address format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate asset data for updates
   */
  validateForUpdate() {
    return this.validateForCreation(); // Same validation rules for updates
  }

  /**
   * Check if contract address format is valid
   */
  isValidContractAddress(address) {
    // Basic validation for different network address formats
    if (!address || address === null) return true; // null is allowed
    
    // Ethereum-style addresses (0x followed by 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return true;
    
    // Bitcoin-style addresses (26-35 alphanumeric chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{26,35}$/.test(address)) return true;
    
    // Solana-style addresses (32-44 base58 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return true;
    
    return false;
  }

  /**
   * Update asset properties
   */
  update(updateData) {
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        this[key] = updateData[key];
      }
    });
    this.updated_at = new Date().toISOString();
    return this;
  }

  /**
   * Transform to create data for database insert
   */
  toCreateData() {
    return {
      symbol: this.symbol ? this.symbol.toUpperCase() : null,
      name: this.name ? this.name.trim() : null,
      decimals: this.decimals,
      network: this.network ? this.network.toLowerCase() : null,
      contract_address: this.contract_address,
      is_native: this.is_native,
      is_active: this.is_active,
      icon_url: this.icon_url,
      min_amount: this.min_amount,
      max_amount: this.max_amount,
      asset_type: this.asset_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Transform to update data for database update
   */
  toUpdateData() {
    return {
      symbol: this.symbol ? this.symbol.toUpperCase() : null,
      name: this.name ? this.name.trim() : null,
      decimals: this.decimals,
      network: this.network ? this.network.toLowerCase() : null,
      contract_address: this.contract_address,
      is_native: this.is_native,
      is_active: this.is_active,
      icon_url: this.icon_url,
      min_amount: this.min_amount,
      max_amount: this.max_amount,
      asset_type: this.asset_type,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Create SupportedAsset instance from database row
   */
  static fromDatabase(dbRow) {
    return new SupportedAsset(dbRow);
  }

  /**
   * Create array of SupportedAsset instances from database rows
   */
  static fromDatabaseArray(dbRows) {
    return dbRows.map(row => new SupportedAsset(row));
  }

  // Static database methods
  static async create(data) {
    try {
      const { data: asset, error } = await supabase
        .from('supported_assets')
        .insert([{
          symbol: data.symbol.toUpperCase(),
          name: data.name,
          asset_type: data.asset_type,
          decimals: data.decimals || 2,
          min_amount: data.min_amount,
          max_amount: data.max_amount,
          is_active: data.is_active ?? true,
          network: data.network,
          contract_address: data.contract_address
        }])
        .select()
        .single();

      if (error) throw error;
      return asset;
    } catch (error) {
      console.error('❌ Error creating supported asset:', error);
      throw new Error(`Failed to create supported asset: ${error.message}`);
    }
  }

  static async findById(symbol) {
    try {
      const { data: asset, error } = await supabase
        .from('supported_assets')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (error) throw error;
      return asset;
    } catch (error) {
      console.error('❌ Error finding supported asset:', error);
      throw new Error(`Failed to find supported asset: ${error.message}`);
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = supabase
        .from('supported_assets')
        .select('*');

      // Apply filters
      if (filters.asset_type) {
        query = query.eq('asset_type', filters.asset_type);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.network) {
        query = query.eq('network', filters.network);
      }

      const { data: assets, error } = await query;

      if (error) throw error;
      return assets;
    } catch (error) {
      console.error('❌ Error finding supported assets:', error);
      throw new Error(`Failed to find supported assets: ${error.message}`);
    }
  }

  static async update(symbol, updates) {
    try {
      const { data: asset, error } = await supabase
        .from('supported_assets')
        .update({
          name: updates.name,
          asset_type: updates.asset_type,
          decimals: updates.decimals,
          min_amount: updates.min_amount,
          max_amount: updates.max_amount,
          is_active: updates.is_active,
          network: updates.network,
          contract_address: updates.contract_address
        })
        .eq('symbol', symbol.toUpperCase())
        .select()
        .single();

      if (error) throw error;
      return asset;
    } catch (error) {
      console.error('❌ Error updating supported asset:', error);
      throw new Error(`Failed to update supported asset: ${error.message}`);
    }
  }

  static async delete(symbol) {
    try {
      const { error } = await supabase
        .from('supported_assets')
        .delete()
        .eq('symbol', symbol.toUpperCase());

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting supported asset:', error);
      throw new Error(`Failed to delete supported asset: ${error.message}`);
    }
  }
}

export default SupportedAsset; 