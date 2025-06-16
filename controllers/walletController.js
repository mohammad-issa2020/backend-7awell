// import web3AuthService from '../services/web3AuthService.js';
import Wallet from '../models/Wallet.js';
import BaseResponse from '../utils/baseResponse.js';
import { logUserActivity } from '../services/activityService.js';

/**
 * Wallet Controller to handle wallets and Web3Auth
 */
class WalletController {
  /**
   * Create JWT for Web3Auth authentication
   * POST /wallets/auth/token
   */
  async createAuthToken(req, res) {
    try {
      const user = req.user;

      // create custom JWT for user
      // const customJWT = web3AuthService.createCustomJWT(user, user);

      // log activity
      await logUserActivity(
        user.id,
        'Web3Auth JWT created',
        'auth_login',
        // { verifier: web3AuthService.web3AuthVerifier }
      );

      return BaseResponse.success(
        res,
        {
          token: customJWT,
          // verifier: web3AuthService.web3AuthVerifier,
          // clientId: web3AuthService.web3AuthClientId,
          expiresIn: 24 * 60 * 60 // 24 hours in seconds
        },
        'Authentication token created successfully'
      );
    } catch (error) {
      console.error('Create auth token error:', error);
      return BaseResponse.error(
        res,
        'Failed to create authentication token',
        500,
        error.message,
        'AUTH_TOKEN_CREATION_FAILED'
      );
    }
  }

  /**
   * Create new wallet
   * POST /wallets
   */
  async createWallet(req, res) {
    try {
      const userId = req.user.id;
      const { address, network = 'ethereum', backupMethods = ['device'] } = req.body;

      if (!address) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'Wallet address is required',
          'MISSING_WALLET_ADDRESS'
        );
      }

      // check if wallet already exists
      const existingWallet = await Wallet.findByAddress(address);
      if (existingWallet) {
        return BaseResponse.error(
          res,
          'Wallet already exists',
          409,
          'This wallet address is already registered',
          'WALLET_ALREADY_EXISTS'
        );
      }

      // create wallet
      const newWallet = await Wallet.create({
        userId,
        address,
        network,
        provider: 'web3auth',
        backupMethods
      });

      // update user table
      // await web3AuthService.createWallet(userId, {
      //   address,
      //   network,
      //   provider: 'web3auth'
      // });

      // log activity
      await logUserActivity(
        userId,
        'Wallet created',
        'wallet_created',
        {
          wallet_address: address,
          network,
          provider: 'web3auth'
        }
      );

