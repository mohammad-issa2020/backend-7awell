import ClientLogService, { CLIENT_EVENT_TYPES, CLIENT_LOG_CATEGORIES } from '../services/clientLogService.js';
import { createSuccessResponse, createErrorResponse } from '../utils/baseResponse.js';

class LogController {
  /**
   * Log client-side event
   * POST /api/v1/logs
   */
  async logEvent(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const {
        eventType,
        payload = {},
        timestamp,
        category = CLIENT_LOG_CATEGORIES.ANALYTICS,
        severity = 'low'
      } = req.body;

      // Validate required fields
      if (!eventType) {
        return res.status(400).json(createErrorResponse(
          'eventType is required',
          'INVALID_PARAMETER',
          400
        ));
      }

      if (!timestamp) {
        return res.status(400).json(createErrorResponse(
          'timestamp is required',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Validate timestamp (should be within reasonable range)
      const now = Date.now();
      const timeDiff = Math.abs(now - timestamp);
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        return res.status(400).json(createErrorResponse(
          'timestamp is too far from server time (max 5 minutes difference)',
          'INVALID_TIMESTAMP',
          400
        ));
      }

      // Validate event type
      if (!Object.values(CLIENT_EVENT_TYPES).includes(eventType)) {
        return res.status(400).json(createErrorResponse(
          `Invalid eventType. Must be one of: ${Object.values(CLIENT_EVENT_TYPES).join(', ')}`,
          'INVALID_EVENT_TYPE',
          400
        ));
      }

      // Validate category
      if (!Object.values(CLIENT_LOG_CATEGORIES).includes(category)) {
        return res.status(400).json(createErrorResponse(
          `Invalid category. Must be one of: ${Object.values(CLIENT_LOG_CATEGORIES).join(', ')}`,
          'INVALID_CATEGORY',
          400
        ));
      }

      // Validate severity
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity)) {
        return res.status(400).json(createErrorResponse(
          `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
          'INVALID_SEVERITY',
          400
        ));
      }

      // Log the event
      const result = await ClientLogService.logEvent({
        userId,
        eventType,
        payload,
        timestamp,
        request: req,
        category,
        severity
      });

      console.log(`📱 Client event logged: ${eventType} by user ${userId}`);

      return res.json(createSuccessResponse(
        result,
        'Event logged successfully'
      ));

    } catch (error) {
      console.error('Error in logEvent controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to log event',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Log multiple events in batch
   * POST /api/v1/logs/batch
   */
  async logBatch(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json(createErrorResponse(
          'events must be a non-empty array',
          'INVALID_PARAMETER',
          400
        ));
      }

      if (events.length > 50) {
        return res.status(400).json(createErrorResponse(
          'Maximum 50 events allowed per batch',
          'BATCH_TOO_LARGE',
          400
        ));
      }

      const results = [];
      const errors = [];

      // Process each event
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
        try {
          // Validate event structure
          if (!event.eventType || !event.timestamp) {
            errors.push({
              index: i,
              error: 'Missing eventType or timestamp'
            });
            continue;
          }

          const result = await ClientLogService.logEvent({
            userId,
            eventType: event.eventType,
            payload: event.payload || {},
            timestamp: event.timestamp,
            request: req,
            category: event.category || CLIENT_LOG_CATEGORIES.ANALYTICS,
            severity: event.severity || 'low'
          });

          results.push({
            index: i,
            ...result
          });

        } catch (eventError) {
          errors.push({
            index: i,
            error: eventError.message
          });
        }
      }

      console.log(`📱 Batch logged: ${results.length} events, ${errors.length} errors for user ${userId}`);

      return res.json(createSuccessResponse(
        {
          processedCount: results.length,
          errorCount: errors.length,
          results,
          errors
        },
        'Batch processing completed'
      ));

    } catch (error) {
      console.error('Error in logBatch controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to process batch',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Log performance metric
   * POST /api/v1/logs/performance
   */
  async logPerformance(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const {
        metric,
        value,
        unit = 'ms',
        context = {}
      } = req.body;

      if (!metric || value === undefined) {
        return res.status(400).json(createErrorResponse(
          'metric and value are required',
          'INVALID_PARAMETER',
          400
        ));
      }

      if (typeof value !== 'number') {
        return res.status(400).json(createErrorResponse(
          'value must be a number',
          'INVALID_PARAMETER',
          400
        ));
      }

      const result = await ClientLogService.logPerformance({
        userId,
        metric,
        value,
        unit,
        context,
        request: req
      });

      console.log(`⚡ Performance logged: ${metric}=${value}${unit} for user ${userId}`);

      return res.json(createSuccessResponse(
        result,
        'Performance metric logged successfully'
      ));

    } catch (error) {
      console.error('Error in logPerformance controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to log performance metric',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Log client-side error
   * POST /api/v1/logs/error
   */
  async logError(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const {
        error,
        context = {}
      } = req.body;

      if (!error) {
        return res.status(400).json(createErrorResponse(
          'error is required',
          'INVALID_PARAMETER',
          400
        ));
      }

      const result = await ClientLogService.logError({
        userId,
        error,
        context,
        request: req
      });

      console.log(`🚨 Client error logged for user ${userId}: ${error.message || error}`);

      return res.json(createSuccessResponse(
        result,
        'Error logged successfully'
      ));

    } catch (error) {
      console.error('Error in logError controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to log error',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Get client logs for authenticated user
   * GET /api/v1/logs?eventType={type}&category={cat}&limit={num}
   */
  async getLogs(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const {
        limit = 50,
        offset = 0,
        eventType,
        category,
        severity,
        startDate,
        endDate
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

      const options = {
        limit: limitNum,
        offset: offsetNum,
        eventType,
        category,
        severity,
        startDate,
        endDate
      };

      const logs = await ClientLogService.getClientLogs(userId, options);

      return res.json(createSuccessResponse(
        {
          logs,
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            hasMore: logs.length === limitNum
          }
        },
        'Logs retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getLogs controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve logs',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Get analytics summary
   * GET /api/v1/logs/analytics?days={num}
   */
  async getAnalytics(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const days = parseInt(req.query.days) || 7;

      if (days < 1 || days > 30) {
        return res.status(400).json(createErrorResponse(
          'Invalid days parameter. Must be between 1 and 30',
          'INVALID_PARAMETER',
          400
        ));
      }

      const analytics = await ClientLogService.getAnalyticsSummary(userId, days);

      return res.json(createSuccessResponse(
        analytics,
        'Analytics retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getAnalytics controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve analytics',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Get available event types and categories
   * GET /api/v1/logs/types
   */
  async getTypes(req, res) {
    try {
      return res.json(createSuccessResponse(
        {
          eventTypes: CLIENT_EVENT_TYPES,
          categories: CLIENT_LOG_CATEGORIES,
          severities: ['low', 'medium', 'high', 'critical']
        },
        'Event types retrieved successfully'
      ));
    } catch (error) {
      console.error('Error in getTypes controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve event types',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }
}

export default new LogController(); 