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
   * Sync user contacts with optimized batch processing (secure version)
   * @param {string} userId - User ID
   * @param {Array} phoneHashes - Array of phone hashes from user's contacts
   * @param {number} deviceContactsCount - Total contacts on device
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  static async syncContacts(userId, phoneHashes, deviceContactsCount, options = {}) {
    try {
      const startTime = Date.now();
      
      // Phone hashes are already provided, no need to convert
      // Validate that all hashes are valid SHA-256 format
      const hashRegex = /^[a-f0-9]{64}$/;
      const invalidHashes = phoneHashes.filter(hash => !hashRegex.test(hash));
      if (invalidHashes.length > 0) {
        throw new Error(`Invalid phone hash format: ${invalidHashes.length} hashes are not valid SHA-256`);
      }

      // Get optimal batch size
      const batchSize = options.batchSize || 500;
      
      let totalProcessed = 0;
      let contactsInserted = 0;
      let contactsUpdated = 0;
      let matchedContacts = 0;

      // Process in batches
      for (let i = 0; i < phoneHashes.length; i += batchSize) {
        const batch = phoneHashes.slice(i, i + batchSize);
        
        // Check for existing users with these phone hashes
        const { data: existingUsers, error: userError } = await supabaseAdmin
          .from('phones')
          .select('phone_hash, linked_user_id')
          .in('phone_hash', batch);

        if (userError) throw userError;

        // Create map of phone hash to user ID
        const phoneToUserMap = {};
        existingUsers?.forEach(user => {
          if (user.linked_user_id) {
            phoneToUserMap[user.phone_hash] = user.linked_user_id;
            matchedContacts++;
          }
        });

        // Prepare contact records for batch insert
        const contactRecords = batch.map(phoneHash => ({
          owner_id: userId,
          phone_hash: phoneHash,
          is_favorite: false,
          linked_user_id: phoneToUserMap[phoneHash] || null
        }));

        // Insert/update contacts using upsert
        const { data: upsertResult, error: upsertError } = await supabaseAdmin
          .from('contacts_with_accounts')
          .upsert(contactRecords, {
            onConflict: 'owner_id,phone_hash',
            ignoreDuplicates: false
          })
          .select('*');

        if (upsertError) throw upsertError;

        // For simplicity, count all as inserted (in reality, some might be updates)
        contactsInserted += batch.length;
        totalProcessed += batch.length;
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      return {
        total_processed: totalProcessed,
        contacts_inserted: contactsInserted,
        contacts_updated: contactsUpdated,
        matched_contacts: matchedContacts,
        processing_time_ms: processingTime,
        batch_size: batchSize,
        sync_completed: true
      };
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw new Error(`Failed to sync contacts: ${error.message}`);
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

      let query = supabaseAdmin
        .from('contacts_with_accounts')
        .select(`
          id,
          phone_hash,
          linked_user_id,
          is_favorite,
          last_interaction,
          created_at,
          users!linked_user_id (
            id,
            phone,
            email,
            user_profiles (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('owner_id', userId);

      // Apply favorites filter if requested
      if (favoritesOnly) {
        query = query.eq('is_favorite', true);
      }

      // Apply pagination and ordering
      query = query
        .range(offset, offset + limit - 1)
        .order('is_favorite', { ascending: false })
        .order('last_interaction', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = (data || []).map(contact => ({
        contact_id: contact.id,
        linked_user_id: contact.linked_user_id,
        linked_user_phone: contact.users?.phone,
        linked_user_email: contact.users?.email,
        linked_user_first_name: contact.users?.user_profiles?.first_name,
        linked_user_last_name: contact.users?.user_profiles?.last_name,
        linked_user_avatar: contact.users?.user_profiles?.avatar_url,
        is_favorite: contact.is_favorite,
        last_interaction: contact.last_interaction,
        contact_created_at: contact.created_at,
        phone_hash: contact.phone_hash
      }));

      return transformedData;
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
      // First, get the current contact to check ownership and current favorite status
      const { data: contact, error: fetchError } = await supabaseAdmin
        .from('contacts_with_accounts')
        .select('is_favorite')
        .eq('id', contactId)
        .eq('owner_id', userId)
        .single();

      if (fetchError || !contact) {
        return {
          success: false,
          message: 'Contact not found or does not belong to user'
        };
      }

      // Toggle the favorite status
      const newFavoriteStatus = !contact.is_favorite;
      
      const { data: updatedContact, error: updateError } = await supabaseAdmin
        .from('contacts_with_accounts')
        .update({ 
          is_favorite: newFavoriteStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .eq('owner_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        isFavorite: newFavoriteStatus,
        contactId: contactId,
        message: 'Favorite status toggled successfully'
      };
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error(`Failed to toggle favorite: ${error.message}`);
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
        .from('contacts_with_accounts')
        .select(`
          id,
          phone_hash,
          linked_user_id,
          is_favorite,
          last_interaction,
          created_at,
          users!linked_user_id (
            id,
            phone,
            email,
            user_profiles (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('owner_id', userId)
        .eq('is_favorite', true)
        .order('last_interaction', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match expected format for favorites
      const transformedData = (data || []).map(contact => ({
        id: contact.id,
        linked_user_id: contact.linked_user_id,
        phone: contact.users?.phone,
        email: contact.users?.email,
        first_name: contact.users?.user_profiles?.first_name,
        last_name: contact.users?.user_profiles?.last_name,
        avatar: contact.users?.user_profiles?.avatar_url,
        last_interaction: contact.last_interaction,
        created_at: contact.created_at,
        phone_hash: contact.phone_hash
      }));

      return transformedData;
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
            phone,
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
          users.phone.ilike.%${searchTerm}%,
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