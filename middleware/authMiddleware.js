const authService = require('../services/authService');
const adminAuthService = require('../services/adminAuthService');
const UserMappingService = require('../services/userMappingService');
const BaseResponse = require('../utils/baseResponse');

/**
 * Middleware to authenticate Stytch session tokens (for users)
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return BaseResponse.unauthorized(res, 'Session token is required', 'MISSING_TOKEN');
    }

    const sessionToken = authHeader.split(' ')[1]; // Bearer SESSION_TOKEN
    
    if (!sessionToken) {
      return BaseResponse.unauthorized(res, 'Invalid token format', 'INVALID_TOKEN_FORMAT');
    }

    // Check for optional JWT in headers (for custom token recovery)
    const sessionJWT = req.headers['x-session-jwt'] || req.headers['session-jwt'];

    // Validate session with Stytch (pass JWT if available for custom token recovery)
    const validationResult = await authService.validateSession(sessionToken, sessionJWT);
    
    if (!validationResult.valid) {
      return BaseResponse.unauthorized(res, 'Invalid or expired session', 'SESSION_INVALID');
    }

    // Get or create user in Supabase
    const supabaseUser = await UserMappingService.createOrGetUser(validationResult.user);
    
    // Add user info to request with both Stytch and Supabase IDs
    req.user = {
      // Stytch user data
      stytchId: validationResult.user.id,
      phoneNumber: validationResult.user.phoneNumber,
      email: validationResult.user.email,
      created_at: validationResult.user.created_at,
      status: validationResult.user.status,
      session: validationResult.session,
      
      // Supabase user data
      id: supabaseUser.id, // This is the UUID we use for database operations
      supabaseId: supabaseUser.id,
      phone: supabaseUser.phone_number || supabaseUser.phone, // Handle both column names
      emailVerified: supabaseUser.email_verified,
      phoneVerified: supabaseUser.phone_verified,
      userStatus: supabaseUser.status,
      lastLogin: supabaseUser.last_login_at,
      
      type: 'user' // Mark as user type
    };

    // Store session token for potential logout
    req.sessionToken = sessionToken;

    next();
  } catch (error) {
      console.error('Authentication middleware error:', error);
      return BaseResponse.error(res, 'Authentication failed', 401, error.message, 'AUTH_FAILED');
  }
};

/**
 * Middleware to authenticate admin JWT tokens
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return BaseResponse.unauthorized(res, 'Admin token is required', 'MISSING_ADMIN_TOKEN');
    }

    const token = authHeader.split(' ')[1]; // Bearer JWT_TOKEN
    
    if (!token) {
      return BaseResponse.unauthorized(res, 'Invalid token format', 'INVALID_TOKEN_FORMAT');
    }

    // Validate admin JWT token
    const validationResult = await adminAuthService.validateToken(token);
    
    if (!validationResult.valid) {
      return BaseResponse.unauthorized(res, 'Invalid or expired admin token', 'ADMIN_TOKEN_INVALID');
    }

    // Add admin info to request
    req.admin = {
      id: validationResult.admin.id,
      username: validationResult.admin.username,
      email: validationResult.admin.email,
      role: validationResult.admin.role,
      permissions: validationResult.admin.permissions,
      type: 'admin' // Mark as admin type
    };

    // Store token for potential logout
    req.adminToken = token;

    next();
  } catch (error) {
    return BaseResponse.error(res, 'Admin authentication failed', 401, error.message, 'ADMIN_AUTH_FAILED');
  }
};

/**
 * Middleware to authenticate either user or admin tokens
 * Useful for endpoints that can be accessed by both users and admins
 */
