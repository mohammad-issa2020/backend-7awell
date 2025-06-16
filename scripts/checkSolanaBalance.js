#!/usr/bin/env node

/**
 * 🔍 Solana Fee Payer Balance Checker
 * 
 * This script checks the balance of the fee payer wallet on Solana
 */

require('dotenv').config();
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

console.log('🔍 Solana Fee Payer Balance Checker');
console.log('===================================\n');

async function checkBalance() {
  try {
    // Check for required environment variables
    if (!process.env.SOLANA_FEE_PAYER_PRIVATE_KEY) {
      console.log('❌ SOLANA_FEE_PAYER_PRIVATE_KEY not found in .env');
      console.log('💡 Run: npm run solana:generate-wallet');
      return;
    }

    // Parse private key
    const privateKeyArray = JSON.parse(process.env.SOLANA_FEE_PAYER_PRIVATE_KEY);
    const { Keypair } = require('@solana/web3.js');
    const wallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    console.log('📋 Wallet Information:');
    console.log('-------------------');
    console.log(`🔑 Address: ${wallet.publicKey.toString()}`);

    // Connect to Solana network
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || 
      (network === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com');
    
    console.log(`🌐 Network: ${network}`);
    console.log(`🔗 RPC: ${rpcUrl}\n`);

    const connection = new Connection(rpcUrl, 'confirmed');

    // Check balance
    console.log('🔍 Checking balance...');
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    console.log('💰 Balance Results:');
    console.log('----------------');
    console.log(`💎 Balance: ${solBalance} SOL`);
    console.log(`🔢 Lamports: ${balance.toLocaleString()}`);

    // Analyze status
    const minBalance = parseFloat(process.env.MIN_SOL_BALANCE || '0.1');
    console.log(`📊 Minimum required: ${minBalance} SOL\n`);

    if (solBalance === 0) {
      console.log('🚨 Warning: Wallet is empty!');
      console.log('📝 Required actions:');
      if (network === 'devnet') {
        console.log('   1. Go to: https://faucet.solana.com/');
        console.log(`   2. Enter address: ${wallet.publicKey.toString()}`);
        console.log('   3. Request free SOL for development');
      } else {
        console.log('   1. Send SOL to the address above');
        console.log('   2. Ensure sufficient amount for fees');
      }
    } else if (solBalance < minBalance) {
      console.log('⚠️  Warning: Balance is low!');
      console.log(`   Current balance: ${solBalance} SOL`);
      console.log(`   Required: ${minBalance} SOL`);
      console.log(`   Shortage: ${(minBalance - solBalance).toFixed(6)} SOL`);
    } else {
      console.log('✅ Balance is sufficient for operations!');
      
      // Estimate possible transactions
      const feePerTx = 0.005; // Average estimate
      const possibleTxs = Math.floor(solBalance / feePerTx);
      console.log(`📊 Expected transactions: ~${possibleTxs.toLocaleString()}`);
    }

    // Additional network information
    console.log('\n🌐 Network Information:');
    console.log('------------------');
    
    try {
      const slot = await connection.getSlot();
      console.log(`🔢 Current Slot: ${slot.toLocaleString()}`);
      
      const blockHeight = await connection.getBlockHeight();
      console.log(`📏 Block Height: ${blockHeight.toLocaleString()}`);
      
      const version = await connection.getVersion();
      console.log(`⚙️  Solana Version: ${version['solana-core']}`);
    } catch (error) {
      console.log('❌ Cannot get network information');
    }

    // Useful links
    console.log('\n🔗 Useful Links:');
    console.log('---------------');
    
    const explorerUrl = network === 'mainnet-beta' 
      ? `https://explorer.solana.com/address/${wallet.publicKey.toString()}`
      : `https://explorer.solana.com/address/${wallet.publicKey.toString()}?cluster=${network}`;
    
    console.log(`🔍 Explorer: ${explorerUrl}`);
    
    if (network === 'devnet') {
      console.log('🚰 Faucet: https://faucet.solana.com/');
    }

  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
    
    if (error.message.includes('JSON')) {
      console.log('💡 Check SOLANA_FEE_PAYER_PRIVATE_KEY format in .env');
    } else if (error.message.includes('network')) {
      console.log('💡 Check internet connection or RPC URL');
    }
  }
}

// Run balance check
checkBalance().then(() => {
  console.log('\n🎉 Balance check completed!');
}).catch(error => {
  console.error('❌ Unexpected error:', error);
}); 