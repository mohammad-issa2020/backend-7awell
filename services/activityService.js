import { supabaseAdmin } from '../database/supabase.js';

/**
 * Simple activity logging service
 * Provides an easy interface to log user activities
 */
class ActivityService {
  /**
   * Log user activity using the database function
   * @param {string} userId - User ID
   * @param {string} action - Action description
   * @param {string} activityType - Activity type (defaults to 'other')
   * @param {Object} details - Additional details object
   * @param {string} ipAddress - IP address (optional)
   * @param {string} deviceId - Device ID (optional)
   * @returns {Promise<string|null>} Log ID or null if failed
   */
  static async logUserActivity(
    userId, 
    action, 
    activityType = 'other', 
    details = {}, 
    ipAddress = null, 
    deviceId = null
  ) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('log_user_activity', {
          p_user_id: userId,
          p_action: action,
          p_activity_type: activityType,
          p_details: details,
          p_ip_address: ipAddress,
          p_device_id: deviceId
        });

      if (error) {
        console.error('Failed to log user activity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('ActivityService error:', error);
      return null;
    }
  }

  /**
   * Log contact-related activity
   * @param {string} userId - User ID
   * @param {string} action - Action description
   * @param {Object} details - Activity details
   * @returns {Promise<string|null>} Log ID or null if failed
   */
  static async logContactActivity(userId, action, details = {}) {
    return this.logUserActivity(userId, action, 'other', details);
  }

  /**
   * Log authentication activity
   * @param {string} userId - User ID
   * @param {string} action - Action description
   * @param {Object} details - Activity details
   * @returns {Promise<string|null>} Log ID or null if failed
   */
  static async logAuthActivity(userId, action, details = {}) {
    return this.logUserActivity(userId, action, 'auth_login', details);
  }

  /**
   * Log transaction activity
   * @param {string} userId - User ID
   * @param {string} action - Action description
   * @param {string} type - 'sent' or 'received'
   * @param {Object} details - Activity details
   * @returns {Promise<string|null>} Log ID or null if failed
   */
  static async logTransactionActivity(userId, action, type = 'sent', details = {}) {
    const activityType = type === 'sent' ? 'transaction_sent' : 'transaction_received';
    return this.logUserActivity(userId, action, activityType, details);
  }
}

// Export the logUserActivity function directly for compatibility
const logUserActivity = ActivityService.logUserActivity.bind(ActivityService);
const logContactActivity = ActivityService.logContactActivity.bind(ActivityService);
const logAuthActivity = ActivityService.logAuthActivity.bind(ActivityService);
const logTransactionActivity = ActivityService.logTransactionActivity.bind(ActivityService);

export default ActivityService;
export {
  logUserActivity,
  logContactActivity,
  logAuthActivity,
  logTransactionActivity
}; 