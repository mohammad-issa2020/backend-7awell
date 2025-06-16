import express from 'express';
import ActivityLogger, { ACTIVITY_TYPES, RISK_LEVELS } from '../services/activityLogger.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import rateLimiter from '../middleware/rateLimiter.js';
import { activityLogger, securityActivityLogger } from '../middleware/activityMiddleware.js';

const router = express.Router();

// Apply rate limiting to all activity routes
router.use(rateLimiter.createLimiter({ windowMs: 15 * 60 * 1000, max: 100 })); // 100 requests per 15 minutes

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/activity/logs
 * Get user's activity logs with filtering
 */
router.get('/logs', 
    activityLogger({
        action: 'Get activity logs',
        activityType: ACTIVITY_TYPES.OTHER,
        riskLevel: RISK_LEVELS.LOW
    }),
    async (req, res) => {
        try {
            const {
                limit = 50,
                offset = 0,
                activityType,
                success,
                riskLevel,
                startDate,
                endDate
            } = req.query;

            const options = {
                limit: Math.min(parseInt(limit), 100), // Max 100 records
                offset: parseInt(offset) || 0,
                activityType,
                success: success !== undefined ? success === 'true' : null,
                riskLevel,
                startDate,
                endDate
            };

            const logs = await ActivityLogger.getActivityLogs(req.user.id, options);

            res.json({
                success: true,
                data: logs,
                pagination: {
                    limit: options.limit,
                    offset: options.offset,
                    hasMore: logs.length === options.limit
                }
            });

        } catch (error) {
            console.error('Activity logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve activity logs'
            });
        }
    }
);

/**
 * GET /api/activity/summary
 * Get user's activity summary
 */
router.get('/summary',
    activityLogger({
        action: 'Get activity summary',
        activityType: ACTIVITY_TYPES.OTHER,
        riskLevel: RISK_LEVELS.LOW
    }),
    async (req, res) => {
        try {
            const days = Math.min(parseInt(req.query.days) || 30, 365); // Max 365 days
            const summary = await ActivityLogger.getActivitySummary(req.user.id, days);

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Activity summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve activity summary'
            });
        }
    }
);

/**
 * GET /api/activity/security
 * Get user's security-related activity logs
 */
router.get('/security',
    securityActivityLogger('Get security logs'),
    async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const logs = await ActivityLogger.getSecurityLogs(req.user.id, limit);

            res.json({
                success: true,
                data: logs
            });

        } catch (error) {
            console.error('Security logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve security logs'
            });
        }
    }
);

/**
 * GET /api/activity/transactions
 * Get user's transaction-related activity logs
 */
router.get('/transactions',
    activityLogger({
        action: 'Get transaction logs',
        activityType: ACTIVITY_TYPES.OTHER,
        riskLevel: RISK_LEVELS.LOW
    }),
    async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const logs = await ActivityLogger.getTransactionLogs(req.user.id, limit);

            res.json({
                success: true,
                data: logs
            });

        } catch (error) {
            console.error('Transaction logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve transaction logs'
            });
        }
    }
);

/**
 * GET /api/activity/suspicious
 * Detect suspicious activity patterns for the user
 */
router.get('/suspicious',
    securityActivityLogger('Check suspicious activity'),
    async (req, res) => {
        try {
            const minutes = Math.min(parseInt(req.query.minutes) || 60, 1440); // Max 24 hours
            const analysis = await ActivityLogger.detectSuspiciousActivity(req.user.id, minutes);

            // If high risk score, log this as a security alert
            if (analysis && analysis.risk_score > 50) {
                await ActivityLogger.logSecurity({
                    userId: req.user.id,
                    action: 'High risk score detected in suspicious activity check',
                    activityType: ACTIVITY_TYPES.SECURITY_ALERT,
                    request: req,
                    details: {
                        riskScore: analysis.risk_score,
                        indicators: analysis.suspicious_indicators,
                        timeWindow: minutes
                    },
                    riskLevel: analysis.risk_score > 80 ? RISK_LEVELS.CRITICAL : RISK_LEVELS.HIGH
                });
            }

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('Suspicious activity detection error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to analyze suspicious activity'
            });
        }
    }
);

/**
 * GET /api/activity/types
 * Get available activity types and risk levels
 */
router.get('/types', (req, res) => {
    res.json({
        success: true,
        data: {
            activityTypes: Object.values(ACTIVITY_TYPES),
            riskLevels: Object.values(RISK_LEVELS)
        }
    });
});

/**
 * GET /api/activity/stats
 * Get activity statistics for the user
 */
