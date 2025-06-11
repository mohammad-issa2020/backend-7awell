const express = require('express');
const testRoutes = require('./testRoutes');
const authRoutes = require('./authRoutes');
const adminAuthRoutes = require('./adminAuthRoutes');
const activityRoutes = require('./activity');
const promotionRoutes = require('./promotionRoutes');
const logRoutes = require('./logRoutes');
const transactionRoutes = require('./transactionRoutes');
const contactRoutes = require('./contactRoutes');
const walletRoutes = require('./walletRoutes');
const stytchClient = require('../config/stytch');

const router = express.Router();

// Welcome route for API
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to 7awel Crypto Wallet API!',
    version: '1.0.0',
    description: 'RESTful API with Stytch authentication and session management',
    endpoints: {
      health: '/api/v1/health',
      stytchTest: '/api/stytch-test',
      debugOtp: '/api/debug-otp',
      auth: {
        checkAvailability: 'GET /api/v1/auth/check-availability',
        sendOTP: 'POST /api/v1/auth/otp/send',
        verifyOTP: 'POST /api/v1/auth/otp/verify',
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
        sessions: 'GET /api/v1/auth/sessions',
        revokeSession: 'DELETE /api/v1/auth/sessions/:sessionId',
        revokeAllSessions: 'DELETE /api/v1/auth/sessions'
      },
      adminAuth: {
        login: 'POST /api/v1/admin/auth/login',
        logout: 'POST /api/v1/admin/auth/logout',
        me: 'GET /api/v1/admin/auth/me',
        changePassword: 'POST /api/v1/admin/auth/change-password',
        validate: 'GET /api/v1/admin/auth/validate',
        create: 'POST /api/v1/admin/auth/create (dev only)'
      },
      promotions: {
        getPromotions: 'GET /api/v1/promotions?locale={locale}',
        recordView: 'POST /api/v1/promotions/:promotionId/view',
        createPromotion: 'POST /api/v1/promotions (admin)',
        updatePromotion: 'PUT /api/v1/promotions/:promotionId (admin)',
        deletePromotion: 'DELETE /api/v1/promotions/:promotionId (admin)',
        analytics: 'GET /api/v1/promotions/analytics (admin)',
        allPromotions: 'GET /api/v1/promotions/all (admin)',
        clearCache: 'DELETE /api/v1/promotions/cache (admin)',
        cleanup: 'POST /api/v1/promotions/cleanup (admin)'
      },
      logs: {
        logEvent: 'POST /api/v1/logs',
        logBatch: 'POST /api/v1/logs/batch',
        logPerformance: 'POST /api/v1/logs/performance',
        logError: 'POST /api/v1/logs/error',
        getLogs: 'GET /api/v1/logs',
        getAnalytics: 'GET /api/v1/logs/analytics',
        getTypes: 'GET /api/v1/logs/types'
      },
      transactions: {
        getTransactions: 'GET /api/v1/transactions?cursor={cursor}&limit={limit}&type={type}&status={status}&assetSymbol={symbol}&network={network}&startDate={date}&endDate={date}&search={query}',
        getTransactionById: 'GET /api/v1/transactions/{id}',
        getStats: 'GET /api/v1/transactions/stats?days={days}',
        getOptions: 'GET /api/v1/transactions/options',
        createTransaction: 'POST /api/v1/transactions (internal)',
        updateStatus: 'PATCH /api/v1/transactions/{id}/status (internal)'
      },
      activity: {
        logs: 'GET /api/v1/activity/logs',
        summary: 'GET /api/v1/activity/summary',
        security: 'GET /api/v1/activity/security',
        transactions: 'GET /api/v1/activity/transactions',
        suspicious: 'GET /api/v1/activity/suspicious',
        stats: 'GET /api/v1/activity/stats',
        types: 'GET /api/v1/activity/types',
        export: 'GET /api/v1/activity/export',
        cleanup: 'POST /api/v1/activity/cleanup'
      },
      contacts: {
        syncContacts: 'POST /api/v1/contacts/sync',
        getContacts: 'GET /api/v1/contacts?favorites=true/false&limit=50&offset=0',
        getFavorites: 'GET /api/v1/contacts/favorites',
        searchContacts: 'GET /api/v1/contacts/search?q=searchTerm&limit=20&offset=0',
        getSyncStatus: 'GET /api/v1/contacts/sync/status',
        getStats: 'GET /api/v1/contacts/stats',
        toggleFavorite: 'POST /api/v1/contacts/:contactId/favorite/toggle',
        updateInteraction: 'POST /api/v1/contacts/interaction',
        createPhoneMapping: 'POST /api/v1/contacts/phone-mapping'
      },
      wallets: {
        createAuthToken: 'POST /api/v1/wallets/auth/token',
        getConfig: 'GET /api/v1/wallets/config?network={network}',
        getStatus: 'GET /api/v1/wallets/status',
        getStats: 'GET /api/v1/wallets/stats',
        getPrimary: 'GET /api/v1/wallets/primary',
        verifyRecovery: 'POST /api/v1/wallets/recovery/verify',
        getUserWallets: 'GET /api/v1/wallets',
        createWallet: 'POST /api/v1/wallets',
        getWalletByAddress: 'GET /api/v1/wallets/:address',
        updateWallet: 'PUT /api/v1/wallets/:walletId',
        addBackupMethod: 'POST /api/v1/wallets/:walletId/backup-methods',
        generateRecoveryLink: 'POST /api/v1/wallets/:walletId/recovery-link',
        deactivateWallet: 'DELETE /api/v1/wallets/:walletId'
      },
      tests: '/api/v1/tests'
    },
    documentation: 'Check the README.md for complete API documentation',
    features: [
      'Stytch-based authentication',
      'Admin authentication with JWT',
      'OTP verification via Stytch (SMS, WhatsApp, Email)',
      'Session management via Stytch',
      'Admin panel with username/password authentication',
      'Role-based access control',
      'Crypto wallet transaction tracking with cursor-based pagination',
      'Comprehensive transaction filtering and search',
      'Real-time transaction status tracking',
      'Promotion system with targeting and analytics',
      'Client-side event logging and analytics',
      'Server-side activity logging and monitoring',
      'Suspicious activity detection',
      'Contact synchronization with privacy-preserving phone hashing',
      'Contact favorites and interaction tracking',
      'Contact search and discovery',
      'Web3Auth integration for blockchain wallets',
      'Multi-network wallet support (Ethereum, Polygon)',
      'Secure wallet management and backup systems',
      'Wallet transaction tracking and recovery',
      'Rate limiting',
      'Input validation',
      'Consistent error handling',
      'Redis caching for performance'
    ]
  });
});

