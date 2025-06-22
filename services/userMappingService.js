import { supabaseAdmin } from '../database/supabase.js';

class UserMappingService {
  /**
   * Create or get user in Supabase based on Stytch user data
   * @param {Object} stytchUser - Stytch user object
   * @returns {Object} Supabase user record
   */
  static async createOrGetUser(stytchUser) {
    try {
      const { id, phoneNumber, email, created_at, status } = stytchUser;
      
      console.log('🔍 UserMappingService: Processing user:', { id, phoneNumber, email });
      
      // Extract email and phone from different possible formats
      let userEmail = email;
      let userPhone = phoneNumber;
      
      // Handle Stytch format (if it comes in the original format)
      if (stytchUser.emails && Array.isArray(stytchUser.emails)) {
        userEmail = stytchUser.emails[0]?.email || email;
      }
      if (stytchUser.phone_numbers && Array.isArray(stytchUser.phone_numbers)) {
        userPhone = stytchUser.phone_numbers[0]?.phone_number || phoneNumber;
      }
      
      console.log('📋 Extracted data:', { userEmail, userPhone });
      
      // First try to find existing user by Stytch ID
      let { data: existingUser, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('stytch_user_id', id)
        .single();
      
      if (existingUser && !error) {
        console.log('✅ Found existing user by Stytch ID:', existingUser.id);
        
        // Update last login
        await supabaseAdmin
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);
          
        return existingUser;
      }
      
      // If not found by Stytch ID, try to find by email or phone
      let existingByContact = null;
      if (userEmail || userPhone) {
        let query = supabaseAdmin.from('users').select('*');
        
        if (userEmail && userPhone) {
          query = query.or(`email.eq.${userEmail},phone.eq.${userPhone}`);
        } else if (userEmail) {
          query = query.eq('email', userEmail);
        } else if (userPhone) {
          query = query.eq('phone', userPhone);
        }
        
        const { data } = await query.single();
        existingByContact = data;
      }
      
      if (existingByContact) {
        console.log('✅ Found existing user by contact info:', existingByContact.id);
        
        // Update existing user with Stytch ID
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            stytch_user_id: id,
            last_login: new Date().toISOString(),
            email_verified: stytchUser.emails?.[0]?.verified || true, // Assume verified if from custom auth
            phone_verified: stytchUser.phone_numbers?.[0]?.verified || true
          })
          .eq('id', existingByContact.id)
          .select()
          .single();
          
        if (updateError) {
          throw new Error(`Failed to update existing user: ${updateError.message}`);
        }
        
        return updatedUser;
      }
      
      // Validate required fields before creating new user
      if (!userEmail && !userPhone) {
        throw new Error('Either email or phone number is required to create user');
      }
      
      console.log('👤 Creating new user with data:', { 
        id, 
        email: userEmail, 
        phone_number: userPhone 
      });
      
      // Create new user - using phone field name to match database schema
      const newUser = {
        stytch_user_id: id,
        email: userEmail,
        phone: userPhone, // Fixed: use phone instead of phone_number
        email_verified: stytchUser.emails?.[0]?.verified || true,
        phone_verified: stytchUser.phone_numbers?.[0]?.verified || true,
        status: 'active',
        last_login: new Date().toISOString(),
        created_at: created_at || new Date().toISOString()
      };
      
      const { data: createdUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([newUser])
        .select()
        .single();
        
      if (createError) {
        throw new Error(`Failed to create new user: ${createError.message}`);
      }
      
      console.log('✅ Created new user:', createdUser.id);
      return createdUser;
      
    } catch (error) {
      console.error('❌ UserMappingService error in createOrGetUser:', error);
      throw new Error(`Failed to create or get user: ${error.message}`);
    }
  }
  
  /**
   * Get Supabase user ID from Stytch user ID
   * @param {string} stytchUserId - Stytch user ID
   * @returns {string} Supabase user UUID
   */
  static async getSupabaseUserId(stytchUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('stytch_user_id', stytchUserId)
        .single();
        
      if (error || !data) {
        throw new Error('User not found in Supabase database');
      }
      
      return data.id;
      
    } catch (error) {
      console.error('UserMappingService error in getSupabaseUserId:', error);
      throw new Error(`Failed to get Supabase user ID: ${error.message}`);
    }
  }
  
  /**
   * Get full user profile by Stytch user ID
   * @param {string} stytchUserId - Stytch user ID
   * @returns {Object} Complete user profile
   */
  static async getUserProfile(stytchUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            avatar_url,
            date_of_birth,
            gender,
            country,
            address
          ),
          user_settings (
            language,
            theme,
            daily_limit
          ),
          notification_settings (
            push_enabled,
            transaction_alerts,
            security_alerts,
            promotions,
            email_notifications
          )
        `)
        .eq('stytch_user_id', stytchUserId)
        .single();
        
      if (error || !data) {
        throw new Error('User profile not found');
      }
      
      return data;
      
    } catch (error) {
      console.error('UserMappingService error in getUserProfile:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }
  
  /**
   * Update user's last login timestamp
   * @param {string} stytchUserId - Stytch user ID
   * @returns {boolean} Success status
   */
  static async updateLastLogin(stytchUserId) {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('stytch_user_id', stytchUserId);
        
      if (error) {
        throw new Error(error.message);
      }
      
      return true;
      
    } catch (error) {
      console.error('UserMappingService error in updateLastLogin:', error);
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  /**
   * Get user by Supabase user ID
   * @param {string} userId - Supabase user ID
   * @returns {Object} User record
   */
  static async getUserById(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error || !data) {
        throw new Error('User not found');
      }
      
      return data;
      
    } catch (error) {
      console.error('UserMappingService error in getUserById:', error);
      throw new Error(`Failed to get user by ID: ${error.message}`);
    }
  }

  /**
   * Update user's phone number
   * @param {string} userId - Supabase user ID
   * @param {string} newPhoneNumber - New phone number
   * @returns {Object} Updated user record
   */
  static async updateUserPhone(userId, newPhoneNumber) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ 
          phone: newPhoneNumber,
          phone_verified: true, // Mark as verified since we verified OTP
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('✅ Phone number updated successfully for user:', userId);
      return data;
      
    } catch (error) {
      console.error('UserMappingService error in updateUserPhone:', error);
      throw new Error(`Failed to update phone number: ${error.message}`);
    }
  }
}

export default UserMappingService; 