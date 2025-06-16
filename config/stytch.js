import dotenv from 'dotenv';
dotenv.config();

import * as stytch from 'stytch';

// Check if required environment variables are present
const STYTCH_PROJECT_ID = process.env.STYTCH_PROJECT_ID;
const STYTCH_SECRET = process.env.STYTCH_SECRET;

console.log('STYTCH_PROJECT_ID:', process.env.STYTCH_PROJECT_ID);
console.log('STYTCH_SECRET:', process.env.STYTCH_SECRET);

// Handle missing Stytch configuration gracefully
if (!STYTCH_PROJECT_ID || !STYTCH_SECRET) {
  throw new Error('❌ Stytch environment variables not configured. Please set STYTCH_PROJECT_ID and STYTCH_SECRET in your environment variables.');
}

// Create real Stytch client if environment variables are present
const stytchClient = new stytch.Client({
  project_id: STYTCH_PROJECT_ID,
  secret: STYTCH_SECRET,
  env: process.env.NODE_ENV === 'production' ? stytch.envs.live : stytch.envs.test,
});

console.log('✅ Stytch client initialized successfully');

export default stytchClient; 