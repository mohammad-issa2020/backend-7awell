const { ActivityLogger, ACTIVITY_TYPES, RISK_LEVELS } = require('../services/activityLogger');

/**
 * Middleware to automatically log user activities
 */
const activityLogger = (options = {}) => {
    const {
        activityType = ACTIVITY_TYPES.OTHER,
        action = null,
        riskLevel = RISK_LEVELS.LOW,
        logSuccess = true,
        logFailure = true,
        extractDetails = null // Function to extract details from req/res
    } = options;

    return async (req, res, next) => {
        // Store original end function
        const originalEnd = res.end;
        const startTime = Date.now();

        // Override res.end to capture response
        res.end = function(chunk, encoding) {
            const duration = Date.now() - startTime;
            const success = res.statusCode < 400;
            
            // Log activity if conditions are met
            if ((success && logSuccess) || (!success && logFailure)) {
                // Extract user ID from request
                const userId = req.user?.id || req.session?.userId || req.body?.userId;
                
                if (userId) {
                    // Determine action
                    let finalAction = action;
                    if (!finalAction) {
                        finalAction = `${req.method} ${req.route?.path || req.path}`;
                    }

                    // Extract details
                    let details = {
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        duration: duration
                    };

                    if (extractDetails && typeof extractDetails === 'function') {
                        const customDetails = extractDetails(req, res);
                        details = { ...details, ...customDetails };
                    }

                    // Determine risk level based on status code if not specified
                    let finalRiskLevel = riskLevel;
                    if (res.statusCode >= 500) {
                        finalRiskLevel = RISK_LEVELS.HIGH;
                    } else if (res.statusCode >= 400) {
                        finalRiskLevel = RISK_LEVELS.MEDIUM;
                    }

                    // Log activity asynchronously
                    ActivityLogger.logActivity({
                        userId,
                        action: finalAction,
                        activityType,
                        details,
                        request: req,
                        sessionId: req.session?.id,
                        success,
                        riskLevel: finalRiskLevel
                    }).catch(error => {
                        console.error('Failed to log activity in middleware:', error);
                    });
                }
            }

            // Call original end function
            originalEnd.call(this, chunk, encoding);
        };

        next();
    };
};

/**
 * Middleware specifically for authentication activities
 */
const authActivityLogger = (action, options = {}) => {
    return activityLogger({
        activityType: ACTIVITY_TYPES.AUTH_LOGIN,
        action,
        riskLevel: RISK_LEVELS.MEDIUM,
        extractDetails: (req, res) => ({
            email: req.body?.email,
            phoneNumber: req.body?.phoneNumber,
            method: req.body?.method || 'unknown'
        }),
        ...options
    });
};

/**
 * Middleware for transaction activities
 */
const transactionActivityLogger = (action, options = {}) => {
    return activityLogger({
        activityType: ACTIVITY_TYPES.TRANSACTION_SENT,
        action,
        riskLevel: RISK_LEVELS.HIGH,
        extractDetails: (req, res) => ({
            amount: req.body?.amount,
            currency: req.body?.currency,
            toAddress: req.body?.toAddress,
            fromAddress: req.body?.fromAddress
        }),
        ...options
    });
};

/**
 * Middleware for security activities
 */
const securityActivityLogger = (action, options = {}) => {
    return activityLogger({
        activityType: ACTIVITY_TYPES.SECURITY_ALERT,
        action,
        riskLevel: RISK_LEVELS.HIGH,
        ...options
    });
};

/**
 * Middleware for settings changes
 */
const settingsActivityLogger = (action, options = {}) => {
    return activityLogger({
        activityType: ACTIVITY_TYPES.SETTINGS_CHANGED,
        action,
        riskLevel: RISK_LEVELS.LOW,
        extractDetails: (req, res) => ({
            settings: req.body
        }),
        ...options
    });
};

/**
 * Middleware to log failed requests (errors, unauthorized access, etc.)
 */
const errorActivityLogger = () => {
    return (err, req, res, next) => {
        const userId = req.user?.id || req.session?.userId;
        
        if (userId) {
            const action = `Error: ${err.message || 'Unknown error'}`;
            const details = {
                error: err.message,
                stack: err.stack,
                method: req.method,
                path: req.path,
                statusCode: err.status || 500
            };

            ActivityLogger.logActivity({
                userId,
                action,
                activityType: ACTIVITY_TYPES.OTHER,
                details,
                request: req,
                success: false,
                riskLevel: RISK_LEVELS.HIGH
            }).catch(logError => {
                console.error('Failed to log error activity:', logError);
            });
        }

        next(err);
    };
};

/**
 * Middleware to track suspicious activities
 */
const suspiciousActivityTracker = () => {
    // Track failed attempts per IP
    const failedAttempts = new Map();
    const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
    const MAX_ATTEMPTS = 5;

    return async (req, res, next) => {
        const ip = ActivityLogger.getClientIP(req);
        const now = Date.now();
        
        // Clean old attempts
        for (const [key, data] of failedAttempts.entries()) {
            if (now - data.firstAttempt > ATTEMPT_WINDOW) {
                failedAttempts.delete(key);
            }
        }

        // Check if response indicates failure
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            if (res.statusCode === 401 || res.statusCode === 403) {
                // Track failed attempt
                if (!failedAttempts.has(ip)) {
                    failedAttempts.set(ip, {
                        count: 1,
                        firstAttempt: now
                    });
                } else {
                    const data = failedAttempts.get(ip);
                    data.count++;
                    failedAttempts.set(ip, data);

                    // Check if suspicious
                    if (data.count >= MAX_ATTEMPTS) {
                        const userId = req.user?.id || req.session?.userId || 'unknown';
                        
                        ActivityLogger.logSecurity({
                            userId,
                            action: 'Suspicious activity detected - Multiple failed attempts',
                            activityType: ACTIVITY_TYPES.SUSPICIOUS_ACTIVITY,
                            request: req,
                            details: {
                                attempts: data.count,
                                timeWindow: ATTEMPT_WINDOW / 1000,
                                reason: 'Multiple failed authentication attempts'
                            },
                            riskLevel: RISK_LEVELS.CRITICAL
                        }).catch(error => {
                            console.error('Failed to log suspicious activity:', error);
                        });
                    }
                }
            }

            originalEnd.call(this, chunk, encoding);
        };

        next();
    };
};

module.exports = {
    activityLogger,
    authActivityLogger,
    transactionActivityLogger,
    securityActivityLogger,
    settingsActivityLogger,
    errorActivityLogger,
    suspiciousActivityTracker
}; 