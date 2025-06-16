import { supabase } from '../database/supabase.js';

class SupportedAsset {
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