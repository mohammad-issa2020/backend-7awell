import { supabaseAdmin } from '../database/supabase.js';

/**
 * User Model for Supabase
 */
class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async create(userData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{
          phone: userData.phone,
          email: userData.email,
          phone_verified: userData.phone_verified || false,
          email_verified: userData.email_verified || false,
          status: userData.status || 'active',
          kyc_level: userData.kyc_level || 'none',
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
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by primary key (ID)
   * @param {string} id - User ID
   * @returns {Object|null} User data
   */
  static async findByPk(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding user by ID:', error);
      return null;
    }
  }

  /**
   * Find user with conditions
   * @param {Object} options - Query options
   * @returns {Object|null} User data
   */
  static async findOne(options = {}) {
    try {
      let query = supabaseAdmin.from('users').select('*');

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
      console.error('❌ Error finding user:', error);
      return null;
    }
  }

  /**
   * Update user
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  async update(updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   * @returns {boolean} Success status
   */
  async destroy() {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', this.id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Delete all users (for testing)
   * @param {Object} options - Delete options
   * @returns {boolean} Success status
   */
  static async destroy(options = {}) {
    try {
      if (options.where && Object.keys(options.where).length === 0) {
        // Delete all users
        const { error } = await supabaseAdmin
          .from('users')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy
      } else if (options.where) {
        let query = supabaseAdmin.from('users').delete();
        
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
      console.error('❌ Error deleting users:', error);
      throw error;
    }
  }

  /**
   * Constructor for instance methods
   * @param {Object} userData - User data
   */
  constructor(userData) {
    Object.assign(this, userData);
  }
}

export default User; 