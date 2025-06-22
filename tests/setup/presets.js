import { localSetup, integrationSetup } from './testSetup.js';

export const TestPresets = {
  authUsers: {
    users: {
      count: 5,
      specific_items: [
        { 
          phone: '+1234567890', 
          email: 'verified@example.com',
          status: 'active',
          verified: true,
          phone_verified: true,
          email_verified: true,
          kyc_level: 'basic'
        },
        { 
          phone: '+0987654321', 
          email: 'pending@example.com',
          status: 'pending',
          verified: false,
          phone_verified: false,
          email_verified: false,
          kyc_level: 'none'
        },
        { 
          phone: '+1111111111', 
          email: 'inactive@example.com',
          status: 'inactive',
          verified: true,
          phone_verified: true,
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
          phone: '+1234567890', // EXISTING_PHONE for duplicate tests
          email: 'existing@example.com', // EXISTING_EMAIL for duplicate tests
          status: 'active',
          verified: true,
          phone_verified: true,
          email_verified: true,
          kyc_level: 'basic'
        },
        {
          phone: '+1987654321',
          email: 'test.reference@example.com',
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
          phone: '+1555000001', 
          email: 'sender@example.com',
          status: 'active',
          user_id: 'test-sender-001'
        },
        { 
          phone: '+1555000002', 
          email: 'receiver@example.com',
          status: 'active',
          user_id: 'test-receiver-001'
        },
        { 
          phone: '+1555000003', 
          email: 'whale@example.com',
          status: 'active',
          user_id: 'test-whale-001'
        }
      ]
    }
  },

  transactionFlow: {
    users: {
      count: 2,
      specific_items: [
        { 
          phone: `+1555${Date.now().toString().slice(-6)}${Math.random().toString().slice(-3)}1`, 
          email: `sender${Date.now().toString().slice(-6)}@example.com`,
          status: 'active',
          user_id: 'test-sender-001'
        },
        { 
          phone: `+1555${Date.now().toString().slice(-6)}${Math.random().toString().slice(-3)}2`, 
          email: `receiver${Date.now().toString().slice(-6)}@example.com`,
          status: 'active',
          user_id: 'test-receiver-001'
        }
      ]
    },
    wallets: {
      count: 2,
      specific_items: [
        {
          user_id: 'test-sender-001',
          network: 'ethereum',
          balance: '10.5'
          // address will be auto-generated to avoid collisions
        },
        {
          user_id: 'test-receiver-001',
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
          sender_id: 'test-sender-001',
          recipient_id: 'test-receiver-001',
          type: 'transfer',
          amount: '1.5',
          asset_symbol: 'ETH',
          status: 'completed',
          reference: 'tx-001'
        },
        {
          sender_id: 'test-sender-001',
          recipient_id: 'test-receiver-001',
          type: 'transfer',
          amount: '0.5',
          asset_symbol: 'BTC',
          status: 'pending',
          reference: 'tx-002'
        },
        {
          sender_id: 'test-sender-001',
          recipient_id: 'test-receiver-001',
          type: 'transfer',
          amount: '2.0',
          asset_symbol: 'ETH',
          status: 'completed',
          reference: 'tx-003'
        }
      ]
    }
  },

  promotionSetup: {
    users: {
      count: 2,
      specific_items: [
        { email: 'user1@example.com', status: 'active' },
        { email: 'user2@example.com', status: 'active' }
      ]
    },
    promotions: {
      count: 3,
      specific_items: [
        {
          title: 'Welcome Bonus',
          description: 'Get $10 for signing up',
          is_active: true,
          priority: 100,
          background_color: '#4CAF50'
        },
        {
          title: 'Referral Bonus',
          description: 'Invite friends and earn',
          is_active: true,
          priority: 200,
          background_color: '#2196F3'
        },
        {
          title: 'Expired Offer',
          description: 'This offer has expired',
          is_active: false,
          priority: 50,
          background_color: '#FF5722'
        }
      ]
    }
  },

  walletSetup: {
    users: {
      count: 3,
      specific_items: [
        { email: 'wallet-user1@example.com', user_id: 'wallet-test-001' },
        { email: 'wallet-user2@example.com', user_id: 'wallet-test-002' },
        { email: 'wallet-user3@example.com', user_id: 'wallet-test-003' }
      ]
    },
    wallets: {
      count: 5,
      specific_items: [
        {
          user_id: 'wallet-test-001',
          network: 'ethereum',
          balance: '5.0',
          is_active: true
        },
        {
          user_id: 'wallet-test-001',
          network: 'bitcoin',
          balance: '0.1',
          is_active: true
        },
        {
          user_id: 'wallet-test-002',
          network: 'ethereum',
          balance: '0.0',
          is_active: false
        },
        {
          user_id: 'wallet-test-003',
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
        { email: 'session-user1@example.com', user_id: 'session-test-001' },
        { email: 'session-user2@example.com', user_id: 'session-test-002' }
      ]
    },
    sessions: {
      count: 4,
      specific_items: [
        {
          user_id: 'session-test-001',
          status: 'active',
          expires_in_minutes: 1440
        },
        {
          user_id: 'session-test-001',
          status: 'expired',
          expires_in_minutes: -60
        },
        {
          user_id: 'session-test-002',
          status: 'active',
          expires_in_minutes: 60
        },
        {
          user_id: 'session-test-002',
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
    if (!TestPresets[presetName]) {
      throw new Error(`❌ Preset '${presetName}' not found. Available presets: ${Object.keys(TestPresets).join(', ')}`);
    }

    if (this.loadedPresets.has(presetName)) {
      console.log(`⚠️  Preset '${presetName}' already loaded, skipping...`);
      return this.setup.getCreatedData();
    }

    console.log(`📦 Loading preset: ${presetName}`);
    const data = await this.setup.create(TestPresets[presetName]);
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