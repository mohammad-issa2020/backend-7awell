import winston from 'winston';
import { getTransports } from './transports.js';
import { getTrace, getCorrelationId, getCurrentUserId } from './correlation.js';

// create custom levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    trace: 'grey'
  }
};

// apply colors
winston.addColors(customLevels.colors);

/**
 * basic format for logs with correlation ID
 */
const baseFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const trace = getTrace();
  
  return JSON.stringify({
    timestamp,
    level,
    message,
    correlationId: trace?.correlationId || 'no-correlation',
    userId: trace?.userId || null,
    requestDuration: trace ? Date.now() - trace.startTime : null,
    ...meta,
    // additional context information
    ...(trace && {
      ip: trace.ip,
      userAgent: trace.userAgent,
      method: trace.method,
      url: trace.url
    })
  });
});

/**
 * create main logger
 */
export const backendLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    baseFormat
  ),
  transports: getTransports(),
  // handle unexpected exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 2
    })
  ],
  // handle Promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 2
    })
  ]
});

/**
 * Enhanced logger with enhanced methods
 */
class EnhancedLogger {
  constructor(baseLogger) {
    this.logger = baseLogger;
  }

  // basic logging methods
  error(message, meta = {}) {
    this.logger.error(message, this._enhanceMeta(meta));
  }

  warn(message, meta = {}) {
    this.logger.warn(message, this._enhanceMeta(meta));
  }

  info(message, meta = {}) {
    this.logger.info(message, this._enhanceMeta(meta));
  }

  http(message, meta = {}) {
    this.logger.http(message, this._enhanceMeta(meta));
  }

  debug(message, meta = {}) {
    this.logger.debug(message, this._enhanceMeta(meta));
  }

  trace(message, meta = {}) {
    this.logger.trace(message, this._enhanceMeta(meta));
  }

  // enhanced logging methods
  
  /**
   * log user actions
   */
  logUserAction(action, details = {}, userId = null) {
    const trace = getTrace();
    this.info(`User Action: ${action}`, {
      category: 'user_action',
      userId: userId || trace?.userId,
      ...details,
      duration: trace ? Date.now() - trace.startTime : null
    });
  }

  /**
   * log authentication operations
   */
  logAuth(action, success = true, details = {}, userId = null) {
    const level = success ? 'info' : 'warn';
    const trace = getTrace();
    
    this[level](`Auth: ${action}`, {
      category: 'authentication',
      success,
      userId: userId || trace?.userId,
      ip: trace?.ip,
      userAgent: trace?.userAgent,
      ...details
    });
  }

  /**
   * log transactions
   */
  logTransaction(action, details = {}, userId = null) {
    const trace = getTrace();
    this.info(`Transaction: ${action}`, {
      category: 'transaction',
      userId: userId || trace?.userId,
      ...details
    });
  }

  /**
   * log security events
   */
  logSecurity(action, severity = 'medium', details = {}, userId = null) {
    const level = severity === 'high' || severity === 'critical' ? 'error' : 'warn';
    const trace = getTrace();
    
    this[level](`Security: ${action}`, {
      category: 'security',
      severity,
      userId: userId || trace?.userId,
      ip: trace?.ip,
      userAgent: trace?.userAgent,
      ...details
    });
  }

  /**
   * log API requests
   */
  logApiRequest(method, path, statusCode, duration, userId = null) {
    const level = statusCode >= 400 ? (statusCode >= 500 ? 'error' : 'warn') : 'http';
    const trace = getTrace();
    
    this[level](`${method} ${path} - ${statusCode} (${duration}ms)`, {
      category: 'api',
      method,
      path,
      statusCode,
      duration,
      userId: userId || trace?.userId,
      ip: trace?.ip,
      userAgent: trace?.userAgent
    });
  }

  /**
   * log errors with stack trace
   */
  logError(error, context = {}, userId = null) {
    const trace = getTrace();
    this.error(`Error: ${error.message}`, {
      category: 'error',
      error: error.message,
      stack: error.stack,
      userId: userId || trace?.userId,
      ...context
    });
  }

  /**
   * log performance
   */
  logPerformance(action, duration, details = {}, userId = null) {
    const level = duration > 5000 ? 'warn' : 'info';
    const trace = getTrace();
    
    this[level](`Performance: ${action} took ${duration}ms`, {
      category: 'performance',
      action,
      duration,
      userId: userId || trace?.userId,
      ...details
    });
  }

  /**
   * log database operations
   */
  logDatabase(operation, table, success = true, details = {}, userId = null) {
    const level = success ? 'debug' : 'error';
    const trace = getTrace();
    
    this[level](`DB: ${operation} on ${table}`, {
      category: 'database',
      operation,
      table,
      success,
      userId: userId || trace?.userId,
      ...details
    });
  }

  /**
   * enhance metadata with context information
   */
  _enhanceMeta(meta) {
    const trace = getTrace();
    return {
      ...meta,
      correlationId: meta.correlationId || trace?.correlationId,
      userId: meta.userId || trace?.userId,
      timestamp: new Date().toISOString()
    };
  }
}

// create enhanced instance of Logger
export const logger = new EnhancedLogger(backendLogger);

// export main logger for direct use
export { backendLogger as rawLogger };

// exporttass default
export default logger; 