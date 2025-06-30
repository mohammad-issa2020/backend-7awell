/**
 * Notification Testing Configuration Guide
 * 
 * This file shows you how to configure your environment for notification testing
 */

// Required environment variables for notification testing
export const requiredEnvVars = {
  // Email Configuration (Gmail or SMTP)
  EMAIL_SERVICE: 'gmail', // or 'smtp'
  EMAIL_HOST: 'smtp.gmail.com', // only if using SMTP
  EMAIL_PORT: '587', // only if using SMTP
  EMAIL_SECURE: 'false', // only if using SMTP
  EMAIL_USER: 'your-email@gmail.com',
  EMAIL_PASS: 'your-app-password', // Gmail App Password, not regular password
  
  // Firebase Configuration (for push notifications)
  FIREBASE_PROJECT_ID: 'your-project-id',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n',
  FIREBASE_CLIENT_EMAIL: 'your-service-account@your-project.iam.gserviceaccount.com',
  
  // Database Configuration (Supabase)
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
  
  // BetterStack (for logging notification events)
  BETTER_STACK_SOURCE_TOKEN: 'your-betterstack-token',
  
  // Phone hashing (for secure logging)
  PHONE_HASH_SALT: 'your-random-salt-string'
};

/**
 * Setup Instructions for Testing Notifications
 */
export const setupInstructions = {
  email: {
    gmail: [
      '1. Enable 2-Factor Authentication on your Gmail account',
      '2. Generate an App Password: https://myaccount.google.com/apppasswords',
      '3. Use the App Password (not your regular password) in EMAIL_PASS',
      '4. Set EMAIL_SERVICE=gmail and EMAIL_USER=your-email@gmail.com'
    ],
    smtp: [
      '1. Get SMTP credentials from your email provider',
      '2. Set EMAIL_SERVICE=smtp',
      '3. Configure EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE',
      '4. Set EMAIL_USER and EMAIL_PASS with your SMTP credentials'
    ]
  },
  
  firebase: [
    '1. Go to Firebase Console: https://console.firebase.google.com',
    '2. Create or select your project',
    '3. Go to Project Settings > Service Accounts',
    '4. Generate new private key (downloads JSON file)',
    '5. Extract projectId, privateKey, and clientEmail from JSON',
    '6. Set the environment variables in your .env file'
  ],
  
  database: [
    '1. Get your Supabase credentials from: https://app.supabase.com',
    '2. Go to Project Settings > API',
    '3. Copy URL and anon key',
    '4. For service role key: Project Settings > API > service_role key'
  ]
};

/**
 * Test Commands
 */
export const testCommands = {
  all: 'node test-notifications.js',
  email: 'node test-notifications.js --email',
  push: 'node test-notifications.js --push', 
  custom: 'node test-notifications.js --custom',
  bulk: 'node test-notifications.js --bulk',
  errors: 'node test-notifications.js --errors'
};

/**
 * Common Issues and Solutions
 */
export const troubleshooting = {
  email: {
    'Authentication failed': [
      'Check if 2FA is enabled and you are using App Password',
      'Verify EMAIL_USER and EMAIL_PASS are correct',
      'Make sure "Less secure app access" is enabled (if not using App Password)'
    ],
    'Connection timeout': [
      'Check your internet connection',
      'Verify EMAIL_HOST and EMAIL_PORT',
      'Try with EMAIL_SECURE=false for port 587'
    ]
  },
  
  firebase: {
    'Authentication error': [
      'Verify your service account JSON is correctly parsed',
      'Check if FIREBASE_PRIVATE_KEY has proper newlines (\\n)',
      'Ensure the service account has FCM permissions'
    ],
    'Invalid registration token': [
      'The test token is fake - use a real FCM token from your mobile app',
      'Get FCM token from your React Native/Flutter app',
      'Token format should be like: "cX1..." (long string)'
    ]
  },
  
  database: {
    'Connection failed': [
      'Check SUPABASE_URL format: https://xxx.supabase.co',
      'Verify SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY',
      'Ensure your IP is allowed (if using row-level security)'
    ]
  }
};

/**
 * How to get real FCM token for testing
 */
export const getFCMToken = {
  reactNative: `
    // Install: npm install @react-native-firebase/messaging
    import messaging from '@react-native-firebase/messaging';
    
    async function getFCMToken() {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    }
  `,
  
  flutter: `
    // Add to pubspec.yaml: firebase_messaging: ^14.0.0
    import 'package:firebase_messaging/firebase_messaging.dart';
    
    Future<String?> getFCMToken() async {
      String? token = await FirebaseMessaging.instance.getToken();
      print('FCM Token: \$token');
      return token;
    }
  `,
  
  web: `
    // Install: npm install firebase
    import { getMessaging, getToken } from "firebase/messaging";
    
    const messaging = getMessaging();
    getToken(messaging, { vapidKey: 'your-vapid-key' }).then((token) => {
      console.log('FCM Token:', token);
    });
  `
};

/**
 * Database Setup for Testing
 */
export const databaseSetup = `
  -- Create test user (run in Supabase SQL editor)
  INSERT INTO users (id, email, full_name, phone_number) 
  VALUES (
    'test-user-123', 
    'test@example.com', 
    'Test User',
    '+1234567890'
  );
  
  -- Create default notification settings
  INSERT INTO notification_settings (
    user_id, 
    email_notifications, 
    push_enabled, 
    transaction_alerts
  ) VALUES (
    'test-user-123', 
    true, 
    true, 
    true
  );
  
  -- Create test session with device token
  INSERT INTO user_sessions (
    id,
    user_id,
    device_token,
    is_active
  ) VALUES (
    'test-session-123',
    'test-user-123', 
    'test-fcm-token-123456789',
    true
  );
`;

console.log('📋 Notification Testing Configuration Guide');
console.log('============================================');
console.log('');
console.log('🔧 Required Environment Variables:');
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  console.log(`  ${key}=${value}`);
});
console.log('');
console.log('📖 Setup Instructions:');
console.log('  Gmail:', setupInstructions.email.gmail);
console.log('  Firebase:', setupInstructions.firebase);
console.log('  Database:', setupInstructions.database);
console.log('');
console.log('🧪 Test Commands:');
Object.entries(testCommands).forEach(([test, command]) => {
  console.log(`  ${test}: ${command}`);
}); 