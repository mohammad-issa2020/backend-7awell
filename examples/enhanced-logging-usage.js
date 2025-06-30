/**
 * Enhanced Logging Usage Examples
 * 
 * This file demonstrates how to use the new enhanced logging system that:
 * 1. Sends ALL log levels to BetterStack
 * 2. Creates 3 daily rotating files (debug, normal, error)
 * 3. Supports phone-based user tracking for non-signed-in users
 * 4. Provides comprehensive bug tracking capabilities
 */

import logger, {
  setUserPhone,
  setUserId,
  setComponent,
  setOperation,
  getUserContext,
  isUserIdentified
} from '../src/logger/index.js';

// ============================================================================
// 1. BASIC LOGGING EXAMPLES
// ============================================================================

console.log('\n=== BASIC LOGGING ===');

// All these will go to:
// - Console (development)
// - logs/debug-YYYY-MM-DD.log (debug + trace)
// - logs/normal-YYYY-MM-DD.log (info + warn + error)
// - logs/error-YYYY-MM-DD.log (errors only)
// - BetterStack (ALL levels now!)

logger.trace('Detailed trace information', { step: 'initialization' });
logger.debug('Debug information for developers', { variable: 'test_value' });
logger.info('General application information', { process: 'startup' });
logger.warn('Warning that needs attention', { resource: 'memory' });
logger.error('Error that occurred', { error: 'connection_failed' });

// ============================================================================
// 2. PHONE-BASED USER TRACKING (For Non-Signed-In Users)
// ============================================================================

console.log('\n=== PHONE-BASED TRACKING ===');

// Example: User enters phone number for OTP but hasn't signed in yet
const userPhone = '+1234567890';

// Method 1: Log phone operations directly
logger.logPhoneOperation('otp_request', userPhone, {
  method: 'SMS',
  attempts: 1
});

// Method 2: Set phone in context for subsequent logs
setUserPhone(userPhone);
logger.info('Phone verified successfully', { 
  verification_method: 'SMS',
  duration: 45000 
});

// All subsequent logs in this request will include phone tracking
logger.logUserAction('profile_view', { section: 'basic_info' });

// ============================================================================
// 3. AUTHENTICATED USER TRACKING
// ============================================================================

console.log('\n=== AUTHENTICATED USER TRACKING ===');

// When user signs in, update to user ID tracking
const userId = 'user_12345';
setUserId(userId);

logger.logAuth('login', true, {
  method: 'phone_otp',
  device: 'mobile_app'
}, userId, userPhone);

// User actions with full identification
logger.logUserAction('wallet_view', {
  balance_requested: true,
  currency: 'USDC'
}, userId);

// ============================================================================
// 4. TRANSACTION LOGGING
// ============================================================================

console.log('\n=== TRANSACTION LOGGING ===');

logger.logTransaction('send_crypto', {
  from_address: 'addr123...',
  to_address: 'addr456...',
  amount: 100,
  currency: 'USDC',
  network: 'solana',
  fee: 0.01
}, userId, userPhone);

// Business process tracking for complex flows
logger.logBusinessProcess('crypto_send', 'validation', true, {
  validation_type: 'address_format'
});

logger.logBusinessProcess('crypto_send', 'signature', true, {
  wallet_type: 'phantom'
});

// ============================================================================
// 5. ERROR TRACKING FOR BUG DEBUGGING
// ============================================================================

console.log('\n=== ERROR TRACKING ===');

try {
  throw new Error('Simulated API error');
} catch (error) {
  logger.logError(error, {
    component: 'payment_processor',
    feature: 'crypto_send',
    operation: 'broadcast_transaction',
    transaction_id: 'tx_789',
    retry_count: 2
  }, userId, userPhone);
}

// Validation errors
logger.logValidationError('wallet_address', 'invalid_format_123', 'solana_address_format', {
  user_input: 'invalid_format_123',
  expected_format: 'base58_44_chars'
});

// ============================================================================
// 6. PERFORMANCE MONITORING
// ============================================================================

console.log('\n=== PERFORMANCE MONITORING ===');

// Simulate slow operation
const start = Date.now();
await new Promise(resolve => setTimeout(resolve, 1500));
const duration = Date.now() - start;

logger.logPerformance('database_query', duration, {
  query_type: 'user_transactions',
  table: 'transactions',
  record_count: 150
}, userId);

// External API calls
logger.logExternalApi('solana_rpc', 'get_balance', true, 800, {
  endpoint: 'https://api.mainnet-beta.solana.com',
  address: 'addr123...'
});