// Stytch connection test route
router.get('/stytch-test', async (req, res) => {
  try {
    // Test Stytch connection by searching for a non-existent user
    const testResult = await stytchClient.users.search({
      query: {
        operator: 'AND',
        operands: [{
          filter_name: 'email',
          filter_value: ['test-connection@example.com']
        }]
      }
    });

    res.json({
      status: 'SUCCESS',
      message: 'Stytch connection successful! ✅',
      stytchResponse: {
        results: testResult.results?.length || 0,
        status_code: testResult.status_code
      },
      environment: {
        project_id: process.env.STYTCH_PROJECT_ID ? 'Set ✅' : 'Missing ❌',
        secret: process.env.STYTCH_SECRET ? 'Set ✅' : 'Missing ❌',
        node_env: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'ERROR',
      message: 'Stytch connection failed! ❌',
      error: error.message,
      environment: {
        project_id: process.env.STYTCH_PROJECT_ID ? 'Set ✅' : 'Missing ❌',
        secret: process.env.STYTCH_SECRET ? 'Set ✅' : 'Missing ❌',
        node_env: process.env.NODE_ENV || 'development'
      }
    });
  }
});

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      stytch: 'Ready',      // Stytch for authentication and sessions
      api: 'Active'         // API service
    },
    version: '1.0.0'
  });
});

// Debug OTP data endpoint
router.get('/debug-otp', (req, res) => {
  const authService = require('../services/authService');
  
  try {
    const otpKeys = Array.from(authService.otpAttempts.keys());
    const otpData = {};
    
    otpKeys.forEach(key => {
      const data = authService.otpAttempts.get(key);
      otpData[key] = {
        methodId: data.methodId,
        attempts: data.attempts,
        expires: new Date(data.expires).toISOString(),
        isExpired: Date.now() > data.expires,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : 'Unknown'
      };
    });

    const rateLimitKeys = Array.from(authService.rateLimitStore.keys());
    const rateLimitData = {};
    
    rateLimitKeys.forEach(key => {
      const data = authService.rateLimitStore.get(key);
      rateLimitData[key] = {
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString()
      };
    });

    res.json({
      status: 'SUCCESS',
      message: 'OTP Debug Information',
      data: {
        otpAttempts: {
          count: otpKeys.length,
          keys: otpKeys,
          data: otpData
        },
        rateLimiting: {
          count: rateLimitKeys.length,
          keys: rateLimitKeys,
          data: rateLimitData
        },
        serverInfo: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'ERROR',
      message: 'Error retrieving debug information',
      error: error.message
    });
  }
});

// API versioning - v1 routes
router.use('/v1/auth', authRoutes);
router.use('/v1/admin/auth', adminAuthRoutes);
router.use('/v1/tests', testRoutes);
router.use('/v1/activity', activityRoutes);
router.use('/v1/promotions', promotionRoutes);
router.use('/v1/logs', logRoutes);
router.use('/v1/transactions', transactionRoutes);
router.use('/v1/contacts', contactRoutes);
router.use('/v1/wallets', walletRoutes);

// Legacy support (without versioning) - can be removed later
router.use('/auth', authRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/tests', testRoutes);
router.use('/activity', activityRoutes);
router.use('/promotions', promotionRoutes);
router.use('/logs', logRoutes);
router.use('/transactions', transactionRoutes);
router.use('/contacts', contactRoutes);
router.use('/wallets', walletRoutes);

// Add more route modules here as your application grows
// router.use('/v1/users', userRoutes);
// router.use('/v1/wallets', walletRoutes);
// router.use('/v1/transactions', transactionRoutes);

module.exports = router; 