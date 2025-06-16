import promotionService from '../services/promotionService.js';
import { createSuccessResponse, createErrorResponse } from '../utils/baseResponse.js';
import Promotion from '../models/Promotion.js';

class PromotionController {
  /**
   * Get promotions for authenticated user
   * GET /api/v1/promotions?locale={locale}&limit={limit}&offset={offset}
   */
  async getPromotions(req, res) {
    try {
      const userId = req.user?.id;
    
      // Extract query parameters
      const {
        locale = 'en',
        limit = 10,
        offset = 0
      } = req.query;

      // Validate parameters
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        return res.status(400).json(createErrorResponse(
          'Invalid limit parameter. Must be between 1 and 50',
          'INVALID_PARAMETER',
          400
        ));
      }

      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json(createErrorResponse(
          'Invalid offset parameter. Must be 0 or greater',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Get promotions from service
      const result = await promotionService.getPromotions(
        userId,
        locale,
        limitNum,
        offsetNum
      );

      // Log successful access
      console.log(`✅ User ${userId} accessed promotions (locale: ${locale})`);

      return res.json(createSuccessResponse(
        result,
        'Promotions retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getPromotions controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve promotions',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }


  /**
   * Get all promotions (admin only)
   * GET /api/v1/promotions/all?limit={limit}&offset={offset}
   */
  async getAllPromotions(req, res) {
    try {
      // Note: This should have admin authentication middleware
      const adminId = req.admin?.id;

      const {
        limit = 20,
        offset = 0
      } = req.query;

      // Validate parameters
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json(createErrorResponse(
          'Invalid limit parameter. Must be between 1 and 100',
          'INVALID_PARAMETER',
          400
        ));
      }

      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json(createErrorResponse(
          'Invalid offset parameter. Must be 0 or greater',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Get all promotions from service
      const result = await promotionService.getAllPromotions(limitNum, offsetNum);

      console.log(`📋 All promotions accessed by admin ${adminId}`);

      return res.json(createSuccessResponse(
        result,
        'All promotions retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getAllPromotions controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve all promotions',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Clear promotion cache (admin only)
   * DELETE /api/v1/promotions/cache?userId={userId}
   */
  async clearCache(req, res) {
    try {
      // Note: This should have admin authentication middleware
      const adminId = req.admin?.id;
      if (!adminId) {
        return res.status(401).json(createErrorResponse(
          'Admin authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const { userId = null } = req.query;

      // Clear cache
      const clearedCount = await promotionService.clearCache(userId);

      console.log(`🗑️ Cache cleared by admin ${adminId}${userId ? ` for user ${userId}` : ' (all users)'}`);

      return res.json(createSuccessResponse(
        {
          clearedEntries: clearedCount,
          targetUser: userId || 'all',
          timestamp: new Date().toISOString()
        },
        'Cache cleared successfully'
      ));

    } catch (error) {
      console.error('Error in clearCache controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to clear cache',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }


  /**
   * Create new promotion (admin only)
   * POST /api/v1/promotions
   */
  async createPromotion(req, res) {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        return res.status(401).json(createErrorResponse(
          'Admin authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const promotionData = req.body;

      // Create Promotion model instance for pre-validation
      const promotion = new Promotion(promotionData);
      const validation = promotion.validateForCreation();

      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          `Validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          400
        ));
      }

      // Create promotion via service
      const result = await promotionService.createPromotion(promotionData);

      console.log(`✅ Promotion created by admin ${adminId}: ${result.promotion.title}`);

      return res.status(201).json(createSuccessResponse(
        result,
        'Promotion created successfully'
      ));

    } catch (error) {
      console.error('Error in createPromotion controller:', error);
      return res.status(400).json(createErrorResponse(
        error.message,
        'PROMOTION_CREATION_ERROR',
        400
      ));
    }
  }

  /**
   * Update promotion (admin only)
   * PUT /api/v1/promotions/:promotionId
   */
  async updatePromotion(req, res) {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        return res.status(401).json(createErrorResponse(
          'Admin authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const { promotionId } = req.params;
      const updateData = req.body;

      if (!promotionId) {
        return res.status(400).json(createErrorResponse(
          'Promotion ID is required',
          'MISSING_PARAMETER',
          400
        ));
      }

      // Pre-validate update data using Promotion model
      const allowedFields = Promotion.getAllowedUpdateFields();
      const filteredData = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json(createErrorResponse(
          'No valid fields to update',
          'NO_VALID_FIELDS',
          400
        ));
      }

      // Update promotion via service (service will handle detailed validation)
      const result = await promotionService.updatePromotion(promotionId, filteredData);

      console.log(`✅ Promotion updated by admin ${adminId}: ${promotionId}`);

      return res.json(createSuccessResponse(
        result,
        'Promotion updated successfully'
      ));

    } catch (error) {
      console.error('Error in updatePromotion controller:', error);
      return res.status(400).json(createErrorResponse(
        error.message,
        'PROMOTION_UPDATE_ERROR',
        400
      ));
    }
  }

  /**
   * Delete promotion (admin only)
   * DELETE /api/v1/promotions/:promotionId
   */
  async deletePromotion(req, res) {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        return res.status(401).json(createErrorResponse(
          'Admin authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const { promotionId } = req.params;

      if (!promotionId) {
        return res.status(400).json(createErrorResponse(
          'Promotion ID is required',
          'MISSING_PARAMETER',
          400
        ));
      }

      // Delete promotion
      const result = await promotionService.deletePromotion(promotionId);

      console.log(`🗑️ Promotion deleted by admin ${adminId}: ${promotionId}`);

      return res.json(createSuccessResponse(
        result,
        'Promotion deleted successfully'
      ));

    } catch (error) {
      console.error('Error in deletePromotion controller:', error);
      return res.status(400).json(createErrorResponse(
        error.message,
        'PROMOTION_DELETE_ERROR',
        400
      ));
    }
  }
}

export default new PromotionController(); 