/**
 * مثال عملي على كيفية استخدام Winston في تسجيل المصادقة
 * Practical example of using Winston for authentication logging
 * 
 * هذا المثال يوضح كيفية استخدام Winston في تسجيل جميع مراحل المصادقة
 * This example shows how to use Winston to log all authentication stages
 */

import logger from '../utils/logger.js';

// مثال على تسجيل الدخول بالهاتف مع Winston
// Example of phone login with Winston logging
async function phoneLoginWithLogging(phoneNumber, req) {
  const startTime = Date.now();
  
  try {
    // 1. تسجيل بداية عملية تسجيل الدخول
    // Log the start of login process
    logger.logAuth('بدء عملية تسجيل الدخول بالهاتف', 'info', {
      phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // 2. تسجيل التحقق من صحة رقم الهاتف
    // Log phone number validation
    if (!phoneNumber || phoneNumber.length < 10) {
      logger.logAuth('فشل في التحقق من صحة رقم الهاتف', 'warn', {
        phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
        reason: 'رقم هاتف غير صالح',
        ip: req.ip
      });
      throw new Error('رقم الهاتف غير صالح');
    }

    // 3. تسجيل إرسال OTP
    // Log OTP sending
    logger.logAuth('محاولة إرسال OTP للهاتف', 'info', {
      phoneNumber: `***${phoneNumber.slice(-4)}`,
      method: 'whatsapp_fallback_sms',
      ip: req.ip
    });

    // محاكاة إرسال OTP
    // Simulate OTP sending
    const sessionId = 'session_' + Date.now();
    
    logger.logAuth('تم إرسال OTP بنجاح', 'info', {
      phoneNumber: `***${phoneNumber.slice(-4)}`,
      sessionId: sessionId,
      method: 'whatsapp',
      executionTime: Date.now() - startTime + 'ms'
    });

    return { sessionId, success: true };

  } catch (error) {
    // 4. تسجيل الأخطاء
    // Log errors
    logger.logError('فشل في إرسال OTP للهاتف', error, {
      phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
      errorMessage: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      executionTime: Date.now() - startTime + 'ms'
    });

    // تسجيل أمني للمحاولات المشبوهة
    // Security logging for suspicious attempts
    if (error.message.includes('rate limit')) {
      logger.logSecurity('محاولات متكررة لإرسال OTP', 'warning', {
        phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : 'undefined',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        attemptType: 'phone_otp_spam',
        requiresInvestigation: true
      });
    }

    throw error;
  }
}

// مثال على التحقق من OTP مع Winston
// Example of OTP verification with Winston logging
async function verifyOTPWithLogging(sessionId, otp, req) {
  const startTime = Date.now();
  
  try {
    // 1. تسجيل محاولة التحقق من OTP
    // Log OTP verification attempt
    logger.logAuth('محاولة التحقق من OTP', 'info', {
      sessionId: sessionId,
      hasOTP: !!otp,
      otpLength: otp ? otp.length : 0,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 2. تسجيل التحقق من صحة البيانات
    // Log data validation
    if (!sessionId || !otp) {
      logger.logAuth('فشل في التحقق: بيانات مفقودة', 'warn', {
        hasSessionId: !!sessionId,
        hasOTP: !!otp,
        ip: req.ip
      });
      throw new Error('معرف الجلسة أو OTP مفقود');
    }

    if (otp.length !== 6) {
      logger.logAuth('فشل في التحقق: طول OTP غير صحيح', 'warn', {
        sessionId: sessionId,
        otpLength: otp.length,
        expectedLength: 6,
        ip: req.ip
      });
      throw new Error('طول OTP غير صحيح');
    }

    // محاكاة التحقق من OTP
    // Simulate OTP verification
    const isValidOTP = otp === '123456'; // مثال فقط
    
    if (!isValidOTP) {
      logger.logAuth('فشل في التحقق من OTP', 'warn', {
        sessionId: sessionId,
        reason: 'OTP غير صحيح',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        executionTime: Date.now() - startTime + 'ms'
      });

      // تسجيل أمني للمحاولات الفاشلة المتكررة
      // Security logging for repeated failed attempts
      logger.logSecurity('محاولة OTP فاشلة', 'warning', {
        sessionId: sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        attemptType: 'invalid_otp',
        potentialBruteForce: true
      });

      throw new Error('OTP غير صحيح');
    }

    // 3. تسجيل نجاح التحقق
    // Log successful verification
    const userId = 'user_' + Date.now();
    
    logger.logAuth('تم التحقق من OTP بنجاح', 'info', {
      sessionId: sessionId,
      userId: userId,
      ip: req.ip,
      success: true,
      executionTime: Date.now() - startTime + 'ms'
    });

    // 4. تسجيل إجراء المستخدم
    // Log user action
    logger.logUserAction(userId, 'phone_login_success', {
      sessionId: sessionId,
      loginMethod: 'phone_otp',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      executionTime: Date.now() - startTime + 'ms'
    });

    return {
      userId: userId,
      sessionId: sessionId,
      success: true,
      message: 'تم تسجيل الدخول بنجاح'
    };

  } catch (error) {
    // تسجيل الأخطاء
    // Log errors
    logger.logError('فشل في التحقق من OTP', error, {
      sessionId: sessionId,
      hasOTP: !!otp,
      errorMessage: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      executionTime: Date.now() - startTime + 'ms'
    });

    throw error;
  }
}

// مثال على تسجيل الخروج مع Winston
// Example of logout with Winston logging
async function logoutWithLogging(userId, sessionToken, req) {
  try {
    // 1. تسجيل محاولة تسجيل الخروج
    // Log logout attempt
    logger.logAuth('محاولة تسجيل الخروج', 'info', {
      userId: userId,
      hasSessionToken: !!sessionToken,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // محاكاة تسجيل الخروج
    // Simulate logout process
    const logoutSuccess = true;

    if (logoutSuccess) {
      // 2. تسجيل نجاح تسجيل الخروج
      // Log successful logout
      logger.logAuth('تم تسجيل الخروج بنجاح', 'info', {
        userId: userId,
        ip: req.ip,
        success: true,
        timestamp: new Date().toISOString()
      });

      // 3. تسجيل إجراء المستخدم
      // Log user action
      logger.logUserAction(userId, 'logout', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        method: 'manual_logout'
      });

      return { success: true, message: 'تم تسجيل الخروج بنجاح' };
    }

  } catch (error) {
    // تسجيل أخطاء تسجيل الخروج
    // Log logout errors
    logger.logError('فشل في تسجيل الخروج', error, {
      userId: userId,
      hasSessionToken: !!sessionToken,
      errorMessage: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    throw error;
  }
}

// مثال على مراقبة الأمان مع Winston
// Example of security monitoring with Winston
function logSecurityEvent(eventType, details, req) {
  // تسجيل الأحداث الأمنية المختلفة
  // Log different security events
  
  switch (eventType) {
    case 'suspicious_login':
      logger.logSecurity('محاولة دخول مشبوهة', 'warning', {
        ...details,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requiresInvestigation: true
      });
      break;

    case 'multiple_failed_attempts':
      logger.logSecurity('محاولات فاشلة متعددة', 'warning', {
        ...details,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        attemptCount: details.count || 1,
        timeWindow: '5 minutes',
        actionRequired: 'temporary_block'
      });
      break;

    case 'account_lockout':
      logger.logSecurity('تم حظر الحساب', 'error', {
        ...details,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        lockoutReason: details.reason || 'too_many_failed_attempts',
        lockoutDuration: '30 minutes'
      });
      break;

    default:
      logger.logSecurity('حدث أمني غير محدد', 'info', {
        eventType: eventType,
        ...details,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
  }
}

export {
  phoneLoginWithLogging,
  verifyOTPWithLogging,
  logoutWithLogging,
  logSecurityEvent
};

/**
 * ملخص استخدام Winston في المصادقة:
 * Summary of Winston usage in authentication:
 * 
 * 1. logger.logAuth() - لتسجيل أحداث المصادقة
 *    For logging authentication events
 * 
 * 2. logger.logUserAction() - لتسجيل إجراءات المستخدم
 *    For logging user actions
 * 
 * 3. logger.logSecurity() - لتسجيل الأحداث الأمنية
 *    For logging security events
 * 
 * 4. logger.logError() - لتسجيل الأخطاء
 *    For logging errors
 * 
 * الأحداث التي يتم تسجيلها:
 * Events that are logged:
 * - بداية عملية تسجيل الدخول / Login process start
 * - إرسال OTP / OTP sending
 * - التحقق من OTP / OTP verification
 * - نجاح/فشل تسجيل الدخول / Login success/failure
 * - تسجيل الخروج / Logout
 * - الأحداث الأمنية / Security events
 * - محاولات الدخول المشبوهة / Suspicious login attempts
 * - المحاولات الفاشلة المتكررة / Repeated failed attempts
 * 
 * جميع هذه السجلات تحفظ في:
 * All these logs are saved in:
 * - ملفات منفصلة (auth.log, security.log, etc.)
 *   Separate files (auth.log, security.log, etc.)
 * - قاعدة البيانات (جدول activity_logs)
 *   Database (activity_logs table)
 */ 