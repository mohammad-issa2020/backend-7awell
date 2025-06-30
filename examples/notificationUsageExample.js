// Example usage of the notification system
import notificationService from '../services/notificationService.js';
import transactionService from '../services/transactionService.js';

/**
 * Example 1: Manual transaction notification
 * Use this when you need to send notifications manually
 */
export async function sendManualTransactionNotification() {
  const userId = 'user-123';
  const transactionData = {
    transactionId: 'tx_67890',
    type: 'transfer',
    amount: 250.50,
    assetSymbol: 'USDC',
    recipientAddress: '0x742d35cc6bf962532c91fd06b4d2c4b6b7cce7f2',
    reference: 'Payment for services',
    createdAt: new Date().toISOString()
  };

  try {
    // Send success notification
    await notificationService.sendTransactionNotification(
      userId, 
      transactionData, 
      'success'
    );
    console.log('✅ Success notification sent');

    // Send failure notification (with failure reason)
    const failedTransactionData = {
      ...transactionData,
      failureReason: 'Insufficient balance'
    };
    
    await notificationService.sendTransactionNotification(
      userId, 
      failedTransactionData, 
      'failure'
    );
    console.log('✅ Failure notification sent');
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
  }
}

/**
 * Example 2: Automatic notification via transaction service
 * This happens automatically when you update transaction status
 */
export async function updateTransactionWithNotification() {
  const userId = 'user-123';
  const transactionId = 'tx_67890';

  try {
    // Update transaction to completed - notification sent automatically
    await transactionService.updateTransactionStatus(
      userId, 
      transactionId, 
      'completed',
      {
        txHash: '0xabc123...',
        blockNumber: 18500000,
        gasUsed: 21000
      }
    );
    console.log('✅ Transaction updated and notification sent');

    // Update transaction to failed - notification sent automatically
    await transactionService.updateTransactionStatus(
      userId, 
      transactionId, 
      'failed',
      {
        errorReason: 'Network timeout',
        errorCode: 'TIMEOUT_ERROR'
      }
    );
    console.log('✅ Transaction failed and notification sent');
  } catch (error) {
    console.error('❌ Failed to update transaction:', error);
  }
}

/**
 * Example 3: Store device token for push notifications
 */
export async function storeUserDeviceToken() {
  const userId = 'user-123';
  const deviceToken = 'fcm-device-token-from-mobile-app';
  const sessionId = 'session-456';

  try {
    const success = await notificationService.storeDeviceToken(
      userId, 
      deviceToken, 
      sessionId
    );
    
    if (success) {
      console.log('✅ Device token stored successfully');
    } else {
      console.log('❌ Failed to store device token');
    }
  } catch (error) {
    console.error('❌ Error storing device token:', error);
  }
}

/**
 * Example 4: Send custom notification
 */
export async function sendCustomNotification() {
  const userId = 'user-123';
  
  const customNotificationData = {
    title: 'Security Alert',
    body: 'New device login detected for your account',
    data: {
      type: 'security_alert',
      device: 'iPhone 14',
      location: 'New York, US',
      timestamp: new Date().toISOString()
    },
    email: {
      html: `
        <h2>Security Alert</h2>
        <p>We detected a new device login for your account:</p>
        <ul>
          <li>Device: iPhone 14</li>
          <li>Location: New York, US</li>
          <li>Time: ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this wasn't you, please secure your account immediately.</p>
      `
    },
    push: {
      android: {
        priority: 'high',
        notification: {
          color: '#ff6b35',
          icon: 'ic_security_alert'
        }
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'security_alert.wav'
          }
        }
      }
    }
  };

  try {
    await notificationService.sendCustomNotification(userId, customNotificationData);
    console.log('✅ Custom notification sent');
  } catch (error) {
    console.error('❌ Failed to send custom notification:', error);
  }
}

/**
 * Example 5: Bulk notifications
 */
export async function sendBulkNotifications() {
  const userIds = ['user-123', 'user-456', 'user-789'];
  const transactionData = {
    transactionId: 'bulk_tx_001',
    type: 'cash_out',
    amount: 1000,
    assetSymbol: 'USDT',
    createdAt: new Date().toISOString()
  };

  try {
    await notificationService.sendBulkTransactionNotification(
      userIds, 
      transactionData, 
      'success'
    );
    console.log('✅ Bulk notifications sent');
  } catch (error) {
    console.error('❌ Failed to send bulk notifications:', error);
  }
}

/**
 * Example 6: Usage in Express route handler
 */
export function createNotificationRoutes(app) {
  // Endpoint to store device token
  app.post('/api/notifications/device-token', async (req, res) => {
    try {
      const { deviceToken } = req.body;
      const userId = req.user.id; // from auth middleware
      const sessionId = req.session.id;

      const success = await notificationService.storeDeviceToken(
        userId, 
        deviceToken, 
        sessionId
      );

      if (success) {
        res.json({ success: true, message: 'Device token stored' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid device token' });
      }
    } catch (error) {
      console.error('Store device token error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Endpoint to send test notification
  app.post('/api/notifications/test', async (req, res) => {
    try {
      const { type = 'both' } = req.body;
      const userId = req.user.id;

      const testData = {
        transactionId: 'TEST_' + Date.now(),
        type: 'transfer',
        amount: 100,
        assetSymbol: 'TEST',
        createdAt: new Date().toISOString()
      };

      await notificationService.sendTransactionNotification(userId, testData, 'success');
      
      res.json({ 
        success: true, 
        message: 'Test notification sent',
        transactionId: testData.transactionId
      });
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
}

/**
 * Example 7: Service integration in transaction flow
 */
export async function processTransaction(transactionData) {
  try {
    // 1. Create transaction
    const transaction = await transactionService.createTransaction(transactionData);
    console.log('Transaction created:', transaction.id);

    // 2. Process the transaction (external API calls, blockchain interactions, etc.)
    const processingResult = await simulateTransactionProcessing(transaction);

    // 3. Update transaction status - this automatically sends notifications
    if (processingResult.success) {
      await transactionService.updateTransactionStatus(
        transaction.sender_id,
        transaction.id,
        'completed',
        {
          txHash: processingResult.txHash,
          blockNumber: processingResult.blockNumber,
          gasUsed: processingResult.gasUsed
        }
      );
      console.log('✅ Transaction completed with notification sent');
    } else {
      await transactionService.updateTransactionStatus(
        transaction.sender_id,
        transaction.id,
        'failed',
        {
          errorReason: processingResult.error,
          errorCode: processingResult.errorCode
        }
      );
      console.log('❌ Transaction failed with notification sent');
    }

    return transaction;
  } catch (error) {
    console.error('Process transaction error:', error);
    throw error;
  }
}

// Mock function to simulate transaction processing
async function simulateTransactionProcessing(transaction) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate random success/failure for demo
  const success = Math.random() > 0.3; // 70% success rate
  
  if (success) {
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      gasUsed: Math.floor(Math.random() * 50000) + 21000
    };
  } else {
    return {
      success: false,
      error: 'Insufficient balance',
      errorCode: 'INSUFFICIENT_BALANCE'
    };
  }
}

// Export all examples for testing
export const examples = {
  sendManualTransactionNotification,
  updateTransactionWithNotification,
  storeUserDeviceToken,
  sendCustomNotification,
  sendBulkNotifications,
  processTransaction
}; 