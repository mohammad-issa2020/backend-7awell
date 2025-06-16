import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

class AdminAuthService {
  constructor() {
    // In production, these should be stored in a database
    // For now, we'll use environment variables or hardcoded values
    this.adminUsers = [
      {
        id: 'admin-001',
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD_HASH || '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        email: process.env.ADMIN_EMAIL || 'admin@7awel.com',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        isActive: true,
        lastLogin: null
      }
    ];
    
    this.activeSessions = new Map(); // Store active admin sessions
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-admin-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Authenticate admin with username and password
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @returns {Object} Authentication result
   */
  async login(username, password) {
    try {
      // Find admin user
      const admin = this.adminUsers.find(user => 
        user.username === username && user.isActive
      );

      if (!admin) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const tokenPayload = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        type: 'admin' // Important: distinguish from user tokens
      };

      const token = jwt.sign(tokenPayload, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRES_IN
      });

      // Create session
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        adminId: admin.id,
        token: token,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: null, // Will be set by controller
        userAgent: null  // Will be set by controller
      };

      this.activeSessions.set(sessionId, session);

      // Update last login
      admin.lastLogin = new Date();

      console.log(`✅ Admin login successful: ${username}`);

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        },
        token: token,
        sessionId: sessionId,
        expiresAt: session.expiresAt
      };

    } catch (error) {
      console.error('Admin login error:', error.message);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async validateToken(token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET);
      
      // Check if it's an admin token
      if (decoded.type !== 'admin') {
        throw new Error('Invalid token type');
      }

      // Find admin user
      const admin = this.adminUsers.find(user => 
        user.id === decoded.id && user.isActive
      );

      if (!admin) {
        throw new Error('Admin not found or inactive');
      }

      return {
        valid: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        },
        decoded: decoded
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }


  async logout(sessionId) {
    try {
      if (this.activeSessions.has(sessionId)) {
        this.activeSessions.delete(sessionId);
        console.log(`✅ Admin session logged out: ${sessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin logout error:', error);
      return false;
    }
  }

  async getProfile(adminId) {
    try {
      const admin = this.adminUsers.find(user => user.id === adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      return {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin
      };
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }


  hasPermission(admin, permission) {
    return admin.permissions && admin.permissions.includes(permission);
  }

 
  async changePassword(adminId, currentPassword, newPassword) {
    try {
      const admin = this.adminUsers.find(user => user.id === adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      admin.password = hashedPassword;

      console.log(`✅ Password changed for admin: ${admin.username}`);
      return true;

    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired admin sessions`);
    }
  }

  /**
   * Create admin user (for initial setup)
   * @param {Object} adminData - Admin user data
   * @returns {Object} Created admin
   */
  async createAdmin(adminData) {
    try {
      const { username, password, email } = adminData;

      // Check if admin already exists
      const existingAdmin = this.adminUsers.find(user => 
        user.username === username || user.email === email
      );

      if (existingAdmin) {
        throw new Error('Admin with this username or email already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create admin
      const newAdmin = {
        id: `admin-${Date.now()}`,
        username: username,
        password: hashedPassword,
        email: email,
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        isActive: true,
        lastLogin: null
      };

      this.adminUsers.push(newAdmin);

      console.log(`✅ Created new admin: ${username}`);
      
      return {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions
      };

    } catch (error) {
      throw new Error(`Failed to create admin: ${error.message}`);
    }
  }
}

// Auto cleanup expired sessions every hour
const adminAuthService = new AdminAuthService();
setInterval(() => {
  adminAuthService.cleanupExpiredSessions();
}, 60 * 60 * 1000); // 1 hour

export default adminAuthService; 