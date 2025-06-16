import { v4 as uuidv4 } from 'uuid';

class BaseResponse {
  constructor() {}

  /**
   * Generate a unique trace ID for request correlation
   */
  static generateTraceId() {
    return uuidv4();
  }

  /**
   * Success response following API specification
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   * @param {string} traceId - Optional trace ID
   */
  static success(res, data = null, message = 'Success', statusCode = 200, traceId = null) {
    const response = {
      statusCode,
      status: 'SUCCESS',
      message,
      timestamp: new Date().toISOString(),
      traceId: traceId || this.generateTraceId()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Error response following API specification
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} error - Error description
   * @param {string} errorCode - Machine-readable error code
   * @param {string} traceId - Optional trace ID
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, error = null, errorCode = null, traceId = null) {
    const response = {
      statusCode,
      status: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      traceId: traceId || this.generateTraceId()
    };

    if (error) {
      response.error = error;
    }

    if (errorCode) {
      response.errorCode = errorCode;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Validation error response
   * @param {Object} res - Express response object
   * @param {*} errors - Validation errors
   * @param {string} message - Error message
   * @param {string} errorCode - Error code
   */
  static validationError(res, errors, message = 'Validation Error', errorCode = 'VALIDATION_ERROR') {
    return this.error(res, message, 400, errors, errorCode);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {string} message - Not found message
   * @param {string} errorCode - Error code
   */
  static notFound(res, message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') {
    return this.error(res, message, 404, null, errorCode);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message
   * @param {string} errorCode - Error code
   */
  static unauthorized(res, message = 'Unauthorized access', errorCode = 'UNAUTHORIZED') {
    return this.error(res, message, 401, null, errorCode);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message
   * @param {string} errorCode - Error code
   */
  static forbidden(res, message = 'Access forbidden', errorCode = 'FORBIDDEN') {
    return this.error(res, message, 403, null, errorCode);
  }

  /**
   * Rate limit exceeded response
   * @param {Object} res - Express response object
   * @param {string} message - Rate limit message
   * @param {string} errorCode - Error code
   */
  static rateLimitExceeded(res, message = 'Rate limit exceeded', errorCode = 'RATE_LIMIT_EXCEEDED') {
    return this.error(res, message, 429, null, errorCode);
  }

  /**
   * Paginated response following API specification
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Success message
   */
  static paginated(res, data, pagination, message = 'Success') {
    const responseData = {
      items: data,
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev
      }
    };

    return this.success(res, responseData, message, 200);
  }
}

/**
 * Helper function to create success response objects
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {string} traceId - Optional trace ID
 * @returns {Object} Response object
 */
export function createSuccessResponse(data = null, message = 'Success', statusCode = 200, traceId = null) {
  const response = {
    statusCode,
    status: 'SUCCESS',
    message,
    timestamp: new Date().toISOString(),
    traceId: traceId || BaseResponse.generateTraceId()
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
}

/**
 * Helper function to create error response objects
 * @param {string} message - Error message
 * @param {string} errorCode - Machine-readable error code
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error description
 * @param {string} traceId - Optional trace ID
 * @returns {Object} Response object
 */
export function createErrorResponse(message = 'Internal Server Error', errorCode = null, statusCode = 500, error = null, traceId = null) {
  const response = {
    statusCode,
    status: 'ERROR',
    message,
    timestamp: new Date().toISOString(),
    traceId: traceId || BaseResponse.generateTraceId()
  };

  if (error) {
    response.error = error;
  }

  if (errorCode) {
    response.errorCode = errorCode;
  }

  return response;
}

export default BaseResponse; 