import { supabaseAdmin } from '../database/supabase.js';

/**
 * TransactionDetail Model for Supabase
 */
class TransactionDetail {
  /**
   * Create new transaction details
   * @param {Object} detailData - Transaction detail data
   * @returns {Object} Created transaction detail
   */
  static async create(detailData) {
    try {
      // Validate required fields
      if (!detailData.transaction_id) {
        throw new Error('Missing required field: transaction_id');
      }
      if (!detailData.network) {
        throw new Error('Missing required field: network');
      }

      const { data, error } = await supabaseAdmin
        .from('transaction_details')
        .insert([{
          transaction_id: detailData.transaction_id,
          network: detailData.network,
          tx_hash: detailData.tx_hash,
          confirmations: detailData.confirmations || 0,
          block_number: detailData.block_number,
          gas_fee: detailData.gas_fee,
          error_message: detailData.error_message,
          raw_response: detailData.raw_response
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create transaction detail: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating transaction detail:', error);
      throw error;
    }
  }

  /**
   * Find transaction detail by transaction ID
   * @param {string} transactionId - Transaction ID
   * @returns {Object|null} Transaction detail data
   */
  static async findByTransactionId(transactionId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('transaction_details')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find transaction detail: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding transaction detail:', error);
      return null;
    }
  }

  /**
   * Find transaction detail by transaction hash
   * @param {string} txHash - Transaction hash
   * @returns {Object|null} Transaction detail data
   */
  static async findByTxHash(txHash) {
    try {
      const { data, error } = await supabaseAdmin
        .from('transaction_details')
        .select('*')
        .eq('tx_hash', txHash)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find transaction detail: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding transaction detail:', error);
      return null;
    }
  }

  /**
   * Update transaction detail
   * @param {string} transactionId - Transaction ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated transaction detail
   */
  static async update(transactionId, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('transaction_details')
        .update({
          network: updateData.network,
          tx_hash: updateData.tx_hash,
          confirmations: updateData.confirmations,
          block_number: updateData.block_number,
          gas_fee: updateData.gas_fee,
          error_message: updateData.error_message,
          raw_response: updateData.raw_response
        })
        .eq('transaction_id', transactionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transaction detail: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating transaction detail:', error);
      throw error;
    }
  }

  /**
   * Delete transaction detail
   * @param {string} transactionId - Transaction ID
   * @returns {boolean} Success status
   */
  static async delete(transactionId) {
    try {
      const { error } = await supabaseAdmin
        .from('transaction_details')
        .delete()
        .eq('transaction_id', transactionId);

      if (error) {
        throw new Error(`Failed to delete transaction detail: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting transaction detail:', error);
      throw error;
    }
  }

  /**
   * Get transaction details with minimum confirmations
   * @param {number} minConfirmations - Minimum number of confirmations
   * @returns {Array} List of transaction details
   */
  static async getWithConfirmations(minConfirmations = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_transaction_details_with_confirmations', {
          p_min_confirmations: minConfirmations
        });

      if (error) {
        throw new Error(`Failed to get transaction details: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting transaction details:', error);
      throw error;
    }
  }
}

export default TransactionDetail; 