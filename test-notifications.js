import notificationService from './services/notificationService.js';
import firebaseService from './services/firebaseService.js';
import emailService from './services/emailService.js';
import logger from './utils/logger.js';
import { randomUUID } from 'crypto';

// Set up email configuration based on provided Gmail settings
process.env.EMAIL_SERVICE = 'gmail';
process.env.EMAIL_HOST = 'smtp.gmail.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_SECURE = 'false'; // TLS/STARTTLS for port 587
process.env.EMAIL_USER = 'issaa.mohammad12@gmail.com';
process.env.EMAIL_PASS = 'zmdl avix ghxy klxl';
process.env.EMAIL_FROM = 'issaa.mohammad12@gmail.com'; // Missing EMAIL_FROM

// Test data with proper UUID
const testUser = {
  id: randomUUID(), // Generate proper UUID instead of "test-user-123"
  email: 'issaa.mohammad12@gmail.com', // Using your actual email for testing
  full_name: 'Test User'
};

const testTransaction = {
  transactionId: 'test-tx-456',
  type: 'transfer',
  amount: 100.50,
  assetSymbol: 'USDC',
  recipientAddress: '0x742d35cc6bf962532c91fd06b4d2c4b6b7cce7f2',
  reference: 'Test payment',
  createdAt: new Date().toISOString()
};

const testDeviceToken = 'test-fcm-token-123456789';

/**
 * Test 1: Email notifications
 */
async function testEmailNotifications() {
  console.log('\n🧪 Testing Email Notifications...\n');
  
  try {
    // Test email transporter
    await emailService.verifyConnection();
    console.log('✅ Email service connection verified');
    
    // Test success email
    console.log('📧 Testing transaction success email...');
    await emailService.sendTransactionSuccessEmail(testUser.email, testTransaction);
    console.log('✅ Success email sent');
    
    // Test failure email
    const failedTransaction = {
      ...testTransaction,
      failureReason: 'Insufficient balance'
    };
    
    console.log('📧 Testing transaction failure email...');
    await emailService.sendTransactionFailureEmail(testUser.email, failedTransaction);
    console.log('✅ Failure email sent');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('💡 Check your email configuration in .env file');
  }
}

/**
 * Test 2: Firebase Push notifications
 */
async function testPushNotifications() {
  console.log('\n🧪 Testing Push Notifications...\n');
  
  try {
    // Check Firebase initialization
    if (firebaseService.isInitialized()) {
      console.log('✅ Firebase service is initialized');
      
      // Test token validation
      console.log('📱 Testing device token validation...');
      const isValidToken = await firebaseService.validateToken(testDeviceToken);
      console.log(`📱 Token validation result: ${isValidToken ? 'Valid' : 'Invalid'}`);
      
      // Test success push notification
      console.log('📱 Testing transaction success push notification...');
      const successResponse = await firebaseService.sendTransactionSuccessNotification(
        testDeviceToken, 
        testTransaction
      );
      console.log('✅ Success push notification sent:', successResponse);
      
      // Test failure push notification
      const failedTransaction = {
        ...testTransaction,
        failureReason: 'Network timeout'
      };
      
      console.log('📱 Testing transaction failure push notification...');
      const failureResponse = await firebaseService.sendTransactionFailureNotification(
        testDeviceToken, 
        failedTransaction
      );
      console.log('✅ Failure push notification sent:', failureResponse);
      
    } else {
      console.log('⚠️ Firebase service not initialized. Skipping push tests.');
      console.log('💡 Check your Firebase configuration in .env file');
    }
    
  } catch (error) {
    console.error('❌ Push notification test failed:', error.message);
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('💡 The test token is invalid. Use a real FCM token from your mobile app.');
    } else if (error.code === 'messaging/authentication-error') {
      console.log('💡 Firebase authentication failed. Check your service account credentials.');
    }
  }
}

/**
 * Test 3: Comprehensive notification service
 */
