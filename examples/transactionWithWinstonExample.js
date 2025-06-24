/**
 * مثال عملي على كيفية استخدام Winston في تسجيل المعاملات
 * Practical example of using Winston for transaction logging
 * 
 * هذا المثال يوضح كيفية استخدام Winston في تسجيل جميع مراحل إنشاء المعاملة
 * This example shows how to use Winston to log all stages of transaction creation
 */

import logger from '../utils/logger.js';
import TransactionService from '../services/transactionService.js';

// مثال على إنشاء معاملة مع تسجيل شامل
// Example of creating a transaction with comprehensive logging
async function createTransactionWithLogging(req, res) {
  const startTime = Date.now();
  const userId = req.user?.id;
  const transactionData = req.body;

  try {
    // 1. تسجيل بداية العملية
    // Log the start of the operation
    logger.logTransaction('بدء عملية إنشاء معاملة جديدة', 'info', {
      userId,
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // 2. تسجيل البيانات المستلمة (مع إخفاء البيانات الحساسة)
    // Log received data (with sensitive data masked)
    logger.logTransaction('بيانات المعاملة المستلمة', 'debug', {
      userId,
      transactionType: transactionData.type,
      amount: transactionData.amount,
      assetSymbol: transactionData.assetSymbol,
      network: transactionData.network,
      // إخفاء العناوين الحساسة
      // Mask sensitive addresses
      fromAddress: transactionData.fromAddress ? '***' + transactionData.fromAddress.slice(-4) : null,
      toAddress: transactionData.toAddress ? '***' + transactionData.toAddress.slice(-4) : null
    });

    // 3. تسجيل التحقق من صحة البيانات
    // Log data validation
    if (!transactionData.type || !transactionData.amount) {
      logger.logTransaction('فشل في التحقق من صحة البيانات', 'warn', {
        userId,
        missingFields: {
          type: !transactionData.type,
          amount: !transactionData.amount
        },
        ip: req.ip
      });
      throw new Error('بيانات المعاملة غير مكتملة');
    }

    logger.logTransaction('تم التحقق من صحة البيانات بنجاح', 'info', {
      userId,
      validatedFields: ['type', 'amount', 'assetSymbol', 'network']
    });

    // 4. تسجيل محاولة إنشاء المعاملة
    // Log transaction creation attempt
    logger.logTransaction('محاولة إنشاء المعاملة في قاعدة البيانات', 'info', {
      userId,
      transactionType: transactionData.type,
      amount: transactionData.amount,
      assetSymbol: transactionData.assetSymbol
    });

    // إنشاء المعاملة
    // Create the transaction
    const transaction = await TransactionService.createTransaction({
      userId,
      ...transactionData
    });

    // 5. تسجيل نجاح إنشاء المعاملة
    // Log successful transaction creation
    logger.logTransaction('تم إنشاء المعاملة بنجاح', 'info', {
      userId,
      transactionId: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      executionTime: Date.now() - startTime + 'ms'
    });

    // 6. تسجيل إجراء المستخدم
    // Log user action
    logger.logUserAction(userId, 'create_transaction', {
      transactionId: transaction.id,
      transactionType: transaction.type,
      amount: `${transaction.amount} ${transaction.asset_symbol}`,
      network: transactionData.network,
      success: true,
      executionTime: Date.now() - startTime + 'ms',
      ip: req.ip
    });

    // 7. تسجيل الأمان (للمعاملات الكبيرة)
    // Security logging (for large transactions)
    if (transaction.amount > 10000) {
      logger.logSecurity('معاملة كبيرة تم إنشاؤها', 'info', {
        userId,
        transactionId: transaction.id,
        amount: transaction.amount,
        assetSymbol: transaction.asset_symbol,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requiresReview: true
      });
    }

    return {
      success: true,
      data: transaction,
      message: 'تم إنشاء المعاملة بنجاح'
    };

  } catch (error) {
    // 8. تسجيل الأخطاء بشكل مفصل
    // Detailed error logging
    logger.logError('فشل في إنشاء المعاملة', error, {
      userId,
      transactionData: {
        type: transactionData?.type,
        amount: transactionData?.amount,
        assetSymbol: transactionData?.assetSymbol,
        network: transactionData?.network
      },
      requestInfo: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      },
      errorDetails: {
        message: error.message,
        stack: error.stack,
        executionTime: Date.now() - startTime + 'ms'
      }
    });

    // تسجيل إجراء المستخدم الفاشل
    // Log failed user action
    logger.logUserAction(userId, 'create_transaction_failed', {
      errorType: error.name,
      errorMessage: error.message,
      transactionType: transactionData?.type,
      amount: transactionData?.amount,
      executionTime: Date.now() - startTime + 'ms',
      ip: req.ip
    });

    throw error;
  }
}

// مثال على الاستعلام عن المعاملات مع التسجيل
// Example of querying transactions with logging
async function getTransactionsWithLogging(req, res) {
  const startTime = Date.now();
  const userId = req.user?.id;

  try {
    // تسجيل بداية الاستعلام
    // Log query start
    logger.logTransaction('بدء استعلام المعاملات', 'info', {
      userId,
      queryParams: req.query,
      ip: req.ip
    });

    const transactions = await TransactionService.getTransactions(userId, req.query);

    // تسجيل نجاح الاستعلام
    // Log successful query
    logger.logTransaction('تم استرداد المعاملات بنجاح', 'info', {
      userId,
      transactionCount: transactions.transactions.length,
      hasMore: transactions.pagination.hasMore,
      executionTime: Date.now() - startTime + 'ms'
    });

    // تسجيل الأداء (إذا كان الاستعلام بطيء)
    // Performance logging (if query is slow)
    const executionTime = Date.now() - startTime;
    if (executionTime > 5000) { // أكثر من 5 ثواني
      logger.logPerformance('استعلام المعاملات بطيء', {
        userId,
        executionTime: executionTime + 'ms',
        queryParams: req.query,
        resultCount: transactions.transactions.length,
        needsOptimization: true
      });
    }

    return transactions;

  } catch (error) {
    logger.logError('فشل في استرداد المعاملات', error, {
      userId,
      queryParams: req.query,
      executionTime: Date.now() - startTime + 'ms',
      ip: req.ip
    });
    throw error;
  }
}

// مثال على تحديث حالة المعاملة مع التسجيل
// Example of updating transaction status with logging
async function updateTransactionStatusWithLogging(userId, transactionId, newStatus, updateData = {}) {
  try {
    // تسجيل محاولة التحديث
    // Log update attempt
    logger.logTransaction('محاولة تحديث حالة المعاملة', 'info', {
      userId,
      transactionId,
      newStatus,
      updateData: Object.keys(updateData)
    });

    const updatedTransaction = await TransactionService.updateTransactionStatus(
      userId, 
      transactionId, 
      newStatus, 
      updateData
    );

    // تسجيل نجاح التحديث
    // Log successful update
    logger.logTransaction('تم تحديث حالة المعاملة بنجاح', 'info', {
      userId,
      transactionId,
      oldStatus: updateData.oldStatus,
      newStatus,
      reference: updatedTransaction.reference
    });

    // تسجيل أمان للحالات الحرجة
    // Security logging for critical status changes
    if (newStatus === 'failed' || newStatus === 'cancelled') {
      logger.logSecurity('تغيير حالة معاملة إلى حالة حرجة', 'warning', {
        userId,
        transactionId,
        newStatus,
        reason: updateData.errorReason || 'لم يتم تحديد السبب',
        requiresInvestigation: true
      });
    }

    return updatedTransaction;

  } catch (error) {
    logger.logError('فشل في تحديث حالة المعاملة', error, {
      userId,
      transactionId,
      attemptedStatus: newStatus,
      updateData
    });
    throw error;
  }
}

export {
  createTransactionWithLogging,
  getTransactionsWithLogging,
  updateTransactionStatusWithLogging
};

/**
 * ملخص استخدام Winston في المعاملات:
 * Summary of Winston usage in transactions:
 * 
 * 1. logger.logTransaction() - لتسجيل أحداث المعاملات
 *    For logging transaction events
 * 
 * 2. logger.logUserAction() - لتسجيل إجراءات المستخدم
 *    For logging user actions
 * 
 * 3. logger.logSecurity() - لتسجيل الأحداث الأمنية
 *    For logging security events
 * 
 * 4. logger.logError() - لتسجيل الأخطاء
 *    For logging errors
 * 
 * 5. logger.logPerformance() - لتسجيل الأداء
 *    For logging performance metrics
 * 
 * 6. logger.logDatabase() - لتسجيل عمليات قاعدة البيانات
 *    For logging database operations
 * 
 * جميع هذه الطرق تقوم بالتسجيل في:
 * All these methods log to:
 * - ملفات منفصلة (transactions.log, security.log, etc.)
 *   Separate files (transactions.log, security.log, etc.)
 * - قاعدة البيانات (جدول activity_logs)
 *   Database (activity_logs table)
 */ 