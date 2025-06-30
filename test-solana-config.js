/**
 * 🔧 Solana DevNet Test Configuration
 * 
 * Configuration settings for comprehensive Solana testing
 */

import { Connection, PublicKey } from '@solana/web3.js';

export const SOLANA_TEST_CONFIG = {
  // ============================================
  // 🌐 NETWORK CONFIGURATION
  // ============================================
  
  // DevNet RPC endpoints (fallback if primary fails)
  RPC_ENDPOINTS: [
    'https://api.devnet.solana.com',
    'https://devnet.helius-rpc.com/?api-key=demo',
    'https://solana-devnet.g.alchemy.com/v2/demo'
  ],
  
  // Network settings
  NETWORK: 'devnet',
  COMMITMENT: 'confirmed',
  
  // ============================================
  // 💰 TOKEN ADDRESSES (DevNet)
  // ============================================
  
  // USDC on DevNet (using as USDT alternative for testing)
  USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  
  // Test token mint (create our own for testing)
  TEST_TOKEN_DECIMALS: 6,
  
  // ============================================
  // 💸 TRANSACTION AMOUNTS
  // ============================================
  
  // Test amounts (in token units)
  AMOUNTS: {
    SMALL: 0.01,      // Small test amount
    MEDIUM: 1,        // Medium test amount  
    LARGE: 10,        // Large test amount
    INSUFFICIENT: 1000000  // Intentionally too large
  },
  
  // SOL amounts for gas fees
  SOL_AMOUNTS: {
    MIN_BALANCE: 0.01,        // Minimum SOL needed
    AIRDROP_AMOUNT: 2,        // SOL to request from faucet
    FEE_BUFFER: 0.1           // Extra SOL for fees
  },
  
  // ============================================
  // ⏱️ TIMING CONFIGURATION
  // ============================================
  
  TIMEOUTS: {
    AIRDROP: 30000,           // 30 seconds for airdrop
    TRANSACTION: 60000,       // 60 seconds for transaction
    CONFIRMATION: 30000,      // 30 seconds for confirmation
    API_REQUEST: 10000,       // 10 seconds for API calls
    SETUP: 120000            // 2 minutes for test setup
  },
  
  // Retry configuration
  RETRIES: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 2000,           // 2 seconds between retries
    BACKOFF_MULTIPLIER: 1.5   // Exponential backoff
  },
  
  // ============================================
  // 🧪 TEST SCENARIOS
  // ============================================
  
  TEST_SCENARIOS: {
    // Happy path scenarios
    SUCCESSFUL_TRANSFER: {
      name: 'Successful USDT Transfer',
      amount: 1,
      expectedStatus: 'completed'
    },
    
    SMALL_AMOUNT_TRANSFER: {
      name: 'Small Amount Transfer',
      amount: 0.01,
      expectedStatus: 'completed'
    },
    
    // Error scenarios
    INSUFFICIENT_BALANCE: {
      name: 'Insufficient Balance',
      amount: 1000000,
      expectedError: 'Insufficient balance'
    },
    
    INVALID_ADDRESS: {
      name: 'Invalid Wallet Address',
      fromWallet: 'invalid-address',
      expectedError: 'Invalid wallet address'
    },
    
    // Edge cases
    ZERO_AMOUNT: {
      name: 'Zero Amount Transfer',
      amount: 0,
      expectedError: 'Amount must be greater than zero'
    },
    
    NEGATIVE_AMOUNT: {
      name: 'Negative Amount Transfer',
      amount: -1,
      expectedError: 'Amount must be positive'
    }
  },
  
  // ============================================
  // 📊 PERFORMANCE TESTING
  // ============================================
  
  PERFORMANCE: {
    CONCURRENT_REQUESTS: 5,    // Number of concurrent API requests
    LOAD_TEST_DURATION: 60,    // Load test duration in seconds
    MAX_RESPONSE_TIME: 5000,   // Max acceptable response time (ms)
    MIN_SUCCESS_RATE: 0.95     // Minimum success rate (95%)
  },
  
  // ============================================
  // 🔧 API TESTING
  // ============================================
  
  API: {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
      PREPARE_TRANSFER: '/api/solana/usdt/prepare',
      COMPLETE_TRANSFER: '/api/solana/usdt/complete',
      CHECK_BALANCE: '/api/solana/usdt/balance',
      ESTIMATE_FEE: '/api/solana/estimate-fee',
      SERVICE_STATS: '/api/solana/stats',
      TRANSACTION_INFO: '/api/solana/transaction'
    },
    
    RATE_LIMITS: {
      TRANSFERS: { window: 60000, max: 10 },        // 10 per minute
      BALANCE_CHECKS: { window: 60000, max: 30 },   // 30 per minute
      UTILITIES: { window: 60000, max: 60 }         // 60 per minute
    }
  },
  
  // ============================================
  // 🗄️ DATABASE TESTING
  // ============================================
  
  DATABASE: {
    // Test transaction statuses to verify
    TRANSACTION_STATUSES: [
      'pending',
      'processing', 
      'completed',
      'failed',
      'cancelled'
    ],
    
    // Test user data
    TEST_USER_PREFIX: 'solana-test-',
    
    // Cleanup settings
    CLEANUP_AFTER_TEST: true,
    PRESERVE_ON_FAILURE: false
  },
  
  // ============================================
  // 🔔 NOTIFICATION TESTING
  // ============================================
  
  NOTIFICATIONS: {
    // Test notification types
    TYPES: ['success', 'failure'],
    
    // Test channels
    CHANNELS: ['email', 'push'],
    
    // Mock settings for testing
    MOCK_EMAIL: 'test@solana-integration.local',
    MOCK_DEVICE_TOKEN: 'test-device-token-123',
    
    // Verification settings
    VERIFY_DELIVERY: false,  // Set to true if you want to verify actual delivery
    TIMEOUT_MS: 5000
  },
  
  // ============================================
  // 🚨 ERROR SIMULATION
  // ============================================
  
  ERROR_SIMULATION: {
    // Network errors
    NETWORK_TIMEOUT: true,
    RPC_FAILURE: true,
    
    // Wallet errors
    INVALID_SIGNATURE: true,
    INSUFFICIENT_FUNDS: true,
    
    // API errors  
    RATE_LIMIT_EXCEEDED: true,
    UNAUTHORIZED_ACCESS: true,
    
    // Database errors
    CONNECTION_FAILURE: false,  // Be careful with this one
    CONSTRAINT_VIOLATION: true
  },
  
  // ============================================
  // 📝 LOGGING CONFIGURATION
  // ============================================
  
  LOGGING: {
    LEVEL: 'debug',           // debug, info, warn, error
    INCLUDE_TIMESTAMPS: true,
    INCLUDE_STACK_TRACES: true,
    LOG_API_REQUESTS: true,
    LOG_DATABASE_QUERIES: false,  // Can be noisy
    LOG_BLOCKCHAIN_CALLS: true
  },
  
  // ============================================
  // 🔐 SECURITY TESTING
  // ============================================
  
  SECURITY: {
    TEST_AUTH_BYPASS: true,
    TEST_INJECTION_ATTACKS: true,
    TEST_RATE_LIMITING: true,
    TEST_INPUT_VALIDATION: true,
    
    // Private key management
    VALIDATE_KEY_SECURITY: true,
    CHECK_KEY_EXPOSURE: true
  }
};

