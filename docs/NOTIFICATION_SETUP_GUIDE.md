# Notification Setup Guide

This guide will help you set up email and Firebase push notifications for transaction alerts in your 7awel wallet application.

## Overview

The notification system supports:
- ✅ Email notifications using nodemailer
- ✅ Firebase push notifications for mobile devices
- ✅ User preference management
- ✅ Automatic transaction status notifications

## Environment Variables

Add the following environment variables to your `.env` file:

### Email Configuration

```env
# Email Service Configuration
EMAIL_SERVICE=gmail                    # or 'smtp' for custom SMTP
EMAIL_HOST=smtp.gmail.com             # Required if EMAIL_SERVICE=smtp
EMAIL_PORT=587                        # Required if EMAIL_SERVICE=smtp
EMAIL_SECURE=false                    # true for 465, false for other ports
EMAIL_USER=your-email@gmail.com       # Your email address
EMAIL_PASS=your-app-password          # App password (not regular password)
EMAIL_FROM=7awel Wallet <noreply@7awel.com>  # From address for emails
```

### Firebase Configuration

```env
# Firebase Configuration (Cloud Messaging only)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
# No FIREBASE_DATABASE_URL needed - only using Cloud Messaging for notifications
```

## Setup Instructions

### 1. Email Setup (Gmail Example)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

3. **Alternative Email Services**:
   ```env
   # For Outlook/Hotmail
   EMAIL_SERVICE=hotmail
   EMAIL_HOST=smtp-mail.outlook.com
   EMAIL_PORT=587
   
   # For Yahoo
   EMAIL_SERVICE=yahoo
   EMAIL_HOST=smtp.mail.yahoo.com
   EMAIL_PORT=587
   
   # For Custom SMTP
   EMAIL_SERVICE=smtp
   EMAIL_HOST=your-smtp-server.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   ```

### 2. Firebase Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project or select existing
   - Enable Cloud Messaging

2. **Generate Service Account Key**:
   - Project Settings → Service accounts
   - Generate new private key
   - Download JSON file

3. **Extract Configuration**:
   ```javascript
   // From the downloaded JSON file - extract these 3 values only:
   {
     "project_id": "your-project-id",           // → FIREBASE_PROJECT_ID
     "private_key": "-----BEGIN PRIVATE...",   // → FIREBASE_PRIVATE_KEY
     "client_email": "firebase-adminsdk@...",  // → FIREBASE_CLIENT_EMAIL
   }
   // Note: We don't need database_url for Cloud Messaging
   ```

4. **Important Notes**:
   - Escape newlines in private key: `\n` → `\\n`
   - Keep private key secure and never commit to git
   - Consider using environment-specific service accounts

## Database Migration

Run the migration to add device token support:

```bash
# Apply the migration (if using a migration tool)
# or execute the SQL directly in your database:
```

```sql
-- Add device_token column to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_token 
ON user_sessions(device_token) 
WHERE device_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device_token 
ON user_sessions(user_id, device_token) 
WHERE device_token IS NOT NULL;
```

## Client Integration

### Storing Device Tokens

When a user logs in from a mobile device, store their FCM token:

```javascript
// Example API endpoint to store device token
POST /api/auth/device-token
{
  "deviceToken": "fcm-device-token-here",
  "sessionId": "user-session-id" // optional
}
```

### Frontend Integration

```javascript
// Example React Native/Flutter integration
import messaging from '@react-native-firebase/messaging';

// Request permission and get token
const getDeviceToken = async () => {
  const authStatus = await messaging().requestPermission();
  
  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
    const token = await messaging().getToken();
    
    // Send token to your backend
    await fetch('/api/auth/device-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken: token })
    });
  }
};
```

## Testing

### Test Email Service

```javascript
// Test email configuration
import emailService from './services/emailService.js';

// Verify connection
const isValid = await emailService.verifyConnection();
console.log('Email service status:', isValid);

// Send test email
await emailService.sendEmail(
  'test@example.com',
  'Test Subject',
  'Test message',
  '<h1>Test HTML message</h1>'
);
```

### Test Firebase Service

```javascript
// Test Firebase configuration
import firebaseService from './services/firebaseService.js';

// Check initialization
console.log('Firebase initialized:', firebaseService.isInitialized());

// Test token validation
const isValidToken = await firebaseService.validateToken('test-token');
console.log('Token valid:', isValidToken);
```

### Test Complete Notification Flow

```javascript
// Test transaction notification
import notificationService from './services/notificationService.js';

const transactionData = {
  transactionId: 'test-123',
  type: 'transfer',
  amount: 100,
  assetSymbol: 'USDC',
  recipientAddress: '0x123...',
  createdAt: new Date().toISOString()
};

await notificationService.sendTransactionNotification(
  'user-id-here',
  transactionData,
  'success' // or 'failure'
);
```

## Notification Preferences

Users can control their notification preferences through the `notification_settings` table:

```sql
-- Update user notification preferences
UPDATE notification_settings 
SET 
  transaction_alerts = true,      -- Enable/disable transaction notifications
  email_notifications = true,     -- Enable/disable email notifications
  push_enabled = true            -- Enable/disable push notifications
WHERE user_id = 'user-id-here';
```

## API Endpoints

Consider adding these endpoints for notification management:

```javascript
// Get user notification settings
GET /api/notifications/settings

// Update notification settings
PUT /api/notifications/settings
{
  "transaction_alerts": true,
  "email_notifications": true,
  "push_enabled": true
}

// Store device token
POST /api/notifications/device-token
{
  "deviceToken": "fcm-token-here"
}

// Send test notification
POST /api/notifications/test
{
  "type": "email" | "push" | "both"
}
```

## Troubleshooting

### Email Issues

1. **Authentication failed**:
   - Verify app password (not regular password)
   - Enable 2FA on email account
   - Check email service configuration

2. **Connection timeout**:
   - Check firewall settings
   - Verify SMTP host and port
   - Try with SSL/TLS settings

### Firebase Issues

1. **Service account errors**:
   - Verify JSON file format
   - Check private key formatting (newlines)
   - Ensure service account has proper permissions

2. **Token validation failed**:
   - Verify FCM token format
   - Check if token is expired
   - Ensure Firebase project settings are correct

### Database Issues

1. **Migration failed**:
   - Check database permissions
   - Verify migration SQL syntax
   - Ensure uuid extension is enabled

## Security Considerations

1. **Environment Variables**:
   - Never commit sensitive keys to git
   - Use different keys for different environments
   - Rotate keys regularly

2. **Device Tokens**:
   - Validate tokens before storing
   - Clean up expired tokens
   - Rate limit token updates

3. **Email Security**:
   - Use app passwords, not regular passwords
   - Enable email encryption when possible
   - Monitor for suspicious sending patterns

## Performance Tips

1. **Async Processing**:
   - Send notifications asynchronously
   - Use queues for high-volume notifications
   - Implement retry logic for failed sends

2. **Database Optimization**:
   - Use indexes on frequently queried columns
   - Clean up old device tokens
   - Batch notification queries when possible

3. **Caching**:
   - Cache user notification preferences
   - Cache Firebase token validation results
   - Use connection pooling for email service

## Monitoring

Set up monitoring for:
- Email delivery rates
- Firebase notification success rates
- Failed notification attempts
- User preference changes
- Device token expiration rates

## Support

For additional help:
- Check application logs for detailed error messages
- Verify environment variable configuration
- Test services individually before integration
- Monitor notification delivery metrics 