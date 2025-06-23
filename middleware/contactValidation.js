import { z } from 'zod';
import BaseResponse from '../utils/baseResponse.js';
import { ERROR_MESSAGES } from '../constants/contactConstants.js';
import { 
  normalizePhoneNumber, 
  isValidPhoneNumber,
  logPerformanceMetrics,
  validateContactIntegrity
} from '../services/contactHelpers.js';

/**
 * @fileoverview Specialized validation middleware for contact operations
 * Provides enhanced validation with business logic and security checks
 */

// ============================================================================
// ENHANCED VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Enhanced validation middleware with logging and security checks
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {Object} options - Validation options
 * @param {boolean} options.logValidation - Whether to log validation attempts
 * @param {boolean} options.sanitize - Whether to sanitize input data
 * @param {Function} options.transformer - Custom data transformer
 * @returns {Function} Express middleware function
 */
export const validateWithLogging = (schema, options = {}) => {
  const {
    logValidation = false,
    sanitize = true,
    transformer = null
  } = options;

  return async (req, res, next) => {
    try {
      // Log validation attempt if enabled
      if (logValidation) {
        console.log(`🔍 Validating ${req.method} ${req.path} - User: ${req.user?.id || 'unknown'}`);
      }

      // Choose data source based on request method
      const dataToValidate = req.method === 'GET' ? req.query : req.body;
      
      // Apply sanitization if enabled
      const sanitizedData = sanitize ? sanitizeInput(dataToValidate) : dataToValidate;
      
      // Validate data against schema
      const validatedData = schema.parse(sanitizedData);
      
      // Apply custom transformer if provided
      const transformedData = transformer ? transformer(validatedData, req) : validatedData;
      
      // Update request with validated data
      if (req.method === 'GET') {
        req.query = transformedData;
      } else {
        req.body = transformedData;
      }
      
      // Add metadata for downstream middleware
      req.validationMeta = {
        timestamp: new Date(),
        schema: schema.constructor.name,
        dataSize: JSON.stringify(dataToValidate).length
      };
      
      next();
    } catch (error) {
      handleValidationError(error, req, res);
    }
  };
};

