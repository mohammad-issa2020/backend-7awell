import { vi } from 'vitest';
import { supabaseAdmin } from '../../database/supabase.js';

/**
 * Base Test Setup Class
 */
class BaseTestSetup {
  constructor(type = 'unit') {
    this.type = type;
    this.createdData = {};
    this.mocks = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log(`🔧 Initializing ${this.type} test setup...`);
    
    // Setup mocks for unit tests
    if (this.type === 'unit') {
      this.setupMocks();
    }
    
    // Setup database for integration tests
    if (this.type === 'integration') {
      await this.setupDatabase();
    }
    
    this.isInitialized = true;
    console.log(`✅ ${this.type} test setup initialized`);
  }

  setupMocks() {
    // Mock Stytch client
    const mockStytchClient = {
      users: {
        search: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      otps: {
        sms: {
          send: vi.fn(),
          authenticate: vi.fn(),
          loginOrCreate: vi.fn()
        },
        email: {
          send: vi.fn(),
          authenticate: vi.fn(),
          loginOrCreate: vi.fn()
        }
      },
      sessions: {
        get: vi.fn(),
        authenticate: vi.fn(),
        revoke: vi.fn()
      }
    };

    global.mockStytchClient = mockStytchClient;
    this.mocks.set('stytch', mockStytchClient);
  }

  async setupDatabase() {
    try {
      // Clean test data from previous runs
      await this.cleanupTestData();
      console.log('🗑️  Database cleaned for integration tests');
    } catch (error) {
      console.warn('⚠️  Warning: Could not clean database:', error.message);
    }
  }

  async cleanupTestData() {
    const tables = [
      'user_sessions',
      'activity_logs', 
      'transactions',
      'wallets',
      'promotions', // Add promotions cleanup
      'user_settings',
      'user_profiles', // Delete profiles before users
      'users'
    ];

    for (const table of tables) {
      try {
        if (table === 'users') {
          // For users table, use multiple cleanup strategies
          
          // Strategy 1: Delete by test email and phone patterns
          const testPatterns = [
            'email.like.%@example.com',
            'email.like.%@test.com',
            'phone.like.+123456%',
            'phone.like.+155%',
            'phone.like.+1000%',
            'phone.like.+1001%',
            'phone.like.+1002%',
            'phone.like.+1003%',
            'phone.like.+1004%',
            'phone.like.+1005%',
            'phone.eq.+1111111111',
            'phone.eq.+0987654321',
            'username.like.%user%',
            'username.like.%test%'
          ];
          
          for (const pattern of testPatterns) {
            try {
              await supabaseAdmin
                .from(table)
                .delete()
                .or(pattern);
            } catch (err) {
              // Continue with other patterns if one fails
            }
          }
          
          // Strategy 2: Delete recent test users (created in last hour)
          try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            await supabaseAdmin
              .from(table)
              .delete()
              .gte('created_at', oneHourAgo)
              .like('email', '%@example.com');
          } catch (err) {
            console.warn(`Could not clean recent test users:`, err.message);
          }
          
        } else if (table === 'user_settings') {
          // Clean user_settings with test patterns
          const settingsPatterns = [
            'user_id.in.(select id from users where email like \'%@example.com\')',
            'user_id.in.(select id from users where email like \'%@test.com\')'
          ];
          
          for (const pattern of settingsPatterns) {
            try {
              await supabaseAdmin
                .from(table)
                .delete()
                .or(pattern);
            } catch (err) {
              // Continue with other patterns
            }
          }
          
        } else if (table === 'user_profiles') {
          // Clean profiles with test patterns
          const profilePatterns = [
            'first_name.like.%test%',
            'first_name.like.%Test%',
            'last_name.like.%test%',
            'last_name.like.%Test%',
            'first_name.eq.New',
            'first_name.eq.Long',
            'first_name.eq.Spéciàl',
            'last_name.eq.User',
            'last_name.eq.Üser'
          ];
          
          for (const pattern of profilePatterns) {
            try {
              await supabaseAdmin
                .from(table)
                .delete()
                .or(pattern);
            } catch (err) {
              // Continue with other patterns
            }
          }
          
        } else {
          // For other tables, try to delete all test data
          try {
            const { error } = await supabaseAdmin
              .from(table)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep dummy records if any
            
            if (error) {
              console.warn(`Warning: Could not clean ${table}:`, error.message);
            }
          } catch (err) {
            console.warn(`Warning: Could not clean ${table}:`, err.message);
          }
        }
      } catch (error) {
        console.warn(`Error cleaning table ${table}:`, error.message);
      }
    }
  }

