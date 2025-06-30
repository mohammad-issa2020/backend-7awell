import logger from './src/logger/index.js';

console.log('🧪 Testing Better Stack Winston Transport...');

// Test different log levels
logger.info('Better Stack Info Test', {
  category: 'test',
  feature: 'better-stack-transport',
  userId: 'test-user-123',
  timestamp: new Date().toISOString()
});

logger.warn('Better Stack Warning Test', {
  category: 'test',
  warningType: 'configuration',
  message: 'This is a warning message for Better Stack'
});

logger.error('Better Stack Error Test', {
  category: 'test',
  error: 'Sample error for testing',
  stack: 'Sample stack trace',
  userId: 'test-user-123'
});

// Test with correlation data
logger.debug('Better Stack Debug Test', {
  category: 'debug',
  debugInfo: {
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  }
});

console.log('✅ Test messages sent!');
console.log('Check your Better Stack dashboard in a few minutes...');

setTimeout(() => {
  console.log('🔍 Visit: https://logs.betterstack.com');
  process.exit(0);
}, 2000); 