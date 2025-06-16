import { supabaseAdmin } from '../database/supabase.js';

/**
 * Phone Model for Supabase
 */
class Phone {
  static table = 'phones';

  /**
   * Create new phone record
   * @param {Object} data - Phone data
   * @returns {Object} Created phone record
   */
  static async create(data) {
    try {
      // Validate required fields
      if (!data.phone_hash) {
        throw new Error('Missing required field: phone_hash');
      }
      if (!data.linked_user_id) {
        throw new Error('Missing required field: linked_user_id');
      }

      const { data: result, error } = await supabaseAdmin
        .from(this.table)
        .insert([{
          phone_hash: data.phone_hash,
          linked_user_id: data.linked_user_id
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create phone record: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating phone record:', error);
      throw error;
    }
  }

  /**
   * Find phone by hash
   * @param {string} phoneHash - Phone hash
   * @returns {Object|null} Phone record
   */
  static async findByHash(phoneHash) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('phone_hash', phoneHash)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find phone record: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding phone record:', error);
      return null;
    }
  }

  /**
   * Find phones by user ID
   * @param {string} userId - User ID
   * @returns {Array} List of phone records
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('linked_user_id', userId);

      if (error) {
        throw new Error(`Failed to find phone records: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error finding phone records:', error);
      throw error;
    }
  }

  /**
   * Update phone record
   * @param {string} phoneHash - Phone hash
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated phone record
   */
  static async update(phoneHash, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .update({
          linked_user_id: updateData.linked_user_id
        })
        .eq('phone_hash', phoneHash)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update phone record: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating phone record:', error);
      throw error;
    }
  }

  /**
   * Delete phone record
   * @param {string} phoneHash - Phone hash
   * @returns {boolean} Success status
   */
  static async delete(phoneHash) {
    try {
      const { error } = await supabaseAdmin
        .from(this.table)
        .delete()
        .eq('phone_hash', phoneHash);

      if (error) {
        throw new Error(`Failed to delete phone record: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting phone record:', error);
      throw error;
    }
  }

  /**
   * Link phone to user
   * @param {string} phoneHash - Phone hash
   * @param {string} userId - User ID
   * @returns {Object} Updated phone record
   */
  static async linkToUser(phoneHash, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('link_phone_to_user', {
          p_phone_hash: phoneHash,
          p_user_id: userId
        });

      if (error) {
        throw new Error(`Failed to link phone to user: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error linking phone to user:', error);
      throw error;
    }
  }

  /**
   * Unlink phone from user
   * @param {string} phoneHash - Phone hash
   * @returns {boolean} Success status
   */
  static async unlinkFromUser(phoneHash) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('unlink_phone_from_user', {
          p_phone_hash: phoneHash
        });

      if (error) {
        throw new Error(`Failed to unlink phone from user: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error unlinking phone from user:', error);
      throw error;
    }
  }

  /**
   * Get user by phone hash
   * @param {string} phoneHash - Phone hash
   * @returns {Object|null} User data
   */
  static async getUserByHash(phoneHash) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_user_by_phone_hash', {
          p_phone_hash: phoneHash
        });

      if (error) {
        throw new Error(`Failed to get user by phone hash: ${error.message}`);
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ Error getting user by phone hash:', error);
      throw error;
    }
  }
}

export default Phone; 