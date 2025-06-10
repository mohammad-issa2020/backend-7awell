const supabase = require('../database/supabase');
const { v4: uuidv4 } = require('uuid');

// Activity types enum matching database
const ACTIVITY_TYPES = {
    AUTH_LOGIN: 'auth_login',
    AUTH_LOGOUT: 'auth_logout',
    AUTH_FAILED_LOGIN: 'auth_failed_login',
    AUTH_OTP_SENT: 'auth_otp_sent',
    AUTH_OTP_VERIFIED: 'auth_otp_verified',
    AUTH_PASSWORD_CHANGED: 'auth_password_changed',
    PROFILE_UPDATED: 'profile_updated',
    SETTINGS_CHANGED: 'settings_changed',
    WALLET_CREATED: 'wallet_created',
    WALLET_IMPORTED: 'wallet_imported',
    TRANSACTION_SENT: 'transaction_sent',
    TRANSACTION_RECEIVED: 'transaction_received',
    PIN_CREATED: 'pin_created',
    PIN_CHANGED: 'pin_changed',
    PIN_FAILED: 'pin_failed',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    BIOMETRIC_DISABLED: 'biometric_disabled',
    SESSION_CREATED: 'session_created',
    SESSION_TERMINATED: 'session_terminated',
    DEVICE_ADDED: 'device_added',
    DEVICE_REMOVED: 'device_removed',
    SECURITY_ALERT: 'security_alert',
    ACCOUNT_LOCKED: 'account_locked',
    ACCOUNT_UNLOCKED: 'account_unlocked',
    DATA_EXPORT: 'data_export',
    DATA_DELETION: 'data_deletion',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    OTHER: 'other'
};

// Risk levels
const RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
};

class ActivityLogger {
    
