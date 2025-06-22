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
      'users'
    ];

    for (const table of tables) {
      try {
        // Delete by email pattern (existing logic)
        await supabaseAdmin
          .from(table)
          .delete()
          .like('email', '%@example.com');
        
        // For users table, also delete by phone pattern
        if (table === 'users') {
          await supabaseAdmin
            .from(table)
            .delete()
            .or('phone.like.+1555%,phone.like.+1234%,phone.like.+0987%,phone.like.+1111%,phone.like.+1987%');
        }
      } catch (error) {
        // Continue with other tables if one fails
        console.warn(`Warning: Could not clean ${table}:`, error.message);
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

      default:
        return baseData;
    }
  }

  async createRealItem(dataType, itemData) {
    switch (dataType) {
      case 'users':
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
        
        // If we have user_email instead of user_id, find the corresponding UUID
        if (itemData.user_email) {
          const createdUsers = this.getCreatedData('users');
          const matchingUser = createdUsers.find(user => user.email === itemData.user_email);
          if (matchingUser) {
            actualUserId = matchingUser.id;
          }
        }
        // If user_id is a custom string, find the corresponding UUID from created users
        else if (itemData.user_id && typeof itemData.user_id === 'string' && !itemData.user_id.includes('-')) {
          const createdUsers = this.getCreatedData('users');
          const matchingUser = createdUsers.find(user => user.user_id === itemData.user_id);
          if (matchingUser) {
            actualUserId = matchingUser.id;
          }
        }

        if (!actualUserId) {
          throw new Error(`Cannot find user for wallet creation. user_email: ${itemData.user_email}, user_id: ${itemData.user_id}`);
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
        const createdUsers = this.getCreatedData('users');
        
        let senderId = itemData.sender_id;
        let recipientId = itemData.recipient_id;
        
        // Find sender by email
        if (itemData.sender_email) {
          const senderUser = createdUsers.find(user => user.email === itemData.sender_email);
          if (senderUser) {
            senderId = senderUser.id;
          }
        }
        
        // Find recipient by email
        if (itemData.recipient_email) {
          const recipientUser = createdUsers.find(user => user.email === itemData.recipient_email);
          if (recipientUser) {
            recipientId = recipientUser.id;
          }
        }

        // Handle completed_at logic based on status
        const transactionData = {
          sender_id: senderId,
          recipient_id: recipientId, 
          type: itemData.type || 'transfer',
          amount: itemData.amount || '1.0',
          asset_symbol: itemData.asset_symbol || 'ETH',
          status: itemData.status || 'pending',
          reference: itemData.reference || `tx-${Date.now()}`,
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

      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  generateRandomData(dataType, defaults = {}) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);

    switch (dataType) {
      case 'users':
        return {
          ...defaults,
          email: `test-${timestamp}-${random}@example.com`,
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          status: defaults.status || 'active'
        };

      case 'wallets':
        return {
          ...defaults,
          wallet_address: this.generateWalletAddress()
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