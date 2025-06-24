import logger from '../utils/logger.js';
import morgan from 'morgan';

// Custom Morgan format for structured logging
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Create custom morgan logger that uses Winston
const winstonMorgan = morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Parse morgan message to extract structured data
      const parts = message.trim().split(' ');
      const method = parts[5]?.replace('"', '');
      const url = parts[6];
      const status = parseInt(parts[8]);
      const responseTime = parseFloat(parts[parts.length - 2]);
      
      logger.logApiRequest(method, url, status, responseTime);
    }
  }
});

// Enhanced logging middleware
const winstonLoggingMiddleware = (options = {}) => {
  const {
    logRequests = true,
    logResponses = true,
    logErrors = true,
    includeBody = false,
    excludePaths = ['/health', '/ping']
  } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    const userId = req.user?.id;
    
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Log incoming request
    if (logRequests) {
      const requestData = {
        method: req.method,
        url: req.originalUrl,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        ...(includeBody && { body: req.body })
      };
      
      logger.debug(`Incoming ${req.method} ${req.originalUrl}`, requestData);
    }

    // Capture original end function
    const originalEnd = res.end;
    
    // Override res.end to log response
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Log response
      if (logResponses) {
        logger.logApiRequest(req.method, req.originalUrl, res.statusCode, duration, userId, req);
      }

      // Log performance if slow
      if (duration > 1000) {
        logger.logPerformance(`${req.method} ${req.originalUrl}`, duration, {
          statusCode: res.statusCode,
          success
        }, userId);
      }

      // Call original end function
      originalEnd.call(this, chunk, encoding);
    };

    // Handle errors
    if (logErrors) {
      const originalNext = next;
      next = (error) => {
        if (error) {
          logger.logError(error, {
            method: req.method,
            url: req.originalUrl,
            statusCode: error.status || 500
          }, userId, req);
        }
        originalNext(error);
      };
    }

    next();
  };
};

// Error logging middleware
const errorLoggingMiddleware = (err, req, res, next) => {
  const userId = req.user?.id;
  
  // Log the error
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    statusCode: err.status || 500,
    body: req.body
  }, userId, req);

  // Log security concerns for certain errors
  if (err.status === 401 || err.status === 403) {
    logger.logSecurity(
      userId,
      `Unauthorized access attempt: ${req.method} ${req.originalUrl}`,
      'medium',
      {
        statusCode: err.status,
        message: err.message
      },
      req
    );
  }

  next(err);
};

// Rate limit logging middleware
const rateLimitLoggingMiddleware = (req, res, next) => {
  const userId = req.user?.id;
  
  // Check if rate limit was hit (usually set by rate limiting middleware)
  if (res.statusCode === 429) {
    logger.logSecurity(
      userId,
      'Rate limit exceeded',
      'medium',
      {
        path: req.originalUrl,
        method: req.method,
        limit: req.rateLimit?.limit,
        remaining: req.rateLimit?.remaining
      },
      req
    );
  }
  
  next();
};

// Authentication logging middleware
const authLoggingMiddleware = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const userId = req.user?.id;
    
    // Log authentication events
    if (req.originalUrl.includes('/auth/')) {
      const success = res.statusCode < 400;
      const action = getAuthAction(req.originalUrl, req.method);
      
      if (action) {
        logger.logAuth(userId, action, success, req, {
          statusCode: res.statusCode,
          endpoint: req.originalUrl
        });
      }
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Helper function to determine auth action
function getAuthAction(url, method) {
  if (url.includes('/login')) return 'User login attempt';
  if (url.includes('/register')) return 'User registration attempt';
  if (url.includes('/logout')) return 'User logout';
  if (url.includes('/verify')) return 'OTP verification';
  if (url.includes('/resend')) return 'OTP resend';
  if (url.includes('/refresh')) return 'Token refresh';
  if (url.includes('/password')) return 'Password change';
  return null;
}

// Transaction logging middleware
const transactionLoggingMiddleware = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const userId = req.user?.id;
    
    // Log transaction events
    if (req.originalUrl.includes('/transaction')) {
      const success = res.statusCode < 400;
      const action = getTransactionAction(req.originalUrl, req.method);
      
      if (action && userId) {
        logger.logTransaction(userId, action, {
          success,
          statusCode: res.statusCode,
          endpoint: req.originalUrl,
          amount: req.body?.amount,
          currency: req.body?.currency,
          toAddress: req.body?.toAddress
        }, req);
      }
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Helper function to determine transaction action
function getTransactionAction(url, method) {
  if (url.includes('/send')) return 'Send transaction';
  if (url.includes('/receive')) return 'Receive transaction';
  if (url.includes('/history')) return 'View transaction history';
  if (url.includes('/status')) return 'Check transaction status';
  return null;
}

export {
  winstonMorgan,
  winstonLoggingMiddleware,
  errorLoggingMiddleware,
  rateLimitLoggingMiddleware,
  authLoggingMiddleware,
  transactionLoggingMiddleware
}; 