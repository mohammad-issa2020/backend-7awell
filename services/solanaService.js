import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';

class SolanaService {
  constructor() {
    // 🌐 connect  solana network
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // 💰 main wallet
    this.initializeFeePayerWallet();

    // 🪙 address USDT in Solana (Tether USD)
    this.usdtMintAddress = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

    // 📊 Settings and fee
    this.maxUSDTPerTransaction = parseFloat(process.env.MAX_USDT_PER_TX || '10000');
    this.minSOLBalance = parseFloat(process.env.MIN_SOL_BALANCE || '0.1');

    console.log('🚀 Solana Service initialized', {
      network: process.env.SOLANA_NETWORK || 'mainnet',
      feePayerAddress: this.feePayerWallet?.publicKey?.toString(),
      maxUSDTPerTx: this.maxUSDTPerTransaction
    });
  }

  /**
   * Initialize fee payment wallet
   */
  initializeFeePayerWallet() {
    try {
      if (!process.env.SOLANA_FEE_PAYER_PRIVATE_KEY) {
        console.warn('⚠️ SOLANA_FEE_PAYER_PRIVATE_KEY not set - using demo mode');
        // Create a test development wallet
        this.feePayerWallet = Keypair.generate();
        this.isDemoMode = true;
        return;
      }

      const privateKeyArray = JSON.parse(process.env.SOLANA_FEE_PAYER_PRIVATE_KEY);
      this.feePayerWallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      this.isDemoMode = false;

      console.log('✅ Fee payer wallet loaded:', this.feePayerWallet.publicKey.toString());
    } catch (error) {
      console.error('❌ Error loading fee payer wallet:', error);
      throw new Error('Failed to initialize Solana fee payer wallet');
    }
  }

