import expressWinston from 'express-winston';
import { getTransports } from './transports.js';
import { getTrace } from './correlation.js';
import logger from './index.js';

/**
 * settings for http logger
 */
export const httpLoggerOptions = {
  transports: getTransports().filter(t => 
    t.name === 'console' || 
    t.filename?.includes('http') || 
    t.filename?.includes('app')
  ),
  level: 'http',
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  dynamicMeta: (req, res) => {
    const trace = getTrace();
    return {
      correlationId: trace?.correlationId,
      userId: trace?.userId,
      ip: trace?.ip,
      userAgent: trace?.userAgent,
      contentLength: res.get('content-length'),
      referrer: req.get('referrer')
    };
  },
  requestWhitelist: [
    'url', 'method', 'httpVersion', 'originalUrl', 'query'
  ],
  responseWhitelist: [
    'statusCode', 'responseTime'
  ],
  // skip routes
  skip: (req, res) => {
    return req.originalUrl?.includes('/health') || 
           req.originalUrl?.includes('/ping') ||
           req.originalUrl?.includes('/favicon.ico');
  }
};

/**
 * HTTP Request Logger Middleware
 */
export const httpLogger = expressWinston.logger(httpLoggerOptions);

/**
 * Error Logger Middleware
 */
export const errorLogger = expressWinston.errorLogger({
  transports: getTransports(),
  level: 'error',
  meta: true,
  msg: 'HTTP Error {{req.method}} {{req.url}} {{err.status}} {{err.message}}',
  dynamicMeta: (req, res, err) => {
    const trace = getTrace();
    return {
      correlationId: trace?.correlationId,
      userId: trace?.userId,
      ip: trace?.ip,
      userAgent: trace?.userAgent,
      errorStack: err.stack,
      requestBody: req.body
    };
  }
});

/**
 * Custom middleware for more detailed logging
 */
export function detailedLoggingMiddleware(options = {}) {
  const {
    logRequests = true,
    logResponses = true,
    logBodies = process.env.NODE_ENV === 'development',
    excludePaths = ['/health', '/ping', '/favicon.ico']
  } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    
    // skip paths
    if (excludePaths.some(path => req.originalUrl?.includes(path))) {
      return next();
    }

    // log incoming request
    if (logRequests) {
      const requestData = {
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        headers: {
          'content-type': req.get('content-type'),
          'user-agent': req.get('user-agent'),
          'accept': req.get('accept')
        },
        ...(logBodies && req.body && { body: req.body })
      };

      logger.debug('Incoming request', {
        category: 'http_request',
        ...requestData
      });
    }

    // log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      const trace = getTrace();
      
      if (logResponses) {
        const responseData = {
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('content-length'),
          contentType: res.get('content-type')
        };

        // determine log level based on status code
        if (res.statusCode >= 500) {
          logger.error('HTTP response', {
            category: 'http_response',
            ...responseData
          });
        } else if (res.statusCode >= 400) {
          logger.warn('HTTP response', {
            category: 'http_response',
            ...responseData
          });
        } else {
          logger.http('HTTP response', {
            category: 'http_response',
            ...responseData
          });
        }
      }

      // log slow operations
      if (duration > 1000) {
        logger.logPerformance(`${req.method} ${req.originalUrl}`, duration, {
          statusCode: res.statusCode,
          slow: true
        });
      }

      // call original end
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Security middleware for security logging
 */
export function securityLoggingMiddleware(req, res, next) {
  const trace = getTrace();
  
  // log suspicious access attempts
  const suspiciousPatterns = [
    /\.\./g,           // Directory traversal
    /<script/i,        // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i     // JavaScript injection
  ];

  const url = req.originalUrl || req.url;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

  if (isSuspicious) {
    logger.logSecurity('Suspicious request detected', 'high', {
      url,
      method: req.method,
      suspiciousPattern: true,
      headers: req.headers
    });
  }

  // log admin access attempts
  if (url.includes('/admin') && !trace?.userId) {
    logger.logSecurity('Unauthorized admin access attempt', 'medium', {
      url,
      method: req.method
    });
  }

  next();
}

/**
 * Rate limiting logging middleware
 */
export function rateLimitLoggingMiddleware(req, res, next) {
  // handle events from rate limiter
  res.on('finish', () => {
    if (res.statusCode === 429) {
      logger.logSecurity('Rate limit exceeded', 'medium', {
        path: req.originalUrl,
        method: req.method,
        rateLimitInfo: {
          limit: req.rateLimit?.limit,
          remaining: req.rateLimit?.remaining,
          resetTime: req.rateLimit?.resetTime
        }
      });
    }
  });

  next();
} 