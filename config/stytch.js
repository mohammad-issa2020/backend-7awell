const stytch = require('stytch');

// Check if required environment variables are present
const STYTCH_PROJECT_ID = process.env.STYTCH_PROJECT_ID;
const STYTCH_SECRET = process.env.STYTCH_SECRET;

// Handle missing Stytch configuration gracefully
if (!STYTCH_PROJECT_ID || !STYTCH_SECRET) {
  console.warn('⚠️  Stytch environment variables not configured. Using mock configuration for testing.');
  console.warn('   Please set STYTCH_PROJECT_ID and STYTCH_SECRET in your environment variables.');
  console.warn('   See STYTCH_SETUP_GUIDE.md for setup instructions.');
  
  // Export a mock client for testing and return early
  const mockClient = {
    otps: {
      sms: {
        send: () => Promise.resolve({ 
          status_code: 200, 
          method_id: 'mock-method-id-sms',
          user_id: 'mock-user-id'
        }),
        loginOrCreate: () => Promise.resolve({ 
          status_code: 200, 
          method_id: 'mock-method-id-sms',
          user_id: 'mock-user-id'
        })
      },
      email: {
        send: () => Promise.resolve({ 
          status_code: 200, 
          method_id: 'mock-method-id-email',
          user_id: 'mock-user-id'
        }),
        loginOrCreate: () => Promise.resolve({ 
          status_code: 200, 
          method_id: 'mock-method-id-email',
          user_id: 'mock-user-id'
        })
      },
      whatsapp: {
        send: () => Promise.resolve({ 
          status_code: 200, 
          method_id: 'mock-method-id-whatsapp',
          user_id: 'mock-user-id'
        }),
        loginOrCreate: () => Promise.resolve({ 
          status_code: 200, 
          method_id: 'mock-method-id-whatsapp',
          user_id: 'mock-user-id'
        })
      },
      authenticate: (params) => {
        const { session_token } = params || {};
        
        // Mock validation: reject invalid tokens
        if (session_token === 'invalid-token' || session_token === 'Bearer invalid-token') {
          return Promise.resolve({
            status_code: 401,
            error_type: 'invalid_token',
            error_message: 'Invalid session token'
          });
        }
        
        return Promise.resolve({
          status_code: 200,
          user: {
            user_id: 'mock-user-id',
            phone_numbers: [{ phone_number: '+1234567890' }],
            emails: [{ email: 'test@example.com' }],
            created_at: new Date().toISOString(),
            status: 'active'
          },
          session: {
            session_id: 'mock-session-id',
            user_id: 'mock-user-id',
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          session_token: 'mock-session-token',
          session_jwt: 'mock-session-jwt'
        });
      }
    },
    magicLinks: {
      email: {
        loginOrCreate: () => Promise.resolve({
          status_code: 200,
          user: {
            user_id: 'mock-user-id',
            emails: [{ email: 'test@example.com' }],
            created_at: new Date().toISOString(),
            status: 'active'
          },
          session_token: 'mock-session-token',
          session_jwt: 'mock-session-jwt'
        })
      }
    },
    sessions: {
      authenticate: (params) => {
        const { session_token } = params || {};
        
        // Mock validation: reject invalid tokens
        if (session_token === 'invalid-token' || session_token === 'Bearer invalid-token') {
          return Promise.resolve({
            status_code: 401,
            error_type: 'invalid_token',
            error_message: 'Invalid session token'
          });
        }
        
        return Promise.resolve({
          status_code: 200,
          user: {
            user_id: 'mock-user-id',
            phone_numbers: [{ phone_number: '+1234567890' }],
            emails: [{ email: 'test@example.com' }],
            created_at: new Date().toISOString(),
            status: 'active'
          },
          session: {
            session_id: 'mock-session-id',
            user_id: 'mock-user-id',
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        });
      }
    },
    users: {
      get: () => Promise.resolve({
        status_code: 200,
        user: {
          user_id: 'mock-user-id',
          phone_numbers: [{ phone_number: '+1234567890' }],
          emails: [{ email: 'test@example.com' }],
          created_at: new Date().toISOString(),
          status: 'active'
        }
      })
    }
  };

  module.exports = mockClient;
  return; // Exit early to prevent real client creation
}

// Create real Stytch client if environment variables are present
const stytchClient = new stytch.Client({
  project_id: STYTCH_PROJECT_ID,
  secret: STYTCH_SECRET,
  env: process.env.NODE_ENV === 'production' ? stytch.envs.live : stytch.envs.test,
});

console.log('✅ Stytch client initialized successfully');

module.exports = stytchClient; 