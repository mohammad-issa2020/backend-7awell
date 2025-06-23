import ContactsWithAccounts from '../models/ContactsWithAccounts.js';
import BaseResponse from '../utils/baseResponse.js';
import { logUserActivity } from '../services/activityService.js';

class ContactController {
  /**
   * Sync user contacts with secure hashed phone numbers
   * POST /contacts/sync
   */
  async syncContacts(req, res) {
    try {
      const { contactHashes, deviceContactsCount, hashingMethod, timestamp, batchSize } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!Array.isArray(contactHashes)) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'contactHashes must be an array',
          'INVALID_CONTACT_HASHES'
        );
      }

      if (!deviceContactsCount || deviceContactsCount < 0) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'deviceContactsCount must be a positive number',
          'INVALID_DEVICE_COUNT'
        );
      }

      // Validate hashing method
      if (hashingMethod !== 'SHA256') {
        return BaseResponse.error(
          res,
          'Invalid hashing method',
          400,
          'Only SHA256 hashing method is supported',
          'INVALID_HASHING_METHOD'
        );
      }

      // Validate timestamp
      if (!timestamp || isNaN(Date.parse(timestamp))) {
        return BaseResponse.error(
          res,
          'Invalid timestamp',
          400,
          'Valid ISO datetime string required',
          'INVALID_TIMESTAMP'
        );
      }

      // Validate contact hashes format
      const hashRegex = /^[a-f0-9]{64}$/;
      const invalidHashes = contactHashes.filter(hash => !hashRegex.test(hash.phoneHash));
      if (invalidHashes.length > 0) {
        return BaseResponse.error(
          res,
          'Invalid hash format',
          400,
          'Phone hashes must be 64-character lowercase hex strings',
          'INVALID_HASH_FORMAT'
        );
      }

      // Validate array size
      if (contactHashes.length > 10000) {
        return BaseResponse.error(
          res,
          'Too many contacts',
          400,
          'Maximum 10,000 contacts allowed per sync',
          'CONTACTS_LIMIT_EXCEEDED'
        );
      }

      // Extract phone hashes from the contact hashes array
      const phoneHashes = contactHashes.map(contact => contact.phoneHash);

      // Estimate performance before sync
      const performanceEstimate = await ContactsWithAccounts.estimateSyncPerformance(
        phoneHashes.length,
        batchSize
      );

      const result = await ContactsWithAccounts.syncContacts(
        userId, 
        phoneHashes, 
        deviceContactsCount,
        { batchSize }
      );

      // Log the sync activity with performance metrics
      await logUserActivity(
        userId,
        'Contact sync completed (secure)',
        'contact',
        {
          device_contacts: deviceContactsCount,
          matched_contacts: result.matched_contacts,
          total_processed: result.total_processed,
          contacts_inserted: result.contacts_inserted,
          contacts_updated: result.contacts_updated,
          processing_time_ms: result.processing_time_ms,
          batch_size: result.batch_size,
          hashing_method: hashingMethod,
          estimated_time_seconds: performanceEstimate?.estimated_time_seconds,
          actual_vs_estimated: performanceEstimate?.estimated_time_seconds ? 
            (result.processing_time_ms / 1000) / performanceEstimate.estimated_time_seconds : null
        }
      );

      return BaseResponse.success(
        res,
        {
          ...result,
          performance_estimate: performanceEstimate,
          security_info: {
            hashing_method: hashingMethod,
            hashes_processed: phoneHashes.length,
            timestamp: timestamp
          }
        },
        'Contacts synced successfully using secure hashing'
      );
    } catch (error) {
      console.error('Contact sync error:', error);
      return BaseResponse.error(
        res,
        'Failed to sync contacts',
        500,
        error.message,
        'CONTACT_SYNC_FAILED'
      );
    }
  }

  /**
   * Get user contacts
   * GET /contacts
   */
  async getContacts(req, res) {
    try {
      const userId = req.user.id;
      const { 
        favorites = 'false', 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const options = {
        favoritesOnly: favorites === 'true',
        limit: Math.min(parseInt(limit) || 50, 100), // Max 100 per request
        offset: parseInt(offset) || 0
      };

      const rawContacts = await ContactsWithAccounts.getUserContacts(userId, options);

      // Format the response to be more user-friendly
      const contacts = rawContacts.map(contact => ({
        id: contact.contact_id,
        // Friend's information (what the user wants to see)
        friend: {
          id: contact.linked_user_id,
          phoneNumber: contact.linked_user_phone,
          email: contact.linked_user_email,
          firstName: contact.linked_user_first_name,
          lastName: contact.linked_user_last_name,
          fullName: [contact.linked_user_first_name, contact.linked_user_last_name]
            .filter(Boolean).join(' ') || 'Unknown Contact',
          avatar: contact.linked_user_avatar
        },
        // Contact relationship data
        isFavorite: contact.is_favorite,
        lastInteraction: contact.last_interaction,
        addedAt: contact.contact_created_at,
        // Internal data (for API operations) - can be removed if not needed
        _internal: {
          phoneHash: contact.phone_hash // Hidden from main view but available if needed
        }
      }));

      return BaseResponse.success(
        res,
        {
          contacts,
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: contacts.length === options.limit
          }
        },
        'Contacts retrieved successfully'
      );
    } catch (error) {
      console.error('Get contacts error:', error);
      return BaseResponse.error(
        res,
        'Failed to get contacts',
        500,
        error.message,
        'GET_CONTACTS_FAILED'
      );
    }
  }

  /**
   * Get favorite contacts
   * GET /contacts/favorites
   */
  async getFavoriteContacts(req, res) {
    try {
      const userId = req.user.id;

      const rawFavorites = await ContactsWithAccounts.getFavoriteContacts(userId);

      // Format the response consistently
      const contacts = rawFavorites.map(contact => ({
        id: contact.id,
        // Friend's information (what the user wants to see)
        friend: {
          id: contact.linked_user_id,
          phoneNumber: contact.phone,
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name,
          fullName: [contact.first_name, contact.last_name]
            .filter(Boolean).join(' ') || 'Unknown Contact',
          avatar: contact.avatar
        },
        // Contact relationship data
        isFavorite: true, // All are favorites in this endpoint
        lastInteraction: contact.last_interaction,
        addedAt: contact.created_at,
        // Internal data (for API operations)
        _internal: {
          phoneHash: contact.phone_hash
        }
      }));

      return BaseResponse.success(
        res,
        { contacts },
        'Favorite contacts retrieved successfully'
      );
    } catch (error) {
      console.error('Get favorite contacts error:', error);
      return BaseResponse.error(
        res,
        'Failed to get favorite contacts',
        500,
        error.message,
        'GET_FAVORITES_FAILED'
      );
    }
  }

  /**
   * Toggle contact favorite status
   * POST /contacts/:contactId/favorite/toggle
   */
  async toggleFavorite(req, res) {
    try {
      const userId = req.user.id;
      const { contactId } = req.params;

      const result = await ContactsWithAccounts.toggleFavorite(userId, contactId);

      if (!result.success) {
        return BaseResponse.error(
          res,
          'Contact not found',
          404,
          'Contact not found or does not belong to user',
          'CONTACT_NOT_FOUND'
        );
      }

      // Log the activity
      await logUserActivity(
        userId,
        'Contact favorite toggled',
        'contact',
        { contact_id: contactId }
      );

      return BaseResponse.success(
        res,
        result,
        'Favorite status updated successfully'
      );
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return BaseResponse.error(
        res,
        'Failed to toggle favorite',
        500,
        error.message,
        'TOGGLE_FAVORITE_FAILED'
      );
    }
  }

  /**
   * Search contacts
   * GET /contacts/search
   */
  async searchContacts(req, res) {
    try {
      const userId = req.user.id;
      const { q: searchTerm, limit = '20', offset = '0' } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return BaseResponse.error(
          res,
          'Invalid search term',
          400,
          'Search term must be at least 2 characters long',
          'INVALID_SEARCH_TERM'
        );
      }

      const options = {
        limit: Math.min(parseInt(limit) || 20, 50), // Max 50 per search
        offset: parseInt(offset) || 0
      };

      const rawContacts = await ContactsWithAccounts.searchContacts(userId, searchTerm.trim(), options);

      // Format the response consistently with getContacts
      const contacts = rawContacts.map(contact => ({
        id: contact.id,
        // Friend's information (what the user wants to see)
        friend: {
          id: contact.linked_user_id,
          phoneNumber: contact.users?.phone_number,
          email: contact.users?.email,
          firstName: contact.users?.user_profiles?.first_name,
          lastName: contact.users?.user_profiles?.last_name,
          fullName: [
            contact.users?.user_profiles?.first_name, 
            contact.users?.user_profiles?.last_name
          ].filter(Boolean).join(' ') || 'Unknown Contact',
          avatar: contact.users?.user_profiles?.avatar_url
        },
        // Contact relationship data
        isFavorite: contact.is_favorite,
        lastInteraction: contact.last_interaction,
        addedAt: contact.created_at,
        // Internal data (for API operations)
        _internal: {
          phoneHash: contact.phone_hash
        }
      }));

      return BaseResponse.success(
        res,
        {
          contacts,
          searchTerm: searchTerm.trim(),
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: contacts.length === options.limit
          }
        },
        'Search completed successfully'
      );
    } catch (error) {
      console.error('Search contacts error:', error);
      return BaseResponse.error(
        res,
        'Failed to search contacts',
        500,
        error.message,
        'SEARCH_CONTACTS_FAILED'
      );
    }
  }

}

export default new ContactController(); 