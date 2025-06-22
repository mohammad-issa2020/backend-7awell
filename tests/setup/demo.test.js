import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { quickSetups, presetSetup } from './presets.js';

describe('✅ User Authentication Flow - NO REPETITION', () => {
  let setup;
  
  beforeAll(async () => {
    // 🎯 Quick auth setup - users ready immediately!
    setup = await quickSetups.auth('unit');
  });
  
  afterAll(async () => {
    await setup.cleanup();
  });
  
  it('should have auth users ready (no creation needed!)', async () => {
    // ✅ Users already created by preset - no repetition!
    const users = setup.getData('users');
    
    // verify the data
    expect(users).toHaveLength(5);
    
    // Find preset users by their characteristics
    const verifiedUser = users.find(u => u.phone_numbers[0].phone_number === '+1234567890');
    expect(verifiedUser.emails[0].email).toBe('verified@example.com');
    expect(verifiedUser.status).toBe('active');
    expect(verifiedUser.verified).toBe(true);
    
    const pendingUser = users.find(u => u.phone_numbers[0].phone_number === '+0987654321');
    expect(pendingUser.emails[0].email).toBe('pending@example.com');
    expect(pendingUser.status).toBe('pending');
    expect(pendingUser.verified).toBe(false);
    
    const inactiveUser = users.find(u => u.phone_numbers[0].phone_number === '+1111111111');
    expect(inactiveUser.emails[0].email).toBe('inactive@example.com');
    expect(inactiveUser.status).toBe('inactive');
    
    console.log('✅ Auth users ready (preset loaded):', users.length);
  });
  
  it('should mock Stytch authentication flow', async () => {
    // setup Stytch mocks for authentication
    global.mockStytchClient.otps.sms.loginOrCreate.mockResolvedValue({
      status_code: 200,
      user_id: 'user-test-123',
      method_id: 'otp-test-456'
    });
    
    global.mockStytchClient.otps.authenticate.mockResolvedValue({
      status_code: 200,
      user_id: 'user-test-123',
      session_token: 'session-token-789',
      session_jwt: 'jwt-token-abc'
    });
    
    // mock the authentication flow
    const otpResult = await global.mockStytchClient.otps.sms.loginOrCreate({
      phone_number: '+1234567890',
      expiration_minutes: 5
    });
    
    const authResult = await global.mockStytchClient.otps.authenticate({
      method_id: otpResult.method_id,
      code: '123456'
    });
    
    // verify the results
    expect(otpResult.status_code).toBe(200);
    expect(authResult.session_token).toBe('session-token-789');
    
    // verify the mocks calls
    expect(global.mockStytchClient.otps.sms.loginOrCreate).toHaveBeenCalledWith({
      phone_number: '+1234567890',
      expiration_minutes: 5
    });
    
    console.log('✅ Authentication flow test passed');
  });
});