      return BaseResponse.success(
        res,
        {
          wallet: newWallet,
          isPrimary: true // the first one is always the primary
        },
        'Wallet created successfully'
      );
    } catch (error) {
      console.error('Create wallet error:', error);
      return BaseResponse.error(
        res,
        'Failed to create wallet',
        500,
        error.message,
        'WALLET_CREATION_FAILED'
      );
    }
  }

  /**
   * Get user wallets
   * GET /wallets
   */
  async getUserWallets(req, res) {
    try {
      const userId = req.user.id;

      const wallets = await Wallet.findByUserId(userId);
      const primaryWallet = await Wallet.getPrimaryWallet(userId);

      // add primary wallet info
      const walletsWithPrimary = wallets.map(wallet => ({
        ...wallet,
        isPrimary: primaryWallet && wallet.id === primaryWallet.id
      }));

      return BaseResponse.success(
        res,
        {
          wallets: walletsWithPrimary,
          totalWallets: wallets.length,
          hasWallets: wallets.length > 0
        },
        'Wallets retrieved successfully'
      );
    } catch (error) {
      console.error('Get user wallets error:', error);
      return BaseResponse.error(
        res,
        'Failed to get wallets',
        500,
        error.message,
        'GET_WALLETS_FAILED'
      );
    }
  }

  /**
   * Get primary wallet
   * GET /wallets/primary
   */
  async getPrimaryWallet(req, res) {
    try {
      const userId = req.user.id;

      const primaryWallet = await Wallet.getPrimaryWallet(userId);

      if (!primaryWallet) {
        return BaseResponse.success(
          res,
          {
            wallet: null,
            hasWallet: false
          },
          'No wallet found for user'
        );
      }

      // update last used
      await Wallet.updateLastUsed(primaryWallet.id);

      return BaseResponse.success(
        res,
        {
          wallet: primaryWallet,
          hasWallet: true,
          isPrimary: true
        },
        'Primary wallet retrieved successfully'
      );
    } catch (error) {
      console.error('Get primary wallet error:', error);
      return BaseResponse.error(
        res,
        'Failed to get primary wallet',
        500,
        error.message,
        'GET_PRIMARY_WALLET_FAILED'
      );
    }
  }

  /**
   * Get wallet by address
   * GET /wallets/:address
   */
  async getWalletByAddress(req, res) {
    try {
      const { address } = req.params;
      const userId = req.user.id;

      const wallet = await Wallet.findByAddress(address);

      if (!wallet) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet with this address does not exist',
          'WALLET_NOT_FOUND'
        );
      }

      // check if wallet belongs to user
      if (wallet.user_id !== userId) {
        return BaseResponse.error(
          res,
          'Access denied',
          403,
          'You do not have access to this wallet',
          'WALLET_ACCESS_DENIED'
        );
      }

      // update last used
      await Wallet.updateLastUsed(wallet.id);

      return BaseResponse.success(
        res,
        { wallet },
        'Wallet retrieved successfully'
      );
    } catch (error) {
      console.error('Get wallet by address error:', error);
      return BaseResponse.error(
        res,
        'Failed to get wallet',
        500,
        error.message,
        'GET_WALLET_FAILED'
      );
    }
  }

  /**
    * Update wallet data
   * PUT /wallets/:walletId
   */
  async updateWallet(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user.id;
      const { backupMethods, network } = req.body;

      // check if wallet belongs to user
      const wallet = await Wallet.findById(walletId);
      if (!wallet || wallet.user_id !== userId) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet not found or access denied',
          'WALLET_NOT_FOUND'
        );
      }

      // prepare data for update
      const updateData = {};
      if (backupMethods) updateData.backup_methods = backupMethods;
      if (network) updateData.network = network;

      const updatedWallet = await Wallet.update(walletId, updateData);

      // log activity
      await logUserActivity(
        userId,
        'Wallet updated',
        'settings_changed',
        {
          wallet_id: walletId,
          updated_fields: Object.keys(updateData)
        }
      );

      return BaseResponse.success(
        res,
        { wallet: updatedWallet },
        'Wallet updated successfully'
      );
    } catch (error) {
      console.error('Update wallet error:', error);
      return BaseResponse.error(
        res,
        'Failed to update wallet',
        500,
        error.message,
        'WALLET_UPDATE_FAILED'
      );
    }
  }

  /**
   * Add backup method
   * POST /wallets/:walletId/backup-methods
   */
  async addBackupMethod(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user.id;
      const { method } = req.body;

      if (!method) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'Backup method is required',
          'MISSING_BACKUP_METHOD'
        );
      }

      // check if wallet belongs to user
      const wallet = await Wallet.findById(walletId);
      if (!wallet || wallet.user_id !== userId) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet not found or access denied',
          'WALLET_NOT_FOUND'
        );
      }

      const success = await Wallet.addBackupMethod(walletId, method);

      if (!success) {
        return BaseResponse.error(
          res,
          'Failed to add backup method',
          500,
          'Could not add backup method',
          'ADD_BACKUP_METHOD_FAILED'
        );
      }

      // log activity
      await logUserActivity(
        userId,
        'Backup method added',
        'security_alert',
        {
          wallet_id: walletId,
          backup_method: method
        }
      );

      return BaseResponse.success(
        res,
        { success: true },
        'Backup method added successfully'
      );
    } catch (error) {
      console.error('Add backup method error:', error);
      return BaseResponse.error(
        res,
        'Failed to add backup method',
        500,
        error.message,
        'ADD_BACKUP_METHOD_FAILED'
      );
    }
  }

  /**
   * Deactivate wallet
   * DELETE /wallets/:walletId
   */
  async deactivateWallet(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user.id;

      // check if wallet belongs to user
      const wallet = await Wallet.findById(walletId);
      if (!wallet || wallet.user_id !== userId) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet not found or access denied',
          'WALLET_NOT_FOUND'
        );
      }

      const success = await Wallet.deactivate(walletId);

      if (!success) {
        return BaseResponse.error(
          res,
          'Failed to deactivate wallet',
          500,
          'Could not deactivate wallet',
          'WALLET_DEACTIVATION_FAILED'
        );
      }

      // log activity
      await logUserActivity(
        userId,
        'Wallet deactivated',
        'security_alert',
        {
          wallet_id: walletId,
          wallet_address: wallet.address
        }
      );

      return BaseResponse.success(
        res,
        { success: true },
        'Wallet deactivated successfully'
      );
    } catch (error) {
      console.error('Deactivate wallet error:', error);
      return BaseResponse.error(
        res,
        'Failed to deactivate wallet',
        500,
        error.message,
        'WALLET_DEACTIVATION_FAILED'
      );
    }
  }

  /**
   * Get Web3Auth settings
   * GET /wallets/config
   */
  async getClientConfig(req, res) {
    try {
      const { network = 'ethereum' } = req.query;

      // const config = web3AuthService.getClientConfig(network);

      return BaseResponse.success(
        res,
        { config },
        'Client configuration retrieved successfully'
      );
    } catch (error) {
      console.error('Get client config error:', error);
      return BaseResponse.error(
        res,
        'Failed to get client configuration',
        500,
        error.message,
        'GET_CONFIG_FAILED'
      );
    }
  }

  /**
    * Create recovery link
   * POST /wallets/:walletId/recovery-link
   */
  async generateRecoveryLink(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user.id;

      // check if wallet belongs to user
      const wallet = await Wallet.findById(walletId);
      if (!wallet || wallet.user_id !== userId) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet not found or access denied',
          'WALLET_NOT_FOUND'
        );
      }

      // const recoveryLink = web3AuthService.generateRecoveryLink(userId, wallet.address);

      // log activity
      await logUserActivity(
        userId,
        'Recovery link generated',
        'security_alert',
        {
          wallet_id: walletId,
          wallet_address: wallet.address
        }
      );

      return BaseResponse.success(
        res,
        {
          recoveryLink,
          expiresIn: '24h',
          walletAddress: wallet.address
        },
        'Recovery link generated successfully'
      );
    } catch (error) {
      console.error('Generate recovery link error:', error);
      return BaseResponse.error(
        res,
        'Failed to generate recovery link',
        500,
        error.message,
        'RECOVERY_LINK_GENERATION_FAILED'
      );
    }
  }

  /**
   * Verify recovery link
   * POST /wallets/recovery/verify
   */
  async verifyRecoveryLink(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'Recovery token is required',
          'MISSING_RECOVERY_TOKEN'
        );
      }

      // const recoveryData = web3AuthService.verifyRecoveryLink(token);

      if (!recoveryData) {
        return BaseResponse.error(
          res,
          'Invalid recovery link',
          400,
          'Recovery link is invalid or expired',
          'INVALID_RECOVERY_LINK'
        );
      }

      // search for wallet
      const wallet = await Wallet.findByAddress(recoveryData.walletAddress);

      if (!wallet) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet associated with recovery link not found',
          'WALLET_NOT_FOUND'
        );
      }

      return BaseResponse.success(
        res,
        {
          valid: true,
          userId: recoveryData.userId,
          walletAddress: recoveryData.walletAddress,
          wallet: {
            id: wallet.id,
            address: wallet.address,
            network: wallet.network,
            provider: wallet.provider
          }
        },
        'Recovery link verified successfully'
      );
    } catch (error) {
      console.error('Verify recovery link error:', error);
      return BaseResponse.error(
        res,
        'Failed to verify recovery link',
        500,
        error.message,
        'RECOVERY_LINK_VERIFICATION_FAILED'
      );
    }
  }

  /**
   * Get wallet statistics
   * GET /wallets/stats
   */
  async getWalletStatistics(req, res) {
    try {
      const statistics = await Wallet.getStatistics();

      return BaseResponse.success(
        res,
        statistics,
        'Wallet statistics retrieved successfully'
      );
    } catch (error) {
      console.error('Get wallet statistics error:', error);
      return BaseResponse.error(
        res,
        'Failed to get wallet statistics',
        500,
        error.message,
        'GET_WALLET_STATS_FAILED'
      );
    }
  }

  /**
   * Check wallet status for user
   * GET /wallets/status
   */
  async getWalletStatus(req, res) {
    try {
      const userId = req.user.id;

      const hasWallet = await Wallet.userHasWallet(userId);
      let primaryWallet = null;

      if (hasWallet) {
        primaryWallet = await Wallet.getPrimaryWallet(userId);
      }

      return BaseResponse.success(
        res,
        {
          hasWallet,
          primaryWallet: primaryWallet ? {
            id: primaryWallet.id,
            address: primaryWallet.address,
            network: primaryWallet.network,
            provider: primaryWallet.provider,
            status: primaryWallet.status,
            createdAt: primaryWallet.created_at,
            lastUsed: primaryWallet.last_used,
            needsRealAddress: primaryWallet.address.startsWith('0x') && 
                              primaryWallet.address.length === 42 && 
                              !primaryWallet.address.match(/^0x[a-fA-F0-9]{40}$/)
          } : null,
          needsSetup: !hasWallet
        },
        'Wallet status retrieved successfully'
      );
    } catch (error) {
      console.error('Get wallet status error:', error);
      return BaseResponse.error(
        res,
        'Failed to get wallet status',
        500,
        error.message,
        'GET_WALLET_STATUS_FAILED'
      );
    }
  }

  /**
   * Update real wallet address (after creation in Frontend)
   * PATCH /wallets/:walletId/address
   */
  async updateWalletAddress(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user.id;
      const { address } = req.body;

      if (!address) {
        return BaseResponse.error(
          res,
          'Invalid request',
          400,
          'Wallet address is required',
          'MISSING_WALLET_ADDRESS'
        );
      }

      // check if address format is valid
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!addressRegex.test(address)) {
        return BaseResponse.error(
          res,
          'Invalid address format',
          400,
          'Address must be a valid Ethereum address',
          'INVALID_ADDRESS_FORMAT'
        );
      }

      // check if wallet belongs to user
      const wallet = await Wallet.findById(walletId);
      if (!wallet || wallet.user_id !== userId) {
        return BaseResponse.error(
          res,
          'Wallet not found',
          404,
          'Wallet not found or access denied',
          'WALLET_NOT_FOUND'
        );
      }

      // check if address is not already in use
      const existingWallet = await Wallet.findByAddress(address);
      if (existingWallet && existingWallet.id !== walletId) {
        return BaseResponse.error(
          res,
          'Address already in use',
          409,
          'This wallet address is already registered to another wallet',
          'ADDRESS_ALREADY_EXISTS'
        );
      }

      // update address
      const updatedWallet = await Wallet.update(walletId, {
        address: address.toLowerCase(),
        updated_at: new Date().toISOString()
      });

      // update user table
      // await web3AuthService.createWallet(userId, {
      //   address: address.toLowerCase(),
      //   network: wallet.network,
      //   provider: wallet.provider
      // });

      // log activity
      await logUserActivity(
        userId,
        'Wallet address updated',
        'wallet_updated',
        {
          wallet_id: walletId,
          old_address: wallet.address,
          new_address: address.toLowerCase()
        }
      );

      return BaseResponse.success(
        res,
        {
          wallet: updatedWallet,
          addressUpdated: true
        },
        'Wallet address updated successfully'
      );
    } catch (error) {
      console.error('Update wallet address error:', error);
      return BaseResponse.error(
        res,
        'Failed to update wallet address',
        500,
        error.message,
        'WALLET_ADDRESS_UPDATE_FAILED'
      );
    }
  }

  /**
   * Check Web3Auth configuration status
   * GET /api/v1/wallets/web3auth/status
   */
  async getWeb3AuthStatus(req, res) {
    try {
      // const status = web3AuthService.getConfigurationStatus();
      
      return BaseResponse.success(
        res,
        status,
        'Web3Auth configuration status retrieved successfully'
      );
    } catch (error) {
      return BaseResponse.error(
        res,
        'Failed to get Web3Auth status',
        500,
        error.message,
        'WEB3AUTH_STATUS_FAILED'
      );
    }
  }
}

export default new WalletController();