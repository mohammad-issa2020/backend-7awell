import { supabaseAdmin } from '../database/supabase.js';
import { decryptWalletAddress } from '../utils/encryption.js';

/**
 * Decrypts wallet address(es) in the data returned from Supabase.
 * @param {Object|Array|null} data - The data from the database.
 * @returns {Object|Array|null} - The data with decrypted wallet addresses.
 */
function decryptWalletData(data) {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(wallet => ({
      ...wallet,
      wallet_address: decryptWalletAddress(wallet.wallet_address),
    }));
  }

  return {
    ...data,
    wallet_address: decryptWalletAddress(data.wallet_address),
  };
}

class Wallet {

  static async create(walletData) {
    try {
      const {
        userId,
        walletAddress, // This is now the ENCRYPTED address
        walletType = 'custodial'
      } = walletData;

      const { data, error } = await supabaseAdmin
        .from('wallets')
        .insert([{
          user_id: userId,
          wallet_address: walletAddress, // Store the encrypted address directly
          wallet_type: walletType,
          status: 'active',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return decryptWalletData(data);
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }


  static async findById(walletId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select(`
          *,
          users!inner(
            id,
            phone_number,
            email,
            first_name,
            last_name
          )
        `)
        .eq('id', walletId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return decryptWalletData(data);
    } catch (error) {
      console.error('❌ Error finding wallet by ID:', error);
      throw new Error(`Failed to find wallet: ${error.message}`);
    }
  }

  static async findByAddress(address) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select(`
          *,
          users!inner(
            id,
            phone_number,
            email,
            first_name,
            last_name
          )
        `)
        .eq('wallet_address', address) // Search by the encrypted address
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return decryptWalletData(data);
    } catch (error) {
      console.error('❌ Error finding wallet by address:', error);
      throw new Error(`Failed to find wallet: ${error.message}`);
    }
  }


  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return decryptWalletData(data);
    } catch (error) {
      console.error('❌ Error finding wallets by user ID:', error);
      throw new Error(`Failed to find wallets: ${error.message}`);
    }
  }

  static async getPrimaryWallet(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return decryptWalletData(data);
    } catch (error) {
      console.error('❌ Error getting primary wallet:', error);
      return null;
    }
  }


  static async update(walletId, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .update(updateData)
        .eq('id', walletId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating wallet:', error);
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
  }

  static async deactivate(walletId) {
    try {
      const { error } = await supabaseAdmin
        .from('wallets')
        .update({ status: 'frozen' })
        .eq('id', walletId);

      if (error) {
        console.error('❌ Error deactivating wallet:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error deactivating wallet:', error);
      return false;
    }
  }


  static async findByType(walletType, limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select(`
          *,
          users!inner(
            id,
            phone_number,
            email,
            first_name,
            last_name
          )
        `)
        .eq('wallet_type', walletType)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error finding wallets by type:', error);
      throw new Error(`Failed to find wallets: ${error.message}`);
    }
  }


  static async getStatistics() {
    try {
      const { count: totalActiveWallets } = await supabaseAdmin
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: typeStats } = await supabaseAdmin
        .from('wallets')
        .select('wallet_type')
        .eq('status', 'active');

      const types = {};
      typeStats?.forEach(wallet => {
        types[wallet.wallet_type] = (types[wallet.wallet_type] || 0) + 1;
      });

      return {
        totalActiveWallets: totalActiveWallets || 0,
        typeDistribution: types,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting wallet statistics:', error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  static async userHasWallet(userId) {
    try {
      const { data } = await supabaseAdmin
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Error checking wallet existence:', error);
      return false;
    }
  }
}

export default Wallet; 