// Example 2: ✅ Complete Transaction Flow - NO REPETITION
describe('✅ Complete Transaction Flow - NO REPETITION', () => {
  let setup;
  
  beforeAll(async () => {
    testSetup = integrationSetup();
    await testSetup.initialize();
  });
  
  afterAll(async () => {
    await testSetup.cleanup();
  });
  
  it('should create complete transaction ecosystem', async () => {
        // 1. create
    const userData = await testSetup.create({
      users: {
        count: 3,
        specific_items: [
          {
            email: 'sender@7awell.com',
            phone: '+966501234567',
            status: 'active'
          },
          {
            email: 'receiver@7awell.com', 
            phone: '+966507654321',
            status: 'active'
          },
          {
            email: 'merchant@7awell.com',
            phone: '+966509876543',
            status: 'active'
          }
        ]
      }
    });
    
    console.log('✅ users created:', userData.users.map(u => u.emails[0].email));
    
    // 2. create wallets for users
    const walletData = await testSetup.create({
      wallets: {
        count: 3,
        defaults: {
          network: 'ethereum',
          is_active: true
        },
        specific_items: [
          {
            user_id: userData.users[0].user_id,
            balance: '100.5',
            address: '0x1234567890123456789012345678901234567890'
          },
          {
            user_id: userData.users[1].user_id,
            balance: '50.25',
            address: '0x9876543210987654321098765432109876543210'
          },
          {
            user_id: userData.users[2].user_id,
            balance: '200.75',
            address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
          }
        ]
      }
    });
    
    console.log('✅ wallets created:', walletData.wallets.length);
    
    // 3. create active sessions
    const sessionData = await testSetup.create({
      sessions: {
        count: 3,
        defaults: {
          expires_in_minutes: 1440,
          status: 'active'
        },
        specific_items: [
          {
            user_id: userData.users[0].user_id,
            session_token: 'sender-session-token'
          },
          {
            user_id: userData.users[1].user_id,
            session_token: 'receiver-session-token'
          },
          {
            user_id: userData.users[2].user_id,
            session_token: 'merchant-session-token'
          }
        ]
      }
    });
    
    console.log('✅ active sessions created:', sessionData.sessions.length);
    
    // 4. create transactions
    const transactionData = await testSetup.create({
      transactions: {
        count: 7,
        defaults: {
          asset_symbol: 'USDC',
          asset_name: 'USD Coin',
          network: 'ethereum',
          gas_fee: '0.002',
          gas_fee_usd: '8.50'
        },
        specific_items: [
          {
            user_id: userData.users[0].user_id,
            type: 'send',
            amount: '25.00',
            usd_amount: '25.00',
            from_address: walletData.wallets[0].wallet_address,
            to_address: walletData.wallets[1].wallet_address,
            status: 'confirmed',
            description: 'send money to a friend'
          },
          {
            user_id: userData.users[1].user_id,
            type: 'receive',
            amount: '25.00',
            usd_amount: '25.00',
            from_address: walletData.wallets[0].wallet_address,
            to_address: walletData.wallets[1].wallet_address,
            status: 'confirmed',
            description: 'receive money from a friend'
          },
          {
            user_id: userData.users[0].user_id,
            type: 'send',
            amount: '50.00',
            usd_amount: '50.00',
            from_address: walletData.wallets[0].wallet_address,
            to_address: walletData.wallets[2].wallet_address,
            status: 'pending',
            description: 'pay to the merchant'
          },
          {
            user_id: userData.users[2].user_id,
            type: 'receive',
            amount: '50.00',
            usd_amount: '50.00',
            from_address: walletData.wallets[0].wallet_address,
            to_address: walletData.wallets[2].wallet_address,
            status: 'pending',
            description: 'receive payment from the client'
          }
        ]
      }
    });
    
    console.log('✅ transactions created:', transactionData.transactions.length);
    
    // 5. create promotions
    const promotionData = await testSetup.create({
      promotions: {
        count: 3,
        defaults: {
          is_active: true,
          locale: 'ar',
          priority: 100
        },
        specific_items: [
          {
            title: 'first transaction offer',
            description: 'get 10 SAR when you make your first transaction',
            background_color: '#4CAF50',
            priority: 200
          },
          {
            title: 'referral offer',
            description: 'get 5 SAR when you refer a friend',
            background_color: '#2196F3',
            priority: 150
          }
        ]
      }
    });
    
    console.log('✅ promotions created:', promotionData.promotions.length);
    
    // verify the created data
    expect(userData.users).toHaveLength(3);
    expect(walletData.wallets).toHaveLength(3);
    expect(sessionData.sessions).toHaveLength(3);
    expect(transactionData.transactions).toHaveLength(7);
    expect(promotionData.promotions).toHaveLength(3);
    
    // verify the relationships between the data
    expect(walletData.wallets[0].user_id).toBe(userData.users[0].user_id);
    expect(sessionData.sessions[0].user_id).toBe(userData.users[0].user_id);
    expect(transactionData.transactions[0].user_id).toBe(userData.users[0].user_id);
    expect(transactionData.transactions[0].from_address).toBe(walletData.wallets[0].wallet_address);
    
    // verify the specific data
    expect(userData.users[0].emails[0].email).toBe('sender@7awell.com');
    expect(walletData.wallets[0].balance).toBe('100.5');
    expect(transactionData.transactions[0].amount).toBe('25.00');
    expect(promotionData.promotions[0].title).toBe('first transaction offer');
    
    // get all created data
    const allCreatedData = testSetup.getCreatedData();
    const dataTypes = Object.keys(allCreatedData);
    
    expect(dataTypes).toContain('users');
    expect(dataTypes).toContain('wallets');
    expect(dataTypes).toContain('sessions');
    expect(dataTypes).toContain('transactions');
    expect(dataTypes).toContain('promotions');
    
    console.log('✅ all data verified successfully');
    console.log('📊 data statistics:');
    console.log(`   - users: ${allCreatedData.users.length}`);
    console.log(`   - wallets: ${allCreatedData.wallets.length}`);
    console.log(`   - sessions: ${allCreatedData.sessions.length}`);
    console.log(`   - transactions: ${allCreatedData.transactions.length}`);
    console.log(`   - promotions: ${allCreatedData.promotions.length}`);
  });
  
  it('should handle specific business scenarios', async () => {
    // scenario: new user makes first transaction
    const newUserData = await testSetup.create({
      users: {
        count: 1,
        specific_items: [
          {
            email: 'newuser@7awell.com',
            phone: '+966501111111',
            status: 'active',
            created_at: new Date().toISOString()
          }
        ]
      }
    });
    
    // create new wallet for the new user
    const newWalletData = await testSetup.create({
      wallets: {
        count: 1,
        specific_items: [
          {
            user_id: newUserData.users[0].user_id,
            network: 'ethereum',
            balance: '0',
            is_active: true
          }
        ]
      }
    });
    
    // create first transaction for the new user
    const firstTransactionData = await testSetup.create({
      transactions: {
        count: 1,
        specific_items: [
          {
            user_id: newUserData.users[0].user_id,
            type: 'receive',
            amount: '10.00',
            usd_amount: '10.00',
            asset_symbol: 'USDC',
            status: 'confirmed',
            description: 'first transaction',
            to_address: newWalletData.wallets[0].wallet_address
          }
        ]
      }
    });
    
    // verify the scenario
    expect(newUserData.users[0].emails[0].email).toBe('newuser@7awell.com');
    expect(newWalletData.wallets[0].balance).toBe('0');
    expect(firstTransactionData.transactions[0].description).toContain('welcome bonus');
    expect(firstTransactionData.transactions[0].amount).toBe('10.00');
    
    console.log('✅ new user first transaction scenario verified successfully');
  });
});

