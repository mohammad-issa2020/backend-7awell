import { supabaseAdmin } from '../database/supabase.js';

/**
 * UserSettings Model for Supabase
 */
class UserSettings {
  /**
   * Create user settings
   * @param {Object} settingsData - Settings data
   * @returns {Object} Created settings
   */
  static async create(settingsData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .insert([{
          user_id: settingsData.user_id,
          language: settingsData.language || 'en',
          theme: settingsData.theme || 'light',
          daily_limit: settingsData.daily_limit || null,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating user settings:', error);
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
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding settings by user ID:', error);
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
      let query = supabaseAdmin.from('user_settings').select('*');

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
      console.error('❌ Error finding settings:', error);
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
        .from('user_settings')
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
      console.error('❌ Error updating settings:', error);
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
        .from('user_settings')
        .delete()
        .eq('user_id', this.user_id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting settings:', error);
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
          .from('user_settings')
          .delete()
          .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
      } else if (options.where) {
        let query = supabaseAdmin.from('user_settings').delete();
        
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
      console.error('❌ Error deleting settings:', error);
      throw error;
    }
  }

  /**
   * Get user with settings
   * @param {string} userId - User ID
   * @returns {Object|null} User with settings data
   */
  static async getUserWithSettings(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          user_settings (*)
        `)
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error getting user with settings:', error);
      return null;
    }
  }

  /**
   * Create default settings for user
   * @param {string} userId - User ID
   * @param {string} language - User language (default: 'en')
   * @returns {Object} Created settings
   */
  static async createDefault(userId, language = 'en') {
    try {
      return await this.create({
        user_id: userId,
        language: language,
        theme: 'light',
        daily_limit: null
      });
    } catch (error) {
      console.error('❌ Error creating default settings:', error);
      throw error;
    }
  }

  /**
   * Update theme
   * @param {string} userId - User ID
   * @param {string} theme - Theme ('light', 'dark', 'system')
   * @returns {Object} Updated settings
   */
  static async updateTheme(userId, theme) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Settings not found');
      }

      const settingsInstance = new UserSettings(settings);
      return await settingsInstance.update({ theme });
    } catch (error) {
      console.error('❌ Error updating theme:', error);
      throw error;
    }
  }

  /**
   * Update language
   * @param {string} userId - User ID
   * @param {string} language - Language code
   * @returns {Object} Updated settings
   */
  static async updateLanguage(userId, language) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Settings not found');
      }

      const settingsInstance = new UserSettings(settings);
      return await settingsInstance.update({ language });
    } catch (error) {
      console.error('❌ Error updating language:', error);
      throw error;
    }
  }

  /**
   * Update daily limit
   * @param {string} userId - User ID
   * @param {number|null} dailyLimit - Daily limit amount
   * @returns {Object} Updated settings
   */
  static async updateDailyLimit(userId, dailyLimit) {
    try {
      const settings = await this.findByUserId(userId);
      if (!settings) {
        throw new Error('Settings not found');
      }

      const settingsInstance = new UserSettings(settings);
      return await settingsInstance.update({ daily_limit: dailyLimit });
    } catch (error) {
      console.error('❌ Error updating daily limit:', error);
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

export default UserSettings; 