import logger from '../utils/logger.js';
import { supabase } from '../database/supabase.js';
import bcrypt from 'bcryptjs';

/**
 * مثال لخدمة المصادقة مع تسجيل منفصل للملفات
 * Example Auth Service with separate file logging
 */
class AuthServiceWithLogs {

  /**
   * تسجيل دخول المستخدم مع تسجيل شامل
   * User login with comprehensive logging
   */
  static async login(email, password, req) {
    const startTime = Date.now();
    
    try {
      // بداية محاولة تسجيل الدخول - تسجيل في ملف auth.log
      // Start login attempt logging - logged to auth.log
      logger.logAuth(null, 'Login attempt started', true, req, {
        email,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent')
      });

      // التحقق من وجود المستخدم
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, password_hash, is_active, failed_login_attempts, last_failed_login')
        .eq('email', email)
        .single();

      if (userError || !user) {
        // تسجيل فشل تسجيل الدخول - مستخدم غير موجود
        // Log login failure - user not found
        logger.logAuth(null, 'Login failed - user not found', false, req, {
          email,
          reason: 'USER_NOT_FOUND',
          duration: Date.now() - startTime
        });
        
        // تسجيل حدث أمني - محاولة دخول بحساب غير موجود
        // Log security event - attempted login with non-existent account
        logger.logSecurity(null, 'Login attempt with non-existent email', 'medium', {
          email,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, req);
        
        throw new Error('Invalid credentials');
      }

      // التحقق من حالة الحساب
      // Check account status
      if (!user.is_active) {
        logger.logAuth(user.id, 'Login failed - account disabled', false, req, {
          email,
          reason: 'ACCOUNT_DISABLED'
        });
        
        logger.logSecurity(user.id, 'Login attempt on disabled account', 'high', {
          email,
          ipAddress: req.ip
        }, req);
        
        throw new Error('Account is disabled');
      }

      // التحقق من محاولات تسجيل الدخول الفاشلة
      // Check failed login attempts
      if (user.failed_login_attempts >= 5) {
        const lastFailedLogin = new Date(user.last_failed_login);
        const timeSinceLastFailure = Date.now() - lastFailedLogin.getTime();
        const lockoutPeriod = 15 * 60 * 1000; // 15 minutes

        if (timeSinceLastFailure < lockoutPeriod) {
          logger.logAuth(user.id, 'Login failed - account locked', false, req, {
            email,
            reason: 'ACCOUNT_LOCKED',
            failedAttempts: user.failed_login_attempts,
            lockoutRemaining: Math.ceil((lockoutPeriod - timeSinceLastFailure) / 1000 / 60)
          });
          
          logger.logSecurity(user.id, 'Login attempt on locked account', 'high', {
            email,
            failedAttempts: user.failed_login_attempts,
            ipAddress: req.ip
          }, req);
          
          throw new Error('Account is temporarily locked');
        }
      }

      // التحقق من كلمة المرور
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        // زيادة عدد محاولات تسجيل الدخول الفاشلة
        // Increment failed login attempts
        const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
        
        await supabase
          .from('users')
          .update({
            failed_login_attempts: newFailedAttempts,
            last_failed_login: new Date().toISOString()
          })
          .eq('id', user.id);

        logger.logAuth(user.id, 'Login failed - invalid password', false, req, {
          email,
          reason: 'INVALID_PASSWORD',
          failedAttempts: newFailedAttempts,
          duration: Date.now() - startTime
        });

        // تسجيل حدث أمني إذا كانت المحاولات كثيرة
        // Log security event if many attempts
        if (newFailedAttempts >= 3) {
          logger.logSecurity(user.id, 'Multiple failed login attempts', 'high', {
            email,
            failedAttempts: newFailedAttempts,
            ipAddress: req.ip,
            possibleBruteForce: newFailedAttempts >= 5
          }, req);
        }

        throw new Error('Invalid credentials');
      }

      // تسجيل دخول ناجح
      // Successful login
      const loginDuration = Date.now() - startTime;
      
      // إعادة تعيين محاولات تسجيل الدخول الفاشلة
      // Reset failed login attempts
      await supabase
        .from('users')
        .update({
          failed_login_attempts: 0,
          last_failed_login: null,
          last_login: new Date().toISOString()
        })
        .eq('id', user.id);

      // تسجيل نجح تسجيل الدخول في ملف auth.log
      // Log successful login to auth.log
      logger.logAuth(user.id, 'Login successful', true, req, {
        email,
        duration: loginDuration,
        previousFailedAttempts: user.failed_login_attempts || 0,
        loginMethod: 'email_password',
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });

      // تسجيل إجراء المستخدم
      // Log user action
      logger.logUserAction(user.id, 'User logged in successfully', {
        loginMethod: 'email_password',
        duration: loginDuration,
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent')
      }, req);

      // مراقبة الأداء
      // Performance monitoring
      if (loginDuration > 2000) {
        logger.logPerformance('Login process - slow execution', loginDuration, {
          email,
          userId: user.id,
          reason: 'database_query_slow'
        }, user.id);
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          isActive: user.is_active
        },
        loginDuration
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      // تسجيل الخطأ مع السياق الكامل
      // Log error with full context
      logger.logError(error, {
        operation: 'user_login',
        email,
        duration: totalDuration,
        errorType: error.message,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      }, null, req);

      throw error;
    }
  }

