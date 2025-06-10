const { supabase } = require('../database/supabase');
const ActivityLogger = require('./activityLogger');

// Client event types that can't be automatically tracked on server
const CLIENT_EVENT_TYPES = {
  // UI/UX Events
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  APP_FOREGROUNDED: 'app_foregrounded',
  SCREEN_VIEW: 'screen_view',
  BUTTON_CLICK: 'button_click',
  FORM_INTERACTION: 'form_interaction',
  
  // Performance Events
  APP_STARTUP_TIME: 'app_startup_time',
  API_RESPONSE_TIME: 'api_response_time',
  SCREEN_LOAD_TIME: 'screen_load_time',
  
  // Error Events
  CLIENT_ERROR: 'client_error',
  NETWORK_ERROR: 'network_error',
  VALIDATION_ERROR: 'validation_error',
  
  // Business Events
  FEATURE_USED: 'feature_used',
  TUTORIAL_STEP: 'tutorial_step',
  ONBOARDING_STEP: 'onboarding_step',
  
  // Security Events (client-side)
  APP_TAMPERING_DETECTED: 'app_tampering_detected',
  ROOT_JAILBREAK_DETECTED: 'root_jailbreak_detected',
  DEBUGGER_DETECTED: 'debugger_detected',
  
  // Custom Business Events
  CUSTOM: 'custom'
};

const CLIENT_LOG_CATEGORIES = {
  ANALYTICS: 'analytics',
  ERROR: 'error', 
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  BUSINESS: 'business'
};