/**
 * Get connection with fallback RPC endpoints
 */
export function getSolanaConnection() {
  for (const endpoint of SOLANA_TEST_CONFIG.RPC_ENDPOINTS) {
    try {
      return new Connection(endpoint, SOLANA_TEST_CONFIG.COMMITMENT);
    } catch (error) {
      console.warn(`Failed to connect to ${endpoint}:`, error.message);
    }
  }
  
  throw new Error('Unable to connect to any Solana RPC endpoint');
}

/**
 * Validate test configuration
 */
export function validateTestConfig() {
  const errors = [];
  
  // Check required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing environment variable: ${envVar}`);
    }
  }
  
  // Validate configuration values
  if (SOLANA_TEST_CONFIG.TIMEOUTS.AIRDROP < 10000) {
    errors.push('Airdrop timeout too short (minimum 10 seconds)');
  }
  
  if (SOLANA_TEST_CONFIG.RETRIES.MAX_ATTEMPTS < 1) {
    errors.push('Max retry attempts must be at least 1');
  }
  
  if (SOLANA_TEST_CONFIG.PERFORMANCE.CONCURRENT_REQUESTS < 1) {
    errors.push('Concurrent requests must be at least 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get test wallet configurations
 */
export function getTestWalletConfig() {
  return {
    sender: {
      role: 'user',
      needsSOL: true,
      needsTokens: true,
      airdropAmount: SOLANA_TEST_CONFIG.SOL_AMOUNTS.AIRDROP_AMOUNT
    },
    
    receiver: {
      role: 'recipient', 
      needsSOL: true,
      needsTokens: false,
      airdropAmount: SOLANA_TEST_CONFIG.SOL_AMOUNTS.MIN_BALANCE
    },
    
    feePayer: {
      role: 'service',
      needsSOL: true,
      needsTokens: false,
      airdropAmount: SOLANA_TEST_CONFIG.SOL_AMOUNTS.AIRDROP_AMOUNT
    },
    
    empty: {
      role: 'test-insufficient',
      needsSOL: false,
      needsTokens: false,
      airdropAmount: 0
    }
  };
}

export default SOLANA_TEST_CONFIG; 