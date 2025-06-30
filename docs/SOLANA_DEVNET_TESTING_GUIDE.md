# 🚀 Solana DevNet Integration Testing Guide

Complete guide for testing Solana integration with devnet, database transactions, and notification system.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Test Configuration](#test-configuration)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Testing](#advanced-testing)

## 🔧 Prerequisites

### Required Software
- Node.js 18+ 
- npm/yarn
- Internet connection (for DevNet access)

### Required Environment Variables
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Authentication
JWT_SECRET=your_jwt_secret

# Solana DevNet Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Fee Payer Wallet (Generated automatically or use existing)
SOLANA_FEE_PAYER_PRIVATE_KEY=[your_fee_payer_private_key_array]

# Limits and Settings
MAX_USDT_PER_TX=10000
MIN_SOL_BALANCE=0.1

# Email Configuration (for notification testing)
EMAIL_FROM=your_test_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Firebase Configuration (for push notification testing)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## 🌐 Environment Setup

### 1. Generate Solana DevNet Wallets

```bash
# Generate fee payer wallet
node scripts/generateSolanaWallet.js

# This will create .env.solana file with wallet configuration
# Copy the variables to your main .env file
```

### 2. Fund DevNet Wallets

The test will automatically request SOL from the DevNet faucet, but you can also manually fund wallets:

```bash
# Visit Solana DevNet Faucet
https://faucet.solana.com/

# Or use CLI (if you have Solana CLI installed)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

### 3. Database Setup

Ensure your Supabase database has all required tables:

```bash
# Run migrations
npm run migrate

# Or manually verify tables exist:
# - users
# - user_profiles  
# - transactions
# - notification_settings
# - user_sessions (with device_token column)
```

## 🧪 Test Configuration

### Test Scenarios Covered

✅ **Wallet Management**
- DevNet wallet creation and funding
- Balance verification
- Multiple wallet scenarios

✅ **Database Integration**  
- Transaction lifecycle (pending → processing → completed/failed)
- User management
- Notification settings

✅ **API Endpoints**
- USDT transfer preparation
- Transaction completion
- Balance checking
- Fee estimation
- Service statistics

✅ **Notification System**
- Success notifications (email + push)
- Failure notifications  
- User preference handling

✅ **Error Handling**
- Invalid wallet addresses
- Insufficient balances
- Network failures
- Rate limiting

✅ **Performance Testing**
- Concurrent requests
- Response time validation
- Success rate verification

## 🚀 Running Tests

### Option 1: Full Test Suite (Recommended)

```bash
# Run complete integration test
node test-solana-integration.js
```

### Option 2: Individual Test Components

```bash
# Run with vitest
npm test tests/solana-full-integration.test.js

# Run specific test scenarios
npm test -- --grep "USDT Transfer"
npm test -- --grep "Notification System"
npm test -- --grep "Database Transaction"
```

### Option 3: Development Mode

```bash
# Run with watch mode for development
npm test -- --watch tests/solana-full-integration.test.js
```

## 📊 Test Coverage

### 1. Wallet Creation and Funding Test

```
🧪 TEST 1: Wallet Creation and Funding
├── ✅ Generate new keypairs
├── ✅ Request DevNet airdrops  
├── ✅ Verify SOL balances
└── ✅ Validate minimum balance requirements
```

### 2. USDT Transfer Preparation Test

```
🧪 TEST 2: USDT Transfer Preparation
├── ✅ API endpoint validation
├── ✅ Request parameter verification
├── ✅ Transaction serialization
├── ✅ Database record creation
└── ✅ Response format validation
```

### 3. Database Transaction Lifecycle Test

```
🧪 TEST 3: Database Transaction Lifecycle
├── ✅ Transaction creation (pending)
├── ✅ Status update (processing)
├── ✅ Status update (completed)
├── ✅ Notification triggering
└── ✅ Data integrity verification
```

### 4. Notification System Test

```
🧪 TEST 4: Notification System Integration
├── ✅ Email notification (success)
├── ✅ Email notification (failure)
├── ✅ Push notification (success)
├── ✅ Push notification (failure)
└── ✅ User preference handling
```

### 5. API Endpoints Test

```
🧪 TEST 5: API Endpoints Testing
├── ✅ Balance check endpoint
├── ✅ Fee estimation endpoint
├── ✅ Service stats endpoint
├── ✅ Authentication verification
└── ✅ Rate limiting validation
```

### 6. Error Handling Test

```
🧪 TEST 6: Error Handling and Edge Cases
├── ✅ Invalid wallet addresses
├── ✅ Insufficient balance scenarios
├── ✅ Network timeout simulation
├── ✅ Malformed request handling
└── ✅ Rate limit enforcement
```

### 7. Real Solana Transaction Test

```
🧪 TEST 7: Real Solana Transaction Simulation
├── ✅ SOL transfer creation
├── ✅ Transaction signing
├── ✅ DevNet submission
├── ✅ Confirmation waiting
└── ✅ Transaction verification
```

### 8. Performance and Concurrency Test

```
🧪 TEST 8: Performance and Concurrency Testing
├── ✅ Concurrent API requests
├── ✅ Response time measurement
├── ✅ Success rate calculation
├── ✅ Resource usage monitoring
└── ✅ Stress testing
```

## 🔍 Test Output Examples

### Successful Test Run

```
╔══════════════════════════════════════════════════════════════╗
║                🚀 SOLANA DEVNET INTEGRATION TEST             ║
║                                                              ║
║  This test will verify:                                      ║
║  ✅ Devnet wallet creation and funding                       ║
║  ✅ Database transaction lifecycle                           ║
║  ✅ Notification system integration                          ║
║  ✅ API endpoints functionality                              ║
║  ✅ Error handling and edge cases                            ║
║  ✅ Real Solana transaction processing                       ║
║  ✅ Performance and concurrency                              ║
╚══════════════════════════════════════════════════════════════╝

🔍 Checking environment setup...
✅ Environment setup verified

🏁 Starting Solana DevNet Integration Test...

🚀 Setting up Solana DevNet Integration Test...
💰 Creating test wallets...
Wallet addresses:
👤 Sender: 7jMZ8Q2Q1xXxhX3bVwM1KkFgW5qNpXxK2vY9zD4Bg8P
📨 Receiver: 3kK8J4P5vW7N2L9xQ1M6fC8yE5tR3dG9Hp6Zb2Fg4N
💳 Fee Payer: 9mN5B8Lk3W6qY1zX7vC2nR4dF5gH8jP9Qt2Mb5Nx8D
🔴 Empty: 2pR5K9Wt6Y3Ng8jL4vZ1xM7bF2cD8Qp5Hu9Ev1Ax6

💸 Funding test wallets...
💰 Requesting 2 SOL airdrop for 7jMZ8Q2Q1xXxhX3bVwM1KkFgW5qNpXxK2vY9zD4Bg8P...
✅ Airdrop confirmed: 5Zr8X3Nq9M2fT6jL1vY4wC8pE5gH7dK3nR6Fx2Bg9Qt

🔍 Verifying wallet balances...
💰 sender: 2.0 SOL
💰 receiver: 0.5 SOL
💰 feePayer: 1.0 SOL
✅ All wallets funded successfully

👤 Creating test user...
✅ Test user created: 123e4567-e89b-12d3-a456-426614174000

🗄️ Setting up test database...
✅ Test database setup completed
✅ Test environment setup completed

🧪 TEST 1: Wallet Creation and Funding
✅ Wallet creation and funding test passed

🧪 TEST 2: USDT Transfer Preparation
✅ USDT transfer preparation test passed

🧪 TEST 3: Database Transaction Lifecycle
✅ Database transaction lifecycle test passed

🧪 TEST 4: Notification System Integration
✅ Success notification sent
✅ Failure notification sent
✅ Notification system test completed

🧪 TEST 5: API Endpoints Testing
✅ API endpoints test passed

🧪 TEST 6: Error Handling and Edge Cases
✅ Error handling test passed

🧪 TEST 7: Real Solana Transaction Simulation
✅ Real Solana transaction confirmed: 2xD8F5Mq7N3gH9jL6vC1wY4pR8tE5nK2fZ9Gx3Bv7Q
✅ Real Solana transaction test completed

🧪 TEST 8: Performance and Concurrency Testing
✅ Processed 5 concurrent requests in 1247ms
✅ Performance and concurrency test passed

🎉 All tests completed successfully!

🧹 Cleaning up test environment...
✅ Test environment cleaned up

╔══════════════════════════════════════════════════════════════╗
║                    🎉 TEST SUITE PASSED!                    ║
║                                                              ║
║  All Solana integration tests completed successfully.       ║
║  Your system is ready for Solana DevNet operations!         ║
╚══════════════════════════════════════════════════════════════╝
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Airdrop Failures

**Problem**: `Failed to request airdrop from devnet`

**Solutions**:
```bash
# Try alternative RPC endpoints
export SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=demo

# Check devnet status
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1, "method":"getHealth"}' https://api.devnet.solana.com

# Manual funding via faucet
open https://faucet.solana.com/
```

#### 2. Database Connection Issues

**Problem**: `Failed to connect to Supabase`

**Solutions**:
```bash
# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     "$SUPABASE_URL/rest/v1/users?select=*&limit=1"
```

#### 3. Notification Failures

**Problem**: `Email/Push notifications not sending`

**Solutions**:
```bash
# Check email configuration
npm run test-email

# Check Firebase configuration  
npm run test-firebase

# Verify notification settings in database
```

#### 4. Rate Limiting Issues

**Problem**: `Rate limit exceeded`

**Solutions**:
```bash
# Wait and retry
sleep 60

# Use different RPC endpoint
# Implement exponential backoff in tests
```

#### 5. Transaction Timeouts

**Problem**: `Transaction confirmation timeout`

**Solutions**:
```bash
# Increase timeout in config
export SOLANA_CONFIRMATION_TIMEOUT=60000

# Check network status
solana cluster-version --url devnet

# Retry with different RPC
```

## 🔬 Advanced Testing

### Load Testing

```bash
# Run extended load test
LOAD_TEST_DURATION=300 node test-solana-integration.js

# Monitor performance
npm run monitor-solana-performance
```

### Security Testing

```bash
# Run security-focused tests
npm test tests/solana-security.test.js

# Test with malicious inputs
npm test tests/solana-security-edge-cases.test.js
```

### Network Simulation

```bash
# Test with network latency
NETWORK_DELAY=2000 node test-solana-integration.js

# Test with intermittent failures
FAILURE_RATE=0.1 node test-solana-integration.js
```

## 📝 Test Reports

Tests generate detailed reports in:

- `test-results/solana-integration-report.json` - Machine-readable results
- `test-results/solana-integration-report.html` - Human-readable HTML report
- `logs/solana-integration.log` - Detailed execution logs

## 🎯 Best Practices

### Before Running Tests

1. ✅ Verify environment variables are set
2. ✅ Check internet connectivity
3. ✅ Ensure database is accessible
4. ✅ Confirm DevNet is operational
5. ✅ Review test configuration

### During Testing

1. 📊 Monitor resource usage
2. 📝 Review logs for warnings
3. 🔍 Verify test data isolation
4. ⏰ Allow sufficient time for completion
5. 🚫 Avoid interrupting long-running tests

### After Testing

1. 🧹 Verify test cleanup completed
2. 📋 Review test results and logs
3. 🔄 Run tests multiple times for consistency
4. 📊 Analyze performance metrics
5. 📝 Document any issues found

## 🆘 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review the logs in `logs/` directory
3. Verify environment configuration
4. Test individual components separately
5. Contact the development team with specific error messages

## 🔗 Related Documentation

- [Solana DevNet Documentation](https://docs.solana.com/cluster/rpc-endpoints#devnet)
- [Supabase API Reference](https://supabase.com/docs/reference/javascript)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Notification Setup Guide](./NOTIFICATION_SETUP_GUIDE.md)
- [Transaction Service Documentation](../services/transactionService.js) 