// ============================================================================
// 7. SECURITY EVENT LOGGING
// ============================================================================

console.log('\n=== SECURITY EVENTS ===');

logger.logSecurity('suspicious_login_attempt', 'high', {
  ip_address: '192.168.1.100',
  failed_attempts: 5,
  lockout_triggered: true
}, null, userPhone);

logger.logSecurity('rate_limit_exceeded', 'medium', {
  endpoint: '/api/send-otp',
  requests_per_minute: 15,
  limit: 10
});

// ============================================================================
// 8. FEATURE USAGE TRACKING
// ============================================================================

console.log('\n=== FEATURE USAGE ===');

logger.logFeatureUsage('crypto_wallet', 'balance_check', {
  currencies: ['USDC', 'SOL'],
  refresh_triggered: true
}, userId, userPhone);

logger.logFeatureUsage('contact_sync', 'import', {
  contacts_count: 250,
  source: 'phone_contacts'
}, userId);

// ============================================================================
// 9. COMPONENT AND OPERATION CONTEXT
// ============================================================================

console.log('\n=== COMPONENT CONTEXT ===');

// Set component context for a series of operations
setComponent('payment_flow', 'recipient_validation');
setOperation('send_crypto', { step: 'address_validation' });

logger.debug('Validating recipient address format');
logger.debug('Checking address exists on blockchain');
logger.info('Recipient validation completed successfully');

// ============================================================================
// 10. DATABASE OPERATIONS
// ============================================================================

console.log('\n=== DATABASE OPERATIONS ===');

logger.logDatabase('INSERT', 'transactions', true, {
  transaction_id: 'tx_12345',
  user_id: userId,
  amount: 100,
  currency: 'USDC'
});

logger.logDatabase('UPDATE', 'user_balances', false, {
  error: 'constraint_violation',
  attempted_balance: -50,
  constraint: 'positive_balance_check'
}, userId);

// ============================================================================
// 11. CHECKING USER CONTEXT
// ============================================================================

console.log('\n=== USER CONTEXT INSPECTION ===');

const userContext = getUserContext();
console.log('Current user context:', userContext);
console.log('Is user identified?', isUserIdentified());

// Example output for BetterStack searching:
// userId:user_12345 - Find all logs for specific user
// userPhone:+1234567890 - Find logs for phone number
// category:transaction - Find all transaction logs  
// component:payment_flow - Find all payment-related logs
// severity:high - Find high-severity events
// isUserIdentified:true - Find logs with identified users

// ============================================================================
// 12. CORRELATION ID USAGE
// ============================================================================

console.log('\n=== CORRELATION TRACKING ===');

// All logs within a request share the same correlation ID
// This allows you to trace a complete user journey in BetterStack

logger.info('Request started: Send crypto flow');
logger.debug('Step 1: Validate sender balance');
logger.debug('Step 2: Validate recipient address');
logger.warn('Step 3: High fee detected', { fee_percentage: 15 });
logger.info('Step 4: Transaction submitted successfully');

console.log('\n=== LOGGING EXAMPLES COMPLETE ===');
console.log('Check your log files:');
console.log('- logs/debug-YYYY-MM-DD.log (all logs including debug/trace)');
console.log('- logs/normal-YYYY-MM-DD.log (info, warn, error only)');
console.log('- logs/error-YYYY-MM-DD.log (errors only)');
console.log('- BetterStack dashboard (all levels including debug)');

// ============================================================================
// BETTERSTACK SEARCH EXAMPLES
// ============================================================================

/*
🔍 BETTERSTACK SEARCH QUERIES:

Basic filters:
- level:error                     # Only errors
- level:debug                     # Debug and trace logs
- category:transaction            # All transaction logs
- component:payment_flow          # All payment-related logs

User tracking:
- userId:user_12345              # Logs for specific user
- userPhone:7890                 # Logs for phone ending in 7890
- userIdentifier:phone-7890      # Non-authenticated user tracking
- isUserIdentified:true          # Only identified users

Debugging:
- correlationId:abc123           # Trace complete request
- severity:high                  # High-severity events
- requiresAttention:true         # Events needing attention
- errorName:TypeError            # Specific error types

Performance:
- category:performance           # Performance logs
- isSlow:true                    # Slow operations (>2s)
- isVerySlow:true               # Very slow operations (>5s)
- duration:>5000                # Operations taking >5 seconds

Business tracking:
- process:crypto_send            # Specific business process
- feature:crypto_wallet          # Feature usage
- operation:broadcast_transaction # Specific operations

*/ 