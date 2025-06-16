import dotenv from 'dotenv';

// Load environment variables as early as possible
dotenv.config();

// Export environment variables for easy access
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  STYTCH_PROJECT_ID: process.env.STYTCH_PROJECT_ID,
  STYTCH_SECRET: process.env.STYTCH_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET
};

export default ENV; 