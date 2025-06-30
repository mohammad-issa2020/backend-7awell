import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import LokiTransport from 'winston-loki';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { getTrace } from './correlation.js';

/**
 * Enhanced format for better bug tracking with secure phone identification
 */
const enhancedFormat = winston.format.printf((info) => {
  const trace = getTrace();
  const timestamp = new Date().toISOString();
  
  return JSON.stringify({
    timestamp,
    level: info.level,
    message: info.message,
    
    // Request tracking
    correlationId: info.correlationId || trace?.correlationId || 'no-correlation',
    
    // Enhanced user identification (secure phone tracking)
    userId: info.userId || trace?.userId || null,
    userPhone: info.userPhone || trace?.userPhone || null,
    phoneIdentifier: info.phoneIdentifier || trace?.phoneIdentifier || null,
    userIdentifier: info.userIdentifier || trace?.userIdentifier || 'anonymous',
    
    // Request context
    ip: trace?.ip || null,
    userAgent: trace?.userAgent || null,
    method: trace?.method || null,
    url: trace?.url || null,
    requestDuration: trace ? Date.now() - trace.startTime : null,
    
    // Environment info
    environment: process.env.NODE_ENV || 'development',
    service: '7awell-backend',
    version: process.env.npm_package_version || '1.0.0',
    
    // Additional metadata
    category: info.category || 'general',
    ...info,
    
    // Stack trace for errors
    ...(info.stack && { stack: info.stack }),
    
    // Performance metrics
    ...(info.duration && { duration: info.duration }),
    
    // Memory usage for debugging
    memoryUsage: process.memoryUsage(),
    
    // Process info
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown'
  });
});

/**
 * Console transport for development
 */
export const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, correlationId, userId, userPhone, phoneIdentifier, userIdentifier, ...meta }) => {
      const trace = getTrace();
      const correlation = correlationId || trace?.correlationId || 'no-correlation';
      
      // Enhanced user display with secure phone identifier
      let userDisplay = 'anonymous';
      if (userId) {
        userDisplay = `user-${userId}`;
      } else if (phoneIdentifier) {
        // Show secure phone identifier for better tracking
        userDisplay = phoneIdentifier;
      } else if (userIdentifier && userIdentifier !== 'anonymous') {
        userDisplay = userIdentifier;
      }
      
      let metaStr = '';
      if (Object.keys(meta).length > 0) {
        metaStr = ` ${JSON.stringify(meta)}`;
      }
      
      return `${timestamp} [${level}] [${correlation.slice(0, 8)}] [${userDisplay}]: ${message}${metaStr}`;
    })
  )
});

/**
 * 1. DEBUG FILE: All debug and trace logs
 * This file contains ALL debugging information including trace logs
 */
export const debugFileTransport = new DailyRotateFile({
  filename: 'logs/debug-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d', // Keep debug logs for 7 days
  level: 'trace', // Include debug and trace levels
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    enhancedFormat
  )
});

/**
 * 2. NORMAL FILE: Info, warn, and error logs (NO debug)
 * This file contains production-level logs without debug noise
 */
export const normalFileTransport = new DailyRotateFile({
  filename: 'logs/normal-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '30d', // Keep normal logs for 30 days
  level: 'info', // Info, warn, error (excludes debug and trace)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    enhancedFormat
  )
});

/**
 * 3. ERROR FILE: Only error logs
 * This file contains ONLY errors for quick debugging
 */
export const errorFileTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '90d', // Keep errors for 90 days
  level: 'error', // Only error level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    enhancedFormat
  )
});

/**
 * Loki transport for production (optional)
 */
export const lokiTransport = process.env.LOKI_URL ? new LokiTransport({
  host: process.env.LOKI_URL,
  labels: {
    app: '7awell-backend',
    env: process.env.NODE_ENV || 'development',
  },
  format: winston.format.json(),
  onConnectionError: (err) => {
    console.error('Loki connection error:', err);
  },
  // dynamic labels with secure phone identifier
  dynamicLabels: () => {
    const trace = getTrace();
    return {
      correlationId: trace?.correlationId || 'unknown',
      userIdentifier: trace?.userIdentifier || 'anonymous',
    };
  },
  batching: true,
  interval: 5000, // send every 5 seconds
  maxBatchSize: 1000
}) : null;

/**
 * Better Stack transport for cloud logging
 * NOW SENDS ALL LOG LEVELS INCLUDING DEBUG AND TRACE
 * WITH SECURE PHONE IDENTIFICATION
 */
export const betterStackTransport = process.env.BETTER_STACK_SOURCE_TOKEN ? (() => {
  const logtail = new Logtail(process.env.BETTER_STACK_SOURCE_TOKEN, {
    endpoint: process.env.BETTER_STACK_ENDPOINT || 'https://in.logs.betterstack.com',
  });

  return new LogtailTransport(logtail, {
    level: 'trace', // ✅ NOW SENDS ALL LEVELS (trace, debug, info, warn, error)
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf((info) => {
        const trace = getTrace();
        const timestamp = new Date().toISOString();
        
        return JSON.stringify({
          // Basic log info
          timestamp,
          level: info.level,
          message: info.message,
          
          // Enhanced tracking for bug resolution with secure phone identification
          correlationId: info.correlationId || trace?.correlationId || 'no-correlation',
          
          // Secure user identification (supports both signed-in and phone-based users)
          userId: info.userId || trace?.userId || null,
          userPhone: info.userPhone || trace?.userPhone || null,
          phoneIdentifier: info.phoneIdentifier || trace?.phoneIdentifier || null,
          userIdentifier: info.userIdentifier || trace?.userIdentifier || 'anonymous',
          
          // Request context for debugging
          ip: trace?.ip || null,
          userAgent: trace?.userAgent || null,
          method: trace?.method || null,
          url: trace?.url || null,
          requestDuration: trace ? Date.now() - trace.startTime : null,
          
          // Environment and service info
          environment: process.env.NODE_ENV || 'development',
          service: '7awell-backend',
          version: process.env.npm_package_version || '1.0.0',
          
          // Bug tracking metadata
          category: info.category || 'general',
          severity: info.severity || null,
          component: info.component || null,
          
          // Performance metrics
          memoryUsage: process.memoryUsage(),
          
          // Process identification
          pid: process.pid,
          hostname: process.env.HOSTNAME || 'unknown',
          
          // Include all additional metadata
          ...info,
          
          // Error details
          ...(info.stack && { stack: info.stack }),
          ...(info.error && { 
            errorName: info.error.name,
            errorMessage: info.error.message,
            errorStack: info.error.stack 
          })
        });
      })
    )
  });
})() : null;

/**
 * Get transports based on environment
 * Returns exactly the 3 file transports + console + cloud services
 */
export function getTransports() {
  const transports = [consoleTransport];
  
  // Always add the 3 daily rotating file transports
  transports.push(
    debugFileTransport,    // 1. Debug file (debug + trace)
    normalFileTransport,   // 2. Normal file (info + warn + error)
    errorFileTransport     // 3. Error file (errors only)
  );
  
  // Add Loki only in production if available
  if (process.env.NODE_ENV === 'production' && lokiTransport) {
    transports.push(lokiTransport);
  }
  
  // Add Better Stack if available (now sends ALL levels with secure phone tracking)
  if (betterStackTransport) {
    transports.push(betterStackTransport);
  }
  
  return transports;
}

/**
 * create logs directory if not exists
 */
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
} 