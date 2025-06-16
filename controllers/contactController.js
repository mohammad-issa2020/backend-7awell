import ContactsWithAccounts from '../models/ContactsWithAccounts.js';
import BaseResponse from '../utils/baseResponse.js';
import { logUserActivity } from '../services/activityService.js';

class ContactController {
  /**
   * Sync user contacts
   * POST /contacts/sync
   */
  async syncContacts(req, res) {
    try {
      const { phoneNumbers, deviceContactsCount } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(phoneNumbers)) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'phoneNumbers must be an array',
          'INVALID_PHONE_NUMBERS'
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

      // Validate phone numbers array
      if (phoneNumbers.length > 10000) {
        return BaseResponse.error(
          res,
          'Too many contacts',
          400,
          'Maximum 10,000 contacts allowed per sync',
          'CONTACTS_LIMIT_EXCEEDED'
        );
      }

      const result = await ContactsWithAccounts.syncContacts(userId, phoneNumbers, deviceContactsCount);

      // Log the sync activity
      await logUserActivity(
        userId,
        'Contact sync completed',
        'contact',
        {
          device_contacts: deviceContactsCount,
          matched_contacts: result.matched_contacts,
          total_processed: result.total_processed
        }
      );

      return BaseResponse.success(
        res,
        result,
        'Contacts synced successfully'
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
   * Update contact interaction
   * POST /contacts/interaction
   */
  async updateInteraction(req, res) {
    try {
      const userId = req.user.id;
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'phoneNumber is required',
          'MISSING_PHONE_NUMBER'
        );
      }

      const result = await ContactsWithAccounts.updateInteraction(userId, phoneNumber);

      return BaseResponse.success(
        res,
        result,
        result.success ? 'Interaction updated successfully' : 'Contact not found'
      );
    } catch (error) {
      console.error('Update interaction error:', error);
      return BaseResponse.error(
        res,
        'Failed to update interaction',
        500,
        error.message,
        'UPDATE_INTERACTION_FAILED'
      );
    }
  }

  /**
   * Get contact sync status
   * GET /contacts/sync/status
   */
  async getSyncStatus(req, res) {
    try {
      const userId = req.user.id;

      const status = await ContactsWithAccounts.getSyncStatus(userId);

      if (!status) {
        return BaseResponse.success(
          res,
          {
            user_id: userId,
            status: 'pending',
            last_sync: null,
            device_contacts_count: 0,
            synced_contacts_count: 0,
            sync_percentage: 0,
            error_message: null
          },
          'No sync history found'
        );
      }

      return BaseResponse.success(
        res,
        status,
        'Sync status retrieved successfully'
      );
    } catch (error) {
      console.error('Get sync status error:', error);
      return BaseResponse.error(
        res,
        'Failed to get sync status',
        500,
        error.message,
        'GET_SYNC_STATUS_FAILED'
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

  /**
   * Create phone mapping for current user
   * POST /contacts/phone-mapping
   */
  async createPhoneMapping(req, res) {
    try {
      const userId = req.user.id;
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'phoneNumber is required',
          'MISSING_PHONE_NUMBER'
        );
      }

      const result = await ContactsWithAccounts.createPhoneMapping(phoneNumber, userId);

      // Log the activity
      await logUserActivity(
        userId,
        'Phone mapping created',
        'contact',
        { phone_hash: result.phoneHash }
      );

      return BaseResponse.success(
        res,
        {
          success: result.success,
          phoneHash: result.phoneHash,
          message: result.message
        },
        'Phone mapping created successfully'
      );
    } catch (error) {
      console.error('Create phone mapping error:', error);
      return BaseResponse.error(
        res,
        'Failed to create phone mapping',
        500,
        error.message,
        'CREATE_PHONE_MAPPING_FAILED'
      );
    }
  }

  /**
   * Get contact statistics
   * GET /contacts/stats
   */
  async getContactStats(req, res) {
    try {
      const userId = req.user.id;

      // Get sync status for basic stats
      const syncStatus = await ContactsWithAccounts.getSyncStatus(userId);
      
      // Get favorite count
      const favorites = await ContactsWithAccounts.getFavoriteContacts(userId);

      const stats = {
        total_device_contacts: syncStatus?.device_contacts_count || 0,
        total_synced_contacts: syncStatus?.synced_contacts_count || 0,
        total_favorites: favorites.length,
        sync_percentage: syncStatus?.sync_percentage || 0,
        last_sync: syncStatus?.last_sync,
        sync_status: syncStatus?.status || 'pending'
      };

      return BaseResponse.success(
        res,
        stats,
        'Contact statistics retrieved successfully'
      );
    } catch (error) {
      console.error('Get contact stats error:', error);
      return BaseResponse.error(
        res,
        'Failed to get contact statistics',
        500,
        error.message,
        'GET_CONTACT_STATS_FAILED'
      );
    }
  }
}

export default new ContactController(); 