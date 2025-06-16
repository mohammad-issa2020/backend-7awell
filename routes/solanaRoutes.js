import express from 'express';
import solanaController from '../controllers/solanaController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import rateLimitMiddleware from '../middleware/rateLimiter.js';

const router = express.Router();

// ===============================
// 🚀 SOLANA USDT TRANSFER ROUTES
// ===============================

/**
 * 🚀 Prepare USDT transfer operation
 * POST /api/solana/usdt/prepare
 * Body: { fromWallet, toWallet, amount }
 */
router.post('/usdt/prepare',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 10 }), // 10 requests per minute
  solanaController.prepareUSDTTransfer
);

/**
 * ✅ Complete USDT transfer operation
 * POST /api/solana/usdt/complete
 * Body: { serializedTransaction, userSignature, transactionId }
 */
router.post('/usdt/complete',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 10 }), // 10 requests per minute
  solanaController.completeUSDTTransfer
);

/**
 * 🎯 Simple USDT send (for testing only)
 * POST /api/solana/usdt/send-simple
 * Body: { fromWallet, toWallet, amount, userPrivateKey }
 */
router.post('/usdt/send-simple',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 5 }), // 5 requests per minute
  solanaController.sendUSDTSimple
);

// ===============================
// 💰 BALANCE & INFO ROUTES
// ===============================

/**
 * 💰 Check user's USDT balance
 * GET /api/solana/usdt/balance/:walletAddress
 */
router.get('/usdt/balance/:walletAddress',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  solanaController.checkUSDTBalance
);

/**
 * 🔧 Check fee payer wallet balance
 * GET /api/solana/fee-payer/balance
 */
router.get('/fee-payer/balance',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  solanaController.checkFeePayerBalance
);

/**
 * 📊 Estimate transaction fees
 * GET /api/solana/estimate-fee
 */
router.get('/estimate-fee',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 60 }), // 60 requests per minute
  solanaController.estimateTransactionFee
);

/**
 * 📈 Get Solana service statistics
 * GET /api/solana/stats
 */
router.get('/stats',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 requests per minute
  solanaController.getServiceStats
);

/**
 * 🔍 Search for transaction on Solana
 * GET /api/solana/transaction/:signature
 */
router.get('/transaction/:signature',
  authenticateToken,
  rateLimitMiddleware.createLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 requests per minute
  solanaController.getTransactionInfo
);

// ===============================
// 📋 ROUTE DOCUMENTATION
// ===============================

/**
 * 📚 Get API documentation
 * GET /api/solana/docs
 */
router.get('/docs', (req, res) => {
  const docs = {
    title: '🚀 Solana USDT Transfer API',
    description: 'API for sending USDT on Solana network with fee payment from main wallet',
    version: '1.0.0',
    baseUrl: '/api/solana',
    
    endpoints: {
      transfers: {
        'POST /usdt/prepare': {
          description: 'Prepare USDT transfer operation',
          body: {
            fromWallet: 'string - Sender wallet address',
            toWallet: 'string - Receiver wallet address',
            amount: 'number - Amount in USDT'
          },
          response: 'Transaction ready for signing'
        },
        
        'POST /usdt/complete': {
          description: 'Complete USDT transfer operation',
          body: {
            serializedTransaction: 'string - Serialized transaction',
            userSignature: 'object - User signature',
            transactionId: 'string - Transaction ID'
          },
          response: 'Transfer result with signature'
        },
        
        'POST /usdt/send-simple': {
          description: 'Simple USDT send (for testing only)',
          body: {
            fromWallet: 'string',
            toWallet: 'string', 
            amount: 'number',
            userPrivateKey: 'string'
          },
          note: 'Available in development environment only'
        }
      },
      
      balances: {
        'GET /usdt/balance/:walletAddress': {
          description: 'Check USDT balance',
          params: { walletAddress: 'Wallet address' },
          response: 'USDT balance and account information'
        },
        
        'GET /fee-payer/balance': {
          description: 'Check fee payer wallet balance',
          response: 'SOL balance in fee payer wallet'
        }
      },
      
      utilities: {
        'GET /estimate-fee': {
          description: 'Estimate transaction fees',
          response: 'Fee estimation in SOL'
        },
        
        'GET /stats': {
          description: 'Service statistics',
          response: 'Comprehensive service status information'
        },
        
        'GET /transaction/:signature': {
          description: 'Transaction information',
          params: { signature: 'Transaction signature' },
          response: 'Transaction details from Solana'
        }
      }
    },
    
    authentication: 'Bearer Token required for all requests',
    
    rateLimits: {
      'Transfer operations': '10 requests/minute',
      'Balance checks': '30 requests/minute',
      'Utilities': '60 requests/minute'
    },
    
    environment: {
      development: {
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com'
      },
      production: {
        network: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com'
      }
    },
    
    examples: {
      prepareTransfer: {
        request: {
          method: 'POST',
          url: '/api/solana/usdt/prepare',
          headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
          body: {
            fromWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            toWallet: '4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA',
            amount: 10.5
          }
        }
      },
      
      checkBalance: {
        request: {
          method: 'GET',
          url: '/api/solana/usdt/balance/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
        }
      }
    },
    
    notes: [
      '🔐 All transactions require user signature',
      '💰 Fees are paid from the main system wallet',
      '⚡ Fast transactions (1-2 seconds)',
      '💸 Very low fees (~$0.0001)',
      '🛡️ High security with full encryption'
    ]
  };
  
  res.json(docs);
});

export default router; 