/**
 * Sanitize input data to prevent XSS and injection attacks
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeInput(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      // Remove potential script tags and normalize whitespace
      sanitized[key] = sanitized[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
    } else if (Array.isArray(sanitized[key])) {
      // Recursively sanitize array elements
      sanitized[key] = sanitized[key].map(item => 
        typeof item === 'string' ? item.trim() : item
      );
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(sanitized[key]);
    }
  });
  
  return sanitized;
}

/**
 * Handle validation errors with proper formatting and logging
 * @param {Error} error - Validation error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function handleValidationError(error, req, res) {
  if (error instanceof z.ZodError) {
    // Format Zod validation errors
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      received: err.received,
      expected: err.expected
    }));
    
    // Log validation failure
    console.warn(`❌ Validation failed for ${req.method} ${req.path}:`, {
      userId: req.user?.id,
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
    
    return BaseResponse.validationError(res, formattedErrors, 'Validation failed');
  }
  
  // Handle other errors
  console.error(`💥 Validation error in ${req.method} ${req.path}:`, error);
  return BaseResponse.error(res, 'Validation error occurred', 400);
}

// ============================================================================
// CONTACT-SPECIFIC VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware to validate phone numbers and check for potential spam
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validatePhoneNumbers = (req, res, next) => {
  try {
    const { phoneNumbers } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return BaseResponse.validationError(res, 
        { phoneNumbers: 'Phone numbers array is required' },
        'Invalid phone numbers'
      );
    }
    
    // Check for duplicate phone numbers
    const uniqueNumbers = new Set(phoneNumbers);
    if (uniqueNumbers.size !== phoneNumbers.length) {
      return BaseResponse.validationError(res,
        { phoneNumbers: 'Duplicate phone numbers detected' },
        'Duplicate phone numbers not allowed'
      );
    }
    
    // Check for suspicious patterns (basic spam detection)
    const suspiciousPatterns = [
      /^\+1{10,}$/, // Too many 1s
      /^(\+\d)\1{5,}$/, // Repeating digits
      /^\+0{5,}/ // Too many zeros
    ];
    
    const suspiciousNumbers = phoneNumbers.filter(number =>
      suspiciousPatterns.some(pattern => pattern.test(number))
    );
    
    if (suspiciousNumbers.length > 0) {
      console.warn(`🚨 Suspicious phone numbers detected from user ${req.user?.id}:`, suspiciousNumbers);
      return BaseResponse.validationError(res,
        { phoneNumbers: 'Some phone numbers appear to be invalid' },
        'Invalid phone number format detected'
      );
    }
    
    next();
  } catch (error) {
    console.error('Phone number validation error:', error);
    return BaseResponse.error(res, 'Phone number validation failed', 400);
  }
};

/**
 * Middleware to validate contact sync rate limits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateSyncRateLimit = (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { phoneNumbers } = req.body;
    
    if (!userId) {
      return BaseResponse.error(res, 'Authentication required', 401);
    }
    
    // Simple in-memory rate limiting (in production, use Redis)
    if (!global.syncAttempts) {
      global.syncAttempts = new Map();
    }
    
    const now = Date.now();
    const userAttempts = global.syncAttempts.get(userId) || [];
    
    // Remove attempts older than 1 hour
    const recentAttempts = userAttempts.filter(timestamp => 
      now - timestamp < 60 * 60 * 1000
    );
    
    // Check if user has exceeded rate limit
    if (recentAttempts.length >= 10) {
      return BaseResponse.error(res, 
        'Rate limit exceeded. Please try again later.', 
        429
      );
    }
    
    // Check if sync size is reasonable for rate limiting
    if (phoneNumbers && phoneNumbers.length > 5000 && recentAttempts.length > 2) {
      return BaseResponse.error(res,
        'Large sync operations are limited. Please try again later.',
        429
      );
    }
    
    // Record this attempt
    recentAttempts.push(now);
    global.syncAttempts.set(userId, recentAttempts);
    
    next();
  } catch (error) {
    console.error('Rate limit validation error:', error);
    return BaseResponse.error(res, 'Rate limit validation failed', 500);
  }
};

/**
 * Middleware to validate bulk operation permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateBulkPermissions = (req, res, next) => {
  try {
    const user = req.user;
    const { contacts } = req.body;
    
    // Check if user has bulk operation permissions
    if (!user || user.role !== 'admin') {
      return BaseResponse.error(res, 
        'Insufficient permissions for bulk operations', 
        403
      );
    }
    
    // Validate bulk operation size
    if (contacts && contacts.length > 1000) {
      console.warn(`⚠️ Large bulk operation attempted by admin ${user.id}: ${contacts.length} contacts`);
    }
    
    next();
  } catch (error) {
    console.error('Bulk permissions validation error:', error);
    return BaseResponse.error(res, 'Permission validation failed', 500);
  }
};

/**
 * Middleware to validate pre-hashed contacts (SECURE METHOD)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateHashedContacts = (req, res, next) => {
  try {
    const { contactHashes, hashingMethod, timestamp } = req.body;
    
    // Verify hashing method
    if (hashingMethod !== 'SHA256') {
      return BaseResponse.validationError(res, 
        { hashingMethod: 'Only SHA256 hashing is supported' },
        'Invalid hashing method'
      );
    }
    
    // Validate hash format (SHA-256 = 64 hex characters)
    const invalidHashes = contactHashes.filter(contact => 
      !/^[a-f0-9]{64}$/.test(contact.phoneHash)
    );
    
    if (invalidHashes.length > 0) {
      console.warn(`🚨 Invalid hash formats detected from user ${req.user?.id}:`, {
        count: invalidHashes.length,
        examples: invalidHashes.slice(0, 3).map(c => c.phoneHash?.substring(0, 10) + '...')
      });
      
      return BaseResponse.validationError(res,
        { contactHashes: `${invalidHashes.length} invalid hash formats detected` },
        'Invalid phone hash format'
      );
    }
    
    // Check for duplicate hashes
    const uniqueHashes = new Set(contactHashes.map(c => c.phoneHash));
    if (uniqueHashes.size !== contactHashes.length) {
      return BaseResponse.validationError(res,
        { contactHashes: 'Duplicate phone hashes detected' },
        'Duplicate contacts not allowed'
      );
    }
    
    // Validate timestamp (prevent replay attacks)
    const requestTime = new Date(timestamp);
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (now - requestTime > maxAge) {
      return BaseResponse.error(res, 'Request too old - please retry', 400);
    }
    
    if (requestTime > now) {
      return BaseResponse.error(res, 'Request timestamp is in the future', 400);
    }
    
    // Log successful secure validation
    console.log(`✅ Secure contact validation passed for user ${req.user?.id}: ${contactHashes.length} hashed contacts`);
    
    next();
  } catch (error) {
    console.error('Hashed contacts validation error:', error);
    return BaseResponse.error(res, 'Hash validation failed', 400);
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a validation middleware factory for common patterns
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Validation middleware
 */
export const createContactValidator = (schema, options = {}) => {
  return validateWithLogging(schema, {
    logValidation: process.env.NODE_ENV === 'development',
    sanitize: true,
    ...options
  });
};

/**
 * Middleware to add request timing for performance monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const addRequestTiming = (req, res, next) => {
  req.startTime = Date.now();
  
  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;
    
    // Add timing header
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`🐌 Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}; 