import { supabaseAdmin } from '../database/supabase.js';

/**
 * NotificationSettings Model for Supabase
 */
class NotificationSettings {
  /**
   * Create notification settings
   * @param {Object} settingsData - Settings data
   * @returns {Object} Created settings
   */
  static async create(settingsData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .insert([{
          user_id: settingsData.user_id,
          push_enabled: settingsData.push_enabled !== undefined ? settingsData.push_enabled : true,
          transaction_alerts: settingsData.transaction_alerts !== undefined ? settingsData.transaction_alerts : true,
          security_alerts: settingsData.security_alerts !== undefined ? settingsData.security_alerts : true,
          promotions: settingsData.promotions !== undefined ? settingsData.promotions : true,
          email_notifications: settingsData.email_notifications !== undefined ? settingsData.email_notifications : true,
          sms_notifications: settingsData.sms_notifications !== undefined ? settingsData.sms_notifications : true,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating notification settings:', error);
      throw error;
    }
  }

  /**
   * Find settings by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Settings data
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding notification settings by user ID:', error);
      return null;
    }
  }

  /**
   * Find settings with conditions
   * @param {Object} options - Query options
   * @returns {Object|null} Settings data
   */
  static async findOne(options = {}) {
    try {
      let query = supabaseAdmin.from('notification_settings').select('*');

      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding notification settings:', error);
      return null;
    }
  }

  /**
   * Update settings
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated settings
   */
  async update(updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.user_id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('❌ Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * Delete settings
   * @returns {boolean} Success status
   */
  async destroy() {
    try {
      const { error } = await supabaseAdmin
        .from('notification_settings')
        .delete()
        .eq('user_id', this.user_id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting notification settings:', error);
      throw error;
    }
  }

  /**
   * Delete all settings (for testing)
   * @param {Object} options - Delete options
   * @returns {boolean} Success status
   */
  static async destroy(options = {}) {
    try {
      if (options.where && Object.keys(options.where).length === 0) {
        // Delete all settings
        const { error } = await supabaseAdmin
          .from('notification_settings')
          .delete()
          .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
      } else if (options.where) {
        let query = supabaseAdmin.from('notification_settings').delete();
        
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        const { error } = await query;
        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting notification settings:', error);
      throw error;
    }
  }

  /**
   * Get user with notification settings
   * @param {string} userId - User ID
   * @returns {Object|null} User with settings data
   */
  static async getUserWithNotificationSettings(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          notification_settings (*)
        `)
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error getting user with notification settings:', error);
      return null;
    }
  }

  /**
   * Create default notification settings for user
   * @param {string} userId - User ID
   * @returns {Object} Created settings
   */
  static async createDefault(userId) {
    try {
      return await this.create({
        user_id: userId,
        push_enabled: true,
        transaction_alerts: true,
        security_alerts: true,
        promotions: true,
        email_notifications: true,
        sms_notifications: true
      });
    } catch (error) {
      console.error('❌ Error creating default notification settings:', error);
      throw error;
    }
  }

  /**
   * Toggle push notifications
   * @param {string} userId - User ID
   * @param {boolean} enabled - Enable/disable push notifications
   * @returns {Object} Updated settings
   */
  static async togglePushNotifications(userId, enabled) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Notification settings not found');
      }

      const settingsInstance = new NotificationSettings(settings);
      return await settingsInstance.update({ push_enabled: enabled });
    } catch (error) {
      console.error('❌ Error toggling push notifications:', error);
      throw error;
    }
  }

  /**
   * Toggle email notifications
   * @param {string} userId - User ID
   * @param {boolean} enabled - Enable/disable email notifications
   * @returns {Object} Updated settings
   */
  static async toggleEmailNotifications(userId, enabled) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Notification settings not found');
      }

      const settingsInstance = new NotificationSettings(settings);
      return await settingsInstance.update({ email_notifications: enabled });
    } catch (error) {
      console.error('❌ Error toggling email notifications:', error);
      throw error;
    }
  }

  /**
   * Toggle SMS notifications
   * @param {string} userId - User ID
   * @param {boolean} enabled - Enable/disable SMS notifications
   * @returns {Object} Updated settings
   */
  static async toggleSmsNotifications(userId, enabled) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Notification settings not found');
      }

      const settingsInstance = new NotificationSettings(settings);
      return await settingsInstance.update({ sms_notifications: enabled });
    } catch (error) {
      console.error('❌ Error toggling SMS notifications:', error);
      throw error;
    }
  }

  /**
   * Update multiple notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Notification preferences
   * @returns {Object} Updated settings
   */
  static async updatePreferences(userId, preferences) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Notification settings not found');
      }

      const settingsInstance = new NotificationSettings(settings);
      return await settingsInstance.update(preferences);
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Constructor for instance methods
   * @param {Object} settingsData - Settings data
   */
  constructor(settingsData) {
    Object.assign(this, settingsData);
  }
}

export default NotificationSettings; 