  /**
   * 💸 Send USDT with fee payment from your main wallet
   * @param {string} fromUserWallet - Sender wallet address
   * @param {string} toUserWallet - Receiver wallet address
   * @param {number} amount - Amount in USDT
   * @param {string} userId - User ID for logging
   * @returns {Object} Operation result
   */
  async prepareUSDTTransfer(fromUserWallet, toUserWallet, amount, userId) {
    try {
      console.log('🚀 Starting USDT transfer preparation...', {
        from: fromUserWallet,
        to: toUserWallet,
        amount,
        userId
      });

      // 1️⃣ Validate input parameters
      await this.validateTransferInputs(fromUserWallet, toUserWallet, amount);

      // 2️⃣ Check fee payer wallet balance
      const feeBalance = await this.checkFeePayerBalance();
      if (!feeBalance.sufficient) {
        throw new Error(`Insufficient SOL for fees. Current: ${feeBalance.balance} SOL, Required: ${this.minSOLBalance} SOL`);
      }

      // 3️⃣ Check user's USDT balance
      const userBalance = await this.checkUSDTBalance(fromUserWallet);
      if (userBalance.shouldCreateAccount) {
        // create token account in instruction  edit for reciver
        // for sender if not exist account trow and check balance 
        const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
          this.feePayerWallet.publicKey,
          userBalance.tokenAccount,
          this.usdtMintAddress,
          userBalance.userWallet
        );
        transaction.add(createTokenAccountInstruction);
      }
      if (userBalance.balance < amount) {
        throw new Error(`Insufficient USDT balance. Available: ${userBalance.balance}, Required: ${amount}`);
      }

      // 4️⃣ Convert addresses to PublicKey
      const fromPubkey = new PublicKey(fromUserWallet);
      const toPubkey = new PublicKey(toUserWallet);


      // 6️⃣ Create transaction
      const transaction = new Transaction();
      // if reciver should create account
      
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.feePayerWallet.publicKey,
          toPubkey,
          this.usdtMintAddress,
          userBalance.userWallet
        )
      );
      // 7️⃣ Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount.address,    // From token account
          toTokenAccount.address,      // To token account
          fromPubkey,                  // Owner of sender account
          amount * Math.pow(10, 6),    // Amount (USDT has 6 decimal places)
          [],                          // Multi-signers
          TOKEN_PROGRAM_ID
        )
      );

      // 8️⃣ Set fee payer (your main wallet)
      transaction.feePayer = this.feePayerWallet.publicKey;

      // 9️⃣ Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;

      // 🔟 Partial sign with fee payer wallet
      transaction.partialSign(this.feePayerWallet);

      // 1️⃣1️⃣ Serialize transaction for sending to user
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      console.log('✅ Transaction ready for user signature');

      return {
        success: true,
        transaction: serializedTransaction.toString('base64'),
        transactionId: this.generateTransactionId(),
        fromTokenAccount: fromTokenAccount.address.toString(),
        toTokenAccount: toTokenAccount.address.toString(),
        amount,
        estimatedFee: await this.estimateTransactionFee(),
        blockhash,
        lastValidBlockHeight,
        expiresAt: Date.now() + (60 * 1000), // Expires in 1 minute
        message: 'Transaction ready - needs user signature'
      };

    } catch (error) {
      console.error('❌ Error preparing USDT transfer:', error);
      throw error;
    }
  }

  /**
   * 📝 Complete transaction after user signature
   * @param {string} serializedTransaction - Serialized transaction
   * @param {Object} userSignature - User signature
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Transfer result
   */
  async completeUSDTTransfer(serializedTransaction, userSignature, transactionId) {
    try {
      console.log('🔄 Completing USDT transfer...', { transactionId });

      // 1️⃣ Restore transaction from Base64
      const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      // 2️⃣ Add user signature
      if (userSignature && userSignature.signature) {
        const userPubkey = new PublicKey(userSignature.publicKey);
        const signatureBuffer = Buffer.from(userSignature.signature, 'base64');
        transaction.addSignature(userPubkey, signatureBuffer);
      }

      // 3️⃣ Verify transaction signatures
      if (!transaction.verifySignatures()) {
        throw new Error('Invalid transaction signatures');
      }

      // 4️⃣ Send transaction
      const rawTransaction = transaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log('📤 Transaction sent:', signature);

      // 5️⃣ Confirm transaction
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight || undefined
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('🎉 USDT transfer completed successfully!');

      return {
        success: true,
        signature,
        transactionId,
        explorerUrl: `https://explorer.solana.com/tx/${signature}${this.getNetworkParam()}`,
        confirmations: 1,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };

    } catch (error) {
      console.error('❌ Error completing transaction:', error);
      throw new Error(`Failed to complete USDT transfer: ${error.message}`);
    }
  }

  /**
   * 💰 Check SOL balance in fee payer wallet
   * @returns {Object} Balance information
   */
  async checkFeePayerBalance() {
    try {
      const balance = await this.connection.getBalance(this.feePayerWallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      return {
        balance: solBalance,
        balanceLamports: balance,
        sufficient: solBalance >= this.minSOLBalance,
        address: this.feePayerWallet.publicKey.toString(),
        minRequired: this.minSOLBalance,
        isDemoMode: this.isDemoMode
      };
    } catch (error) {
      console.error('❌ Error checking fee payer balance:', error);
      throw error;
    }
  }

  /**
   * 🪙 Check user's USDT balance
   * @param {string} userWallet - User wallet address
   * @returns {Object} USDT balance information
   */
  async checkUSDTBalance(userWallet) {

    let tokenAccount;
    try {
      // Get token account address
      const userPubkey = new PublicKey(userWallet);
      
      // Get token account address
      tokenAccount = await getAssociatedTokenAddress(
        this.usdtMintAddress,
        userPubkey,
        false
      );
    } catch (error) {
      console.error('❌ Error checking USDT balance:', error);
      throw error;
    }
    
    try {

      // Check balance
      const balance = await this.connection.getTokenAccountBalance(tokenAccount.address);
      
      return {
        balance: parseFloat(balance.value.uiAmount || 0),
        balanceRaw: balance.value.amount,
        decimals: balance.value.decimals,
        tokenAccount: tokenAccount.address.toString(),
        mint: this.usdtMintAddress.toString()
      };
    } catch (error) {
      console.error('❌ Error checking USDT balance:', error);
      return {
        balance: 0,
        error: error.message,
        tokenAccount: tokenAccount.address.toString(),
        shouldCreateAccount: true
      };
    }
  }

  /**
   * 📊 Estimate transaction fees
   * @returns {Object} Fee estimation
   */
  async estimateTransactionFee() {
    try {
      // Base transaction fee
      const baseFee = 5000; // 0.000005 SOL

      // Additional fee for creating token account (if needed)
      const tokenAccountFee = 2039280; // ~0.002 SOL

      return {
        baseFee,
        tokenAccountFee,
        totalLamports: baseFee + tokenAccountFee,
        totalSOL: (baseFee + tokenAccountFee) / LAMPORTS_PER_SOL,
        currency: 'SOL'
      };
    } catch (error) {
      console.error('❌ Error estimating fee:', error);
      return {
        totalSOL: 0.005, // Default estimation
        error: error.message
      };
    }
  }

  /**
   * ✅ Validate transfer inputs
   */
  async validateTransferInputs(fromWallet, toWallet, amount) {
    // Check addresses
    try {
      new PublicKey(fromWallet);
      new PublicKey(toWallet);
    } catch (error) {
      throw new Error('Invalid wallet address format');
    }

    // Check amount
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > this.maxUSDTPerTransaction) {
      throw new Error(`Amount exceeds maximum limit of ${this.maxUSDTPerTransaction} USDT`);
    }

    // Check that addresses are different
    if (fromWallet === toWallet) {
      throw new Error('Cannot send to the same wallet');
    }
  }

  /**
   * 🆔 Generate unique transaction ID
   */
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🌐 Get network parameter for explorer
   */
  getNetworkParam() {
    const network = process.env.SOLANA_NETWORK;
    if (network === 'devnet') return '?cluster=devnet';
    if (network === 'testnet') return '?cluster=testnet';
    return ''; // mainnet
  }

  /**
   * 📈 Get service statistics
   */
  async getServiceStats() {
    try {
      const feeBalance = await this.checkFeePayerBalance();
      const estimatedFee = await this.estimateTransactionFee();

      return {
        feePayerWallet: {
          address: this.feePayerWallet.publicKey.toString(),
          balance: feeBalance.balance,
          sufficient: feeBalance.sufficient
        },
        network: process.env.SOLANA_NETWORK || 'mainnet',
        usdtMint: this.usdtMintAddress.toString(),
        limits: {
          maxUSDTPerTransaction: this.maxUSDTPerTransaction,
          minSOLBalance: this.minSOLBalance
        },
        estimatedFees: estimatedFee,
        isDemoMode: this.isDemoMode,
        status: feeBalance.sufficient ? 'operational' : 'insufficient_funds'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export default new SolanaService(); 