const authenticateAny = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return BaseResponse.unauthorized(res, 'Authentication required', 'MISSING_TOKEN');
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return BaseResponse.unauthorized(res, 'Invalid token format', 'INVALID_TOKEN_FORMAT');
    }

    // Try admin authentication first
    const adminValidation = await adminAuthService.validateToken(token);
    
    if (adminValidation.valid) {
      // It's an admin token
      req.admin = {
        id: adminValidation.admin.id,
        username: adminValidation.admin.username,
        email: adminValidation.admin.email,
        role: adminValidation.admin.role,
        permissions: adminValidation.admin.permissions,
        type: 'admin'
      };
      req.adminToken = token;
      req.authType = 'admin';
      return next();
    }

    // Try user authentication
    const userValidation = await authService.validateSession(token);
    
    if (userValidation.valid) {
      // It's a user token
      req.user = {
        id: userValidation.user.id,
        phoneNumber: userValidation.user.phoneNumber,
        email: userValidation.user.email,
        created_at: userValidation.user.created_at,
        status: userValidation.user.status,
        session: userValidation.session,
        type: 'user'
      };
      req.sessionToken = token;
      req.authType = 'user';
      return next();
    }

    // Both failed
    return BaseResponse.unauthorized(res, 'Invalid token', 'INVALID_TOKEN');

  } catch (error) {
    return BaseResponse.error(res, 'Authentication failed', 401, error.message, 'AUTH_FAILED');
  }
};

/**
 * Middleware to check admin permissions
 * @param {string|Array} requiredPermissions - Permission(s) required
 */
const requireAdminPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      const admin = req.admin;
      
      if (!admin) {
        return BaseResponse.forbidden(res, 'Admin access required', 'ADMIN_ACCESS_REQUIRED');
      }

      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      const hasPermission = permissions.every(permission => 
        adminAuthService.hasPermission(admin, permission)
      );

      if (!hasPermission) {
        return BaseResponse.forbidden(res, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
      }

      next();
    } catch (error) {
      return BaseResponse.error(res, 'Permission check failed', 403, error.message, 'PERMISSION_CHECK_FAILED');
    }
  };
};

/**
 * Middleware to ensure only admin access
 */
const adminOnly = (req, res, next) => {
  try {
    if (!req.admin || req.admin.type !== 'admin') {
      return BaseResponse.forbidden(res, 'Admin access only', 'ADMIN_ONLY');
    }
    next();
  } catch (error) {
    return BaseResponse.error(res, 'Admin check failed', 403, error.message, 'ADMIN_CHECK_FAILED');
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      req.admin = null;
      req.sessionToken = null;
      req.adminToken = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      req.admin = null;
      req.sessionToken = null;
      req.adminToken = null;
      return next();
    }

    // Try admin first
    const adminValidation = await adminAuthService.validateToken(token);
    if (adminValidation.valid) {
      req.admin = {
        id: adminValidation.admin.id,
        username: adminValidation.admin.username,
        email: adminValidation.admin.email,
        role: adminValidation.admin.role,
        permissions: adminValidation.admin.permissions,
        type: 'admin'
      };
      req.adminToken = token;
      req.authType = 'admin';
      return next();
    }

    // Try user
    const userValidation = await authService.validateSession(token);
    if (userValidation.valid) {
      req.user = {
        id: userValidation.user.id,
        phoneNumber: userValidation.user.phoneNumber,
        email: userValidation.user.email,
        created_at: userValidation.user.created_at,
        status: userValidation.user.status,
        session: userValidation.session,
        type: 'user'
      };
      req.sessionToken = token;
      req.authType = 'user';
      return next();
    }

    // Both failed, continue without auth
    req.user = null;
    req.admin = null;
    req.sessionToken = null;
    req.adminToken = null;
    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    req.user = null;
    req.admin = null;
    req.sessionToken = null;
    req.adminToken = null;
    next();
  }
};

module.exports = {
  authenticateToken,      // User authentication only
  authenticateAdmin,      // Admin authentication only
  authenticateAny,        // Either user or admin
  requireAdminPermission, // Check admin permissions
  adminOnly,              // Admin access only
  optionalAuth           // Optional authentication
}; 