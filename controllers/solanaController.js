import solanaService from '../services/solanaService.js';
import BaseResponse from '../utils/baseResponse.js';
import { logUserActivity } from '../services/activityService.js';
import Transaction from '../models/Transaction.js';

class SolanaController {
  /**
   * 🚀 Prepare USDT transfer operation
   * POST /api/solana/usdt/prepare
   */
  async prepareUSDTTransfer(req, res) { 
    try {
      const { fromWallet, toWallet, amount } = req.body;
      const userId = req.user?.id;

      // Check required inputs
      if (!fromWallet || !toWallet || !amount) {
        return BaseResponse.error(
          res,
          'Missing required fields',
          400,
          'fromWallet, toWallet, and amount are required',
          'MISSING_FIELDS'
        );
      }

      console.log('🚀 Preparing USDT transfer:', {
        fromWallet,
        toWallet,
        amount,
        userId
      });

      // Prepare transaction
      const result = await solanaService.prepareUSDTTransfer(
        fromWallet,
        toWallet,
        parseFloat(amount),
        userId
      );

      // Log activity
      if (userId) {
        await logUserActivity(
          userId,
          'USDT transfer prepared',
          'solana_transfer_prepare',
          {
            fromWallet,
            toWallet,
            amount: parseFloat(amount),
            transactionId: result.transactionId
          }
        );
      }

      // 2.add transaction to database
      const dbEntry = await Transaction.create({
        user_id: userId,
        from_address: fromWallet,
        to_address: toWallet,
        amount: parseFloat(amount),
        status: 'PENDING_INIT', // xxxx1
        raw_transaction: result.transaction, // serialized
        network: 'solana',
        type: 'usdt_transfer',
        reference: result.transactionId,
        created_at: new Date().toISOString()
      });

      // 3. return transactionId and transaction
      return BaseResponse.success(
        res,
        {
          transaction: result.transaction,
          transactionId: dbEntry.id, // or reference if you want
          ...result
        },
        'USDT transfer prepared successfully. Please sign the transaction.'
      );

    } catch (error) {
      console.error('❌ Error preparing USDT transfer:', error);
      
      return BaseResponse.error(
        res,
        'Failed to prepare USDT transfer',
        400,
        error.message,
        'PREPARE_TRANSFER_FAILED'
      );
    }
  }

  /**
   * ✅ Complete USDT transfer operation
   * POST /api/solana/usdt/complete
   */
  async completeUSDTTransfer(req, res) {
    try {
      const { serializedTransaction, userSignature, transactionId } = req.body;
      const userId = req.user?.id;

      // Check required inputs
      if (!serializedTransaction || !transactionId) {
        return BaseResponse.error(
          res,
          'Missing required fields',
          400,
          'serializedTransaction and transactionId are required',
          'MISSING_FIELDS'
        );
      }

      console.log('✅ Completing USDT transfer:', { transactionId, userId });

      // 1. update the transaction to SIGNED_BY_USER 
      await Transaction.update(transactionId, {
        status: 'SIGNED_BY_USER', 
        signed_transaction: serializedTransaction,
        updated_at: new Date().toISOString()
      });

      // 2. verify the signature and instructions (need a function in solanaService)
      if (solanaService.verifyUserSignature) {
        const isValid = await solanaService.verifyUserSignature(serializedTransaction, userSignature);
        if (!isValid) {
          // if error: update the transaction to FAILED_VALIDATION
          await Transaction.update(transactionId, {
            status: 'FAILED_VALIDATION', 
            error_message: 'Invalid user signature or transaction instructions',
            updated_at: new Date().toISOString()
          });
          return BaseResponse.error(
            res,
            'Invalid user signature or transaction instructions',
            400,
            'Validation failed',
            'FAILED_VALIDATION'
          );
        }
      }

      // 3. sign with fee payer wallet and send to blockchain
      try {
        const result = await solanaService.completeUSDTTransfer(
          serializedTransaction,
          userSignature,
          transactionId
        );
        // if success: update the transaction to SUCCESS
        await Transaction.update(transactionId, {
          status: 'SUCCESS', 
          blockchain_signature: result.signature,
          updated_at: new Date().toISOString()
        });
        return BaseResponse.success(res, result, 'USDT transfer completed successfully!');
      } catch (err) {
        // if failed: update the transaction to FAILED_ONCHAIN
        await Transaction.update(transactionId, {
          status: 'FAILED_ONCHAIN', 
          error_message: err.message,
          updated_at: new Date().toISOString()
        });
        return BaseResponse.error(
          res,
          'Failed to send transaction to blockchain',
          400,
          err.message,
          'FAILED_ONCHAIN'
        );
      }

    } catch (error) {
      console.error('❌ Error completing USDT transfer:', error);
      
      return BaseResponse.error(
        res,
        'Failed to complete USDT transfer',
        400,
        error.message,
        'COMPLETE_TRANSFER_FAILED'
      );
    }
  }

  /**
   * 💰 Check user's USDT balance
   * GET /api/solana/usdt/balance/:walletAddress
   */
  async checkUSDTBalance(req, res) {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        return BaseResponse.error(
          res,
          'Wallet address is required',
          400,
          'walletAddress parameter is required',
          'MISSING_WALLET_ADDRESS'
        );
      }

      console.log('💰 Checking USDT balance for:', walletAddress);

      const balance = await solanaService.checkUSDTBalance(walletAddress);

