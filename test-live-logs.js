import logger from './src/logger/index.js';

console.log('🧪 Starting Better Stack Live Logs Test...\n');

// Function to generate different types of logs
function generateVariousLogs() {
  console.log('📊 Generating various log types for Better Stack...');
  
  // 1. Info logs
  logger.info('🚀 Live test started - Better Stack Integration', {
    category: 'test-lifecycle',
    testId: 'better-stack-' + Date.now(),
    environment: 'testing',
    feature: 'better-stack-transport'
  });
  
  // 2. Debug logs
  logger.debug('🔍 Debug information for Better Stack testing', {
    category: 'test-debug',
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
  
  // 3. Warning logs
  logger.warn('⚠️ Better Stack Warning Test', {
    category: 'test-warning',
    warningType: 'live-test',
    severity: 'medium',
    message: 'This is a test warning for Better Stack Live Tail'
  });
  
  // 4. Error logs
  logger.error('❌ Better Stack Error Test', {
    category: 'test-error',
    errorType: 'simulation',
    errorCode: 'BETTER_STACK_TEST_001',
    stack: 'Simulated stack trace for Better Stack testing',
    userId: 'test-user-123'
  });
  
  // 5. HTTP logs
  logger.http('🌐 HTTP simulation log for Better Stack', {
    category: 'test-http',
    method: 'POST',
    url: '/api/better-stack-test',
    statusCode: 200,
    responseTime: 45,
    correlationId: 'better-stack-test-correlation'
  });
  
  // 6. Custom structured logs
  logger.info('💾 Database operation test', {
    category: 'test-database',
    operation: 'SELECT',
    table: 'users',
    executionTime: 23,
    rowsAffected: 5,
    query: 'SELECT * FROM users WHERE active = true'
  });
  
  // 7. Security logs
  logger.warn('🔐 Security test log', {
    category: 'test-security',
    event: 'authentication_attempt',
    result: 'success',
    userId: 'test-user-456',
    ip: '192.168.1.100',
    userAgent: 'Better-Stack-Test-Agent/1.0'
  });
  
  // 8. Performance logs
  logger.info('⚡ Performance metrics test', {
    category: 'test-performance',
    metrics: {
      responseTime: 125,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage(),
      activeConnections: 15
    }
  });
  
  // 9. Business logic logs
  logger.info('💰 Business transaction test', {
    category: 'test-business',
    transactionType: 'payment',
    amount: 100.50,
    currency: 'USD',
    transactionId: 'btst-' + Date.now(),
    status: 'completed'
  });
  
  // 10. Final completion log
  logger.info('✅ Better Stack Live Test completed successfully', {
    category: 'test-lifecycle',
    totalLogs: 10,
    testDuration: 'immediate',
    timestamp: new Date().toISOString(),
    nextStep: 'Check Better Stack Dashboard'
  });
}

// Run the test
console.log('🔥 Starting Better Stack log generation...');
generateVariousLogs();

console.log('\n🎉 Better Stack Live Logs Test completed!');
console.log('📊 Expected logs: 10 different log entries');
console.log('🌐 Dashboard: https://logs.betterstack.com');
