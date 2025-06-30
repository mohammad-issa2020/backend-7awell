import dotenv from 'dotenv';
import emailService from './services/emailService.js';
import logger from './utils/logger.js';

// Load environment variables from .env file
dotenv.config();

// Test transaction data
const testTransaction = {
  transactionId: 'test-tx-123',
  type: 'transfer',
  amount: 100.50,
  assetSymbol: 'USDC',
  recipientAddress: '0x742d35cc6bf962532c91fd06b4d2c4b6b7cce7f2',
  reference: 'Test payment',
  createdAt: new Date().toISOString()
};

async function testEmailFromEnv() {
  console.log('🧪 Testing Gmail Configuration from .env file...\n');
  
  // Show current configuration from environment
  console.log('📋 Current Email Configuration from .env:');
  console.log(`EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'Not set'}`);
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'Not set'}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || 'Not set'}`);
  console.log(`EMAIL_SECURE: ${process.env.EMAIL_SECURE || 'Not set'}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER || 'Not set'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'Not set'}`);
  console.log('');
  
  // Check if required email settings are configured
  const requiredSettings = ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missingSettings = requiredSettings.filter(setting => !process.env[setting]);
  
  if (missingSettings.length > 0) {
    console.log('❌ Missing required email settings in .env file:');
    missingSettings.forEach(setting => {
      console.log(`   - ${setting}`);
    });
    console.log('\n💡 Please add these settings to your .env file:');
    console.log('   EMAIL_SERVICE=gmail');
    console.log('   EMAIL_HOST=smtp.gmail.com');
    console.log('   EMAIL_PORT=587');
    console.log('   EMAIL_SECURE=false');
    console.log('   EMAIL_USER=issaa.mohammad12@gmail.com');
    console.log('   EMAIL_PASS=zmdl avix ghxy klxl');
    console.log('   EMAIL_FROM=issaa.mohammad12@gmail.com');
    console.log('\n📖 See gmail-env-config.txt for detailed setup instructions.');
    return;
  }
  
  try {
    // Test 1: Verify connection
    console.log('1️⃣ Testing email service connection...');
    const connectionResult = await emailService.verifyConnection();
    if (connectionResult) {
      console.log('✅ Email service connection verified!\n');
    } else {
      console.log('❌ Email service connection failed!\n');
      console.log('💡 Common solutions:');
      console.log('   1. Verify App Password is correct');
      console.log('   2. Enable 2-Factor Authentication on Gmail');
      console.log('   3. Generate new App Password: https://myaccount.google.com/apppasswords');
      return;
    }
    
    // Test 2: Send success email
    console.log('2️⃣ Sending transaction success email...');
    await emailService.sendTransactionSuccessEmail(
      process.env.EMAIL_USER, 
      testTransaction
    );
    console.log('✅ Success email sent! Check your inbox.\n');
    
    // Test 3: Send failure email
    console.log('3️⃣ Sending transaction failure email...');
    const failedTransaction = {
      ...testTransaction,
      failureReason: 'Insufficient balance'
    };
    
    await emailService.sendTransactionFailureEmail(
      process.env.EMAIL_USER, 
      failedTransaction
    );
    console.log('✅ Failure email sent! Check your inbox.\n');
    
    console.log('🎉 All email tests passed!');
    console.log('📧 Check your Gmail inbox for 2 test emails.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication Error - App Password Issue:');
      console.log('1. Current password may be incorrect');
      console.log('2. Go to: https://myaccount.google.com/apppasswords');
      console.log('3. Delete old app password and create new one');
      console.log('4. Select "Mail" and "Other" device');
      console.log('5. Enter "7awell Backend" as device name');
      console.log('6. Copy the 16-character password');
      console.log('7. Update EMAIL_PASS in your .env file');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection Error Solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify firewall/antivirus settings');
      console.log('3. Try different network if corporate firewall blocks SMTP');
    } else if (error.message.includes('EMAIL_FROM')) {
      console.log('\n💡 Configuration Error:');
      console.log('EMAIL_FROM is not properly set in .env file');
    }
  }
}

// Run the test
testEmailFromEnv().catch(console.error); 