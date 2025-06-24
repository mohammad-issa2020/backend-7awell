import logger from '../utils/logger.js';
import { supabase } from '../database/supabase.js';

/**
 * Example service showing Winston logging integration
 */
class ExampleService {
  
  /**
   * Example user registration with comprehensive logging
   */
  static async registerUser(userData, req) {
    const startTime = Date.now();
    
    try {
      // Log the start of registration process
      logger.info('User registration started', {
        email: userData.email,
        category: 'user_management'
      });

      // Validate user data
      if (!userData.email || !userData.password) {
        logger.logSecurity(null, 'Registration attempt with missing data', 'medium', {
          missingFields: {
            email: !userData.email,
            password: !userData.password
          }
        }, req);
        throw new Error('Email and password are required');
      }

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.logError(checkError, {
          operation: 'check_existing_user',
          email: userData.email
        }, null, req);
        throw new Error('Database error during user check');
      }

      if (existingUser) {
        logger.logAuth(null, 'Registration failed - user already exists', false, req, {
          email: userData.email,
          existingUserId: existingUser.id
        });
        throw new Error('User already exists');
      }

      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          password_hash: userData.password, // In real app, hash this first
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        logger.logError(createError, {
          operation: 'create_user',
          email: userData.email
        }, null, req);
        throw new Error('Failed to create user');
      }

      // Log successful registration
      const duration = Date.now() - startTime;
      logger.logAuth(newUser.id, 'User registration successful', true, req, {
        email: userData.email,
        registrationMethod: 'email'
      });

      logger.logUserAction(newUser.id, 'Account created successfully', {
        registrationSource: req.get('User-Agent'),
        emailDomain: userData.email.split('@')[1]
      }, req);

      // Log performance if registration took too long
      logger.logPerformance('User registration', duration, {
        success: true,
        userId: newUser.id
      }, newUser.id);

      // Log database operation
      logger.logDatabase('INSERT', 'users', true, {
        recordId: newUser.id,
        operation: 'user_registration'
      }, newUser.id);

      logger.info('User registration completed successfully', {
        userId: newUser.id,
        email: userData.email,
        duration: `${duration}ms`,
        category: 'user_management'
      });

      return newUser;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the error with full context
      logger.logError(error, {
        operation: 'user_registration',
        email: userData.email,
        duration: `${duration}ms`,
        requestData: {
          hasEmail: !!userData.email,
          hasPassword: !!userData.password,
          userAgent: req?.get('User-Agent')
        }
      }, null, req);

