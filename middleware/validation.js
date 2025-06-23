import { validationResult } from 'express-validator';
import BaseResponse from '../utils/baseResponse.js';
import { z } from 'zod';

class ValidationMiddleware {
  /**
   * Handle validation results
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static handleValidation(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      
      errors.array().forEach(error => {
        formattedErrors[error.param] = error.msg;
      });
      
      return BaseResponse.validationError(res, formattedErrors, 'Validation failed');
    }
    
    next();
  }

  /**
   * Sanitize request data
   * @param {Array} fields - Fields to sanitize
   * @returns {Function} Middleware function
   */
  static sanitizeFields(fields) {
    return (req, res, next) => {
      try {
        fields.forEach(field => {
          if (req.body[field] && typeof req.body[field] === 'string') {
            // Basic sanitization - trim whitespace
            req.body[field] = req.body[field].trim();
            
            // Remove potential script tags (basic XSS prevention)
            req.body[field] = req.body[field]
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          }
        });
        next();
      } catch (error) {
        return BaseResponse.error(res, 'Data sanitization failed', 400);
      }
    };
  }

  /**
   * Validate file upload
   * @param {Object} options - Upload options
   * @returns {Function} Middleware function
   */
  static validateFileUpload(options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
      required = false
    } = options;

    return (req, res, next) => {
      try {
        if (!req.file && required) {
          return BaseResponse.validationError(res, 
            { file: 'File is required' }, 
            'File validation failed'
          );
        }

        if (req.file) {
          // Check file size
          if (req.file.size > maxSize) {
            return BaseResponse.validationError(res,
              { file: `File size must be less than ${maxSize / 1024 / 1024}MB` },
              'File validation failed'
            );
          }

          // Check file type
          if (!allowedTypes.includes(req.file.mimetype)) {
            return BaseResponse.validationError(res,
              { file: `File type must be one of: ${allowedTypes.join(', ')}` },
              'File validation failed'
            );
          }
        }

        next();
      } catch (error) {
        return BaseResponse.error(res, 'File validation failed', 400);
      }
    };
  }

  /**
   * Validate pagination parameters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static validatePagination(req, res, next) {
    try {
      const { page, limit } = req.query;
      
      if (page && (isNaN(page) || parseInt(page) < 1)) {
        return BaseResponse.validationError(res,
          { page: 'Page must be a positive number' },
          'Pagination validation failed'
        );
      }

      if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return BaseResponse.validationError(res,
          { limit: 'Limit must be between 1 and 100' },
          'Pagination validation failed'
        );
      }

      next();
    } catch (error) {
      return BaseResponse.error(res, 'Pagination validation failed', 400);
    }
  }
}

/**
 * Middleware to validate request body using Zod schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData; // Use validated and cleaned data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return BaseResponse.validationError(res, errors, 'Validation failed');
      }
      
      return BaseResponse.error(res, 'Validation error', 400);
    }
  };
};

/**
 * Middleware to validate query parameters using Zod schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData; // Use validated and cleaned data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return BaseResponse.validationError(res, errors, 'Query validation failed');
      }
      
      return BaseResponse.error(res, 'Query validation error', 400);
    }
  };
};

// ============================================================================
// VALIDATION SCHEMAS - Authentication endpoints
// ============================================================================

// Helper functions for phone number normalization  
const normalizePhoneNumber = (value) => {
  if (!value) return value;
  // Normalize the phone number by converting space or %2B to +
  let normalized = value.replace(/^(\s|%2B)/, '+');
  
  // Validate the normalized format
  if (!/^\+[1-9]\d{1,14}$/.test(normalized)) {
    throw new Error('Invalid phone number format');
  }
  
  return normalized;
};

// Helper phone number schema  
const phoneNumberSchema = z.string()
  .regex(/^(\+|%2B|\s)[1-9]\d{1,14}$/, 'Invalid phone number format')
  .transform(normalizePhoneNumber);

const sessionIdSchema = z.string()
  .regex(/^seq_auth_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 
    'Invalid sequential auth session ID');

const phoneChangeSessionIdSchema = z.string()
  .regex(/^phone_change_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid phone change session ID');

const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

export const checkAvailabilitySchema = z.object({
  medium: z.enum(['phone', 'email']),
  value: z.string().refine((value, ctx) => {
    const medium = ctx.parent.medium;
    if (medium === 'phone') {
      try {
        normalizePhoneNumber(value);
        return true;
      } catch {
        return false;
      }
    } else {
      return z.string().email().safeParse(value).success;
    }
  }, 'Invalid value for selected medium').transform((value, ctx) => {
    const medium = ctx.parent.medium;
    if (medium === 'phone') {
      return normalizePhoneNumber(value);
    }
    return value;
  })
});

export const loginSchema = z.object({
  phoneNumber: phoneNumberSchema.optional(),
  email: z.string().email().optional()
}).refine(data => data.phoneNumber || data.email, {
  message: 'Either phoneNumber or email must be provided'
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const revokeDeviceSchema = z.object({
  deviceId: z.string().uuid().optional()
});

export const startVerificationSchema = z.object({
  phoneNumber: phoneNumberSchema,
  email: z.string().email()
});

export const sendVerificationOTPSchema = z.object({
  sessionId: z.string().uuid(),
  medium: z.enum(['phone', 'email']),
  channel: z.string().optional().transform((val, ctx) => {
    const medium = ctx.parent.medium;
    if (medium === 'phone') {
      return val && ['whatsapp', 'sms'].includes(val) ? val : 'sms';
    }
    return 'email';
  })
});

export const verifyVerificationOTPSchema = z.object({
  sessionId: z.string().uuid(),
  medium: z.enum(['phone', 'email']),
  otp: otpSchema
});

export const completeLoginSchema = z.object({
  sessionId: sessionIdSchema
});

// Sequential Authentication Flow Schemas
export const phoneLoginSchema = z.object({
  phoneNumber: phoneNumberSchema
});

export const phoneVerifySchema = z.object({
  sessionId: sessionIdSchema,
  otp: otpSchema
});

export const emailLoginSchema = z.object({
  sessionId: sessionIdSchema,
  email: z.string().email()
});

export const emailVerifySchema = z.object({
  sessionId: sessionIdSchema,
  otp: otpSchema
});

// Phone Change Validation Schemas
export const phoneChangeStartSchema = z.object({
  newPhoneNumber: phoneNumberSchema
});

export const phoneChangeVerifyOldSchema = z.object({
  sessionId: phoneChangeSessionIdSchema,
  otp: otpSchema
});

export const phoneChangeVerifyNewSchema = z.object({
  sessionId: phoneChangeSessionIdSchema,
  otp: otpSchema
});

export { validateBody, validateQuery };

export { ValidationMiddleware }; 