async function testNotificationService() {
  console.log('\n🧪 Testing Notification Service...\n');
  
  try {
    // Test device token storage
    console.log('💾 Testing device token storage...');
    const tokenStored = await notificationService.storeDeviceToken(
      testUser.id, 
      testDeviceToken, 
      'test-session-123'
    );
    console.log(`💾 Device token storage result: ${tokenStored ? 'Success' : 'Failed'}`);
    
    // Test transaction success notification
    console.log('🔔 Testing transaction success notification...');
    await notificationService.sendTransactionNotification(
      testUser.id, 
      testTransaction, 
      'success'
    );
    console.log('✅ Transaction success notification sent');
    
    // Test transaction failure notification
    const failedTransaction = {
      ...testTransaction,
      failureReason: 'Insufficient balance'
    };
    
    console.log('🔔 Testing transaction failure notification...');
    await notificationService.sendTransactionNotification(
      testUser.id, 
      failedTransaction, 
      'failure'
    );
    console.log('✅ Transaction failure notification sent');
    
  } catch (error) {
    console.error('❌ Notification service test failed:', error.message);
  }
}

/**
 * Test 4: Custom notifications
 */
async function testCustomNotifications() {
  console.log('\n🧪 Testing Custom Notifications...\n');
  
  try {
    const customNotification = {
      title: '🔒 Security Alert',
      body: 'New device login detected for your account',
      data: {
        type: 'security_alert',
        device: 'Test Device',
        location: 'Test Location',
        timestamp: new Date().toISOString()
      },
      email: {
        subject: '🔒 Security Alert - 7awel Wallet',
        html: `
          <h2>🔒 Security Alert</h2>
          <p>We detected a new device login for your account:</p>
          <ul>
            <li><strong>Device:</strong> Test Device</li>
            <li><strong>Location:</strong> Test Location</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
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
    
    await notificationService.sendCustomNotification(testUser.id, customNotification);
    console.log('✅ Custom notification sent');
    
  } catch (error) {
    console.error('❌ Custom notification test failed:', error.message);
  }
}

/**
 * Test 5: Bulk notifications
 */
async function testBulkNotifications() {
  console.log('\n🧪 Testing Bulk Notifications...\n');
  
  try {
    const userIds = ['test-user-1', 'test-user-2', 'test-user-3'];
    const bulkTransaction = {
      transactionId: 'bulk-tx-789',
      type: 'reward',
      amount: 50,
      assetSymbol: 'USDT',
      reference: 'Monthly reward',
      createdAt: new Date().toISOString()
    };
    
    console.log(`🔔 Sending bulk notifications to ${userIds.length} users...`);
    await notificationService.sendBulkTransactionNotification(
      userIds, 
      bulkTransaction, 
      'success'
    );
    console.log('✅ Bulk notifications sent');
    
  } catch (error) {
    console.error('❌ Bulk notification test failed:', error.message);
  }
}

/**
 * Test 6: Error handling
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...\n');
  
  try {
    // Test with invalid user ID
    console.log('❌ Testing with invalid user ID...');
    await notificationService.sendTransactionNotification(
      null, 
      testTransaction, 
      'success'
    );
  } catch (error) {
    console.log('✅ Correctly caught error for invalid user ID:', error.message);
  }
  
  try {
    // Test with invalid status
    console.log('❌ Testing with invalid status...');
    await notificationService.sendTransactionNotification(
      testUser.id, 
      testTransaction, 
      'invalid-status'
    );
  } catch (error) {
    console.log('✅ Correctly caught error for invalid status:', error.message);
  }
  
  try {
    // Test with missing transaction data
    console.log('❌ Testing with missing transaction data...');
    await notificationService.sendTransactionNotification(
      testUser.id, 
      null, 
      'success'
    );
  } catch (error) {
    console.log('✅ Correctly caught error for missing transaction data:', error.message);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 Starting Notification System Tests...');
  console.log('=' .repeat(50));
  
  // Check environment
  console.log('\n📋 Environment Check:');
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? '✅' : '❌'}`);
  console.log(`🔥 Firebase configured: ${process.env.FIREBASE_PROJECT_ID ? '✅' : '❌'}`);
  console.log(`🔗 Database connected: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  
  // Run tests
  await testEmailNotifications();
  await testPushNotifications();
  await testNotificationService();
  await testCustomNotifications();
  await testBulkNotifications();
  await testErrorHandling();
  
  console.log('\n🏁 Notification tests completed!');
  console.log('=' .repeat(50));
  
  // Test specific functions
  if (process.argv.includes('--email')) {
    await testEmailNotifications();
  } else if (process.argv.includes('--push')) {
    await testPushNotifications();
  } else if (process.argv.includes('--custom')) {
    await testCustomNotifications();
  } else if (process.argv.includes('--bulk')) {
    await testBulkNotifications();
  } else if (process.argv.includes('--errors')) {
    await testErrorHandling();
  } else {
    // Run all tests by default
    await runAllTests();
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in notification test:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection in notification test:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error); 