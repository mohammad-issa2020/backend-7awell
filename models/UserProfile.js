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
      // Enforce required fields for profile creation
      const requiredFields = ['user_id', 'first_name', 'last_name'];
      for (const field of requiredFields) {
        if (!profileData[field]) {
          throw new Error(`Missing required field for profile creation: ${field}`);
        }
      }

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
   * Create user with profile (instance method)
   * @param {Object} userData - User data
   * @param {Object} profileData - Profile data
   * @returns {Object} Created user and profile
   */
  async createUserWithProfile(userData, profileData) {
    try {
      // Import User model dynamically to avoid circular dependencies
      const { default: User } = await import('./User.js');
      
      // First create the user
      const user = await User.create(userData);
      
      // Then create the profile with the user_id
      const profile = await UserProfile.create({
        ...profileData,
        user_id: user.id
      });

      return { user, profile };
    } catch (error) {
      console.error('❌ Error creating user with profile:', error);
      throw error;
    }
  }

  /**
   * Create profile for existing user (instance method)
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data
   * @returns {Object} Created profile
   */
  async createProfile(userId, profileData) {
    try {
      return await UserProfile.create({
        ...profileData,
        user_id: userId
      });
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Search users with profiles (instance method)
   * @param {string} searchTerm - Search term
   * @returns {Array} Found users with profiles
   */
  async searchUsersWithProfiles(searchTerm) {
    try {
      // First get users matching email
      const { data: usersByEmail, error: emailError } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          user_profiles (*)
        `)
        .ilike('email', `%${searchTerm}%`)
        .not('user_profiles', 'is', null);

      if (emailError) {
        console.warn('Email search error:', emailError.message);
      }

      // Then get profiles matching name and get their users
      const { data: profilesByName, error: nameError } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          *,
          users (*)
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);

      if (nameError) {
        console.warn('Name search error:', nameError.message);
      }

      // Combine results and remove duplicates
      const userResults = usersByEmail || [];
      const profileResults = (profilesByName || []).map(profile => ({
        ...profile.users,
        user_profiles: [profile]
      }));

      // Merge results and remove duplicates by user id
      const allResults = [...userResults, ...profileResults];
      const uniqueResults = allResults.filter((user, index, arr) => 
        arr.findIndex(u => u.id === user.id) === index
      );

      return uniqueResults;
    } catch (error) {
      console.error('❌ Error searching users with profiles:', error);
      return [];
    }
  }

  /**
   * Get profile statistics (instance method)
   * @returns {Object} Profile statistics
   */
  async getProfileStatistics() {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const profiles = data || [];
      const stats = {
        total_profiles: profiles.length,
        complete_profiles: profiles.filter(p => p.first_name && p.last_name && p.avatar_url).length,
        profiles_with_avatar: profiles.filter(p => p.avatar_url).length,
        profiles_with_birth_date: profiles.filter(p => p.date_of_birth).length,
        average_age: profiles.filter(p => p.date_of_birth).length > 0 
          ? Math.round(profiles.filter(p => p.date_of_birth)
              .reduce((sum, p) => {
                const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
                return sum + age;
              }, 0) / profiles.filter(p => p.date_of_birth).length)
          : 0,
        gender_distribution: profiles.reduce((acc, p) => {
          if (p.gender) {
            acc[p.gender] = (acc[p.gender] || 0) + 1;
          }
          return acc;
        }, {}),
        country_distribution: profiles.reduce((acc, p) => {
          if (p.country) {
            acc[p.country] = (acc[p.country] || 0) + 1;
          }
          return acc;
        }, {})
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting profile statistics:', error);
      return null;
    }
  }

  /**
   * Get user with profile (static method)
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

      if (data) {
        // If user has no profile, set user_profiles to null instead of empty array
        if (data.user_profiles && data.user_profiles.length === 0) {
          data.user_profiles = null;
        }
        // Also add a profile property for easier access
        data.profile = data.user_profiles && data.user_profiles.length > 0 ? data.user_profiles[0] : null;
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error getting user with profile:', error);
      return null;
    }
  }

  /**
   * Get user with profile (instance method)
   * @param {string} userId - User ID
   * @returns {Object|null} User with profile data
   */
  async getUserWithProfile(userId) {
    try {
      return await UserProfile.getUserWithProfile(userId);
    } catch (error) {
      console.error('❌ Error getting user with profile:', error);
      return null;
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
   * Update profile - DISABLED
   * This functionality is disabled as per current requirements.
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated profile
   */
  /*
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
  */

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
   * Constructor for instance methods
   * @param {Object} profileData - Profile data
   */
  constructor(profileData) {
    Object.assign(this, profileData);
  }
}

export default UserProfile; 