// example 3: performance test with large dataset
describe('Performance Test - Large Dataset', () => {
  let testSetup;
  
  beforeAll(async () => {
    testSetup = localSetup(); // use unit test for speed
    await testSetup.initialize();
  });
  
  afterAll(async () => {
    await testSetup.cleanup();
  });
  
  it('should handle large dataset creation efficiently', async () => {
    const startTime = Date.now();
    
    // create large dataset
    const largeDataset = await testSetup.create({
      users: {
        count: 100,
        defaults: {
          status: 'active',
          verified: true
        },
        specific_items: [
          { email: 'admin@7awell.com', status: 'admin' },
          { email: 'support@7awell.com', status: 'support' }
        ]
      },
      transactions: {
        count: 500,
        defaults: {
          asset_symbol: 'USDC',
          network: 'ethereum',
          status: 'confirmed'
        }
      },
      promotions: {
        count: 50,
        defaults: {
          is_active: true,
          locale: 'ar'
        }
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // verify the data
    expect(largeDataset.users).toHaveLength(100);
    expect(largeDataset.transactions).toHaveLength(500);
    expect(largeDataset.promotions).toHaveLength(50);
    
    // verify the performance (should be less than 5 seconds)
    expect(duration).toBeLessThan(5000);
    
    console.log(`✅ created ${largeDataset.users.length + largeDataset.transactions.length + largeDataset.promotions.length} items in ${duration}ms`);
    
    // verify the specific data
    const adminUser = largeDataset.users.find(u => u.emails[0].email === 'admin@7awell.com');
    expect(adminUser.status).toBe('admin');
    
    const supportUser = largeDataset.users.find(u => u.emails[0].email === 'support@7awell.com');
    expect(supportUser.status).toBe('support');
  });
}); 