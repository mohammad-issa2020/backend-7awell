import { supabaseAdmin } from '../database/supabase.js';
import crypto from 'crypto';

/**
 * ContactsWithAccounts Model for Supabase
 */
class ContactsWithAccounts {
  static table = 'contacts_with_accounts';

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
   * Sync user contacts with optimized batch processing
   * @param {string} userId - User ID
   * @param {Array} phoneNumbers - Array of phone numbers from user's contacts
   * @param {number} deviceContactsCount - Total contacts on device
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  static async syncContacts(userId, phoneNumbers, deviceContactsCount, options = {}) {
    try {
      // Convert phone numbers to hashes
      const phoneHashes = phoneNumbers.map(phone => this.createPhoneHash(phone));

      // Get optimal batch size
      const optimalBatchSize = await this.getOptimalBatchSize(phoneNumbers.length);
      const batchSize = options.batchSize || optimalBatchSize;

      // Use the optimized database function
      const { data, error } = await supabaseAdmin
        .rpc('sync_user_contacts', {
          p_owner_id: userId,
          p_phone_hashes: phoneHashes,
          p_device_contacts_count: deviceContactsCount,
          p_batch_size: batchSize
        });

      if (error) throw error;

      return {
        total_processed: data.total_processed,
        contacts_inserted: data.contacts_inserted,
        contacts_updated: data.contacts_updated,
        matched_contacts: data.matched_contacts,
        processing_time_ms: data.processing_time_ms,
        batch_size: data.batch_size,
        sync_completed: true
      };
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw new Error(`Failed to sync contacts: ${error.message}`);
    }
  }

  /**
   * Bulk insert contacts using optimized database function
   * @param {Array} contacts - Array of contact objects
   * @param {Object} options - Insert options
   * @returns {Object} Insert result
   */
  static async bulkInsertContacts(contacts, options = {}) {
    try {
      // Get optimal batch size
      const optimalBatchSize = await this.getOptimalBatchSize(contacts.length);
      const batchSize = options.batchSize || optimalBatchSize;

      // Use the optimized database function
      const { data, error } = await supabaseAdmin
        .rpc('bulk_insert_contacts', {
          p_contacts: JSON.stringify(contacts),
          p_batch_size: batchSize
        });

      if (error) throw error;

      return {
        total_processed: data.total_processed,
        contacts_inserted: data.contacts_inserted,
        contacts_updated: data.contacts_updated,
        matched_contacts: data.matched_contacts,
        processing_time_ms: data.processing_time_ms,
        batch_size: data.batch_size
      };
    } catch (error) {
      console.error('Error bulk inserting contacts:', error);
      throw new Error(`Failed to bulk insert contacts: ${error.message}`);
    }
  }

