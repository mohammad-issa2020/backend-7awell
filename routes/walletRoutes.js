import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import walletController from '../controllers/walletController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import BaseResponse from '../utils/baseResponse.js';

const router = express.Router();

/**
 * Middleware to
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return BaseResponse.error(
      res,
      'Validation failed',
      400,
      errors.array().map(err => `${err.param}: ${err.msg}`).join(', '),
      'VALIDATION_ERROR'
    );
  }
  next();
};





/**
 * 📊 Check wallet status for user
 * GET /api/wallets/status
 */
router.get('/status',
  authenticateToken,
  walletController.getWalletStatus
);

/**
 * 📈 Get wallet statistics
 * GET /api/wallets/stats
 */
router.get('/stats',
  authenticateToken,
  walletController.getWalletStatistics
);

/**
 * 👛 Get primary wallet
 * GET /api/wallets/primary
 */
router.get('/primary',
  authenticateToken,
  walletController.getPrimaryWallet
);

/**
 * 🔄 Verify recovery link
 * POST /api/wallets/recovery/verify
 */
router.post('/recovery/verify',
  [
    body('token')
      .notEmpty()
      .withMessage('Recovery token is required')
      .isString()
      .withMessage('Recovery token must be a string')
  ],
  handleValidationErrors,
  walletController.verifyRecoveryLink
);

/**
 * 💼 Get all user wallets
 * GET /api/wallets
 */
router.get('/',
  authenticateToken,
  walletController.getUserWallets
);

/**
 * ➕ Create new wallet
 * POST /api/wallets
 */
router.post('/',
  authenticateToken,
  [
    body('address')
      .notEmpty()
      .withMessage('Wallet address is required')
      .isString()
      .withMessage('Wallet address must be a string')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid Ethereum address format'),
    
    body('network')
      .optional()
      .isIn(['ethereum', 'polygon', 'goerli'])
      .withMessage('Network must be ethereum, polygon, or goerli'),
    
    body('backupMethods')
      .optional()
      .isArray()
      .withMessage('Backup methods must be an array')
      .custom((value) => {
        const validMethods = ['device', 'cloud', 'social', 'email', 'phone'];
        return value.every(method => validMethods.includes(method));
      })
      .withMessage('Invalid backup method')
  ],
  handleValidationErrors,
  walletController.createWallet
);

/**
 * 🔍 Get wallet by address
 * GET /api/wallets/:address
 */
router.get('/:address',
  authenticateToken,
  [
    param('address')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid Ethereum address format')
  ],
  handleValidationErrors,
  walletController.getWalletByAddress
);

/**
 * ✏️ Update wallet data
 * PUT /api/wallets/:walletId
 */
router.put('/:walletId',
  authenticateToken,
  [
    param('walletId')
      .isUUID()
      .withMessage('Invalid wallet ID format'),
    
    body('backupMethods')
      .optional()
      .isArray()
      .withMessage('Backup methods must be an array')
      .custom((value) => {
        const validMethods = ['device', 'cloud', 'social', 'email', 'phone'];
        return value.every(method => validMethods.includes(method));
      })
      .withMessage('Invalid backup method'),
    
    body('network')
      .optional()
      .isIn(['ethereum', 'polygon', 'goerli'])
      .withMessage('Network must be ethereum, polygon, or goerli')
  ],
  handleValidationErrors,
  walletController.updateWallet
);

/**
 * 🔐 Add backup method
 * POST /api/wallets/:walletId/backup-methods
 */
router.post('/:walletId/backup-methods',
  authenticateToken,
  [
    param('walletId')
      .isUUID()
      .withMessage('Invalid wallet ID format'),
    
    body('method')
      .notEmpty()
      .withMessage('Backup method is required')
      .isIn(['device', 'cloud', 'social', 'email', 'phone'])
      .withMessage('Invalid backup method')
  ],
  handleValidationErrors,
  walletController.addBackupMethod
);

/**
 * 🔗 Create recovery link
 * POST /api/wallets/:walletId/recovery-link
 */
router.post('/:walletId/recovery-link',
  authenticateToken,
  [
    param('walletId')
      .isUUID()
      .withMessage('Invalid wallet ID format')
  ],
  handleValidationErrors,
  walletController.generateRecoveryLink
);

/**
 * 🔄 update wallet address
 * PATCH /api/wallets/:walletId/address
 */
router.patch('/:walletId/address',
  authenticateToken,
  [
    param('walletId')
      .isUUID()
      .withMessage('Invalid wallet ID format'),
    
    body('address')
      .notEmpty()
      .withMessage('Wallet address is required')
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid Ethereum address format')
  ],
  handleValidationErrors,
  walletController.updateWalletAddress
);

/**
 * 🗑️ Deactivate wallet
 * DELETE /api/wallets/:walletId
 */
router.delete('/:walletId',
  authenticateToken,
  [
    param('walletId')
      .isUUID()
      .withMessage('Invalid wallet ID format')
  ],
  handleValidationErrors,
  walletController.deactivateWallet
);



export default router; 