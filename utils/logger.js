/**
 * Enhanced Logger System
 * system for logging
 */

// Import Enhanced logging system
import enhancedLogger from '../src/logger/index.js';

// Export Enhanced logging system
export default enhancedLogger;

// Export logger
export const logger = enhancedLogger.logger;

// Export stream for morgan compatibility
export const stream = {
  write: (message) => {
    enhancedLogger.info(message.trim(), { category: 'http' });
  }
}; 