  /**
   * Create test data based on configuration
   */
  async create(config) {
    const results = {};

    for (const [dataType, dataConfig] of Object.entries(config)) {
      console.log(`📝 Creating ${dataType}...`);
      
      try {
        const created = await this.createDataType(dataType, dataConfig);
        results[dataType] = created;
        
        // Store created data for cleanup
        if (!this.createdData[dataType]) {
          this.createdData[dataType] = [];
        }
        this.createdData[dataType].push(...created);
        
        console.log(`✅ Created ${created.length} ${dataType}`);
      } catch (error) {
        console.error(`❌ Error creating ${dataType}:`, error);
        throw error;
      }
    }

    return results;
  }

  async createDataType(dataType, config) {
    const { count = 0, specific_items = [], defaults = {} } = config;
    const created = [];

    // Create specific items first
    for (const item of specific_items) {
      const itemData = { ...defaults, ...item };
      const createdItem = await this.createSingleItem(dataType, itemData);
      created.push(createdItem);
    }

    // Create additional random items if count is greater than specific_items
    const remainingCount = Math.max(0, count - specific_items.length);
    for (let i = 0; i < remainingCount; i++) {
      const randomData = this.generateRandomData(dataType, defaults);
      const createdItem = await this.createSingleItem(dataType, randomData);
      created.push(createdItem);
    }

    return created;
  }

  async createSingleItem(dataType, itemData) {
    if (this.type === 'unit') {
      // For unit tests, return mock data
      return this.createMockItem(dataType, itemData);
    } else {
      // For integration tests, create real data
      return this.createRealItem(dataType, itemData);
    }
  }

