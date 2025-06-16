import adminAuthService from '../services/adminAuthService.js';
import { createSuccessResponse, createErrorResponse } from '../utils/baseResponse.js';

class AdminAuthController {
  /**
   * Admin login with username and password
   * POST /api/v1/admin/auth/login
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json(createErrorResponse(
          'Username and password are required',
          'MISSING_CREDENTIALS',
          400
        ));
      }

      // Authenticate admin
      const result = await adminAuthService.login(username, password);

      // Log successful login
      console.log(`🔐 Admin login successful: ${username} from IP: ${req.ip}`);

      return res.json(createSuccessResponse(
        {
          admin: result.admin,
          token: result.token,
          expiresAt: result.expiresAt
        },
        'Admin login successful'
      ));

    } catch (error) {
      console.error('Admin login error:', error.message);
      return res.status(401).json(createErrorResponse(
        'Invalid credentials',
        'AUTHENTICATION_FAILED',
        401
      ));
    }
  }

  /**
   * Admin logout
   * POST /api/v1/admin/auth/logout
   */
  async logout(req, res) {
    try {
      const sessionId = req.admin?.sessionId;

      if (sessionId) {
        await adminAuthService.logout(sessionId);
      }

      console.log(`🚪 Admin logout: ${req.admin?.username}`);

      return res.json(createSuccessResponse(
        { loggedOut: true },
        'Admin logged out successfully'
      ));

    } catch (error) {
      console.error('Admin logout error:', error);
      return res.status(500).json(createErrorResponse(
        'Logout failed',
        'LOGOUT_ERROR',
        500
      ));
    }
  }

  /**
   * Get admin profile
   * GET /api/v1/admin/auth/me
   */
  async getProfile(req, res) {
    try {
      const adminId = req.admin?.id;

      if (!adminId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const profile = await adminAuthService.getProfile(adminId);

      return res.json(createSuccessResponse(
        profile,
        'Admin profile retrieved successfully'
      ));

    } catch (error) {
      console.error('Get admin profile error:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve profile',
        'PROFILE_ERROR',
        500
      ));
    }
  }

  /**
   * Change admin password
   * POST /api/v1/admin/auth/change-password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = req.admin?.id;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json(createErrorResponse(
          'Current password and new password are required',
          'MISSING_PASSWORDS',
          400
        ));
      }

      if (newPassword.length < 6) {
        return res.status(400).json(createErrorResponse(
          'New password must be at least 6 characters long',
          'WEAK_PASSWORD',
          400
        ));
      }

      // Change password
      await adminAuthService.changePassword(adminId, currentPassword, newPassword);

      console.log(`🔒 Password changed for admin: ${req.admin?.username}`);

      return res.json(createSuccessResponse(
        { passwordChanged: true },
        'Password changed successfully'
      ));

    } catch (error) {
      console.error('Change password error:', error);
      return res.status(400).json(createErrorResponse(
        error.message,
        'PASSWORD_CHANGE_ERROR',
        400
      ));
    }
  }

  /**
   * Validate admin token (for debugging)
   * GET /api/v1/admin/auth/validate
   */
  async validateToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json(createErrorResponse(
          'Authorization header required',
          'MISSING_TOKEN',
          401
        ));
      }

      const token = authHeader.split(' ')[1]; // Bearer TOKEN
      
      if (!token) {
        return res.status(401).json(createErrorResponse(
          'Invalid token format',
          'INVALID_TOKEN_FORMAT',
          401
        ));
      }

      const validation = await adminAuthService.validateToken(token);

      if (!validation.valid) {
        return res.status(401).json(createErrorResponse(
          'Invalid token',
          'INVALID_TOKEN',
          401
        ));
      }

      return res.json(createSuccessResponse(
        {
          valid: true,
          admin: validation.admin
        },
        'Token is valid'
      ));

    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(401).json(createErrorResponse(
        'Token validation failed',
        'VALIDATION_ERROR',
        401
      ));
    }
  }

  /**
   * Create admin user (for initial setup only)
   * POST /api/v1/admin/auth/create
   */
  async createAdmin(req, res) {
    try {
      // Only allow this in development environment
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json(createErrorResponse(
          'Admin creation not allowed in production',
          'FORBIDDEN',
          403
        ));
      }

      const { username, password, email } = req.body;

      // Validate input
      if (!username || !password || !email) {
        return res.status(400).json(createErrorResponse(
          'Username, password, and email are required',
          'MISSING_FIELDS',
          400
        ));
      }

      if (password.length < 6) {
        return res.status(400).json(createErrorResponse(
          'Password must be at least 6 characters long',
          'WEAK_PASSWORD',
          400
        ));
      }

      // Create admin
      const newAdmin = await adminAuthService.createAdmin({
        username,
        password,
        email
      });

      console.log(`👤 New admin created: ${username}`);

      return res.status(201).json(createSuccessResponse(
        newAdmin,
        'Admin created successfully'
      ));

    } catch (error) {
      console.error('Create admin error:', error);
      return res.status(400).json(createErrorResponse(
        error.message,
        'ADMIN_CREATION_ERROR',
        400
      ));
    }
  }
}

export default new AdminAuthController(); 