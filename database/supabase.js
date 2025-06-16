import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Supabase Database Configuration
 * 
 * Environment variables required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Your Supabase anon key
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (for admin operations)
 */

// Check if required environment variables are present
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('❌ Supabase environment variables not configured. Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
}

let supabase, supabaseAdmin, testConnection, getHealthStatus;

// Regular client for most operations
supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': '7awel-crypto-wallet-backend'
      }
    }
  }
);

// Admin client for administrative operations (user management, etc.)
supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

/**
 * Test database connection
 */
testConnection = async function() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      throw error;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
};

/**
 * Get database health status
 */
getHealthStatus = async function() {
  try {
    const { data, error } = await supabase.rpc('pg_backend_pid');
    if (error) {
      throw error;
    }
    return {
      status: 'healthy',
      pid: data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

console.log('✅ Supabase client initialized successfully');

export { supabase, supabaseAdmin, testConnection, getHealthStatus }; 