  /**
   * Get optimal batch size for contact operations
   * @param {number} contactCount - Number of contacts to process
   * @param {number} avgContactSizeKb - Average contact size in KB
   * @returns {number} Optimal batch size
   */
  static async getOptimalBatchSize(contactCount, avgContactSizeKb = 0.5) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_optimal_batch_size', {
          p_estimated_contact_count: contactCount,
          p_avg_contact_size_kb: avgContactSizeKb
        });

      if (error) throw error;

      return data || 500; // Default fallback
    } catch (error) {
      console.error('Error getting optimal batch size:', error);
      return 500; // Default fallback
    }
  }

  /**
   * Estimate sync performance
   * @param {number} contactCount - Number of contacts
   * @param {number} batchSize - Optional batch size
   * @returns {Object} Performance estimates
   */
  static async estimateSyncPerformance(contactCount, batchSize = null) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('estimate_sync_performance', {
          p_contact_count: contactCount,
          p_batch_size: batchSize
        });

      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error estimating sync performance:', error);
      throw new Error(`Failed to estimate sync performance: ${error.message}`);
    }
  }

  /**
   * Get contact sync statistics
   * @param {number} days - Number of days to look back
   * @returns {Array} Sync statistics
   */
  static async getSyncStatistics(days = 30) {
    try {
      const { data, error } = await supabaseAdmin
        .from('contact_sync_stats')
        .select('*')
        .gte('sync_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('sync_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      throw new Error(`Failed to get sync statistics: ${error.message}`);
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

  /**
   * Create new contact
   * @param {Object} data - Contact data
   * @returns {Object} Created contact
   */
  static async create(data) {
    try {
      // Validate required fields
      if (!data.owner_id) {
        throw new Error('Missing required field: owner_id');
      }
      if (!data.phone_hash) {
        throw new Error('Missing required field: phone_hash');
      }

      const { data: result, error } = await supabaseAdmin
        .from(this.table)
        .insert([{
          owner_id: data.owner_id,
          phone_hash: data.phone_hash,
          is_favorite: data.is_favorite || false,
          linked_user_id: data.linked_user_id || null
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create contact: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Find contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Object|null} Contact record
   */
  static async findById(contactId) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('id', contactId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find contact: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding contact:', error);
      return null;
    }
  }

  /**
   * Find contacts by owner ID
   * @param {string} ownerId - Owner ID
   * @returns {Array} List of contacts
   */
  static async findByOwnerId(ownerId) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('owner_id', ownerId)
        .order('is_favorite', { ascending: false })
        .order('last_interaction', { ascending: false });

      if (error) {
        throw new Error(`Failed to find contacts: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error finding contacts:', error);
      throw error;
    }
  }

  /**
   * Find contact by owner ID and phone hash
   * @param {string} ownerId - Owner ID
   * @param {string} phoneHash - Phone hash
   * @returns {Object|null} Contact record
   */
  static async findByOwnerAndPhone(ownerId, phoneHash) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .select('*')
        .eq('owner_id', ownerId)
        .eq('phone_hash', phoneHash)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find contact: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding contact:', error);
      return null;
    }
  }

  /**
   * Update contact
   * @param {string} contactId - Contact ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated contact
   */
  static async update(contactId, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.table)
        .update({
          is_favorite: updateData.is_favorite,
          linked_user_id: updateData.linked_user_id,
          last_interaction: updateData.last_interaction || new Date().toISOString()
        })
        .eq('id', contactId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update contact: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete contact
   * @param {string} contactId - Contact ID
   * @returns {boolean} Success status
   */
  static async delete(contactId) {
    try {
      const { error } = await supabaseAdmin
        .from(this.table)
        .delete()
        .eq('id', contactId);

      if (error) {
        throw new Error(`Failed to delete contact: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Add contact using stored procedure
   * @param {string} ownerId - Owner ID
   * @param {string} phoneHash - Phone hash
   * @param {boolean} isFavorite - Whether contact is favorite
   * @param {string} linkedUserId - Linked user ID
   * @returns {string} Contact ID
   */
  static async addContact(ownerId, phoneHash, isFavorite = false, linkedUserId = null) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('add_contact', {
          p_owner_id: ownerId,
          p_phone_hash: phoneHash,
          p_is_favorite: isFavorite,
          p_linked_user_id: linkedUserId
        });

      if (error) {
        throw new Error(`Failed to add contact: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Update contact using stored procedure
   * @param {string} contactId - Contact ID
   * @param {boolean} isFavorite - Whether contact is favorite
   * @param {string} linkedUserId - Linked user ID
   * @returns {boolean} Success status
   */
  static async updateContact(contactId, isFavorite = null, linkedUserId = null) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('update_contact', {
          p_contact_id: contactId,
          p_is_favorite: isFavorite,
          p_linked_user_id: linkedUserId
        });

      if (error) {
        throw new Error(`Failed to update contact: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete contact using stored procedure
   * @param {string} contactId - Contact ID
   * @returns {boolean} Success status
   */
  static async deleteContact(contactId) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('delete_contact', {
          p_contact_id: contactId
        });

      if (error) {
        throw new Error(`Failed to delete contact: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID using stored procedure
   * @param {string} contactId - Contact ID
   * @returns {Object|null} Contact data
   */
  static async getContactById(contactId) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_contact_by_id', {
          p_contact_id: contactId
        });

      if (error) {
        throw new Error(`Failed to get contact: ${error.message}`);
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('❌ Error getting contact:', error);
      throw error;
    }
  }
}

export default ContactsWithAccounts; 