    /**
     * Log user activity
     * @param {Object} params - Activity parameters
     * @param {string} params.userId - User ID
     * @param {string} params.action - Action description
     * @param {string} params.activityType - Activity type from ACTIVITY_TYPES
     * @param {Object} params.details - Additional details
     * @param {Object} params.request - Express request object (optional)
     * @param {string} params.sessionId - Session ID (optional)
     * @param {boolean} params.success - Whether action was successful
     * @param {string} params.riskLevel - Risk level
     * @param {Object} params.metadata - Additional metadata
     */
    static async logActivity({
        userId,
        action,
        activityType = ACTIVITY_TYPES.OTHER,
        details = {},
        request = null,
        sessionId = null,
        success = true,
        riskLevel = RISK_LEVELS.LOW,
        metadata = {}
    }) {
        try {
            // Extract info from request if provided
            let ipAddress = null;
            let userAgent = null;
            let deviceId = null;
            
            if (request) {
                ipAddress = this.getClientIP(request);
                userAgent = request.get('User-Agent');
                deviceId = request.get('X-Device-ID') || request.body?.deviceId;
            }

            const { data, error } = await supabase
                .rpc('log_user_activity', {
                    p_user_id: userId,
                    p_session_id: sessionId,
                    p_action: action,
                    p_activity_type: activityType,
                    p_details: details,
                    p_ip_address: ipAddress,
                    p_device_id: deviceId,
                    p_user_agent: userAgent,
                    p_success: success,
                    p_risk_level: riskLevel,
                    p_metadata: metadata
                });

            if (error) {
                console.error('Failed to log activity:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('ActivityLogger error:', error);
            return null;
        }
    }

    /**
     * Log authentication activity
     */
    static async logAuth({
        userId,
        action,
        success = true,
        request = null,
        details = {},
        riskLevel = RISK_LEVELS.LOW
    }) {
        const activityType = success ? ACTIVITY_TYPES.AUTH_LOGIN : ACTIVITY_TYPES.AUTH_FAILED_LOGIN;
        
        return this.logActivity({
            userId,
            action,
            activityType,
            success,
            request,
            details,
            riskLevel
        });
    }

    /**
     * Log OTP activity
     */
    static async logOTP({
        userId,
        action,
        type = 'sent', // 'sent' or 'verified'
        success = true,
        request = null,
        details = {}
    }) {
        const activityType = type === 'sent' ? ACTIVITY_TYPES.AUTH_OTP_SENT : ACTIVITY_TYPES.AUTH_OTP_VERIFIED;
        
        return this.logActivity({
            userId,
            action,
            activityType,
            success,
            request,
            details
        });
    }

    /**
     * Log transaction activity
     */
    static async logTransaction({
        userId,
        action,
        type = 'sent', // 'sent' or 'received'
        amount,
        currency,
        toAddress = null,
        fromAddress = null,
        success = true,
        request = null,
        transactionHash = null
    }) {
        const activityType = type === 'sent' ? ACTIVITY_TYPES.TRANSACTION_SENT : ACTIVITY_TYPES.TRANSACTION_RECEIVED;
        
        const details = {
            amount,
            currency,
            toAddress,
            fromAddress,
            transactionHash
        };

        return this.logActivity({
            userId,
            action,
            activityType,
            success,
            request,
            details,
            riskLevel: amount > 1000 ? RISK_LEVELS.MEDIUM : RISK_LEVELS.LOW // Example risk assessment
        });
    }

    /**
     * Log security activity
     */
    static async logSecurity({
        userId,
        action,
        activityType = ACTIVITY_TYPES.SECURITY_ALERT,
        success = true,
        request = null,
        details = {},
        riskLevel = RISK_LEVELS.HIGH
    }) {
        return this.logActivity({
            userId,
            action,
            activityType,
            success,
            request,
            details,
            riskLevel
        });
    }

    /**
     * Log PIN activity
     */
    static async logPIN({
        userId,
        action,
        type = 'failed', // 'created', 'changed', 'failed'
        success = true,
        request = null,
        attempts = null
    }) {
        let activityType;
        let riskLevel = RISK_LEVELS.LOW;

        switch (type) {
            case 'created':
                activityType = ACTIVITY_TYPES.PIN_CREATED;
                break;
            case 'changed':
                activityType = ACTIVITY_TYPES.PIN_CHANGED;
                break;
            case 'failed':
                activityType = ACTIVITY_TYPES.PIN_FAILED;
                riskLevel = attempts > 3 ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM;
                break;
            default:
                activityType = ACTIVITY_TYPES.OTHER;
        }

        const details = attempts ? { attempts } : {};

        return this.logActivity({
            userId,
            action,
            activityType,
            success,
            request,
            details,
            riskLevel
        });
    }


    /**
     * Get user activity logs
     */
    static async getActivityLogs(userId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                activityType = null,
                success = null,
                riskLevel = null,
                startDate = null,
                endDate = null
            } = options;

            let query = supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (activityType) {
                query = query.eq('activity_type', activityType);
            }

            if (success !== null) {
                query = query.eq('success', success);
            }

            if (riskLevel) {
                query = query.eq('risk_level', riskLevel);
            }

            if (startDate) {
                query = query.gte('created_at', startDate);
            }

            if (endDate) {
                query = query.lte('created_at', endDate);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to get activity logs:', error);
            return [];
        }
    }


    /**
     * Get transaction logs
     */
    static async getTransactionLogs(userId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('user_transaction_logs')
                .select('*')
                .eq('user_id', userId)
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to get transaction logs:', error);
            return [];
        }
    }

    /**
     * Extract client IP from request
     */
    static getClientIP(request) {
        return request.ip ||
               request.connection?.remoteAddress ||
               request.socket?.remoteAddress ||
               (request.connection?.socket ? request.connection.socket.remoteAddress : null) ||
               request.headers['x-forwarded-for']?.split(',')[0] ||
               request.headers['x-real-ip'] ||
               'unknown';
    }


}

module.exports = {
    ActivityLogger,
    ACTIVITY_TYPES,
    RISK_LEVELS
}; 