      throw error;
    }
  }

  /**
   * Example transaction processing with logging
   */
  static async processTransaction(transactionData, userId, req) {
    const startTime = Date.now();
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.logUserAction(userId, 'Transaction processing started', {
        transactionId,
        amount: transactionData.amount,
        currency: transactionData.currency,
        type: transactionData.type
      }, req);

      // Validate transaction
      if (!transactionData.amount || transactionData.amount <= 0) {
        logger.logSecurity(userId, 'Invalid transaction amount attempted', 'medium', {
          attemptedAmount: transactionData.amount,
          transactionId
        }, req);
        throw new Error('Invalid transaction amount');
      }

      // Check user balance (example)
      const { data: userWallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError) {
        logger.logError(walletError, {
          operation: 'fetch_user_wallet',
          userId,
          transactionId
        }, userId, req);
        throw new Error('Failed to fetch wallet information');
      }

      if (userWallet.balance < transactionData.amount) {
        logger.logTransaction(userId, 'Transaction failed - insufficient funds', {
          requiredAmount: transactionData.amount,
          availableBalance: userWallet.balance,
          transactionId,
          currency: transactionData.currency
        }, req);
        throw new Error('Insufficient funds');
      }

      // Process the transaction (example)
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert([{
          id: transactionId,
          user_id: userId,
          amount: transactionData.amount,
          currency: transactionData.currency,
          type: transactionData.type,
          status: 'completed',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (txError) {
        logger.logError(txError, {
          operation: 'create_transaction',
          transactionId,
          userId
        }, userId, req);
        throw new Error('Failed to process transaction');
      }

      // Log successful transaction
      const duration = Date.now() - startTime;
      logger.logTransaction(userId, 'Transaction completed successfully', {
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        duration: `${duration}ms`
      }, req);

      // Log performance metrics
      logger.logPerformance('Transaction processing', duration, {
        transactionType: transaction.type,
        amount: transaction.amount,
        success: true
      }, userId);

      // Log database operations
      logger.logDatabase('INSERT', 'transactions', true, {
        recordId: transaction.id,
        operation: 'process_transaction'
      }, userId);

      return transaction;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logError(error, {
        operation: 'process_transaction',
        transactionId,
        userId,
        duration: `${duration}ms`,
        transactionData: {
          amount: transactionData.amount,
          currency: transactionData.currency,
          type: transactionData.type
        }
      }, userId, req);

      throw error;
    }
  }

  /**
   * Example security monitoring
   */
  static async monitorSecurityEvent(eventType, userId, details, req) {
    try {
      // Determine severity based on event type
      let severity = 'low';
      if (['unauthorized_access', 'brute_force', 'suspicious_login'].includes(eventType)) {
        severity = 'high';
      } else if (['rate_limit_exceeded', 'invalid_token'].includes(eventType)) {
        severity = 'medium';
      }

      // Log security event
      logger.logSecurity(userId, `Security event: ${eventType}`, severity, {
        eventType,
        details,
        timestamp: new Date().toISOString(),
        riskScore: this.calculateRiskScore(eventType, details)
      }, req);

      // For critical events, also log to database immediately
      if (severity === 'high') {
        await supabase
          .from('security_events')
          .insert([{
            user_id: userId,
            event_type: eventType,
            severity,
            details,
            ip_address: req?.ip,
            user_agent: req?.get('User-Agent'),
            created_at: new Date().toISOString()
          }]);

        logger.logDatabase('INSERT', 'security_events', true, {
          eventType,
          severity,
          userId
        }, userId);
      }

    } catch (error) {
      logger.logError(error, {
        operation: 'monitor_security_event',
        eventType,
        userId
      }, userId, req);
    }
  }

  /**
   * Example method showing different logging patterns
   */
  static async complexOperation(operationData, userId, req) {
    // Start timing
    const operationStart = Date.now();
    
    // Log operation start
    logger.debug('Starting complex operation', {
      operationType: operationData.type,
      userId,
      category: 'business_logic'
    });

    try {
      // Step 1: Data validation
      const validationStart = Date.now();
      this.validateOperationData(operationData);
      const validationDuration = Date.now() - validationStart;
      
      logger.debug('Data validation completed', {
        duration: validationDuration,
        userId,
        category: 'validation'
      });

      // Step 2: Database operations
      const dbStart = Date.now();
      const dbResult = await this.performDatabaseOperations(operationData, userId);
      const dbDuration = Date.now() - dbStart;
      
      logger.logDatabase('COMPLEX_QUERY', 'multiple_tables', true, {
        duration: dbDuration,
        recordsAffected: dbResult.count
      }, userId);

      // Step 3: External API calls (example)
      const apiStart = Date.now();
      const apiResult = await this.callExternalAPI(operationData);
      const apiDuration = Date.now() - apiStart;
      
      logger.info('External API call completed', {
        apiEndpoint: operationData.apiEndpoint,
        duration: apiDuration,
        statusCode: apiResult.status,
        userId,
        category: 'external_api'
      });

      // Log final success
      const totalDuration = Date.now() - operationStart;
      logger.logUserAction(userId, 'Complex operation completed successfully', {
        operationType: operationData.type,
        totalDuration,
        steps: {
          validation: validationDuration,
          database: dbDuration,
          externalApi: apiDuration
        }
      }, req);

      // Performance monitoring
      if (totalDuration > 5000) {
        logger.logPerformance('Complex operation - slow execution', totalDuration, {
          operationType: operationData.type,
          bottleneck: this.identifyBottleneck({
            validation: validationDuration,
            database: dbDuration,
            externalApi: apiDuration
          })
        }, userId);
      }

      return {
        success: true,
        data: { dbResult, apiResult },
        duration: totalDuration
      };

    } catch (error) {
      const totalDuration = Date.now() - operationStart;
      
      logger.logError(error, {
        operation: 'complex_operation',
        operationType: operationData.type,
        duration: totalDuration,
        userId,
        step: this.identifyFailureStep(error)
      }, userId, req);

      throw error;
    }
  }

  // Helper methods for the example
  static validateOperationData(data) {
    if (!data.type) throw new Error('Operation type is required');
    // Add more validation...
  }

  static async performDatabaseOperations(data, userId) {
    // Simulate database operations
    return { count: 5, success: true };
  }

  static async callExternalAPI(data) {
    // Simulate API call
    return { status: 200, data: { success: true } };
  }

  static calculateRiskScore(eventType, details) {
    // Simple risk scoring example
    const baseScores = {
      'unauthorized_access': 80,
      'brute_force': 90,
      'suspicious_login': 70,
      'rate_limit_exceeded': 40,
      'invalid_token': 30
    };
    return baseScores[eventType] || 10;
  }

  static identifyBottleneck(timings) {
    const max = Math.max(...Object.values(timings));
    return Object.keys(timings).find(key => timings[key] === max);
  }

  static identifyFailureStep(error) {
    // Simple step identification based on error message
    if (error.message.includes('validation')) return 'validation';
    if (error.message.includes('database')) return 'database';
    if (error.message.includes('API')) return 'external_api';
    return 'unknown';
  }
}

export default ExampleService; 