import TransactionService, { TRANSACTION_TYPES, TRANSACTION_STATUS } from '../services/transactionService.js';
import { createSuccessResponse, createErrorResponse } from '../utils/baseResponse.js';
import { z } from "zod";

// message error code add 
const transactionSchema = z.object({
  userId: z.string(),
  type: z.string(),
  amount: z.number(),
  assetSymbol: z.string(),
  assetName: z.string().optional(),
  network: z.string(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

class TransactionController {
  /**
   * Get user transactions with cursor-based pagination
   * GET /api/v1/transactions?cursor={cursor}&limit={limit}&type={type}&status={status}&assetSymbol={symbol}&network={network}&startDate={date}&endDate={date}&search={query}
   */
  async getTransactions(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const {
        cursor,
        limit = 20,
        type,
        status,
        assetSymbol,
        network,
        startDate,
        endDate,
        search
      } = req.query;

      // Validate limit parameter
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json(createErrorResponse(
          'Invalid limit parameter. Must be between 1 and 100',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Validate transaction type if provided
      if (type && !Object.values(TRANSACTION_TYPES).includes(type)) {
        return res.status(400).json(createErrorResponse(
          `Invalid transaction type. Must be one of: ${Object.values(TRANSACTION_TYPES).join(', ')}`,
          'INVALID_TRANSACTION_TYPE',
          400
        ));
      }

      // Validate status if provided
      if (status && !Object.values(TRANSACTION_STATUS).includes(status)) {
        return res.status(400).json(createErrorResponse(
          `Invalid transaction status. Must be one of: ${Object.values(TRANSACTION_STATUS).join(', ')}`,
          'INVALID_TRANSACTION_STATUS',
          400
        ));
      }

      // Validate date formats if provided
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json(createErrorResponse(
            'Invalid startDate format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)',
            'INVALID_DATE_FORMAT',
            400
          ));
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json(createErrorResponse(
            'Invalid endDate format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)',
            'INVALID_DATE_FORMAT',
            400
          ));
        }
      }

      // Validate date range
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
          return res.status(400).json(createErrorResponse(
            'endDate must be after startDate',
            'INVALID_DATE_RANGE',
            400
          ));
        }
      }

      // Get transactions from service
      const options = {
        cursor,
        limit: limitNum,
        type,
        status,
        assetSymbol,
        network,
        startDate,
        endDate,
        search
      };

      const result = await TransactionService.getTransactions(userId, options);

      console.log(`📊 User ${userId} retrieved ${result.transactions.length} transactions`);

      return res.json(createSuccessResponse(
        result,
        'Transactions retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getTransactions controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve transactions',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Get transaction by ID
   * GET /api/v1/transactions/{id}
   */
  async getTransactionById(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const { id: transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json(createErrorResponse(
          'Transaction ID is required',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(transactionId)) {
        return res.status(400).json(createErrorResponse(
          'Invalid transaction ID format',
          'INVALID_UUID_FORMAT',
          400
        ));
      }

      // Get transaction from service
      const transaction = await TransactionService.getTransactionById(userId, transactionId);

      console.log(`🔍 User ${userId} retrieved transaction ${transactionId}`);

      return res.json(createSuccessResponse(
        transaction,
        'Transaction retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getTransactionById controller:', error);

      if (error.message === 'Transaction not found') {
        return res.status(404).json(createErrorResponse(
          'Transaction not found',
          'TRANSACTION_NOT_FOUND',
          404
        ));
      }

      if (error.message === 'Invalid transaction ID format') {
        return res.status(400).json(createErrorResponse(
          'Invalid transaction ID format',
          'INVALID_UUID_FORMAT',
          400
        ));
      }

      return res.status(500).json(createErrorResponse(
        'Failed to retrieve transaction',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Get transaction statistics
   * GET /api/v1/transactions/stats?days={days}
   */
  async getTransactionStats(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const days = parseInt(req.query.days) || 30;

      if (days < 1 || days > 365) {
        return res.status(400).json(createErrorResponse(
          'Invalid days parameter. Must be between 1 and 365',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Get stats from service
      const stats = await TransactionService.getTransactionStats(userId, days);

      console.log(`📈 User ${userId} retrieved transaction stats for ${days} days`);

      return res.json(createSuccessResponse(
        {
          ...stats,
          period: {
            days,
            startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        },
        'Transaction statistics retrieved successfully'
      ));

    } catch (error) {
      console.error('Error in getTransactionStats controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve transaction statistics',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Create a new transaction (for testing or internal use)
   * POST /api/v1/transactions
   */
  async createTransaction(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const {
        type,
        amount,
        assetSymbol,
        assetName,
        network,
        fromAddress,
        toAddress,
        description,
        metadata = {}
      } = req.body;

      const transactionData = {
        userId,
        type,
        amount,
        assetSymbol,
        assetName,
        network,
        fromAddress,
        toAddress,
        description,
        metadata
      };

      // Zod validation add // error code 
      const parseResult = transactionSchema.safeParse(transactionData);
      
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map(e => e.message).join(', ');
        return res.status(400).json(createErrorResponse(
          `Validation failed: ${errors}`,
          'VALIDATION_ERROR',
          400
        ));
      }

      // Create transaction
      const transaction = await TransactionService.createTransaction(transactionData);

      console.log(`✅ User ${userId} created transaction ${transaction.id} (${type} ${amount} ${assetSymbol})`);

      return res.status(201).json(createSuccessResponse(
        transaction,
        'Transaction created successfully'
      ));

    } catch (error) {
      console.error('Error in createTransaction controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to create transaction',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Update transaction status (for internal use)
   * PATCH /api/v1/transactions/{id}/status
   */
  async updateTransactionStatus(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(createErrorResponse(
          'Authentication required',
          'UNAUTHORIZED',
          401
        ));
      }

      const { id: transactionId } = req.params;
      const { status, ...updateData } = req.body;

      if (!transactionId || !status) {
        return res.status(400).json(createErrorResponse(
          'Transaction ID and status are required',
          'INVALID_PARAMETER',
          400
        ));
      }

      // Validate status
      if (!Object.values(TRANSACTION_STATUS).includes(status)) {
        return res.status(400).json(createErrorResponse(
          `Invalid status. Must be one of: ${Object.values(TRANSACTION_STATUS).join(', ')}`,
          'INVALID_TRANSACTION_STATUS',
          400
        ));
      }

      // Update transaction
      const transaction = await TransactionService.updateTransactionStatus(
        userId,
        transactionId,
        status,
        updateData
      );

      console.log(`🔄 User ${userId} updated transaction ${transactionId} status to ${status}`);

      return res.json(createSuccessResponse(
        transaction,
        'Transaction status updated successfully'
      ));

    } catch (error) {
      console.error('Error in updateTransactionStatus controller:', error);

      if (error.message === 'Transaction not found or access denied') {
        return res.status(404).json(createErrorResponse(
          'Transaction not found',
          'TRANSACTION_NOT_FOUND',
          404
        ));
      }

      return res.status(500).json(createErrorResponse(
        'Failed to update transaction status',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }

  /**
   * Get transaction options (types, statuses, etc.)
   * GET /api/v1/transactions/options
   */
  async getTransactionOptions(req, res) {
    try {
      const options = TransactionService.getTransactionOptions();

      return res.json(createSuccessResponse(
        options,
        'Transaction options retrieved successfully'
      ));
    } catch (error) {
      console.error('Error in getTransactionOptions controller:', error);
      return res.status(500).json(createErrorResponse(
        'Failed to retrieve transaction options',
        'INTERNAL_SERVER_ERROR',
        500,
        error.message
      ));
    }
  }
}

export default new TransactionController(); 