  createMockItem(dataType, itemData) {
    const baseData = {
      id: `mock-${dataType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...itemData
    };

    // Add type-specific mock data
    switch (dataType) {
      case 'users':
        return {
          ...baseData,
          user_id: baseData.id,
          emails: itemData.email ? [{ email: itemData.email, verified: itemData.email_verified || false }] : [],
          phone_numbers: itemData.phone ? [{ phone_number: itemData.phone, verified: itemData.phone_verified || false }] : [],
          status: itemData.status || 'active',
          verified: itemData.verified || false
        };

      case 'wallets':
        return {
          ...baseData,
          user_id: itemData.user_id || `user-${Math.random().toString(36).substr(2, 9)}`,
          wallet_address: itemData.wallet_address || itemData.address || this.generateWalletAddress()
        };

      case 'transactions':
        return {
          ...baseData,
          user_id: itemData.user_id || `user-${Math.random().toString(36).substr(2, 9)}`,
          type: itemData.type || 'send',
          amount: itemData.amount || '1.0',
          asset_symbol: itemData.asset_symbol || 'ETH',
          status: itemData.status || 'pending'
        };

      case 'promotions':
        return {
          ...baseData,
          promotion_id: baseData.id,
          title: itemData.title || `Test Promotion ${Date.now()}`,
          description: itemData.description || 'Test promotion description',
          image_url: itemData.image_url || 'https://example.com/test.jpg',
          link_url: itemData.link_url || 'https://example.com/test',
          background_color: itemData.background_color || '#FF5733',
          priority: itemData.priority || 100,
          start_date: itemData.start_date || new Date().toISOString(),
          end_date: itemData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: itemData.is_active !== undefined ? itemData.is_active : true,
          locale: itemData.locale || 'en'
        };

      default:
        return baseData;
    }
  }

  async createRealItem(dataType, itemData) {
    switch (dataType) {
      case 'users':
        // Check if user with this phone already exists (including deleted ones)
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id, status')
          .eq('phone', itemData.phone)
          .single();

        if (existingUser) {
          if (existingUser.status === 'deleted') {
            // Reactivate the existing user instead of creating a new one
            const { data: reactivatedUser, error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                email: itemData.email,
                phone_verified: itemData.phone_verified || false,
                email_verified: itemData.email_verified || false,
                status: itemData.status || 'active',
                kyc_level: itemData.kyc_level || 'none'
              })
              .eq('id', existingUser.id)
              .select()
              .single();

            if (updateError) throw new Error(`Database error: ${updateError.message}`);
            return reactivatedUser;
          } else {
            throw new Error(`User with phone ${itemData.phone} already exists and is active`);
          }
        }

        // Create new user if no existing user found
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .insert([{
            phone: itemData.phone,
            email: itemData.email,
            phone_verified: itemData.phone_verified || false,
            email_verified: itemData.email_verified || false,
            status: itemData.status || 'active',
            kyc_level: itemData.kyc_level || 'none'
          }])
          .select()
          .single();

        if (userError) throw new Error(`Database error: ${userError.message}`);
        return user;

      case 'wallets':
        // Find the actual user UUID from created users
        let actualUserId = itemData.user_id;
        const createdUsers = this.getCreatedData('users');
        
        // If we have user_email instead of user_id, find the corresponding UUID
        if (itemData.user_email) {
          const matchingUser = createdUsers.find(user => user.email === itemData.user_email);
          if (matchingUser) {
            actualUserId = matchingUser.id;
          }
        }
        // If user_id is a custom string, find the corresponding UUID from created users
        else if (itemData.user_id && typeof itemData.user_id === 'string' && !itemData.user_id.includes('-')) {
          const matchingUser = createdUsers.find(user => user.user_id === itemData.user_id);
          if (matchingUser) {
            actualUserId = matchingUser.id;
          }
        }
        // If no user_id specified, distribute wallets evenly among users
        else if (!actualUserId && createdUsers.length > 0) {
          const walletIndex = this.getCreatedData('wallets').length;
          const userIndex = walletIndex % createdUsers.length;
          actualUserId = createdUsers[userIndex].id;
          console.log(`🔧 Auto-assigning wallet ${walletIndex} to user ${userIndex} (${actualUserId})`);
        }

        if (!actualUserId) {
          throw new Error(`Cannot find user for wallet creation. Available users: ${createdUsers.length}, user_email: ${itemData.user_email}, user_id: ${itemData.user_id}`);
        }

        const { data: wallet, error: walletError } = await supabaseAdmin
          .from('wallets')
          .insert([{
            user_id: actualUserId,
            wallet_address: itemData.wallet_address || itemData.address || this.generateWalletAddress()
          }])
          .select()
          .single();

        if (walletError) throw new Error(`Database error: ${walletError.message}`);
        return wallet;

      case 'transactions':
        // Find sender and recipient UUIDs
        const availableUsers = this.getCreatedData('users');
        
        let senderId = itemData.sender_id;
        let recipientId = itemData.recipient_id;
        
        // Find sender by email
        if (itemData.sender_email) {
          const senderUser = availableUsers.find(user => user.email === itemData.sender_email);
          if (senderUser) {
            senderId = senderUser.id;
          }
        }
        
        // Find recipient by email
        if (itemData.recipient_email) {
          const recipientUser = availableUsers.find(user => user.email === itemData.recipient_email);
          if (recipientUser) {
            recipientId = recipientUser.id;
          }
        }
        
        // If no sender_id specified, use first available user
        if (!senderId && availableUsers.length > 0) {
          senderId = availableUsers[0].id;
        }
        
        // If no recipient_id specified, use second available user (or first if only one exists)
        if (!recipientId && availableUsers.length > 0) {
          recipientId = availableUsers[availableUsers.length > 1 ? 1 : 0].id;
        }

        // Handle completed_at logic based on status
        const transactionData = {
          sender_id: senderId,
          recipient_id: recipientId, 
          type: itemData.type || 'transfer',
          amount: itemData.amount || '1.0',
          asset_symbol: itemData.asset_symbol || 'ETH',
          status: itemData.status || 'active',
          reference: itemData.reference || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          note: itemData.description
        };

        // Add completed_at if status is completed
        if (itemData.status === 'completed') {
          transactionData.completed_at = new Date().toISOString();
        }

        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert([transactionData])
          .select()
          .single();

        if (transactionError) throw new Error(`Database error: ${transactionError.message}`);
        return transaction;

      case 'promotions':
        const { data: promotion, error: promotionError } = await supabaseAdmin
          .from('promotions')
          .insert([{
            title: itemData.title || `Test Promotion ${Date.now()}`,
            description: itemData.description || 'Test promotion description',
            image_url: itemData.image_url || 'https://example.com/test.jpg',
            link_url: itemData.link_url || 'https://example.com/test',
            background_color: itemData.background_color || '#FF5733',
            priority: itemData.priority || 100,
            start_date: itemData.start_date || new Date().toISOString(),
            end_date: itemData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: itemData.is_active !== undefined ? itemData.is_active : true,
            locale: itemData.locale || 'en'
          }])
          .select()
          .single();

        if (promotionError) throw new Error(`Database error: ${promotionError.message}`);
        return promotion;

      case 'sessions':
        // Find user UUID for the session
        const sessionUsers = this.getCreatedData('users');
        let sessionUserId = itemData.user_id;
        
        // If user_id is provided, find the user by it or by email
        if (itemData.user_email) {
          const sessionUser = sessionUsers.find(user => user.email === itemData.user_email);
          if (sessionUser) {
            sessionUserId = sessionUser.id;
          }
        }
        
        // If no user_id specified, use first available user
        if (!sessionUserId && sessionUsers.length > 0) {
          sessionUserId = sessionUsers[0].id;
        }

        // Calculate expires_at based on expires_in_minutes
        const now = new Date();
        let createdAt = now;
        let expiresAt;
        
        if (itemData.expires_in_minutes && itemData.expires_in_minutes < 0) {
          // For expired sessions, set created_at in the past and expires_at slightly after created_at
          // This satisfies the constraint while still making the session expired relative to now
          const minutesAgo = Math.abs(itemData.expires_in_minutes) + 30; // Create 30 minutes before expiry
          createdAt = new Date(Date.now() - (minutesAgo * 60 * 1000));
          expiresAt = new Date(createdAt.getTime() + (30 * 60 * 1000)); // Expire 30 minutes after creation
        } else if (itemData.expires_in_minutes) {
          expiresAt = new Date(Date.now() + (itemData.expires_in_minutes * 60 * 1000));
        } else {
          expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // Default: 24 hours
        }

        const sessionData = {
          user_id: sessionUserId,
          session_token: itemData.session_token || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          device_id: itemData.device_id || `device_${Date.now()}`,
          device_name: itemData.device_name || 'Test Device',
          ip_address: itemData.ip_address || '127.0.0.1',
          user_agent: itemData.user_agent || 'Test User Agent',
          expires_at: expiresAt.toISOString(),
          is_active: itemData.status === 'active' ? true : (itemData.status === 'expired' || itemData.status === 'revoked' ? false : true),
          pin_verified: itemData.pin_verified !== undefined ? itemData.pin_verified : false,
          last_activity: itemData.last_activity || new Date().toISOString(),
          created_at: createdAt.toISOString()
        };

        const { data: session, error: sessionError } = await supabaseAdmin
          .from('user_sessions')
          .insert([sessionData])
          .select()
          .single();

        if (sessionError) throw new Error(`Database error: ${sessionError.message}`);
        return session;

      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  generateRandomData(dataType, defaults = {}) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);

    switch (dataType) {
      case 'users':
        // Generate unique phone numbers by using timestamp + random to avoid collisions
        const uniquePhoneSuffix = (timestamp % 1000000000).toString().padStart(9, '0');
        const randomDigit = Math.floor(Math.random() * 10);
        
        return {
          ...defaults,
          email: `test-${timestamp}-${random}@example.com`,
          phone: `+15${uniquePhoneSuffix}${randomDigit}`, // Use +15 prefix to avoid conflicts with preset data
          status: defaults.status || 'active'
        };

      case 'wallets':
        return {
          ...defaults,
          wallet_address: this.generateWalletAddress()
        };

      case 'promotions':
        return {
          ...defaults,
          title: `Random Promotion ${timestamp}`,
          description: `Random promotion description ${timestamp}`,
          image_url: `https://example.com/promo-${random}.jpg`,
          link_url: `https://example.com/promo-${random}`,
          background_color: '#' + Math.floor(Math.random()*16777215).toString(16),
          priority: Math.floor(Math.random() * 500) + 1,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + (Math.random() * 90 + 1) * 24 * 60 * 60 * 1000).toISOString(),
          is_active: Math.random() > 0.3, // 70% active
          locale: 'en'
        };

