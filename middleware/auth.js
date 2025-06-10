const jwt = require('jsonwebtoken');
const BaseResponse = require('../utils/baseResponse');

class AuthMiddleware {
  /**
   * Verify JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return BaseResponse.unauthorized(res, 'Access token is required');
      }

      const token = authHeader.split(' ')[1]; // Bearer TOKEN
      
      if (!token) {
        return BaseResponse.unauthorized(res, 'Invalid token format');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return BaseResponse.unauthorized(res, 'Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        return BaseResponse.unauthorized(res, 'Invalid token');
      }
      return BaseResponse.error(res, 'Token verification failed', 401);
    }
  }

  /**
   * Check if user has required role
   * @param {Array} allowedRoles - Array of allowed roles
   * @returns {Function} Middleware function
   */
  static requireRole(allowedRoles) {
    return (req, res, next) => {
      try {
        const userRole = req.user?.role;
        
        if (!userRole) {
          return BaseResponse.forbidden(res, 'User role not found');
        }

        if (!allowedRoles.includes(userRole)) {
          return BaseResponse.forbidden(res, 'Insufficient permissions');
        }

        next();
      } catch (error) {
        return BaseResponse.error(res, 'Role verification failed', 403);
      }
    };
  }

  /**
   * Optional authentication - doesn't fail if no token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          req.user = decoded;
        }
      }
      
      next();
    } catch (error) {
      // Continue without authentication for optional routes
      next();
    }
  }
}

module.exports = AuthMiddleware; 