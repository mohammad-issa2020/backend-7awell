import winston from 'winston';
import { getTransports } from './transports.js';
import { 
  getTrace, 
  getCorrelationId, 
  getCurrentUserId,
  getCurrentUserPhone,
  getCurrentPhoneIdentifier,
  getCurrentUserIdentifier,
  setUserPhone,
  setUserId,
  setComponent,
  setOperation,
  getUserContext,
  isUserIdentified
} from './correlation.js';

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
 * Enhanced format for logs with comprehensive context and secure phone tracking
 */
const baseFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const trace = getTrace();
  const userContext = getUserContext();
  
  return JSON.stringify({
    timestamp,
    level,
    message,
    
    // Request tracking
    correlationId: trace?.correlationId || 'no-correlation',
    requestDuration: trace ? Date.now() - trace.startTime : null,
    
    // Enhanced user identification with secure phone tracking
    ...userContext,
    
    // Request context
    ip: trace?.ip,
    userAgent: trace?.userAgent,
    method: trace?.method,
    url: trace?.url,
    
    // Component/operation tracking for debugging
    component: trace?.component || meta.component || null,
    feature: trace?.feature || meta.feature || null,
    operation: trace?.operation || meta.operation || null,
    
    // Include all other metadata
    ...meta
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
 * Enhanced logger with secure phone-based tracking and bug debugging features
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

  // Enhanced logging methods for specific use cases
  
  /**
   * Log user actions with secure phone-based tracking support
   */
  logUserAction(action, details = {}, userId = null, userPhone = null) {
    // Update tracking if user info provided
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    const trace = getTrace();
    this.info(`User Action: ${action}`, {
      category: 'user_action',
      action,
      ...details,
      duration: trace ? Date.now() - trace.startTime : null,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Enhanced authentication logging with secure phone support
   */
  logAuth(action, success = true, details = {}, userId = null, userPhone = null) {
    const level = success ? 'info' : 'warn';
    
    // Update tracking
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('auth', action);
    
    this[level](`Auth: ${action}`, {
      category: 'authentication',
      action,
      success,
      severity: success ? 'low' : 'medium',
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Log transactions with comprehensive tracking
   */
  logTransaction(action, details = {}, userId = null, userPhone = null) {
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('transaction', action);
    
    this.info(`Transaction: ${action}`, {
      category: 'transaction',
      action,
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Enhanced security event logging
   */
  logSecurity(action, severity = 'medium', details = {}, userId = null, userPhone = null) {
    const level = severity === 'high' || severity === 'critical' ? 'error' : 'warn';
    
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('security', action);
    
    this[level](`Security: ${action}`, {
      category: 'security',
      action,
      severity,
      ...details,
      isUserIdentified: isUserIdentified(),
      requiresAttention: severity === 'high' || severity === 'critical'
    });
  }

  /**
   * Enhanced API request logging
   */
  logApiRequest(method, path, statusCode, duration, userId = null, userPhone = null) {
    const level = statusCode >= 400 ? (statusCode >= 500 ? 'error' : 'warn') : 'http';
    
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('api', `${method}-${path}`);
    
    this[level](`${method} ${path} - ${statusCode} (${duration}ms)`, {
      category: 'api',
      method,
      path,
      statusCode,
      duration,
      isError: statusCode >= 400,
      isServerError: statusCode >= 500,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Enhanced error logging with stack trace and context
   */
  logError(error, context = {}, userId = null, userPhone = null) {
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent(context.component || 'unknown', context.feature);
    
    this.error(`Error: ${error.message}`, {
      category: 'error',
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      severity: 'high',
      ...context,
      isUserIdentified: isUserIdentified(),
      requiresAttention: true
    });
  }

  /**
   * Enhanced phone operation logging with secure identifier
   * For non-signed-in users - now uses secure hash instead of last 4 digits
   */
  logPhoneOperation(operation, phone, details = {}) {
    setUserPhone(phone);
    setComponent('phone-ops', operation);
    
    const phoneIdentifier = getCurrentPhoneIdentifier();
    
    this.info(`Phone Operation: ${operation}`, {
      category: 'phone_operation',
      operation,
      phoneIdentifier: phoneIdentifier, // Secure hash identifier
      ...details,
      isUserIdentified: isUserIdentified(),
      phoneTrackingSecure: true // Indicates this uses secure tracking
    });
  }

  /**
   * Log business process steps for debugging complex flows
   */
  logBusinessProcess(process, step, success = true, details = {}, userId = null, userPhone = null) {
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setOperation(process, { step, success, ...details });
    setComponent('business', process);
    
    const level = success ? 'info' : 'warn';
    this[level](`Business Process: ${process} - ${step}`, {
      category: 'business_process',
      process,
      step,
      success,
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Log performance metrics for debugging
   */
  logPerformance(action, duration, details = {}, userId = null, userPhone = null) {
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('performance', action);
    
    const level = duration > 5000 ? 'warn' : (duration > 2000 ? 'info' : 'debug');
    this[level](`Performance: ${action} took ${duration}ms`, {
      category: 'performance',
      action,
      duration,
      isSlow: duration > 2000,
      isVerySlow: duration > 5000,
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Enhanced database operation logging
   */
  logDatabase(operation, table, success = true, details = {}, userId = null, userPhone = null) {
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('database', operation);
    
    const level = success ? 'debug' : 'error';
    this[level](`Database ${operation} on ${table}`, {
      category: 'database',
      operation,
      table,
      success,
      severity: success ? 'low' : 'high',
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Log external API calls
   */
  logExternalApi(service, operation, success = true, duration = null, details = {}) {
    setComponent('external-api', service);
    
    const level = success ? 'info' : 'warn';
    this[level](`External API: ${service} ${operation}`, {
      category: 'external_api',
      service,
      operation,
      success,
      duration,
      severity: success ? 'low' : 'medium',
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Log validation errors for debugging
   */
  logValidationError(field, value, rule, details = {}) {
    setComponent('validation', field);
    
    this.warn(`Validation Error: ${field} failed ${rule}`, {
      category: 'validation',
      field,
      rule,
      hasValue: !!value,
      valueType: typeof value,
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Log feature usage for analytics and debugging
   */
  logFeatureUsage(feature, action, details = {}, userId = null, userPhone = null) {
    if (userId) setUserId(userId);
    if (userPhone) setUserPhone(userPhone);
    
    setComponent('feature', feature);
    
    this.info(`Feature Usage: ${feature} - ${action}`, {
      category: 'feature_usage',
      feature,
      action,
      ...details,
      isUserIdentified: isUserIdentified()
    });
  }

  /**
   * Enhanced meta information with automatic context
   */
  _enhanceMeta(meta) {
    const trace = getTrace();
    const userContext = getUserContext();
    
    return {
      // Automatic context enhancement
      timestamp: new Date().toISOString(),
      ...userContext,
      correlationId: trace?.correlationId,
      component: trace?.component || meta.component,
      feature: trace?.feature || meta.feature,
      operation: trace?.operation || meta.operation,
      
      // Memory and performance
      memoryUsage: process.memoryUsage(),
      
      // Original metadata
      ...meta
    };
  }
}

// create enhanced logger instance
export const logger = new EnhancedLogger(backendLogger);

// export correlation functions for convenience
export {
  getTrace,
  getCorrelationId,
  getCurrentUserId,
  getCurrentUserPhone,
  getCurrentPhoneIdentifier,
  getCurrentUserIdentifier,
  setUserPhone,
  setUserId,
  setComponent,
  setOperation,
  getUserContext,
  isUserIdentified
};

export default logger; 