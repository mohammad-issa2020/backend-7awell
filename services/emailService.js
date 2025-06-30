import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      const config = {
        service: ENV.EMAIL_SERVICE,
        host: ENV.EMAIL_HOST,
        port: ENV.EMAIL_PORT,
        secure: ENV.EMAIL_SECURE,
        auth: {
          user: ENV.EMAIL_USER,
          pass: ENV.EMAIL_PASS
        }
      };

      // Remove undefined values
      Object.keys(config).forEach(key => {
        if (config[key] === undefined) {
          delete config[key];
        }
      });

      this.transporter = nodemailer.createTransport(config);

      logger.info('✅ Email service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send transaction success notification
   * @param {string} recipientEmail - Recipient email address
   * @param {Object} transactionData - Transaction details
   */
  async sendTransactionSuccessEmail(recipientEmail, transactionData) {
    try {
      const {
        transactionId,
        type,
        amount,
        assetSymbol,
        recipientAddress,
        reference,
        createdAt
      } = transactionData;

      const subject = '✅ Transaction Successful - 7awel Wallet';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Transaction Successful</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .transaction-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Transaction Successful!</h1>
            </div>
            <div class="content">
              <p>Your transaction has been completed successfully. Here are the details:</p>
              
              <div class="transaction-details">
                <div class="detail-row">
                  <span class="label">Transaction ID:</span>
                  <span class="value">${transactionId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Type:</span>
                  <span class="value">${type.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value">${amount} ${assetSymbol}</span>
                </div>
                ${recipientAddress ? `
                <div class="detail-row">
                  <span class="label">Recipient:</span>
                  <span class="value">${recipientAddress}</span>
                </div>
                ` : ''}
                ${reference ? `
                <div class="detail-row">
                  <span class="label">Reference:</span>
                  <span class="value">${reference}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Date:</span>
                  <span class="value">${new Date(createdAt).toLocaleString()}</span>
                </div>
              </div>
              
              <p>Your funds have been processed and are now available in your wallet.</p>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 7awel Wallet. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Transaction Successful!
        
        Your transaction has been completed successfully.
        
        Transaction Details:
        - Transaction ID: ${transactionId}
        - Type: ${type.toUpperCase()}
        - Amount: ${amount} ${assetSymbol}
        ${recipientAddress ? `- Recipient: ${recipientAddress}` : ''}
        ${reference ? `- Reference: ${reference}` : ''}
        - Date: ${new Date(createdAt).toLocaleString()}
        
        Your funds have been processed and are now available in your wallet.
        
        If you have any questions, please contact our support team.
      `;

      await this.sendEmail(recipientEmail, subject, text, html);
      logger.info(`✅ Transaction success email sent to ${recipientEmail} for transaction ${transactionId}`);
    } catch (error) {
      logger.error('❌ Failed to send transaction success email:', error);
      throw error;
    }
  }

  /**
   * Send transaction failure notification
   * @param {string} recipientEmail - Recipient email address
   * @param {Object} transactionData - Transaction details
   */
  async sendTransactionFailureEmail(recipientEmail, transactionData) {
    try {
      const {
        transactionId,
        type,
        amount,
        assetSymbol,
        recipientAddress,
        reference,
        createdAt,
        failureReason
      } = transactionData;

      const subject = '❌ Transaction Failed - 7awel Wallet';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Transaction Failed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .transaction-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f44336; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .error-icon { font-size: 48px; margin-bottom: 10px; }
            .action-section { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #ffeaa7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="error-icon">❌</div>
              <h1>Transaction Failed</h1>
            </div>
            <div class="content">
              <p>Unfortunately, your transaction could not be completed. Here are the details:</p>
              
              <div class="transaction-details">
                <div class="detail-row">
                  <span class="label">Transaction ID:</span>
                  <span class="value">${transactionId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Type:</span>
                  <span class="value">${type.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value">${amount} ${assetSymbol}</span>
                </div>
                ${recipientAddress ? `
                <div class="detail-row">
                  <span class="label">Recipient:</span>
                  <span class="value">${recipientAddress}</span>
                </div>
                ` : ''}
                ${reference ? `
                <div class="detail-row">
                  <span class="label">Reference:</span>
                  <span class="value">${reference}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Date:</span>
                  <span class="value">${new Date(createdAt).toLocaleString()}</span>
                </div>
                ${failureReason ? `
                <div class="detail-row">
                  <span class="label">Reason:</span>
                  <span class="value">${failureReason}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="action-section">
                <h3>What's Next?</h3>
                <ul>
                  <li>Your funds remain safely in your wallet</li>
                  <li>You can try the transaction again</li>
                  <li>Check your account balance and network connectivity</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
              
              <p>If you need assistance, please contact our support team with the transaction ID above.</p>
            </div>
            <div class="footer">
              <p>© 2024 7awel Wallet. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Transaction Failed
        
        Unfortunately, your transaction could not be completed.
        
        Transaction Details:
        - Transaction ID: ${transactionId}
        - Type: ${type.toUpperCase()}
        - Amount: ${amount} ${assetSymbol}
        ${recipientAddress ? `- Recipient: ${recipientAddress}` : ''}
        ${reference ? `- Reference: ${reference}` : ''}
        - Date: ${new Date(createdAt).toLocaleString()}
        ${failureReason ? `- Reason: ${failureReason}` : ''}
        
        What's Next?
        - Your funds remain safely in your wallet
        - You can try the transaction again
        - Check your account balance and network connectivity
        - Contact support if the issue persists
        
        If you need assistance, please contact our support team with the transaction ID above.
      `;

      await this.sendEmail(recipientEmail, subject, text, html);
      logger.info(`✅ Transaction failure email sent to ${recipientEmail} for transaction ${transactionId}`);
    } catch (error) {
      logger.error('❌ Failed to send transaction failure email:', error);
      throw error;
    }
  }

  /**
   * Send email using configured transporter
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} text - Plain text content
   * @param {string} html - HTML content
   */
  async sendEmail(to, subject, text, html) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      if (!ENV.EMAIL_FROM) {
        throw new Error('EMAIL_FROM environment variable not set');
      }

      const mailOptions = {
        from: ENV.EMAIL_FROM,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email sent successfully: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Verify email transporter configuration
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      logger.info('✅ Email service connection verified');
      return true;
    } catch (error) {
      logger.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new EmailService(); 