  /**
   * تسجيل مستخدم جديد مع تسجيل شامل
   * User registration with comprehensive logging
   */
  static async register(userData, req) {
    const startTime = Date.now();
    
    try {
      // بداية عملية التسجيل
      // Start registration process
      logger.logAuth(null, 'User registration started', true, req, {
        email: userData.email,
        registrationSource: req.get('User-Agent')
      });

      // التحقق من البيانات المطلوبة
      // Validate required data
      if (!userData.email || !userData.password) {
        logger.logSecurity(null, 'Registration attempt with missing data', 'medium', {
          missingEmail: !userData.email,
          missingPassword: !userData.password,
          ipAddress: req.ip
        }, req);
        throw new Error('Email and password are required');
      }

      // التحقق من وجود المستخدم مسبقاً
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        logger.logAuth(null, 'Registration failed - user already exists', false, req, {
          email: userData.email,
          existingUserId: existingUser.id
        });
        
        logger.logSecurity(null, 'Registration attempt with existing email', 'low', {
          email: userData.email,
          ipAddress: req.ip
        }, req);
        
        throw new Error('User already exists');
      }

      // إنشاء المستخدم الجديد
      // Create new user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          password_hash: hashedPassword,
          is_active: true,
          created_at: new Date().toISOString(),
          failed_login_attempts: 0
        }])
        .select('id, email, is_active, created_at')
        .single();

      if (createError) {
        logger.logError(createError, {
          operation: 'create_user',
          email: userData.email
        }, null, req);
        throw new Error('Failed to create user account');
      }

      const registrationDuration = Date.now() - startTime;

      // تسجيل نجح التسجيل في ملف auth.log
      // Log successful registration to auth.log
      logger.logAuth(newUser.id, 'User registration successful', true, req, {
        email: userData.email,
        userId: newUser.id,
        duration: registrationDuration,
        registrationMethod: 'email_password'
      });

      // تسجيل إجراء المستخدم
      // Log user action
      logger.logUserAction(newUser.id, 'New account created', {
        email: userData.email,
        registrationSource: req.get('User-Agent'),
        duration: registrationDuration
      }, req);

      // مراقبة الأداء
      // Performance monitoring
      logger.logPerformance('User registration', registrationDuration, {
        userId: newUser.id,
        success: true
      }, newUser.id);

      return newUser;

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      logger.logError(error, {
        operation: 'user_registration',
        email: userData.email,
        duration: totalDuration
      }, null, req);

      throw error;
    }
  }

  /**
   * تسجيل خروج المستخدم
   * User logout
   */
  static async logout(userId, req) {
    try {
      logger.logAuth(userId, 'User logout initiated', true, req, {
        userId,
        logoutTime: new Date().toISOString()
      });

      // تحديث وقت آخر نشاط للمستخدم
      // Update user's last activity
      await supabase
        .from('users')
        .update({
          last_logout: new Date().toISOString()
        })
        .eq('id', userId);

      logger.logAuth(userId, 'User logout successful', true, req, {
        userId,
        completedAt: new Date().toISOString()
      });

      logger.logUserAction(userId, 'User logged out', {
        logoutTime: new Date().toISOString()
      }, req);

      return { success: true };

    } catch (error) {
      logger.logError(error, {
        operation: 'user_logout',
        userId
      }, userId, req);
      throw error;
    }
  }

  /**
   * تغيير كلمة المرور
   * Change password
   */
  static async changePassword(userId, oldPassword, newPassword, req) {
    const startTime = Date.now();
    
    try {
      logger.logAuth(userId, 'Password change attempt started', true, req, {
        userId,
        timestamp: new Date().toISOString()
      });

      // جلب بيانات المستخدم الحالية
      // Get current user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, password_hash')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.logSecurity(userId, 'Password change attempt for non-existent user', 'high', {
          userId
        }, req);
        throw new Error('User not found');
      }

      // التحقق من كلمة المرور القديمة
      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
      
      if (!isOldPasswordValid) {
        logger.logAuth(userId, 'Password change failed - invalid old password', false, req, {
          userId,
          email: user.email,
          reason: 'INVALID_OLD_PASSWORD'
        });
        
        logger.logSecurity(userId, 'Invalid old password during password change', 'medium', {
          userId,
          email: user.email
        }, req);
        
        throw new Error('Current password is incorrect');
      }

      // تحديث كلمة المرور
      // Update password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedNewPassword,
          password_changed_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        logger.logError(updateError, {
          operation: 'update_password',
          userId
        }, userId, req);
        throw new Error('Failed to update password');
      }

      const changeDuration = Date.now() - startTime;

      // تسجيل نجح تغيير كلمة المرور
      // Log successful password change
      logger.logAuth(userId, 'Password changed successfully', true, req, {
        userId,
        email: user.email,
        duration: changeDuration,
        timestamp: new Date().toISOString()
      });

      logger.logUserAction(userId, 'Password changed', {
        timestamp: new Date().toISOString(),
        duration: changeDuration
      }, req);

      // تسجيل حدث أمني مهم
      // Log important security event
      logger.logSecurity(userId, 'User password changed', 'low', {
        userId,
        email: user.email,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip
      }, req);

      return { success: true };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      logger.logError(error, {
        operation: 'change_password',
        userId,
        duration: totalDuration
      }, userId, req);

      throw error;
    }
  }
}

export default AuthServiceWithLogs; 