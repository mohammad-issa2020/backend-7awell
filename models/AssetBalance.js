import { supabaseAdmin } from '../database/supabase.js';

/**
 * AssetBalance Model for Supabase
 */
class AssetBalance {
  static table = 'asset_balances';

  /**
   * Create a new asset balance
   * @param {Object} data - Asset balance data
   * @param {string} data.wallet_id - Wallet ID
   * @param {string} data.asset_symbol - Asset symbol (USD, EUR, BTC, etc.)
   * @param {number} data.total - Total balance
   * @param {number} data.available - Available balance
   * @param {number} data.pending - Pending balance
   * @returns {Object} Created asset balance
   */
  static async create(data) {
    try {
      const { data: result, error } = await supabaseAdmin
        .from(this.table)
        .insert([{
          wallet_id: data.wallet_id,
          asset_symbol: data.asset_symbol,
          total: data.total || 0,
          available: data.available || 0,
          pending: data.pending || 0
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating asset balance:', error);
      throw new Error(`Failed to create asset balance: ${error.message}`);
    }
  }

  /**
   * Find asset balance by ID
   * @param {string} id - Asset balance ID
   * @returns {Object|null} Found asset balance or null if not found
   */
  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Return null if no data found, otherwise return first result
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ Error finding asset balance by ID:', error);
      throw new Error(`Failed to find asset balance: ${error.message}`);
    }
  }

  /**
   * Find asset balances by wallet ID
   * @param {string} walletId - Wallet ID
   * @returns {Array} Found asset balances
   */
  static async findByWalletId(walletId) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('wallet_id', walletId)
        .order('asset_symbol', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error finding asset balances by wallet ID:', error);
      throw new Error(`Failed to find asset balances: ${error.message}`);
    }
  }

  /**
   * Find asset balance by wallet ID and asset symbol
   * @param {string} walletId - Wallet ID
   * @param {string} assetSymbol - Asset symbol
   * @returns {Object} Found asset balance
   */
  static async findByWalletAndAsset(walletId, assetSymbol) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('wallet_id', walletId)
        .eq('asset_symbol', assetSymbol)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error finding asset balance:', error);
      throw new Error(`Failed to find asset balance: ${error.message}`);
    }
  }

  /**
   * Update asset balance
   * @param {string} id - Asset balance ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated asset balance
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating asset balance:', error);
      throw new Error(`Failed to update asset balance: ${error.message}`);
    }
  }

  /**
   * Delete asset balance
   * @param {string} id - Asset balance ID
   * @returns {boolean} True if deleted
   */
  static async delete(id) {
    try {
      const { error } = await supabaseAdmin
        .from(this.table)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting asset balance:', error);
      throw new Error(`Failed to delete asset balance: ${error.message}`);
    }
  }

  /**
   * Get total balance for all assets in a wallet
   * @param {string} walletId - Wallet ID
   * @returns {Object} Total balances by asset
   */
  static async getWalletTotals(walletId) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('asset_symbol, total')
        .eq('wallet_id', walletId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const totals = {};
      data.forEach(balance => {
        totals[balance.asset_symbol] = balance.total;
      });

      return totals;
    } catch (error) {
      console.error('❌ Error getting wallet totals:', error);
      throw new Error(`Failed to get wallet totals: ${error.message}`);
    }
  }
}

export default AssetBalance; 