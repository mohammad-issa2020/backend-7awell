const { supabaseAdmin } = require('../database/supabase');
const crypto = require('crypto');

class Contact {
  /**
   * Create phone hash for privacy
   * @param {string} phoneNumber - Phone number to hash
   * @returns {string} SHA-256 hash
   */
  static createPhoneHash(phoneNumber) {
    // Remove all non-digit characters and normalize
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    return crypto.createHash('sha256').update(normalizedPhone).digest('hex');
  }

  /**
   * Create or update phone mapping
   * @param {string} phoneNumber - User's phone number
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  static async createPhoneMapping(phoneNumber, userId) {
    try {
      const phoneHash = this.createPhoneHash(phoneNumber);
      
      const { data, error } = await supabaseAdmin
        .rpc('create_phone_mapping', {
          p_phone_hash: phoneHash,
          p_user_id: userId
        });

      if (error) throw error;

      return {
        success: true,
        phoneHash,
        message: 'Phone mapping created successfully'
      };
    } catch (error) {
      console.error('Error creating phone mapping:', error);
      throw new Error(`Failed to create phone mapping: ${error.message}`);
    }
  }

  /**
   * Sync user contacts
   * @param {string} userId - User ID
   * @param {Array} phoneNumbers - Array of phone numbers from user's contacts
   * @param {number} deviceContactsCount - Total contacts on device
   * @returns {Object} Sync result
   */
  static async syncContacts(userId, phoneNumbers, deviceContactsCount) {
    try {
      // Convert phone numbers to hashes
      const phoneHashes = phoneNumbers.map(phone => this.createPhoneHash(phone));

      const { data, error } = await supabaseAdmin
        .rpc('sync_user_contacts', {
          p_owner_id: userId,
          p_phone_hashes: phoneHashes,
          p_device_contacts_count: deviceContactsCount
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw new Error(`Failed to sync contacts: ${error.message}`);
    }
  }

  /**
   * Get user contacts
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} User contacts
   */
  static async getUserContacts(userId, options = {}) {
    try {
      const {
        favoritesOnly = false,
        limit = 50,
        offset = 0
      } = options;

      const { data, error } = await supabaseAdmin
        .rpc('get_user_contacts', {
          p_user_id: userId,
          p_favorites_only: favoritesOnly,
          p_limit: limit,
          p_offset: offset
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting user contacts:', error);
      throw new Error(`Failed to get user contacts: ${error.message}`);
    }
  }

  /**
   * Toggle contact favorite status
   * @param {string} userId - User ID
   * @param {string} contactId - Contact ID
   * @returns {Object} Result
   */
  static async toggleFavorite(userId, contactId) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('toggle_contact_favorite', {
          p_owner_id: userId,
          p_contact_id: contactId
        });

      if (error) throw error;

      return {
        success: data,
        message: data ? 'Favorite status toggled successfully' : 'Contact not found'
      };
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error(`Failed to toggle favorite: ${error.message}`);
    }
  }

  /**
   * Update contact interaction
   * @param {string} userId - User ID
   * @param {string} phoneNumber - Contact phone number
   * @returns {Object} Result
   */
  static async updateInteraction(userId, phoneNumber) {
    try {
      const phoneHash = this.createPhoneHash(phoneNumber);

      const { data, error } = await supabaseAdmin
        .rpc('update_contact_interaction', {
          p_owner_id: userId,
          p_phone_hash: phoneHash
        });

      if (error) throw error;

      return {
        success: data,
        message: data ? 'Interaction updated successfully' : 'Contact not found'
      };
    } catch (error) {
      console.error('Error updating interaction:', error);
      throw new Error(`Failed to update interaction: ${error.message}`);
    }
  }

  /**
   * Get contact sync status
   * @param {string} userId - User ID
   * @returns {Object} Sync status
   */
  static async getSyncStatus(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_contact_sync_status', {
          p_user_id: userId
        });

      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw new Error(`Failed to get sync status: ${error.message}`);
    }
  }

  /**
   * Get favorite contacts view
   * @param {string} userId - User ID
   * @returns {Array} Favorite contacts
   */
  static async getFavoriteContacts(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_favorite_contacts')
        .select('*')
        .eq('owner_id', userId)
        .order('last_interaction', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting favorite contacts:', error);
      throw new Error(`Failed to get favorite contacts: ${error.message}`);
    }
  }

  /**
   * Search contacts
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Array} Matching contacts
   */
  static async searchContacts(userId, searchTerm, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      // Search in first name, last name, email, and phone
      const { data, error } = await supabaseAdmin
        .from('contacts_with_accounts')
        .select(`
          id,
          phone_hash,
          linked_user_id,
          is_favorite,
          last_interaction,
          created_at,
          users!linked_user_id (
            phone_number,
            email,
            user_profiles (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('owner_id', userId)
        .not('linked_user_id', 'is', null)
        .or(`
          users.email.ilike.%${searchTerm}%,
          users.phone_number.ilike.%${searchTerm}%,
          users.user_profiles.first_name.ilike.%${searchTerm}%,
          users.user_profiles.last_name.ilike.%${searchTerm}%
        `)
        .range(offset, offset + limit - 1)
        .order('is_favorite', { ascending: false })
        .order('last_interaction', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw new Error(`Failed to search contacts: ${error.message}`);
    }
  }
}

module.exports = Contact; 