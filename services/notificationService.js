import emailService from './emailService.js';
import firebaseService from './firebaseService.js';
import NotificationSettings from '../models/NotificationSettings.js';
import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';

class NotificationService {
  constructor() {
    logger.info('🔔 Notification service initialized');
  }

  /**
   * Send transaction notification (success or failure)
   * @param {string} userId - User ID
   * @param {Object} transactionData - Transaction details
   * @param {string} status - 'success' or 'failure'
   */
  async sendTransactionNotification(userId, transactionData, status) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!transactionData) {
        throw new Error('Transaction data is required');
      }

      if (!['success', 'failure'].includes(status)) {
        throw new Error('Status must be "success" or "failure"');
      }

      logger.info(`🔔 Sending ${status} notification for transaction ${transactionData.transactionId} to user ${userId}`);

      // Get user data and notification preferences
      const [userData, notificationSettings] = await Promise.all([
        this.getUserData(userId),
        this.getNotificationSettings(userId)
      ]);

      if (!userData) {
        logger.error(`❌ User ${userId} not found`);
        return;
      }

      // Check if user has transaction alerts enabled
      if (!notificationSettings?.transaction_alerts) {
        logger.info(`ℹ️ Transaction alerts disabled for user ${userId}`);
        return;
      }

      const notifications = [];

      // Send email notification if enabled
      if (notificationSettings.email_notifications && userData.email) {
        logger.info(`📧 Sending email notification to ${userData.email}`);
        const emailPromise = this.sendEmailNotification(
          userData.email,
          transactionData,
          status
        ).catch(error => {
          logger.error(`❌ Email notification failed for user ${userId}:`, error);
        });
        notifications.push(emailPromise);
      }

      // Send push notification if enabled and user has device tokens
      if (notificationSettings.push_enabled) {
        logger.info(`📱 Sending push notification to user ${userId}`);
        const pushPromise = this.sendPushNotification(
          userId,
          transactionData,
          status
        ).catch(error => {
          logger.error(`❌ Push notification failed for user ${userId}:`, error);
        });
        notifications.push(pushPromise);
      }

      // Execute all notifications in parallel
      await Promise.all(notifications);

      logger.info(`✅ Notification process completed for transaction ${transactionData.transactionId}`);
    } catch (error) {
      logger.error('❌ Failed to send transaction notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   * @param {string} email - User email
   * @param {Object} transactionData - Transaction details
   * @param {string} status - 'success' or 'failure'
   */
  async sendEmailNotification(email, transactionData, status) {
    try {
      if (status === 'success') {
        await emailService.sendTransactionSuccessEmail(email, transactionData);
      } else {
        await emailService.sendTransactionFailureEmail(email, transactionData);
      }
    } catch (error) {
      logger.error('❌ Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   * @param {string} userId - User ID
   * @param {Object} transactionData - Transaction details
   * @param {string} status - 'success' or 'failure'
   */
  async sendPushNotification(userId, transactionData, status) {
    try {
      // Get user device tokens
      const deviceTokens = await this.getUserDeviceTokens(userId);
      
      if (!deviceTokens || deviceTokens.length === 0) {
        logger.info(`ℹ️ No device tokens found for user ${userId}`);
        return;
      }

      // Send notification to all user devices
      const notificationPromises = deviceTokens.map(async (token) => {
        try {
          if (status === 'success') {
            await firebaseService.sendTransactionSuccessNotification(token, transactionData);
          } else {
            await firebaseService.sendTransactionFailureNotification(token, transactionData);
          }
        } catch (error) {
          logger.error(`❌ Failed to send push notification to token ${token}:`, error);
        }
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('❌ Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Get user data
   * @param {string} userId - User ID
   * @returns {Object|null} User data
   */
  async getUserData(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error(`❌ Failed to get user data for ${userId}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Get user notification settings
   * @param {string} userId - User ID
   * @returns {Object|null} Notification settings
   */
  async getNotificationSettings(userId) {
    try {
      const settings = await NotificationSettings.findByUserId(userId);
      
      // If no settings found, create default settings
      if (!settings) {
        logger.info(`ℹ️ Creating default notification settings for user ${userId}`);
        return await NotificationSettings.createDefault(userId);
      }

      return settings;
    } catch (error) {
      logger.error('❌ Failed to get notification settings:', error);
      return null;
    }
  }

  /**
   * Get user device tokens (you'll need to implement this based on your user sessions or device storage)
   * @param {string} userId - User ID
   * @returns {Array} Array of device tokens
   */
  async getUserDeviceTokens(userId) {
    try {
      // This assumes you have a way to store device tokens
      // You might want to add a 'device_tokens' column to user_sessions table
      // or create a separate device_tokens table
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('device_token')
        .eq('user_id', userId)
        .not('device_token', 'is', null);

      if (error) {
        logger.error(`❌ Failed to get device tokens for user ${userId}:`, error);
        return [];
      }

      return data?.map(session => session.device_token).filter(token => token) || [];
    } catch (error) {
      logger.error('❌ Failed to get user device tokens:', error);
      return [];
    }
  }

  /**
   * Store user device token
   * @param {string} userId - User ID
   * @param {string} deviceToken - FCM device token
   * @param {string} sessionId - Session ID (optional)
   */
  async storeDeviceToken(userId, deviceToken, sessionId = null) {
    try {
      if (!userId || !deviceToken) {
        throw new Error('User ID and device token are required');
      }

      // Validate the token with Firebase
      const isValidToken = await firebaseService.validateToken(deviceToken);
      if (!isValidToken) {
        logger.warn(`⚠️ Invalid device token provided for user ${userId}`);
        return false;
      }

      // Update user session with device token
      const { error } = await supabase
        .from('user_sessions')
        .update({ device_token: deviceToken })
        .eq('user_id', userId)
        .eq('id', sessionId || 'current_session');

      if (error) {
        logger.error(`❌ Failed to store device token for user ${userId}:`, error);
        return false;
      }

      logger.info(`✅ Device token stored for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('❌ Failed to store device token:', error);
      return false;
    }
  }

  /**
   * Send custom notification
   * @param {string} userId - User ID
   * @param {Object} notificationData - Custom notification data
   */
  async sendCustomNotification(userId, notificationData) {
    try {
      const { title, body, data, email, push } = notificationData;

      // Get user data and notification preferences
      const [userData, notificationSettings] = await Promise.all([
        this.getUserData(userId),
        this.getNotificationSettings(userId)
      ]);

      if (!userData) {
        logger.error(`❌ User ${userId} not found`);
        return;
      }

      const notifications = [];

      // Send email if requested and enabled
      if (email && notificationSettings?.email_notifications && userData.email) {
        const emailPromise = emailService.sendEmail(
          userData.email,
          title,
          body,
          email.html || body
        ).catch(error => {
          logger.error(`❌ Custom email notification failed for user ${userId}:`, error);
        });
        notifications.push(emailPromise);
      }

      // Send push notification if requested and enabled
      if (push && notificationSettings?.push_enabled) {
        const deviceTokens = await this.getUserDeviceTokens(userId);
        if (deviceTokens.length > 0) {
          const pushPromise = firebaseService.sendMulticastNotification(
            deviceTokens,
            {
              notification: { title, body },
              data: data || {},
              android: push.android || { priority: 'high' },
              apns: push.apns || {}
            }
          ).catch(error => {
            logger.error(`❌ Custom push notification failed for user ${userId}:`, error);
          });
          notifications.push(pushPromise);
        }
      }

      await Promise.all(notifications);
      logger.info(`✅ Custom notification sent to user ${userId}`);
    } catch (error) {
      logger.error('❌ Failed to send custom notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} transactionData - Transaction details
   * @param {string} status - 'success' or 'failure'
   */
  async sendBulkTransactionNotification(userIds, transactionData, status) {
    try {
      const notificationPromises = userIds.map(userId => 
        this.sendTransactionNotification(userId, transactionData, status)
          .catch(error => {
            logger.error(`❌ Bulk notification failed for user ${userId}:`, error);
          })
      );

      await Promise.all(notificationPromises);
      logger.info(`✅ Bulk notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('❌ Failed to send bulk notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new NotificationService(); 