class ClientLogService {
  /**
   * Log client-side event
   * @param {Object} params - Log parameters
   * @param {string} params.userId - User ID
   * @param {string} params.eventType - Event type from CLIENT_EVENT_TYPES
   * @param {Object} params.payload - Event payload/data
   * @param {number} params.timestamp - Client timestamp
   * @param {Object} params.request - Express request object
   * @param {string} params.category - Event category
   * @param {string} params.severity - Event severity (low, medium, high, critical)
   * @returns {Object} Log result
   */
  static async logEvent({
    userId,
    eventType,
    payload = {},
    timestamp,
    request = null,
    category = CLIENT_LOG_CATEGORIES.ANALYTICS,
    severity = 'low'
  }) {
    try {
      // Validate required fields
      if (!userId || !eventType || !timestamp) {
        throw new Error('Missing required fields: userId, eventType, timestamp');
      }

      // Validate event type
      if (!Object.values(CLIENT_EVENT_TYPES).includes(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }

      // Extract client info from request
      const clientInfo = this.extractClientInfo(request);
      
      // Calculate server-client time difference
      const serverTimestamp = Date.now();
      const timeDrift = serverTimestamp - timestamp;

      // Prepare log entry
      const logEntry = {
        user_id: userId,
        event_type: eventType,
        category,
        severity,
        payload,
        client_timestamp: new Date(timestamp).toISOString(),
        server_timestamp: new Date(serverTimestamp).toISOString(),
        time_drift_ms: timeDrift,
        ...clientInfo
      };

      // Store in client_logs table
      const { data, error } = await supabase
        .from('client_logs')
        .insert([logEntry])
        .select()
        .single();

      if (error) {
        console.error('Failed to store client log:', error);
        throw error;
      }

      // For critical events, also log to main activity system
      if (severity === 'critical' || category === CLIENT_LOG_CATEGORIES.SECURITY) {
        await this.logToActivitySystem({
          userId,
          eventType,
          payload,
          request,
          severity
        });
      }

      return {
        success: true,
        logId: data.id,
        serverTimestamp,
        timeDrift
      };

    } catch (error) {
      console.error('ClientLogService error:', error);
      throw new Error(`Failed to log client event: ${error.message}`);
    }
  }

  /**
   * Log performance metrics
   */
  static async logPerformance({
    userId,
    metric,
    value,
    unit = 'ms',
    context = {},
    request = null
  }) {
    return this.logEvent({
      userId,
      eventType: CLIENT_EVENT_TYPES.API_RESPONSE_TIME,
      payload: {
        metric,
        value,
        unit,
        context
      },
      timestamp: Date.now(),
      request,
      category: CLIENT_LOG_CATEGORIES.PERFORMANCE,
      severity: value > 5000 ? 'high' : value > 2000 ? 'medium' : 'low'
    });
  }

  /**
   * Log client-side errors
   */
  static async logError({
    userId,
    error,
    context = {},
    request = null
  }) {
    const errorPayload = {
      message: error.message || error,
      stack: error.stack || null,
      name: error.name || 'Error',
      context,
      userAgent: request?.get('User-Agent'),
      url: context.url || context.route,
      timestamp: Date.now()
    };

    return this.logEvent({
      userId,
      eventType: CLIENT_EVENT_TYPES.CLIENT_ERROR,
      payload: errorPayload,
      timestamp: Date.now(),
      request,
      category: CLIENT_LOG_CATEGORIES.ERROR,
      severity: 'medium'
    });
  }

  /**
   * Log security events detected on client
   */
  static async logSecurityEvent({
    userId,
    securityEvent,
    details = {},
    request = null
  }) {
    return this.logEvent({
      userId,
      eventType: securityEvent,
      payload: {
        ...details,
        detectedAt: Date.now(),
        severity: 'critical'
      },
      timestamp: Date.now(),
      request,
      category: CLIENT_LOG_CATEGORIES.SECURITY,
      severity: 'critical'
    });
  }

  /**
   * Log user interaction events
   */
  static async logInteraction({
    userId,
    screen,
    action,
    element,
    context = {},
    request = null
  }) {
    return this.logEvent({
      userId,
      eventType: CLIENT_EVENT_TYPES.BUTTON_CLICK,
      payload: {
        screen,
        action,
        element,
        context
      },
      timestamp: Date.now(),
      request,
      category: CLIENT_LOG_CATEGORIES.ANALYTICS,
      severity: 'low'
    });
  }

  /**
   * Get client logs for a user
   */
  static async getClientLogs(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        eventType,
        category,
        severity,
        startDate,
        endDate
      } = options;

      let query = supabase
        .from('client_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching client logs:', error);
      throw new Error(`Failed to fetch client logs: ${error.message}`);
    }
  }

  /**
   * Get client analytics summary
   */
  static async getAnalyticsSummary(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .rpc('get_client_analytics_summary', {
          p_user_id: userId,
          p_start_date: startDate.toISOString()
        });

      if (error) {
        throw error;
      }

      return data || {};
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw new Error(`Failed to fetch analytics summary: ${error.message}`);
    }
  }

  /**
   * Extract client information from request
   */
  static extractClientInfo(request) {
    if (!request) {
      return {
        user_agent: null,
        ip_address: null,
        device_id: null,
        app_version: null,
        platform: null
      };
    }

    return {
      user_agent: request.get('User-Agent'),
      ip_address: request.ip || request.connection?.remoteAddress,
      device_id: request.get('X-Device-ID') || request.body?.deviceId,
      app_version: request.get('X-App-Version') || request.body?.appVersion,
      platform: request.get('X-Platform') || request.body?.platform
    };
  }

  /**
   * Log critical events to main activity system
   */
  static async logToActivitySystem({
    userId,
    eventType,
    payload,
    request,
    severity
  }) {
    try {
      await ActivityLogger.logActivity({
        userId,
        action: `Client event: ${eventType}`,
        activityType: 'other',
        details: {
          clientEventType: eventType,
          payload,
          severity,
          source: 'client_log_service'
        },
        request,
        success: true,
        riskLevel: severity === 'critical' ? 'high' : 'medium'
      });
    } catch (error) {
      console.error('Failed to log to activity system:', error);
      // Don't throw - this is supplementary logging
    }
  }

  /**
   * Cleanup old client logs
   */
  static async cleanupOldLogs(days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { error } = await supabase
        .from('client_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      console.log(`✅ Cleaned up client logs older than ${days} days`);
    } catch (error) {
      console.error('Failed to cleanup old client logs:', error);
      throw error;
    }
  }
}

module.exports = ClientLogService;
module.exports.CLIENT_EVENT_TYPES = CLIENT_EVENT_TYPES;
module.exports.CLIENT_LOG_CATEGORIES = CLIENT_LOG_CATEGORIES; 