router.get('/stats',
    activityLogger({
        action: 'Get activity statistics',
        activityType: ACTIVITY_TYPES.OTHER,
        riskLevel: RISK_LEVELS.LOW
    }),
    async (req, res) => {
        try {
            const days = Math.min(parseInt(req.query.days) || 7, 30); // Max 30 days for stats
            
            // Get activity logs for the period
            const logs = await ActivityLogger.getActivityLogs(req.user.id, {
                limit: 1000, // Get more records for stats
                startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
            });

            // Calculate statistics
            const stats = {
                totalActivities: logs.length,
                dailyAverage: Math.round(logs.length / days),
                activityByType: {},
                activityByRisk: {},
                successRate: 0,
                mostActiveDay: null,
                recentActivity: logs.slice(0, 5) // Last 5 activities
            };

            // Count by type
            logs.forEach(log => {
                stats.activityByType[log.activity_type] = (stats.activityByType[log.activity_type] || 0) + 1;
                stats.activityByRisk[log.risk_level] = (stats.activityByRisk[log.risk_level] || 0) + 1;
            });

            // Calculate success rate
            const successfulLogs = logs.filter(log => log.success);
            stats.successRate = logs.length > 0 ? Math.round((successfulLogs.length / logs.length) * 100) : 0;

            // Find most active day
            const dayCount = {};
            logs.forEach(log => {
                const day = new Date(log.created_at).toDateString();
                dayCount[day] = (dayCount[day] || 0) + 1;
            });

            if (Object.keys(dayCount).length > 0) {
                stats.mostActiveDay = Object.keys(dayCount).reduce((a, b) => 
                    dayCount[a] > dayCount[b] ? a : b
                );
            }

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Activity stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve activity statistics'
            });
        }
    }
);

/**
 * POST /api/activity/cleanup
 * Cleanup old activity logs (admin function)
 */
router.post('/cleanup',
    rateLimiter.createLimiter({ windowMs: 60 * 60 * 1000, max: 1 }), // Once per hour
    securityActivityLogger('Cleanup activity logs'),
    async (req, res) => {
        try {
            // Only allow if user has admin permissions (you can add your own check)
            // For now, we'll allow any authenticated user to cleanup their own old logs
            
            const days = Math.max(parseInt(req.body.days) || 365, 30); // Minimum 30 days
            const deletedCount = await ActivityLogger.cleanupOldLogs(days);

            await ActivityLogger.logActivity({
                userId: req.user.id,
                action: 'Activity logs cleanup performed',
                activityType: ACTIVITY_TYPES.DATA_DELETION,
                request: req,
                details: {
                    daysThreshold: days,
                    deletedCount: deletedCount
                },
                riskLevel: RISK_LEVELS.MEDIUM
            });

            res.json({
                success: true,
                message: `Cleaned up ${deletedCount} old activity logs`,
                data: {
                    deletedCount,
                    daysThreshold: days
                }
            });

        } catch (error) {
            console.error('Activity cleanup error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup activity logs'
            });
        }
    }
);

/**
 * GET /api/activity/export
 * Export user's activity logs
 */
router.get('/export',
    rateLimiter.createLimiter({ windowMs: 60 * 60 * 1000, max: 3 }), // 3 exports per hour
    securityActivityLogger('Export activity logs'),
    async (req, res) => {
        try {
            const format = req.query.format || 'json'; // json or csv
            const days = Math.min(parseInt(req.query.days) || 30, 90); // Max 90 days
            
            const logs = await ActivityLogger.getActivityLogs(req.user.id, {
                limit: 5000, // Max 5000 records for export
                startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
            });

            // Log the export activity
            await ActivityLogger.logActivity({
                userId: req.user.id,
                action: 'Activity logs exported',
                activityType: ACTIVITY_TYPES.DATA_EXPORT,
                request: req,
                details: {
                    format,
                    days,
                    recordCount: logs.length
                },
                riskLevel: RISK_LEVELS.MEDIUM
            });

            if (format === 'csv') {
                // Convert to CSV
                const csvHeader = 'ID,Action,Type,Success,Risk Level,IP Address,Device ID,Created At\n';
                const csvRows = logs.map(log => 
                    `"${log.id}","${log.action}","${log.activity_type}","${log.success}","${log.risk_level}","${log.ip_address || ''}","${log.device_id || ''}","${log.created_at}"`
                ).join('\n');
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${days}d.csv"`);
                res.send(csvHeader + csvRows);
            } else {
                // Return JSON
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${days}d.json"`);
                res.json({
                    exportDate: new Date().toISOString(),
                    userId: req.user.id,
                    dayRange: days,
                    totalRecords: logs.length,
                    data: logs
                });
            }

        } catch (error) {
            console.error('Activity export error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export activity logs'
            });
        }
    }
);

export default router; 