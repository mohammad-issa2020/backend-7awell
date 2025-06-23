import { localSetup, integrationSetup } from './testSetup.js';
import { UserTemplates } from './userTemplates.js';

// Helper function to generate unique phone numbers
const generateUniquePhone = (suffix = '') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `+1555${timestamp}${random}${suffix}`;
};

// Helper function to generate unique emails
const generateUniqueEmail = (prefix, domain = 'example.com') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}@${domain}`;
};

export const TestPresets = {
  authUsers: {
    users: {
      count: 6, // Increase count to include more test cases
      specific_items: [
        { 
          phone: generateUniquePhone('1'), // Use helper function
          email: generateUniqueEmail('verified'),
          status: 'active',
          verified: true,
          phone_verified: true,
          email_verified: true,
          kyc_level: 'basic'
        },
        { 
          phone: generateUniquePhone('2'), // Different suffix
          email: generateUniqueEmail('suspended1'),
          status: 'suspended',
          verified: false,
          phone_verified: false,
          email_verified: false,
          kyc_level: 'none'
        },
        { 
          phone: generateUniquePhone('3'), // Different suffix
          email: generateUniqueEmail('inactive'),
          status: 'suspended',
          verified: true,
          phone_verified: true,
          email_verified: false,
          kyc_level: 'none'
        },
        { 
          phone: generateUniquePhone('4'), // Add a suspended user for Phone tests
          email: generateUniqueEmail('suspended'),
          status: 'suspended',
          verified: false,
          phone_verified: false,
          email_verified: false,
          kyc_level: 'none'
        }
      ]
    }
  },

  // New: User Testing Templates
  userTestTemplates: {
    users: {
      count: 2,
      specific_items: [
        {
          phone: generateUniquePhone('ut1'), // Use unique phone number
          email: generateUniqueEmail('existing'), // Use unique email for duplicate tests
          status: 'active',
          verified: true,
          phone_verified: true,
          email_verified: true,
          kyc_level: 'basic'
        },
        {
          phone: generateUniquePhone('ut2'), // Use unique phone number
          email: generateUniqueEmail('test.reference'),
          status: 'active',
          verified: true,
          phone_verified: true,
          email_verified: true,
          kyc_level: 'basic'
        }
      ]
    }
  },

  transactionUsers: {
    users: {
      count: 3,
      specific_items: [
        { 
          phone: generateUniquePhone('tu1'), 
          email: generateUniqueEmail('sender'),
          status: 'active'
          // user_id will be auto-generated as UUID
        },
        { 
          phone: generateUniquePhone('tu2'), 
          email: generateUniqueEmail('receiver'),
          status: 'active'
          // user_id will be auto-generated as UUID
        },
        { 
          phone: generateUniquePhone('tu3'), 
          email: generateUniqueEmail('whale'),
          status: 'active'
          // user_id will be auto-generated as UUID
        }
      ]
    }
  },

  transactionFlow: {
    users: {
      count: 2,
      specific_items: [
        { 
          phone: generateUniquePhone('tf1'), 
          email: generateUniqueEmail('sender'),
          status: 'active'
          // user_id will be auto-generated as UUID
        },
        { 
          phone: generateUniquePhone('tf2'), 
          email: generateUniqueEmail('receiver'),
          status: 'active'
          // user_id will be auto-generated as UUID
        }
      ]
    },
    wallets: {
      count: 2,
      specific_items: [
        {
          // user_id will be set from created users
          network: 'ethereum',
          balance: '10.5'
          // address will be auto-generated to avoid collisions
        },
        {
          // user_id will be set from created users
          network: 'ethereum',
          balance: '2.0'
          // address will be auto-generated to avoid collisions
        }
      ]
    },
    transactions: {
      count: 3,
      specific_items: [
        {
          // sender_id and recipient_id will be set from created users
          type: 'transfer',
          amount: '1.5',
          asset_symbol: 'ETH',
          status: 'completed'
          // reference will be auto-generated to avoid duplicates
        },
        {
          // sender_id and recipient_id will be set from created users
          type: 'transfer',
          amount: '0.5',
          asset_symbol: 'BTC',
          status: 'pending'
          // reference will be auto-generated to avoid duplicates
        },
        {
          // sender_id and recipient_id will be set from created users
          type: 'transfer',
          amount: '2.0',
          asset_symbol: 'ETH',
          status: 'completed'
          // reference will be auto-generated to avoid duplicates
        }
      ]
    }
  },

  promotionSetup: {
    users: {
      count: 2,
      specific_items: [
        { email: generateUniqueEmail('user1'), status: 'active' },
        { email: generateUniqueEmail('user2'), status: 'active' }
      ]
    },
    promotions: {
      count: 3,
      specific_items: [
        {
          title: 'Welcome Bonus',
          description: 'Get $10 for signing up',
          image_url: 'https://example.com/welcome.jpg',
          link_url: 'https://example.com/welcome',
          is_active: true,
          priority: 100,
          background_color: '#4CAF50',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          locale: 'en'
        },
        {
          title: 'Referral Bonus',
          description: 'Invite friends and earn',
          image_url: 'https://example.com/referral.jpg',
          link_url: 'https://example.com/referral',
          is_active: true,
          priority: 200,
          background_color: '#2196F3',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
          locale: 'en'
        },
        {
          title: 'Expired Offer',
          description: 'This offer has expired',
          image_url: 'https://example.com/expired.jpg',
          link_url: 'https://example.com/expired',
          is_active: false,
          priority: 50,
          background_color: '#FF5722',
          start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
          end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago (expired)
          locale: 'en'
        }
      ]
    }
  },

  walletSetup: {
    users: {
      count: 3,
      defaults: {
        status: 'active',
        phone_verified: true,
        email_verified: true,
        kyc_level: 'none'
      },
      specific_items: [
        { 
          email: generateUniqueEmail('wallet-user1'), 
          phone: generateUniquePhone('w1')
          // user_id will be auto-generated as UUID
        },
        { 
          email: generateUniqueEmail('wallet-user2'), 
          phone: generateUniquePhone('w2')
          // user_id will be auto-generated as UUID
        },
        { 
          email: generateUniqueEmail('wallet-user3'), 
          phone: generateUniquePhone('w3')
          // user_id will be auto-generated as UUID
        }
      ]
    },
    wallets: {
      count: 4,
      specific_items: [
        {
          user_index: 0, // Reference first user
          network: 'ethereum',
          balance: '5.0',
          is_active: true
        },
        {
          user_index: 0, // Reference first user
          network: 'bitcoin',
          balance: '0.1',
          is_active: true
        },
        {
          user_index: 1, // Reference second user
          network: 'ethereum',
          balance: '0.0',
          is_active: false
        },
        {
          user_index: 2, // Reference third user
          network: 'solana',
          balance: '100.0',
          is_active: true
        }
      ]
    }
  },

  sessionSetup: {
    users: {
      count: 2,
      specific_items: [
        { 
          email: generateUniqueEmail('session-user1'), 
          phone: generateUniquePhone('s1')  // Shorter suffix to fit in VARCHAR(20)
        },
        { 
          email: generateUniqueEmail('session-user2'), 
          phone: generateUniquePhone('s2')  // Shorter suffix to fit in VARCHAR(20)
        }
      ]
    },
    sessions: {
      count: 4,
      specific_items: [
        {
          user_index: 0,  // Reference first user by index instead of email
          status: 'active',
          expires_in_minutes: 1440
        },
        {
          user_index: 0,  // Reference first user by index instead of email
          status: 'expired',
          expires_in_minutes: -60
        },
        {
          user_index: 1,  // Reference second user by index instead of email
          status: 'active',
          expires_in_minutes: 60
        },
        {
          user_index: 1,  // Reference second user by index instead of email
          status: 'revoked',
          expires_in_minutes: 1440
        }
      ]
    }
  }
};


export class PresetTestSetup {
  constructor(type = 'unit') {
    this.setup = type === 'integration' ? integrationSetup() : localSetup();
    this.type = type;
    this.loadedPresets = new Set();
  }

  async initialize() {
    await this.setup.initialize();
  }

  async cleanup() {
    await this.setup.cleanup();
  }


  async loadPreset(presetName) {
    console.log(`📦 Loading preset: ${presetName}`);
    
    // Reset state BEFORE any setup runs
    UserTemplates.resetCounters();
    await this.cleanup(); // Clean DB state

    const presetConfig = TestPresets[presetName];
    if (!presetConfig) {
      throw new Error(`Preset "${presetName}" not found.`);
    }

    if (this.loadedPresets.has(presetName)) {
      console.log(`⚠️  Preset '${presetName}' already loaded, skipping...`);
      return this.setup.getCreatedData();
    }

    const data = await this.setup.create(presetConfig);
    this.loadedPresets.add(presetName);
    
    console.log(`✅ Preset '${presetName}' loaded successfully`);
    return data;
  }


  async loadPresets(presetNames) {
    const results = {};
    for (const presetName of presetNames) {
      results[presetName] = await this.loadPreset(presetName);
    }
    return results;
  }


  async create(config) {
    return await this.setup.create(config);
  }

  getAllData() {
    return this.setup.getAllCreatedData();
  }

 
  getData(type) {
    return this.setup.getCreatedData(type);
  }


  resetMocks() {
    this.setup.resetMocks();
  }


  static getAvailablePresets() {
    return Object.keys(TestPresets);
  }


  static getPresetConfig(presetName) {
    return TestPresets[presetName];
  }
}


export const presetSetup = (type = 'unit') => new PresetTestSetup(type);
export const unitPresetSetup = () => new PresetTestSetup('unit');
export const integrationPresetSetup = () => new PresetTestSetup('integration');

export const quickSetups = {
  async auth(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPreset('authUsers');
    return setup;
  },

  // New: User Testing Setup
  async userTests(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPreset('userTestTemplates');
    return setup;
  },

  // Transaction testing
  async transactions(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPreset('transactionFlow');
    return setup;
  },

  // Wallet testing
  async wallets(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPreset('walletSetup');
    return setup;
  },

  // Promotion testing
  async promotions(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPreset('promotionSetup');
    return setup;
  },

  // Session testing
  async sessions(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPreset('sessionSetup');
    return setup;
  },

  // Complete setup with everything
  async complete(type = 'unit') {
    const setup = presetSetup(type);
    await setup.initialize();
    await setup.loadPresets(['authUsers', 'transactionFlow', 'promotionSetup']);
    return setup;
  }
}; 