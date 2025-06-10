const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test transaction creation
async function testCreateTransaction() {
  try {
    console.log('🧪 Testing transaction creation...');

    // You need to replace this with a valid session token from your authentication
    const sessionToken = 'YOUR_VALID_SESSION_TOKEN_HERE';

    const transactionData = {
      type: 'send',
      amount: '1.5',
      assetSymbol: 'ETH',
      assetName: 'Ethereum',
      network: 'ethereum',
      fromAddress: '0x1234567890123456789012345678901234567890',
      toAddress: '0x9876543210987654321098765432109876543210',
      description: 'Test transaction via API'
    };

    console.log('📝 Transaction data:', JSON.stringify(transactionData, null, 2));

    const response = await axios.post(`${BASE_URL}/v1/transactions`, transactionData, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Transaction created successfully!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Transaction data:', JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error creating transaction:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Test getting transaction options
async function testGetTransactionOptions() {
  try {
    console.log('🧪 Testing transaction options...');

    const sessionToken = 'YOUR_VALID_SESSION_TOKEN_HERE';

    const response = await axios.get(`${BASE_URL}/v1/transactions/options`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    console.log('✅ Transaction options retrieved successfully!');
    console.log('📊 Options:', JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Error getting transaction options:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Test listing transactions
async function testListTransactions() {
  try {
    console.log('🧪 Testing transaction listing...');

    const sessionToken = 'YOUR_VALID_SESSION_TOKEN_HERE';

    const response = await axios.get(`${BASE_URL}/v1/transactions?limit=5`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    console.log('✅ Transactions listed successfully!');
    console.log('📊 Found', response.data.data.transactions.length, 'transactions');
    console.log('📊 Pagination:', response.data.data.pagination);

    return response.data;

  } catch (error) {
    console.error('❌ Error listing transactions:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting transaction API tests...\n');
  
  try {
    // Test 1: Get options (no authentication issues)
    console.log('='.repeat(50));
    await testGetTransactionOptions();
    
    console.log('\n' + '='.repeat(50));
    await testListTransactions();
    
    console.log('\n' + '='.repeat(50));
    await testCreateTransaction();
    
    console.log('\n✨ All tests completed successfully!');
    
  } catch (error) {
    console.log('\n💥 Tests failed with error:', error.message);
    process.exit(1);
  }
}

// Instructions for users
function printInstructions() {
  console.log(`
📋 INSTRUCTIONS:
1. Make sure your server is running on http://localhost:3000
2. Get a valid session token by:
   - POST /api/v1/verification/start (with phone and email)
   - POST /api/v1/verification/send-otp (for phone)
   - POST /api/v1/verification/verify-otp (for phone)
   - POST /api/v1/verification/send-otp (for email)
   - POST /api/v1/verification/verify-otp (for email)
   - POST /api/v1/verification/complete-login (to get session token)
3. Replace 'YOUR_VALID_SESSION_TOKEN_HERE' with your actual token
4. Run: node test-create-transaction.js

🔗 Available transaction types:
   send, receive, buy, sell, swap, stake, unstake, reward, fee, deposit, withdrawal, transfer, payment, cash_out, cash_in, exchange

📊 Required fields:
   - type (string)
   - amount (string/number)
   - assetSymbol (string, max 10 chars)
   - network (string, max 50 chars)

💡 Optional fields:
   - assetName (string)
   - fromAddress (string)
   - toAddress (string)
   - description (string)
   - metadata (object)
`);
}

if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printInstructions();
  } else {
    runAllTests();
  }
}

module.exports = { 
  testCreateTransaction, 
  testGetTransactionOptions, 
  testListTransactions,
  printInstructions 
}; 