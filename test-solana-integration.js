#!/usr/bin/env node

/**
 * 🚀 Standalone Solana DevNet Integration Test Runner
 * 
 * Run with: node test-solana-integration.js
 */

import dotenv from 'dotenv';
import SolanaIntegrationTest from './tests/solana-full-integration.test.js';

// Load environment variables
dotenv.config();

console.log(`
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
║                                                              ║
║  ⚠️  Note: This test uses Solana DevNet and requires        ║
║     internet connection for airdrops and RPC calls           ║
╚══════════════════════════════════════════════════════════════╝
`);

// Check environment setup
function checkEnvironment() {
  console.log('🔍 Checking environment setup...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and try again.');
    process.exit(1);
  }
  
  console.log('✅ Environment setup verified');
}

// Main test execution
async function runTest() {
  try {
    checkEnvironment();
    
    console.log('\n🏁 Starting Solana DevNet Integration Test...\n');
    
    const testSuite = new SolanaIntegrationTest();
    await testSuite.runAllTests();
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎉 TEST SUITE PASSED!                    ║
║                                                              ║
║  All Solana integration tests completed successfully.       ║
║  Your system is ready for Solana DevNet operations!         ║
╚══════════════════════════════════════════════════════════════╝
`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║                    ❌ TEST SUITE FAILED!                    ║
║                                                              ║
║  Error: ${error.message.padEnd(49)}║
║                                                              ║
║  Please check the error details above and fix any issues.   ║
╚══════════════════════════════════════════════════════════════╝
`);
    
    console.error('\n📋 Full error details:');
    console.error(error);
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Test terminated');
  process.exit(0);
});

// Run the test
runTest(); 