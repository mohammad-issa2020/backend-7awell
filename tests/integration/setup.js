import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

// Database setup (you'll need to adjust based on your actual database)
let testDb;

export const setupIntegrationTests = async () => {
  // Initialize test database connection
  // This is a placeholder - adapt to your actual database setup
  console.log('🔧 Setting up integration test environment...');
  
  // Set environment variables for integration testing
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'integration-test-jwt-secret';
  process.env.STYTCH_PROJECT_ID = 'project-live-test-12345';
  process.env.STYTCH_SECRET = 'secret_live_test_12345';
  
  // If you're using a real database for integration tests
  if (process.env.TEST_DATABASE_URL) {
    try {
      // Connect to test database
      // Example for PostgreSQL with pg or similar
      // testDb = await connectToDatabase(process.env.TEST_DATABASE_URL);
      console.log('📊 Connected to test database');
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  }
};

export const cleanupIntegrationTests = async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  if (testDb) {
    // Clean up database connection
    // await testDb.close();
    console.log('📊 Disconnected from test database');
  }
};

// Test data factories
export const createTestUser = () => ({
  email: `test-${Date.now()}@example.com`,
  phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  firstName: 'Test',
  lastName: 'User'
});

export const createTestTransaction = (userId, overrides = {}) => ({
  user_id: userId,
  type: 'send',
  amount: '1.5',
  asset_symbol: 'ETH',
  asset_name: 'Ethereum',
  from_address: '0x1234567890123456789012345678901234567890',
  to_address: '0x9876543210987654321098765432109876543210',
  network: 'ethereum',
  status: 'pending',
  description: 'Integration test transaction',
  created_at: new Date(),
  ...overrides
});

export const createTestPromotion = (overrides = {}) => ({
  title: 'Integration Test Promotion',
  description: 'This is a test promotion for integration testing',
  image_url: 'https://example.com/test-image.jpg',
  link_url: 'https://example.com/test-promotion',
  background_color: '#FF5733',
  priority: 100,
  start_date: new Date(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  is_active: true,
  locale: 'en',
  ...overrides
});

// Database helpers
export const clearTestData = async () => {
  if (!testDb) return;
  
  try {
    // Clear test data from all tables
    // Adjust these based on your actual table names
    const tables = [
      'user_sessions',
      'promotion_views',
      'promotion_clicks',
      'activity_logs',
      'transactions',
      'promotions',
      'users'
    ];
    
    for (const table of tables) {
      // await testDb.query(`DELETE FROM ${table} WHERE created_at > NOW() - INTERVAL '1 hour'`);
    }
    
    console.log('🗑️  Cleared test data');
  } catch (error) {
    console.warn('⚠️  Error clearing test data:', error);
  }
};

export const seedTestData = async () => {
  if (!testDb) return;
  
  try {
    // Seed basic test data
    console.log('🌱 Seeding test data...');
    
    // Example: Create test promotions
    // await testDb.query(`
    //   INSERT INTO promotions (title, description, is_active, start_date, end_date)
    //   VALUES ('Test Promotion', 'Integration test promotion', true, NOW(), NOW() + INTERVAL '30 days')
    // `);
    
  } catch (error) {
    console.warn('⚠️  Error seeding test data:', error);
  }
};

// HTTP helpers for integration tests
export const makeAuthenticatedRequest = async (request, sessionToken) => {
  return request.set('Authorization', `Bearer ${sessionToken}`);
};

export const loginTestUser = async (app, request, userCredentials) => {
  // This would perform actual login and return session token
  // For now, return a mock token for integration testing
  return 'integration-test-session-token';
};

// Validation helpers
export const expectValidApiResponse = (response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
  expect(response.body.statusCode).toBe(expectedStatus);
  expect(response.body.timestamp).toBeDefined();
  
  if (expectedStatus === 200) {
    expect(response.body.data).toBeDefined();
  }
};

export const expectValidPagination = (paginationData) => {
  expect(paginationData).toBeDefined();
  expect(typeof paginationData.limit).toBe('number');
  expect(typeof paginationData.hasMore).toBe('boolean');
  expect(paginationData.limit).toBeGreaterThan(0);
  expect(paginationData.limit).toBeLessThanOrEqual(100);
};

export const expectValidTransaction = (transaction) => {
  expect(transaction).toBeDefined();
  expect(transaction.id).toBeDefined();
  expect(transaction.type).toBeDefined();
  expect(transaction.amount).toBeDefined();
  expect(transaction.asset_symbol).toBeDefined();
  expect(transaction.status).toBeDefined();
  expect(transaction.created_at).toBeDefined();
  
  // Validate transaction types
  const validTypes = ['send', 'receive', 'buy', 'sell', 'swap', 'stake', 'unstake', 'reward'];
  expect(validTypes).toContain(transaction.type);
  
  // Validate status
  const validStatuses = ['pending', 'confirmed', 'failed', 'cancelled'];
  expect(validStatuses).toContain(transaction.status);
};

export const expectValidPromotion = (promotion) => {
  expect(promotion).toBeDefined();
  expect(promotion.promotion_id).toBeDefined();
  expect(promotion.title).toBeDefined();
  expect(promotion.description).toBeDefined();
  expect(promotion.is_active).toBeDefined();
  expect(promotion.start_date).toBeDefined();
  expect(promotion.end_date).toBeDefined();
  expect(typeof promotion.is_active).toBe('boolean');
};

export const expectValidUser = (user) => {
  expect(user).toBeDefined();
  expect(user.user_id).toBeDefined();
  expect(user.emails || user.phone_numbers).toBeDefined();
  expect(user.status).toBeDefined();
  expect(user.created_at).toBeDefined();
};

// Global integration test setup
beforeAll(async () => {
  await setupIntegrationTests();
  await seedTestData();
}, 30000); // 30 second timeout for setup

afterAll(async () => {
  await clearTestData();
  await cleanupIntegrationTests();
}, 30000);

beforeEach(async () => {
  // Reset any per-test state
}, 10000);

afterEach(async () => {
  // Clean up per-test data if needed
}, 10000);

console.log('🧪 Integration test setup loaded'); 