      return BaseResponse.success(
        res,
        balance,
        'USDT balance retrieved successfully'
      );

    } catch (error) {
      console.error('❌ Error checking USDT balance:', error);
      
      return BaseResponse.error(
        res,
        'Failed to check USDT balance',
        400,
        error.message,
        'BALANCE_CHECK_FAILED'
      );
    }
  }

  /**
   * 🔧 Check fee payer wallet balance
   * GET /api/solana/fee-payer/balance
   */
  async checkFeePayerBalance(req, res) {
    try {
      console.log('🔧 Checking fee payer balance...');

      const balance = await solanaService.checkFeePayerBalance();

      return BaseResponse.success(
        res,
        balance,
        'Fee payer balance retrieved successfully'
      );

    } catch (error) {
      console.error('❌ Error checking fee payer balance:', error);
      
      return BaseResponse.error(
        res,
        'Failed to check fee payer balance',
        500,
        error.message,
        'FEE_PAYER_BALANCE_FAILED'
      );
    }
  }

  /**
   * 📊 Estimate transaction fees
   * GET /api/solana/estimate-fee
   */
  async estimateTransactionFee(req, res) {
    try {
      console.log('📊 Estimating transaction fee...');

      const fee = await solanaService.estimateTransactionFee();

      return BaseResponse.success(
        res,
        fee,
        'Transaction fee estimated successfully'
      );

    } catch (error) {
      console.error('❌ Error estimating transaction fee:', error);
      
      return BaseResponse.error(
        res,
        'Failed to estimate transaction fee',
        500,
        error.message,
        'FEE_ESTIMATION_FAILED'
      );
    }
  }

  /**
   * 📈 Get Solana service statistics
   * GET /api/solana/stats
   */
  async getServiceStats(req, res) {
    try {
      console.log('📈 Getting Solana service stats...');

      const stats = await solanaService.getServiceStats();

      return BaseResponse.success(
        res,
        stats,
        'Solana service statistics retrieved successfully'
      );

    } catch (error) {
      console.error('❌ Error getting service stats:', error);
      
      return BaseResponse.error(
        res,
        'Failed to get service statistics',
        500,
        error.message,
        'STATS_FAILED'
      );
    }
  }

  /**
   * 🔍 Search for transaction on Solana
   * GET /api/solana/transaction/:signature
   */
  async getTransactionInfo(req, res) {
    try {
      const { signature } = req.params;

      if (!signature) {
        return BaseResponse.error(
          res,
          'Transaction signature is required',
          400,
          'signature parameter is required',
          'MISSING_SIGNATURE'
        );
      }

      console.log('🔍 Getting transaction info for:', signature);

      // This requires calling Solana RPC
      const connection = solanaService.connection;
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) {
        return BaseResponse.error(
          res,
          'Transaction not found',
          404,
          'Transaction with this signature was not found',
          'TRANSACTION_NOT_FOUND'
        );
      }

      const result = {
        signature,
        slot: transaction.slot,
        blockTime: transaction.blockTime,
        confirmations: transaction.meta?.confirmations || 0,
        fee: transaction.meta?.fee,
        status: transaction.meta?.err ? 'failed' : 'success',
        explorerUrl: `https://explorer.solana.com/tx/${signature}${solanaService.getNetworkParam()}`,
        logs: transaction.meta?.logMessages || []
      };

      return BaseResponse.success(
        res,
        result,
        'Transaction information retrieved successfully'
      );

    } catch (error) {
      console.error('❌ Error getting transaction info:', error);
      
      return BaseResponse.error(
        res,
        'Failed to get transaction information',
        400,
        error.message,
        'TRANSACTION_INFO_FAILED'
      );
    }
  }

  /**
   * 🎯 Simple USDT send (prepare + complete in one step for testing)
   * POST /api/solana/usdt/send-simple
   */
  async sendUSDTSimple(req, res) {
    try {
      const { fromWallet, toWallet, amount, userPrivateKey } = req.body;
      const userId = req.user?.id;

      // Warning: This is for testing only - don't use private keys in production
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
        return BaseResponse.error(
          res,
          'Simple send not available in production',
          403,
          'This endpoint is for testing only',
          'PRODUCTION_RESTRICTED'
        );
      }

      if (!fromWallet || !toWallet || !amount || !userPrivateKey) {
        return BaseResponse.error(
          res,
          'Missing required fields',
          400,
          'fromWallet, toWallet, amount, and userPrivateKey are required',
          'MISSING_FIELDS'
        );
      }

      console.log('🎯 Simple USDT send (TEST MODE):', {
        fromWallet,
        toWallet,
        amount
      });

      // Prepare transaction
      const prepared = await solanaService.prepareUSDTTransfer(
        fromWallet,
        toWallet,
        parseFloat(amount),
        userId
      );

      // Simulate user signature (for testing only)
      const userSignature = {
        publicKey: fromWallet,
        signature: 'simulated_signature_for_testing'
      };

      // Complete transaction
      const completed = await solanaService.completeUSDTTransfer(
        prepared.transaction,
        userSignature,
        prepared.transactionId
      );

      return BaseResponse.success(
        res,
        {
          prepared,
          completed,
          warning: 'This is a test endpoint - not for production use'
        },
        'USDT sent successfully (TEST MODE)'
      );

    } catch (error) {
      console.error('❌ Error in simple USDT send:', error);
      
      return BaseResponse.error(
        res,
        'Failed to send USDT',
        400,
        error.message,
        'SIMPLE_SEND_FAILED'
      );
    }
  }
}

export default new SolanaController(); 