      case 'sessions':
        return {
          ...defaults,
          session_token: `session_${timestamp}_${random}`,
          device_id: `device_${random}`,
          device_name: `Test Device ${random}`,
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: `Mozilla/5.0 (Test Browser ${random})`,
          expires_in_minutes: Math.random() > 0.3 ? 1440 : -60, // 70% active sessions
          status: Math.random() > 0.3 ? 'active' : 'expired'
        };

      default:
        return defaults;
    }
  }

  generateWalletAddress() {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Get all created data
   */
  getAllCreatedData() {
    return this.createdData;
  }

  /**
   * Get created data by type
   */
  getCreatedData(type) {
    return this.createdData[type] || [];
  }

  /**
   * Reset all mocks
   */
  resetMocks() {
    if (this.type === 'unit') {
      vi.clearAllMocks();
      this.mocks.forEach(mock => {
        if (typeof mock === 'object' && mock !== null) {
          Object.values(mock).forEach(fn => {
            if (typeof fn === 'function' && fn.mockReset) {
              fn.mockReset();
            }
          });
        }
      });
    }
  }

  /**
   * Cleanup all test data
   */
  async cleanup() {
    console.log(`🧹 Cleaning up ${this.type} test data...`);
    
    if (this.type === 'integration') {
      await this.cleanupTestData();
    }
    
    this.resetMocks();
    this.createdData = {};
    this.isInitialized = false;
    
    console.log(`✅ ${this.type} test cleanup complete`);
  }
}

/**
 * Create local/unit test setup
 */
export const localSetup = () => new BaseTestSetup('unit');

/**
 * Create integration test setup
 */
export const integrationSetup = () => new BaseTestSetup('integration'); 