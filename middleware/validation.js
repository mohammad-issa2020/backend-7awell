const { validationResult } = require('express-validator');
const BaseResponse = require('../utils/baseResponse');
const Joi = require('joi');

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
 * Middleware to validate request body using Joi schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return BaseResponse.validationError(res, errors, 'Validation failed');
    }
    
    req.body = value; // Use validated and cleaned data
    next();
  };
};

/**
 * Middleware to validate query parameters using Joi schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return BaseResponse.validationError(res, errors, 'Query validation failed');
    }
    
    req.query = value; // Use validated and cleaned data
    next();
  };
};

// Validation schemas for authentication endpoints

const checkAvailabilitySchema = Joi.object({
  medium: Joi.string().valid('phone', 'email').required(),
  value: Joi.alternatives().conditional('medium', {
    is: 'phone',
    then: Joi.string()
      .pattern(/^(\+|%2B|\s)[1-9]\d{1,14}$/)
      .required()
      .custom((value, helpers) => {
        // Normalize the phone number by converting space or %2B to +
        let normalized = value.replace(/^(\s|%2B)/, '+');
        
        // Validate the normalized format
        if (!/^\+[1-9]\d{1,14}$/.test(normalized)) {
          return helpers.error('any.invalid');
        }
        
        return normalized;
      }, 'Phone number normalization'),
    otherwise: Joi.string().email().required()
  })
});

const sendOTPSchema = Joi.object({
  medium: Joi.string().valid('phone', 'email').required(),
  value: Joi.alternatives().conditional('medium', {
    is: 'phone',
    then: Joi.string()
      .pattern(/^(\+|%2B|\s)[1-9]\d{1,14}$/)
      .required()
      .custom((value, helpers) => {
        // Normalize the phone number by converting space or %2B to +
        let normalized = value.replace(/^(\s|%2B)/, '+');
        
        // Validate the normalized format
        if (!/^\+[1-9]\d{1,14}$/.test(normalized)) {
          return helpers.error('any.invalid');
        }
        
        return normalized;
      }, 'Phone number normalization'),
    otherwise: Joi.string().email().required()
  }),
  channel: Joi.alternatives().conditional('medium', {
    is: 'phone',
    then: Joi.string().valid('whatsapp', 'sms').default('sms'),
    otherwise: Joi.string().valid('email').default('email')
  })
});

const verifyOTPSchema = Joi.object({
  medium: Joi.string().valid('phone', 'email').required(),
  value: Joi.alternatives().conditional('medium', {
    is: 'phone',
    then: Joi.string()
      .pattern(/^(\+|%2B|\s)[1-9]\d{1,14}$/)
      .required()
      .custom((value, helpers) => {
        // Normalize the phone number by converting space or %2B to +
        let normalized = value.replace(/^(\s|%2B)/, '+');
        
        // Validate the normalized format
        if (!/^\+[1-9]\d{1,14}$/.test(normalized)) {
          return helpers.error('any.invalid');
        }
        
        return normalized;
      }, 'Phone number normalization'),
    otherwise: Joi.string().email().required()
  }),
  otp: Joi.string().pattern(/^\d{6}$/).required()
});

const loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^(\+|%2B|\s)[1-9]\d{1,14}$/)
    .optional()
    .custom((value, helpers) => {
      if (!value) return value;
      
      // Normalize the phone number by converting space or %2B to +
      let normalized = value.replace(/^(\s|%2B)/, '+');
      
      // Validate the normalized format
      if (!/^\+[1-9]\d{1,14}$/.test(normalized)) {
        return helpers.error('any.invalid');
      }
      
      return normalized;
    }, 'Phone number normalization'),
  email: Joi.string().email().optional()
}).or('phoneNumber', 'email');

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const revokeDeviceSchema = Joi.object({
  deviceId: Joi.string().uuid().optional()
});

const startVerificationSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^(\+|%2B|\s)[1-9]\d{1,14}$/)
    .required()
    .custom((value, helpers) => {
      // Normalize the phone number by converting space or %2B to +
      let normalized = value.replace(/^(\s|%2B)/, '+');
      
      // Validate the normalized format
      if (!/^\+[1-9]\d{1,14}$/.test(normalized)) {
        return helpers.error('any.invalid');
      }
      
      return normalized;
    }, 'Phone number normalization'),
  email: Joi.string().email().required()
});

const sendVerificationOTPSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  medium: Joi.string().valid('phone', 'email').required(),
  channel: Joi.alternatives().conditional('medium', {
    is: 'phone',
    then: Joi.string().valid('whatsapp', 'sms').default('sms'),
    otherwise: Joi.string().valid('email').default('email')
  })
});

const verifyVerificationOTPSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  medium: Joi.string().valid('phone', 'email').required(),
  otp: Joi.string().pattern(/^\d{6}$/).required()
});

const completeLoginSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

module.exports = {
  validateBody,
  validateQuery,
  checkAvailabilitySchema,
  sendOTPSchema,
  verifyOTPSchema,
  loginSchema,
  refreshTokenSchema,
  revokeDeviceSchema,
  startVerificationSchema,
  sendVerificationOTPSchema,
  verifyVerificationOTPSchema,
  completeLoginSchema,
  ValidationMiddleware
}; 