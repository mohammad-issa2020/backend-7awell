import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../../database/supabase.js';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Mock Stytch client to avoid real API calls during testing
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
    whatsapp: {
      send: vi.fn(),
      authenticate: vi.fn(),
      loginOrCreate: vi.fn()
    },
    email: {
      send: vi.fn(),
      authenticate: vi.fn(),
      loginOrCreate: vi.fn()
    },
    authenticate: vi.fn()
  },
  sessions: {
    get: vi.fn(),
    authenticate: vi.fn(),
    revoke: vi.fn(),
    revoke_all: vi.fn()
  },
  magicLinks: {
    email: {
      send: vi.fn(),
      authenticate: vi.fn(),
      loginOrCreate: vi.fn()
    }
  },
  verificationSessions: {
    create: vi.fn(),
    get: vi.fn(),
    complete: vi.fn()
  }
};

// Mock Stytch config module globally
vi.mock('../../config/stytch.js', () => ({
  default: mockStytchClient
}));

// Mock SolanaService
vi.mock('../../services/solanaService', () => ({
  default: {
    initializeFeePayerWallet: vi.fn(),
    createWallet: vi.fn(),
    getBalance: vi.fn(),
    transfer: vi.fn()
  }
}));



// Mock Winston logger to avoid console spam during tests
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn()
};

// Mock logger globally
vi.mock('../../utils/logger', () => ({
  default: mockLogger
}));

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  process.env.STYTCH_PROJECT_ID = 'test-project-id';
  process.env.STYTCH_SECRET = 'test-secret';
  process.env.PORT = '0'; // Use random port for testing

  // Clean up Supabase tables
  await supabaseAdmin.from('wallets').delete().neq('id', 0);
  await supabaseAdmin.from('contacts').delete().neq('id', 0);
});

// Clean up after all tests
afterAll(async () => {
  vi.clearAllMocks();
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
global.mockStytchClient = mockStytchClient;
global.mockLogger = mockLogger;

// Helper function to create mock user data
global.createMockUser = (overrides = {}) => ({
  user_id: 'user-test-12345',
  emails: [{ email: 'test@example.com', verified: true }],
  phone_numbers: [{ phone_number: '+1234567890', verified: true }],
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides
});

// Helper function to create mock session data
global.createMockSession = (overrides = {}) => ({
  session_id: 'session-test-12345',
  user_id: 'user-test-12345',
  started_at: new Date().toISOString(),
  last_accessed_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides
});

// Helper function to create mock transaction data
global.createMockTransaction = (overrides = {}) => ({
  id: 'txn-test-12345',
  internal_id: 'txn_1640995200_a1b2c3d4',
  type: 'send',
  status: 'confirmed',
  amount: '0.5',
  asset_symbol: 'ETH',
  asset_name: 'Ethereum',
  asset_type: 'cryptocurrency',
  usd_amount: '2150.00',
  from_address: '0x123...',
  to_address: '0x456...',
  network: 'ethereum',
  transaction_hash: '0xabc123...',
  confirmations: 15,
  required_confirmations: 12,
  gas_fee: '0.002',
  gas_fee_usd: '8.60',
  description: 'Test transaction',
  created_at: new Date().toISOString(),
  ...overrides
});

// Helper function to create mock promotion data
global.createMockPromotion = (overrides = {}) => ({
  promotion_id: 'promo-test-12345',
  title: 'Test Promotion',
  description: 'Test promotion description',
  image_url: 'https://example.com/image.jpg',
  link_url: 'https://example.com/promotion',
  background_color: '#FF5733',
  priority: 100,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
  ...overrides
});

console.log('🧪 Test environment setup complete'); 