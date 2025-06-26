import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import LokiTransport from 'winston-loki';
import { getTrace } from './correlation.js';

/**
 * Console transport for development
 */
export const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, correlationId, userId, ...meta }) => {
      const trace = getTrace();
      const correlation = correlationId || trace?.correlationId || 'no-correlation';
      const user = userId || trace?.userId || 'anonymous';
      
      let metaStr = '';
      if (Object.keys(meta).length > 0) {
        metaStr = ` ${JSON.stringify(meta)}`;
      }
      
      return `${timestamp} [${level}] [${correlation.slice(0, 8)}] [${user}]: ${message}${metaStr}`;
    })
  )
});

/**
 * File transport for general logs with daily rotation
 */
export const fileTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // keep for 14 days
  level: 'debug', // changed to include debug logs
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      const trace = getTrace();
      return JSON.stringify({
        ...info,
        correlationId: info.correlationId || trace?.correlationId,
        userId: info.userId || trace?.userId,
        ip: trace?.ip,
        userAgent: trace?.userAgent
      });
    })
  )
});

/**
 * Debug file transport for debug and trace logs
 */
export const debugFileTransport = new DailyRotateFile({
  filename: 'logs/debug-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '7d', // debug logs keep for a week
  level: 'trace', // include all debug and trace logs
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      const trace = getTrace();
      return JSON.stringify({
        ...info,
        correlationId: info.correlationId || trace?.correlationId,
        userId: info.userId || trace?.userId,
        ip: trace?.ip,
        userAgent: trace?.userAgent
      });
    })
  )
});

/**
 * Error file transport for errors only
 */
export const errorFileTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '30d', // errors keep longer
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      const trace = getTrace();
      return JSON.stringify({
        ...info,
        correlationId: info.correlationId || trace?.correlationId,
        userId: info.userId || trace?.userId,
        ip: trace?.ip,
        userAgent: trace?.userAgent,
        requestMethod: trace?.method,
        requestUrl: trace?.url
      });
    })
  )
});

/**
 * HTTP requests transport separate
 */
export const httpFileTransport = new DailyRotateFile({
  filename: 'logs/http-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '7d', // HTTP logs keep week
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
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
  // dynamic labels
  dynamicLabels: () => {
    const trace = getTrace();
    return {
      correlationId: trace?.correlationId || 'unknown',
      userId: trace?.userId || 'anonymous',
    };
  },
  batching: true,
  interval: 5000, // send every 5 seconds
  maxBatchSize: 1000
}) : null;

/**
    * create array of transports based on environment
 */
export function getTransports() {
  const transports = [consoleTransport];
  
  // always add file transports for better debugging
  transports.push(fileTransport, errorFileTransport, httpFileTransport, debugFileTransport);
  
  // add Loki only in production if available
  if (process.env.NODE_ENV === 'production' && lokiTransport) {
    transports.push(lokiTransport);
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