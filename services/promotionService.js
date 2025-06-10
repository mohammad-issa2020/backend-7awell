const { supabase, supabaseAdmin } = require('../database/supabase');
const redis = require('redis');
const Promotion = require('../models/Promotion');

class PromotionService {
  constructor() {
    // Initialize Redis client for caching
    this.redisClient = null;
    this.initRedis();
    
    // Cache settings
    this.CACHE_TTL = 300; // 5 minutes
    this.CACHE_PREFIX = 'promotions:';
  }

  /**
   * Clean user ID to extract UUID from Stytch format
   * Stytch returns IDs like "user-test-76aebdcf-338a-4a2a-8695-d086b615d888"
   * Database expects "76aebdcf-338a-4a2a-8695-d086b615d888"
   */
  cleanUserId(userId) {
    if (!userId) return null;
    
    // If it has a prefix like "user-test-", extract the UUID part
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = userId.match(uuidPattern);
    
    if (match) {
      return match[1];
    }
    
    // If it's already a clean UUID, return as is
    return userId;
  }

  async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL
        });
        
        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });
        
        await this.redisClient.connect();
        console.log('✅ Redis connected for promotions caching');
      }
    } catch (error) {
      console.warn('⚠️ Redis not available for promotions caching:', error.message);
    }
  }


  async getPromotions(userId, locale = 'en', limit = 10, offset = 0) {
    try {
      // Clean the user ID to extract UUID
      const cleanUserId = this.cleanUserId(userId);
      console.log(`🔧 Cleaned user ID: ${userId} -> ${cleanUserId}`);
      
      // Try to get from cache first
      const cacheKey = `${this.CACHE_PREFIX}${cleanUserId}:${locale}:${limit}:${offset}`;
      let cachedData = null;

      if (this.redisClient) {
        try {
          cachedData = await this.redisClient.get(cacheKey);
          if (cachedData) {
            console.log('📦 Returning cached promotions data');
            return JSON.parse(cachedData);
          }
        } catch (cacheError) {
          console.warn('Cache read error:', cacheError.message);
        }
      }

      let promotions = [];

      try {
        // Try to use the stored procedure first
        const { data, error } = await supabase
          .rpc('get_targeted_promotions', {
            p_user_id: cleanUserId,
            p_limit: limit,
            p_offset: offset
          });

        if (error) {
          console.warn('Stored procedure not found, using fallback query:', error.message);
          throw error;
        }

        promotions = data || [];
      } catch (error) {
        // Fallback: Query promotions table directly
        console.log('📋 Using fallback query for promotions');
        
        const { data, error: fallbackError } = await supabase
          .from('promotions')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (fallbackError) {
          throw new Error(`Database error: ${fallbackError.message}`);
        }

        // Transform data to match expected format
        promotions = (data || []).map(promo => ({
          promotion_id: promo.id,
          title: promo.title,
          description: promo.description,
          priority: promo.priority,
          start_date: promo.start_date,
          end_date: promo.end_date,
          is_viewed: false, // Default values since we don't have user interaction data
          is_clicked: false,
          locale: promo.locale || locale
        }));
      }

      // Format the response
      const result = {
        promotions: promotions || [],
        pagination: {
          limit,
          offset,
          hasMore: promotions && promotions.length === limit
        },
        locale,
        cached: false,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      if (this.redisClient) {
        try {
          await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
          console.log('💾 Cached promotions data');
        } catch (cacheError) {
          console.warn('Cache write error:', cacheError.message);
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting promotions:', error);
      throw new Error(`Failed to get promotions: ${error.message}`);
    }
  }




  /**
   * Get all active promotions (for admin use)
   * @param {number} limit - Number of promotions to return
   * @param {number} offset - Offset for pagination
   * @returns {Object} Promotions data
   */
  async getAllPromotions(limit = 20, offset = 0) {
    try {
      console.log('📋 Getting all promotions for admin (including expired)');
      
      // Direct query using admin client - get ALL promotions regardless of status
      const { data, error } = await supabaseAdmin
        .from('promotions')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`🔍 Found ${data?.length || 0} promotions in database`);
      console.log('🔍 Sample promotion data:', data?.[0]);

      // Convert to Promotion models
      const promotions = Promotion.fromArray(data || []);

      return {
        promotions: promotions.map(p => p.toApiResponse()),
        pagination: {
          limit,
          offset,
          hasMore: data && data.length === limit
        },
        total: data?.length || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting all promotions:', error);
      throw new Error(`Failed to get promotions: ${error.message}`);
    }
  }

  /**
   * Clear promotion cache
   * @param {string} userId - User ID (optional, clears all if not provided)
   */
  async clearCache(userId = null) {
    if (!this.redisClient) {
      return false;
    }

    try {
      const pattern = userId 
        ? `${this.CACHE_PREFIX}${userId}:*`
        : `${this.CACHE_PREFIX}*`;
      
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        console.log(`🗑️ Cleared ${keys.length} promotion cache entries`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }


  /**
   * Create new promotion (admin only)
   * @param {Object} promotionData - Promotion data
   * @returns {Object} Created promotion
   */
  async createPromotion(promotionData) {
    try {
      // Create and validate promotion using model
      const promotion = Promotion.createValidated(promotionData);

      // Convert to database format
      const createData = promotion.toCreateData();

      // Create promotion in database using admin client
      const { data, error } = await supabaseAdmin
        .from('promotions')
        .insert(createData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ New promotion created: ${data.id} - ${data.title}`);

      // Clear related caches
      await this.clearCache();

      // Convert database result to Promotion model
      const createdPromotion = Promotion.fromDatabase(data);

      return {
        success: true,
        promotion: createdPromotion.toApiResponse(),
        created_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating promotion:', error);
      throw new Error(`Failed to create promotion: ${error.message}`);
    }
  }

  /**
   * Update promotion (admin only)
   * @param {string} promotionId - Promotion ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated promotion
   */
  async updatePromotion(promotionId, updateData) {
    try {
      // First, get the existing promotion using admin client
      const { data: existingData, error: getError } = await supabaseAdmin
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .single();

      if (getError || !existingData) {
        throw new Error('Promotion not found');
      }

      // Create Promotion model instance with existing data
      const existingPromotion = new Promotion(existingData);

      // Update only the provided fields
      const allowedFields = Promotion.getAllowedUpdateFields();
      const filteredUpdateData = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredUpdateData).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Create a new promotion instance with updated data for validation
      const updatedPromotion = existingPromotion.clone();
      updatedPromotion.update(filteredUpdateData);

      // Validate the updated promotion
      const validation = updatedPromotion.validateForUpdate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Convert to database update format
      const updateFields = updatedPromotion.toUpdateData();

      // Update promotion in database using admin client
      const { data, error } = await supabaseAdmin
        .from('promotions')
        .update(updateFields)
        .eq('id', promotionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Promotion updated: ${promotionId} - ${data.title}`);

      // Clear related caches
      await this.clearCache();

      // Convert database result to Promotion model
      const resultPromotion = new Promotion(data);

      return {
        success: true,
        promotion: resultPromotion.toApiResponse(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error updating promotion:', error);
      throw new Error(`Failed to update promotion: ${error.message}`);
    }
  }

  /**
   * Delete promotion (admin only)
   * @param {string} promotionId - Promotion ID
   * @returns {Object} Result
   */
  async deletePromotion(promotionId) {
    try {
      // First, get the promotion to return its info using admin client
      const { data: promotionData, error: getError } = await supabaseAdmin
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .single();

      if (getError || !promotionData) {
        throw new Error('Promotion not found');
      }

      // Convert to Promotion model
      const promotion = new Promotion(promotionData);

      // Delete the promotion using admin client
      const { error: deleteError } = await supabaseAdmin
        .from('promotions')
        .delete()
        .eq('id', promotionId);

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }

      console.log(`🗑️ Promotion deleted: ${promotionId} - ${promotion.title}`);

      // Clear related caches
      await this.clearCache();

      return {
        success: true,
        deleted_promotion: promotion.toApiResponse(),
        deleted_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error deleting promotion:', error);
      throw new Error(`Failed to delete promotion: ${error.message}`);
    }
  }
}

module.exports = new PromotionService(); 