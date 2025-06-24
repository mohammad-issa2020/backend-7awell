import { supabase } from '../database/supabase.js';
import logger from '../utils/logger.js';

// Transaction types mapping - matching database enum
const TRANSACTION_TYPES = {
  TRANSFER: 'transfer',
  PAYMENT: 'payment', 
  CASH_OUT: 'cash_out',
  CASH_IN: 'cash_in',
  EXCHANGE: 'exchange'
};

// Transaction status mapping - matching database enum
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Asset types
const ASSET_TYPES = {
  CRYPTOCURRENCY: 'cryptocurrency',
  TOKEN: 'token',
  NFT: 'nft',
  FIAT: 'fiat'
};

class TransactionService {
  /**
   * Get user transactions with cursor-based pagination
   * @param {string} userId - Supabase User UUID (already cleaned from middleware)
   * @param {Object} options - Query options
   * @returns {Object} Paginated transactions
   */
  static async getTransactions(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const {
        cursor = null,
        limit = 20,
        type = null,
        status = null,
        assetSymbol = null,
        network = null,
        startDate = null,
        endDate = null,
        search = null
      } = options;

      // Validate limit
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

      // Validate transaction type if provided
      if (type && !Object.values(TRANSACTION_TYPES).includes(type)) {
        throw new Error(`Invalid transaction type: ${type}`);
      }

      // Validate status if provided
      if (status && !Object.values(TRANSACTION_STATUS).includes(status)) {
        throw new Error(`Invalid transaction status: ${status}`);
      }

      // Parse dates if provided
      let parsedStartDate = null, parsedEndDate = null;
      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          throw new Error('Invalid start date format');
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          throw new Error('Invalid end date format');
        }
      }

      // Calculate offset for cursor-based pagination
      let offset = 0;
      if (cursor) {
        // For now, treat cursor as offset (can be improved for true cursor pagination)
        offset = parseInt(cursor, 10) || 0;
      }

      console.log('📊 Querying transactions directly with:', {
        userId,
        status,
        type,
        limit: limitNum,
        offset
      });

      // Query transactions table directly since the function doesn't exist
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('type', type);
      }

      // Apply pagination
      query = query.range(offset, offset + limitNum - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Database error in getTransactions:', error);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      let transactions = data || [];
      
      console.log(`📋 Retrieved ${transactions.length} transactions from database`);

      // Client-side filtering for additional parameters not supported by the DB function
      if (assetSymbol) {
        transactions = transactions.filter(tx => 
          tx.asset_symbol && tx.asset_symbol.toLowerCase() === assetSymbol.toLowerCase()
        );
      }

      if (search) {
        const searchLower = search.toLowerCase();
        transactions = transactions.filter(tx => 
          (tx.reference && tx.reference.toLowerCase().includes(searchLower)) ||
          (tx.note && tx.note.toLowerCase().includes(searchLower)) ||
          (tx.asset_symbol && tx.asset_symbol.toLowerCase().includes(searchLower))
        );
      }

      if (parsedStartDate) {
        transactions = transactions.filter(tx => 
          new Date(tx.created_at) >= parsedStartDate
        );
      }

      if (parsedEndDate) {
        transactions = transactions.filter(tx => 
          new Date(tx.created_at) <= parsedEndDate
        );
      }

      // Determine if there are more results
      const hasMore = transactions.length === limitNum;
      const nextCursor = hasMore ? (offset + limitNum).toString() : null;

      console.log(`✅ Returning ${transactions.length} transactions with hasMore: ${hasMore}`);

      return {
        transactions,
        pagination: {
          limit: limitNum,
          cursor,
          nextCursor,
          hasMore
        },
        filters: {
          type,
          status,
          assetSymbol,
          network,
          startDate,
          endDate,
          search
        },
        totalCount: transactions.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('TransactionService error in getTransactions:', error);
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction by ID
   * @param {string} userId - Supabase User UUID
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Transaction details
   */
  static async getTransactionById(userId, transactionId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate transaction ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(transactionId)) {
        throw new Error('Invalid transaction ID format');
      }

      // Query transaction directly with proper user validation using existing columns
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          reference,
          sender_id,
          recipient_id,
          type,
          status,
          amount,
          asset_symbol,
          fee,
          exchange_rate,
          note,
          metadata,
          created_at,
          updated_at,
          completed_at
        `)
        .eq('id', transactionId)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          throw new Error('Transaction not found');
        }
        console.error('Database error in getTransactionById:', error);
        throw new Error(`Failed to fetch transaction: ${error.message}`);
      }

      if (!data) {
        throw new Error('Transaction not found');
      }

      const transaction = data;

      // Extract additional data from metadata
      const metadata = transaction.metadata || {};
      
      // Calculate additional derived fields
      const totalFees = parseFloat(transaction.fee || 0);

      const isConfirmed = transaction.status === TRANSACTION_STATUS.CONFIRMED;
      const isPending = transaction.status === TRANSACTION_STATUS.PENDING;

      // Determine direction
      const direction = transaction.sender_id === userId ? 'sent' : 'received';

      // Enrich transaction with computed fields and metadata
      const enrichedTransaction = {
        ...transaction,
        // Extract from metadata
        asset_name: metadata.asset_name || transaction.asset_symbol,
        network: metadata.network,
        from_address: metadata.from_address,
        to_address: metadata.to_address,
        description: metadata.description || transaction.note,
        // Computed fields
        direction,
        totalFeesUsd: totalFees,
        isConfirmed,
        isPending,
        timeSinceInitiated: this.calculateTimeDifference(transaction.created_at),
        timeToConfirmation: transaction.completed_at ? 
          this.calculateTimeDifference(transaction.created_at, transaction.completed_at) : null,
        // Status updates from metadata
        status_updates: metadata.status_updates || {}
      };

      console.log(`🔍 Retrieved transaction ${transactionId} for user ${userId}: ${direction}`);

      return enrichedTransaction;

    } catch (error) {
      console.error('TransactionService error in getTransactionById:', error);
      throw error; // Re-throw to preserve the original error message
    }
  }

  /**
   * Get transaction statistics for user
   * @param {string} userId - Supabase User UUID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Transaction statistics
   */
  static async getTransactionStats(userId, days = 30) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase.rpc('get_user_transaction_stats', {
        p_user_id: userId,
        p_days: days
      });

      if (error) {
        console.error('Database error in getTransactionStats:', error);
        throw new Error(`Failed to fetch transaction stats: ${error.message}`);
      }

      return data && data.length > 0 ? data[0] : {
        total_transactions: 0,
        total_sent: 0,
        total_received: 0,
        total_fees: 0,
        transactions_by_type: {},
        transactions_by_status: {},
        transactions_by_asset: {},
        avg_transaction_amount: 0,
        pending_transactions: 0,
        failed_transactions: 0
      };

    } catch (error) {
      console.error('TransactionService error in getTransactionStats:', error);
      throw new Error(`Failed to get transaction statistics: ${error.message}`);
    }
  }


  static async createTransaction(transactionData) {
    try {
      const {
        userId,
        type,
        amount,
        assetSymbol,
        assetName,
        network,
        fromAddress = null,
        toAddress = null,
        description = null,
        metadata = {}
      } = transactionData;

      if (!userId) {
        logger.warn('Transaction creation failed: User ID missing', {
          transactionData: { ...transactionData, userId: '[REDACTED]' }
        });
        throw new Error('User ID is required');
      }

      // Validate required fields
      if (!userId || !type || !amount || !assetSymbol || !network) {
        logger.warn('Transaction creation failed: Missing required fields', {
          userId,
          missingFields: {
            userId: !userId,
            type: !type,
            amount: !amount,
            assetSymbol: !assetSymbol,
            network: !network
          }
        });
        throw new Error('Missing required transaction fields');
      }

      // Validate transaction type
      if (!Object.values(TRANSACTION_TYPES).includes(type)) {
        logger.warn('Transaction creation failed: Invalid transaction type', {
          userId,
          providedType: type,
          validTypes: Object.values(TRANSACTION_TYPES)
        });
        throw new Error(`Invalid transaction type: ${type}`);
      }

      // Log transaction processing start
      logger.logTransaction('Processing transaction creation', 'info', {
        userId,
        type,
        amount,
        assetSymbol,
        network,
        description
      });

      // Generate reference manually
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const prefix = this.getTransactionPrefix(type);
      const reference = `${prefix}${timestamp.slice(-10)}${random}`;

      // Prepare transaction data using only existing database columns
      const transaction = {
        reference,
        sender_id: userId, // Use sender_id for user transactions
        type,
        amount: parseFloat(amount),
        asset_symbol: assetSymbol.toUpperCase(),
        fee: 0, // Default fee
        note: description || `${type} transaction for ${amount} ${assetSymbol}`,
        metadata: {
          ...metadata,
          // Store additional data in metadata since columns don't exist
          asset_name: assetName || assetSymbol,
          network: network.toLowerCase(),
          from_address: fromAddress,
          to_address: toAddress,
          description,
          created_by: 'api',
          source: 'transaction_service'
        },
        status: TRANSACTION_STATUS.PENDING
      };

      // Log database insertion attempt
      logger.logDatabase('Inserting transaction into database', 'info', {
        userId,
        reference,
        type,
        amount: parseFloat(amount),
        assetSymbol: assetSymbol.toUpperCase()
      });

      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) {
        logger.logError('Database error in createTransaction', error, {
          userId,
          transactionData: transaction,
          databaseError: error.message
        });
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      // Log successful database insertion
      logger.logTransaction('Transaction successfully inserted into database', 'info', {
        userId,
        transactionId: data.id,
        reference: data.reference,
        type: data.type,
        amount: data.amount,
        status: data.status
      });

      // Log transaction creation to activity system
      await this.logTransactionActivity(userId, 'transaction_created', {
        transactionId: data.id,
        type,
        amount,
        assetSymbol,
        network
      });

      // Log final success
      logger.logTransaction('Transaction creation completed successfully', 'info', {
        userId,
        transactionId: data.id,
        reference: data.reference,
        executionTime: Date.now() - parseInt(timestamp)
      });

      return data;

    } catch (error) {
      logger.logError('TransactionService error in createTransaction', error, {
        userId: transactionData?.userId,
        transactionType: transactionData?.type,
        amount: transactionData?.amount,
        assetSymbol: transactionData?.assetSymbol,
        errorMessage: error.message,
        stackTrace: error.stack
      });
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction prefix based on type
   * @param {string} type - Transaction type
   * @returns {string} Prefix for reference
   */
  static getTransactionPrefix(type) {
    const prefixMap = {
      transfer: 'TXF',
      payment: 'PAY',
      cash_out: 'OUT',
      cash_in: 'CIN',
      exchange: 'EXC',
      send: 'SND',
      receive: 'RCV',
      buy: 'BUY',
      sell: 'SEL',
      swap: 'SWP',
      stake: 'STK',
      unstake: 'UST',
      reward: 'RWD',
      fee: 'FEE',
      deposit: 'DEP',
      withdrawal: 'WTH'
    };
    
    return prefixMap[type] || 'TXN';
  }

  static async updateTransactionStatus(userId, transactionId, status, updateData = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate status
      if (!Object.values(TRANSACTION_STATUS).includes(status)) {
        throw new Error(`Invalid transaction status: ${status}`);
      }

      // Get current metadata to preserve existing data
      const { data: currentTx } = await supabase
        .from('transactions')
        .select('metadata')
        .eq('id', transactionId)
        .eq('sender_id', userId)
        .single();

      const currentMetadata = currentTx?.metadata || {};
      
      // Prepare updates - only use columns that exist in the database
      const updates = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add status-specific fields using existing columns only
      if (status === TRANSACTION_STATUS.COMPLETED) {
        updates.completed_at = new Date().toISOString();
      }

      // Store all additional data in metadata (including txHash, blockNumber, errorCode, etc.)
      const statusUpdateData = {
        timestamp: new Date().toISOString(),
        ...updateData // This includes txHash, blockNumber, errorCode, errorReason, etc.
      };

      updates.metadata = {
        ...currentMetadata,
        status_updates: {
          ...currentMetadata.status_updates,
          [status]: statusUpdateData
        }
      };

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .eq('sender_id', userId) // Ensure user owns the transaction
        .select()
        .single();

      if (error) {
        console.error('Database error in updateTransactionStatus:', error);
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      if (!data) {
        throw new Error('Transaction not found or access denied');
      }

      // Log status change to activity system
      await this.logTransactionActivity(userId, 'transaction_status_updated', {
        transactionId,
        oldStatus: updateData.oldStatus,
        newStatus: status
      });

      return data;

    } catch (error) {
      console.error('TransactionService error in updateTransactionStatus:', error);
      throw new Error(`Failed to update transaction status: ${error.message}`);
    }
  }


  static getTransactionOptions() {
    return {
      types: Object.values(TRANSACTION_TYPES),
      statuses: Object.values(TRANSACTION_STATUS),
      assetTypes: Object.values(ASSET_TYPES),
      supportedNetworks: [
        'ethereum',
        'bitcoin',
        'polygon',
        'binance-smart-chain',
        'avalanche',
        'solana',
        'cardano',
        'polkadot'
      ],
      maxLimit: 100,
      defaultLimit: 20
    };
  }


  static calculateTimeDifference(startTime, endTime = null) {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return { value: 'Just now', ms: diffMs };
    } else if (diffMinutes < 60) {
      return { value: `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`, ms: diffMs };
    } else if (diffHours < 24) {
      return { value: `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`, ms: diffMs };
    } else {
      return { value: `${diffDays} day${diffDays > 1 ? 's' : ''} ago`, ms: diffMs };
    }
  }


  static async logTransactionActivity(userId, action, details) {
    try {
      // Log to activity_logs table directly with correct column names only
      const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          action: action,
          details: details,
          ip_address: null,
          device_id: null
        }]);

      if (error) {
        console.warn('Failed to log transaction activity:', error);
      }
    } catch (error) {
      console.warn('Error logging transaction activity:', error);
      // Don't throw - this is supplementary logging
    }
  }

  static validateTransactionData(transactionData) {
    const errors = [];
    const {
      type,
      amount,
      assetSymbol,
      network,
      fromAddress,
      toAddress
    } = transactionData;

    // Validate type
    if (!type || !Object.values(TRANSACTION_TYPES).includes(type)) {
      errors.push('Invalid or missing transaction type. Valid types: ' + Object.values(TRANSACTION_TYPES).join(', '));
    }

    // Validate amount - be more lenient 
    if (!amount) {
      errors.push('Amount is required');
    } else {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push('Amount must be a positive number');
      }
    }

    // Validate asset symbol - be more lenient
    if (!assetSymbol) {
      errors.push('Asset symbol is required');
    } else if (typeof assetSymbol !== 'string' || assetSymbol.length > 20 || assetSymbol.length < 1) {
      errors.push('Asset symbol must be 1-20 characters');
    }

    // Validate network - be more lenient
    if (!network) {
      errors.push('Network is required');
    } else if (typeof network !== 'string' || network.length > 50 || network.length < 1) {
      errors.push('Network must be 1-50 characters');
    }

    // Validate addresses for transfer transactions - but make it optional for testing
    if (type === TRANSACTION_TYPES.TRANSFER) {
      if (fromAddress && typeof fromAddress !== 'string') {
        errors.push('From address must be a string');
      }
      if (toAddress && typeof toAddress !== 'string') {
        errors.push('To address must be a string');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default TransactionService;
export { TRANSACTION_TYPES, TRANSACTION_STATUS, ASSET_TYPES }; 