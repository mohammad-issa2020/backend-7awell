import admin from 'firebase-admin';
import { ENV } from '../config/env.js';
import logger from '../utils/logger.js';

class FirebaseService {
  constructor() {
    this.app = null;
    this.messaging = null;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      if (!ENV.FIREBASE_PROJECT_ID || !ENV.FIREBASE_PRIVATE_KEY || !ENV.FIREBASE_CLIENT_EMAIL) {
        logger.warn('⚠️ Firebase configuration incomplete. Push notifications will be disabled.');
        return;
      }

      // Parse the private key (handle escaped newlines)
      const privateKey = ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      const serviceAccount = {
        projectId: ENV.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
      };

      // Initialize Firebase Admin only if not already initialized
      if (!admin.apps.length) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
          // No database needed - only using Cloud Messaging
        });
      } else {
        this.app = admin.app();
      }

      this.messaging = admin.messaging();
      logger.info('✅ Firebase service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase service:', error);
      this.app = null;
      this.messaging = null;
    }
  }

  /**
   * Send transaction success push notification
   * @param {string} deviceToken - Device FCM token
   * @param {Object} transactionData - Transaction details
   */
  async sendTransactionSuccessNotification(deviceToken, transactionData) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Skipping push notification.');
        return null;
      }

      const {
        transactionId,
        type,
        amount,
        assetSymbol,
        recipientAddress
      } = transactionData;

      const message = {
        token: deviceToken,
        notification: {
          title: '✅ Transaction Successful',
          body: `Your ${type} of ${amount} ${assetSymbol} was completed successfully`
        },
        data: {
          type: 'transaction_success',
          transactionId: transactionId.toString(),
          transactionType: type,
          amount: amount.toString(),
          assetSymbol: assetSymbol || '',
          recipientAddress: recipientAddress || '',
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4CAF50',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: '✅ Transaction Successful',
                body: `Your ${type} of ${amount} ${assetSymbol} was completed successfully`
              }
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      logger.info(`✅ Transaction success push notification sent: ${response}`);
      return response;
    } catch (error) {
      logger.error('❌ Failed to send transaction success push notification:', error);
      throw error;
    }
  }

  /**
   * Send transaction failure push notification
   * @param {string} deviceToken - Device FCM token
   * @param {Object} transactionData - Transaction details
   */
  async sendTransactionFailureNotification(deviceToken, transactionData) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Skipping push notification.');
        return null;
      }

      const {
        transactionId,
        type,
        amount,
        assetSymbol,
        failureReason
      } = transactionData;

      const message = {
        token: deviceToken,
        notification: {
          title: '❌ Transaction Failed',
          body: `Your ${type} of ${amount} ${assetSymbol} could not be completed`
        },
        data: {
          type: 'transaction_failure',
          transactionId: transactionId.toString(),
          transactionType: type,
          amount: amount.toString(),
          assetSymbol: assetSymbol || '',
          failureReason: failureReason || 'Unknown error',
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#f44336',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: '❌ Transaction Failed',
                body: `Your ${type} of ${amount} ${assetSymbol} could not be completed`
              }
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      logger.info(`✅ Transaction failure push notification sent: ${response}`);
      return response;
    } catch (error) {
      logger.error('❌ Failed to send transaction failure push notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   * @param {Array} deviceTokens - Array of device FCM tokens
   * @param {Object} notificationData - Notification data
   */
  async sendMulticastNotification(deviceTokens, notificationData) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Skipping push notification.');
        return null;
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        logger.warn('⚠️ No device tokens provided for multicast notification');
        return null;
      }

      const message = {
        tokens: deviceTokens,
        notification: notificationData.notification,
        data: notificationData.data || {},
        android: notificationData.android || {
          priority: 'high'
        },
        apns: notificationData.apns || {}
      };

      const response = await this.messaging.sendMulticast(message);
      logger.info(`✅ Multicast notification sent to ${deviceTokens.length} devices. Success: ${response.successCount}, Failure: ${response.failureCount}`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            logger.error(`❌ Failed to send to token ${deviceTokens[idx]}: ${resp.error?.message}`);
          }
        });
      }

      return response;
    } catch (error) {
      logger.error('❌ Failed to send multicast notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe device token to a topic
   * @param {string|Array} deviceTokens - Device token(s)
   * @param {string} topic - Topic name
   */
  async subscribeToTopic(deviceTokens, topic) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Cannot subscribe to topic.');
        return null;
      }

      const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      logger.info(`✅ Subscribed ${tokens.length} devices to topic: ${topic}`);
      return response;
    } catch (error) {
      logger.error(`❌ Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe device token from a topic
   * @param {string|Array} deviceTokens - Device token(s)
   * @param {string} topic - Topic name
   */
  async unsubscribeFromTopic(deviceTokens, topic) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Cannot unsubscribe from topic.');
        return null;
      }

      const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      logger.info(`✅ Unsubscribed ${tokens.length} devices from topic: ${topic}`);
      return response;
    } catch (error) {
      logger.error(`❌ Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   * @param {string} topic - Topic name
   * @param {Object} notificationData - Notification data
   */
  async sendToTopic(topic, notificationData) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Cannot send to topic.');
        return null;
      }

      const message = {
        topic: topic,
        notification: notificationData.notification,
        data: notificationData.data || {},
        android: notificationData.android || {
          priority: 'high'
        },
        apns: notificationData.apns || {}
      };

      const response = await this.messaging.send(message);
      logger.info(`✅ Notification sent to topic ${topic}: ${response}`);
      return response;
    } catch (error) {
      logger.error(`❌ Failed to send notification to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Validate device token
   * @param {string} deviceToken - Device FCM token
   */
  async validateToken(deviceToken) {
    try {
      if (!this.messaging) {
        logger.warn('⚠️ Firebase messaging not initialized. Cannot validate token.');
        return false;
      }

      // Try to send a dry run message to validate the token
      const message = {
        token: deviceToken,
        notification: {
          title: 'Test',
          body: 'Test message'
        },
        dryRun: true
      };

      await this.messaging.send(message);
      return true;
    } catch (error) {
      logger.error('❌ Token validation failed:', error);
      return false;
    }
  }

  /**
   * Check if Firebase is properly initialized
   */
  isInitialized() {
    return this.messaging !== null;
  }
}

// Export singleton instance
export default new FirebaseService(); 