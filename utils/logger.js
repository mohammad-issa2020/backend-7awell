import winston from 'winston';
import { supabase } from '../database/supabase.js';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Database transport class
class DatabaseTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.name = 'database';
    this.level = options.level || 'info';
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Only log to database if we have a userId or if it's an error/warning
      if (info.userId || ['error', 'warn'].includes(info.level)) {
        await this.logToDatabase(info);
      }
    } catch (error) {
      console.error('Failed to log to database:', error);
    }

    callback();
  }

  async logToDatabase(info) {
    try {
      const logEntry = {
        user_id: info.userId || null,
        action: info.message,
        details: {
          level: info.level,
          timestamp: info.timestamp,
          service: info.service || 'system',
          ...info.meta,
          ...(info.error && { error: info.error }),
          ...(info.stack && { stack: info.stack })
        },
        ip_address: info.ipAddress || null,
        device_id: info.deviceId || null
      };

      // Log to activity_logs table
      const { error } = await supabase
        .from('activity_logs')
        .insert([logEntry]);

      if (error) {
        console.error('Database logging error:', error);
      }
    } catch (error) {
      console.error('Database transport error:', error);
    }
  }
}

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'backend-7awell'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // Error logs separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      tailable: true
    }),

    // Authentication logs separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'auth.log'),
      level: 'info',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 10, // Keep more auth logs for security auditing
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, userId, success, category, ...meta }) => {
          if (category === 'authentication') {
            return JSON.stringify({
              timestamp,
              level,
              message,
              userId: userId || 'anonymous',
              success,
              ...meta
            });
          }
          return null; // Don't log to this file if not auth-related
        })
      )
    }),

    // Transaction logs separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'transactions.log'),
      level: 'info',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 15, // Keep more transaction logs for financial auditing
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, userId, category, ...meta }) => {
          if (category === 'transaction') {
            return JSON.stringify({
              timestamp,
              level,
              message,
              userId: userId || 'anonymous',
              ...meta
            });
          }
          return null; // Don't log to this file if not transaction-related
        })
      )
    }),

    // Security logs separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 20, // Keep many security logs
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, userId, category, severity, ...meta }) => {
          if (category === 'security') {
            return JSON.stringify({
              timestamp,
              level,
              message,
              userId: userId || 'anonymous',
              severity,
              ...meta
            });
          }
          return null;
        })
      )
    }),

    // API requests logs separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'api.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 7, // Keep a week of API logs
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, category, method, path, statusCode, duration, userId, ...meta }) => {
          if (category === 'api') {
            return JSON.stringify({
              timestamp,
              level,
              method,
              path,
              statusCode,
              duration,
              userId: userId || 'anonymous',
              ...meta
            });
          }
          return null;
        })
      )
    }),

    // Database transport
    new DatabaseTransport({
      level: 'info'
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 2
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 2
    })
  ]
});

// Enhanced logging methods with database integration
const enhancedLogger = {
  // Basic logging methods
  debug: (message, meta = {}) => logger.debug(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),

  // User-specific logging methods
  logUserAction: (userId, action, details = {}, request = null) => {
    const meta = { 
      userId, 
      ...details,
      ...(request && {
        ipAddress: getClientIP(request),
        userAgent: request.get('User-Agent'),
        deviceId: request.get('X-Device-ID') || request.body?.deviceId
      })
    };
    logger.info(action, meta);
  },

  // Authentication logging
  logAuth: (userId, action, success = true, request = null, details = {}) => {
    const level = success ? 'info' : 'warn';
    const meta = {
      userId,
      success,
      category: 'authentication',
      ...details,
      ...(request && {
        ipAddress: getClientIP(request),
        userAgent: request.get('User-Agent')
      })
    };
    logger[level](`Auth: ${action}`, meta);
  },

  // Transaction logging
  logTransaction: (userId, action, details = {}, request = null) => {
    const meta = {
      userId,
      category: 'transaction',
      ...details,
      ...(request && {
        ipAddress: getClientIP(request),
        deviceId: request.get('X-Device-ID')
      })
    };
    logger.info(`Transaction: ${action}`, meta);
  },

  // Security logging
  logSecurity: (userId, action, severity = 'medium', details = {}, request = null) => {
    const level = severity === 'high' || severity === 'critical' ? 'error' : 'warn';
    const meta = {
      userId,
      severity,
      category: 'security',
      ...details,
      ...(request && {
        ipAddress: getClientIP(request),
        userAgent: request.get('User-Agent'),
        deviceId: request.get('X-Device-ID')
      })
    };
    logger[level](`Security: ${action}`, meta);
  },

  // API request logging
  logApiRequest: (method, path, statusCode, duration, userId = null, request = null) => {
    const level = statusCode >= 400 ? (statusCode >= 500 ? 'error' : 'warn') : 'info';
    const meta = {
      method,
      path,
      statusCode,
      duration,
      userId,
      category: 'api',
      ...(request && {
        ipAddress: getClientIP(request),
        userAgent: request.get('User-Agent')
      })
    };
    logger[level](`${method} ${path} - ${statusCode} (${duration}ms)`, meta);
  },

  // Error logging with stack trace
  logError: (error, context = {}, userId = null, request = null) => {
    const meta = {
      error: error.message,
      stack: error.stack,
      userId,
      category: 'error',
      ...context,
      ...(request && {
        ipAddress: getClientIP(request),
        userAgent: request.get('User-Agent')
      })
    };
    logger.error(`Error: ${error.message}`, meta);
  },

  // Performance logging
  logPerformance: (action, duration, details = {}, userId = null) => {
    const level = duration > 5000 ? 'warn' : 'info';
    const meta = {
      userId,
      duration,
      category: 'performance',
      ...details
    };
    logger[level](`Performance: ${action} took ${duration}ms`, meta);
  },

  // Database operation logging
  logDatabase: (operation, table, success = true, details = {}, userId = null) => {
    const level = success ? 'debug' : 'error';
    const meta = {
      userId,
      operation,
      table,
      success,
      category: 'database',
      ...details
    };
    logger[level](`DB: ${operation} on ${table}`, meta);
  }
};

// Helper function to extract client IP
function getClientIP(request) {
  return request.ip ||
         request.connection?.remoteAddress ||
         request.socket?.remoteAddress ||
         (request.connection?.socket ? request.connection.socket.remoteAddress : null) ||
         request.headers['x-forwarded-for']?.split(',')[0] ||
         request.headers['x-real-ip'] ||
         'unknown';
}

// Stream for morgan HTTP logging
const stream = {
  write: (message) => {
    // Remove trailing newline and log as info
    logger.info(message.trim(), { category: 'http' });
  }
};

export default enhancedLogger;
export { logger, stream }; 