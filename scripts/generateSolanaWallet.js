#!/usr/bin/env node

/**
 * 🚀 Solana Fee Payer Wallet Generator
 * 
 * This script creates a new wallet for paying USDT transaction fees on Solana
 */

const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

console.log('🚀 Solana Fee Payer Wallet Generator');
console.log('=====================================\n');

// Create new wallet
const wallet = Keypair.generate();

console.log('✅ New wallet created successfully!\n');

console.log('📋 Wallet Information:');
console.log('-------------------');
console.log(`🔑 Public Key: ${wallet.publicKey.toString()}`);
console.log(`🔐 Private Key Array: [${Array.from(wallet.secretKey).join(',')}]`);
console.log(`📊 Private Key Length: ${wallet.secretKey.length} bytes\n`);

// Create .env file content
const envContent = `
# ===============================
# 🌐 SOLANA CONFIGURATION
# ===============================
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# ===============================
# 💰 FEE PAYER WALLET
# ===============================
SOLANA_FEE_PAYER_PRIVATE_KEY=[${Array.from(wallet.secretKey).join(',')}]

# ===============================
# 📊 LIMITS & SETTINGS
# ===============================
MAX_USDT_PER_TX=10000
MIN_SOL_BALANCE=0.1
`;

// Save to file
const envFilePath = path.join(__dirname, '..', '.env.solana');
fs.writeFileSync(envFilePath, envContent.trim());

console.log('💾 Settings saved to:');
console.log(`📁 ${envFilePath}\n`);

console.log('📝 Post-creation steps:');
console.log('----------------------');
console.log('1. Copy variables from .env.solana to main .env file');
console.log('2. Fund the wallet with SOL:');
console.log(`   💰 Address: ${wallet.publicKey.toString()}`);
console.log('3. For development: Use Solana Devnet Faucet');
console.log('4. For production: Send real SOL to the address\n');

// Check balance (if connected to internet)
async function checkBalance() {
  try {
    console.log('🔍 Checking current balance...');
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`💰 Current balance: ${solBalance} SOL`);
    
    if (solBalance === 0) {
      console.log('⚠️  Wallet is empty - needs funding');
      console.log('🌐 Devnet Faucet: https://faucet.solana.com/');
    } else {
      console.log('✅ Wallet is funded and ready to use!');
    }
  } catch (error) {
    console.log('❌ Cannot check balance (check internet connection)');
  }
}

// Run balance check
checkBalance().then(() => {
  console.log('\n🎉 Wallet creation completed successfully!');
  console.log('📚 Check docs/SOLANA_SETUP.md for more details');
});

// Export wallet for use in other scripts
module.exports = {
  wallet,
  publicKey: wallet.publicKey.toString(),
  privateKeyArray: Array.from(wallet.secretKey)
}; 