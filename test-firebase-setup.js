// Test Firebase setup
import firebaseService from './services/firebaseService.js';
import { ENV } from './config/env.js';

async function testFirebaseSetup() {
  console.log('🔥 Testing Firebase Setup...');
  
  console.log('Environment variables:');
  console.log('FIREBASE_PROJECT_ID:', ENV.FIREBASE_PROJECT_ID);
  console.log('FIREBASE_CLIENT_EMAIL:', ENV.FIREBASE_CLIENT_EMAIL ? 'Set ✅' : 'Missing ❌');
  console.log('FIREBASE_PRIVATE_KEY:', ENV.FIREBASE_PRIVATE_KEY ? 'Set ✅' : 'Missing ❌');
  console.log('Note: No Firebase Database needed - using Cloud Messaging only');
  
  console.log('\nFirebase Service Status:');
  console.log('Initialized:', firebaseService.isInitialized() ? '✅' : '❌');
  
  if (firebaseService.isInitialized()) {
    console.log('🎉 Firebase is ready to send notifications!');
  } else {
    console.log('❌ Firebase setup incomplete. Please check your service account key.');
  }
}

testFirebaseSetup().catch(console.error); 