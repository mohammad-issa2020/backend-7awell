import { supabaseAdmin } from '../database/supabase.js';

/**
 * UserProfile Model for Supabase
 */
class UserProfile {
  /**
   * Create a new user profile
   * @param {Object} profileData - Profile data
   * @returns {Object} Created profile
   */
  static async create(profileData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .insert([{
          user_id: profileData.user_id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          avatar_url: profileData.avatar_url || null,
          date_of_birth: profileData.date_of_birth || null,
          gender: profileData.gender || null,
          country: profileData.country || null,
          address: profileData.address || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Find profile by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Profile data
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding profile by user ID:', error);
      return null;
    }
  }

  /**
   * Find profile with conditions
   * @param {Object} options - Query options
   * @returns {Object|null} Profile data
   */
  static async findOne(options = {}) {
    try {
      let query = supabaseAdmin.from('user_profiles').select('*');

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
      console.error('❌ Error finding profile:', error);
      return null;
    }
  }

  /**
   * Update profile
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated profile
   */
  async update(updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
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
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete profile
   * @returns {boolean} Success status
   */
  async destroy() {
    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('user_id', this.user_id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting profile:', error);
      throw error;
    }
  }

  /**
   * Delete all profiles (for testing)
   * @param {Object} options - Delete options
   * @returns {boolean} Success status
   */
  static async destroy(options = {}) {
    try {
      if (options.where && Object.keys(options.where).length === 0) {
        // Delete all profiles
        const { error } = await supabaseAdmin
          .from('user_profiles')
          .delete()
          .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
      } else if (options.where) {
        let query = supabaseAdmin.from('user_profiles').delete();
        
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
      console.error('❌ Error deleting profiles:', error);
      throw error;
    }
  }

  /**
   * Get user with profile
   * @param {string} userId - User ID
   * @returns {Object|null} User with profile data
   */
  static async getUserWithProfile(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error getting user with profile:', error);
      return null;
    }
  }

  /**
   * Constructor for instance methods
   * @param {Object} profileData - Profile data
   */
  constructor(profileData) {
    Object.assign(this, profileData);
  }
}

export default UserProfile; 