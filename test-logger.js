import logger from './utils/logger.js';

console.log('🔥 Testing logging system...\n');

// Test 1: Basic log
logger.info('Hello! This is a logging test', {
    testType: 'basic_test',
    timestamp: new Date().toISOString()
});

// Test 2: Error log
logger.error('This is an example error', {
    errorCode: 'TEST_ERROR',
    details: 'This is a test error for demonstration'
});

// Test 3: Warning log
logger.warn('Test warning message', {
    warningType: 'test_warning',
    message: 'This is a warning for testing'
});

// Test 4: User action log
logger.logUserAction('Test user activity', {
    userId: 'test_user_123',
    action: 'test_action',
    details: 'This is a test user activity'
});

// Test 5: Authentication log
logger.logAuth('User authentication attempt', {
    userId: 'test_user_123',
    step: 'login_attempt',
    method: 'email',
    result: 'success'
});

// Test 6: Transaction log
logger.logTransaction('Test transaction processing', {
    transactionId: 'tx_test_123',
    userId: 'test_user_123',
    amount: 100.50,
    currency: 'USD',
    status: 'completed'
});

// Test 7: Security log
logger.logSecurity('Security monitoring test', {
    ip: '192.168.1.100',
    suspiciousActivity: 'test_activity',
    riskLevel: 'low',
    action: 'logged'
});

// Test 8: Performance log
logger.logPerformance('Performance test operation', {
    operation: 'test_operation',
    duration: 250,
    performanceImpact: 'normal'
});

// Test 9: Debug log
logger.debug('This is a debug message', {
    debugType: 'test_debug',
    component: 'logger_test',
    details: 'This debug message helps with troubleshooting'
});

// Test 10: Trace log (most detailed)
logger.trace('This is a trace message', {
    traceType: 'test_trace',
    component: 'logger_test',
    step: 'final_step',
    details: 'This trace message shows detailed execution flow'
});

// Test 11: Database log
logger.logDatabase('SELECT', 'users', true, {
    query: 'SELECT * FROM users WHERE id = ?',
    executionTime: 45,
    rowsReturned: 1
});

console.log('\n✅ All logs have been sent!');
console.log('📁 Check the logs/ folder to see the new files');

// Short wait to ensure logs are written
setTimeout(() => {
    console.log('\n🎯 Test completed! You can now examine the files in logs/ folder');
    process.exit(0);
}, 1000); 