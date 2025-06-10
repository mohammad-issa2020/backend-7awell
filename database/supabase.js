const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

// Handle missing Supabase configuration gracefully
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Supabase environment variables not configured. Using mock configuration for testing.');
  console.warn('   Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
  console.warn('   See ENVIRONMENT_SETUP.md for setup instructions.');
  
  // Create mock Supabase clients for testing
  const mockClient = {
    from: (table) => ({
      select: (columns = '*') => ({
        eq: (column, value) => ({
          single: () => Promise.resolve({ 
            data: table === 'users' ? {
              id: 'mock-user-id',
              email: 'test@example.com',
              phone_number: '+1234567890',
              stytch_user_id: 'mock-stytch-user-id',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : null, 
            error: null 
          }),
          or: (condition) => ({
            single: () => Promise.resolve({ 
              data: table === 'users' ? {
                id: 'mock-user-id',
                email: 'test@example.com',
                phone_number: '+1234567890',
                stytch_user_id: 'mock-stytch-user-id',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } : null, 
              error: null 
            })
          })
        }),
        or: (condition) => ({
          single: () => Promise.resolve({ 
            data: table === 'users' ? {
              id: 'mock-user-id',
              email: 'test@example.com',
              phone_number: '+1234567890',
              stytch_user_id: 'mock-stytch-user-id',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : null, 
            error: null 
          }),
          eq: (column, value) => ({
            single: () => Promise.resolve({ 
              data: table === 'users' ? {
                id: 'mock-user-id',
                email: 'test@example.com',
                phone_number: '+1234567890',
                stytch_user_id: 'mock-stytch-user-id',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } : null, 
              error: null 
            })
          })
        }),
        limit: (count) => Promise.resolve({ 
          data: table === 'transactions' ? [] : 
                table === 'users' ? [{
                  id: 'mock-user-id',
                  email: 'test@example.com',
                  phone_number: '+1234567890',
                  stytch_user_id: 'mock-stytch-user-id',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }] : [], 
          error: null 
        }),
        order: (column, options) => ({
          limit: (count) => Promise.resolve({ 
            data: table === 'transactions' ? [] : [], 
            error: null 
          })
        })
      }),
      insert: (data) => ({
        select: () => Promise.resolve({ 
          data: [{ 
            id: 'mock-id', 
            ...data,
            created_at: new Date().toISOString() 
          }], 
          error: null 
        })
      }),
      update: (data) => ({
        eq: (column, value) => ({
          select: () => Promise.resolve({ 
            data: [{ 
              id: 'mock-id',
              ...data,
              updated_at: new Date().toISOString() 
            }], 
            error: null 
          })
        })
      }),
      delete: () => ({
        eq: (column, value) => Promise.resolve({ data: null, error: null })
      })
    }),
    rpc: (functionName, params) => Promise.resolve({ 
      data: functionName === 'get_user_transactions' ? [] : null, 
      error: null 
    }),
    auth: {
      signInWithPassword: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: null 
      })
    }
  };

  module.exports = {
    supabase: mockClient,
    supabaseAdmin: mockClient,
    testConnection: () => Promise.resolve(true),
    getHealthStatus: () => Promise.resolve({
      status: 'healthy (mock)',
      pid: 'mock-pid',
      timestamp: new Date().toISOString()
    })
  };
  
  return; // Exit early to prevent real client creation
}

// Regular client for most operations
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side doesn't need session persistence
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
const supabaseAdmin = createClient(
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
async function testConnection() {
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
}

/**
 * Get database health status
 */
async function getHealthStatus() {
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
}

console.log('✅ Supabase client initialized successfully');

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  getHealthStatus
}; 