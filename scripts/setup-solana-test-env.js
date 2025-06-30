#!/usr/bin/env node

/**
 * 🔧 Solana Test Environment Setup Script
 * 
 * Prepares environment for comprehensive Solana DevNet testing
 */

import dotenv from 'dotenv';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

console.log(`
╔══════════════════════════════════════════════════════════════╗
║              🔧 SOLANA TEST ENVIRONMENT SETUP                ║
║                                                              ║
║  This script will prepare your environment for:             ║
║  ✅ Solana DevNet testing                                   ║
║  ✅ Database migrations                                     ║
║  ✅ Wallet generation and funding                           ║
║  ✅ Configuration validation                                ║
╚══════════════════════════════════════════════════════════════╝
`);

class SolanaTestEnvSetup {
  constructor() {
    this.envPath = join(__dirname, '..', '.env');
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    this.testWallets = {};
  }

  async run() {
    try {
      console.log('🚀 Starting environment setup...\n');
      
      await this.checkPrerequisites();
      await this.setupEnvironmentVariables();
      await this.generateTestWallets();
      await this.fundTestWallets();
      await this.verifyDatabaseConnection();
      await this.runMigrations();
      await this.verifyConfiguration();
      
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎉 SETUP COMPLETED!                      ║
║                                                              ║
║  Your environment is now ready for Solana testing.         ║
║  Run: npm run solana:test                                    ║
╚══════════════════════════════════════════════════════════════╝
`);
      
    } catch (error) {
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║                    ❌ SETUP FAILED!                         ║
║                                                              ║
║  Error: ${error.message.padEnd(49)}║
╚══════════════════════════════════════════════════════════════╝
`);
      
      console.error('\n📋 Full error details:');
      console.error(error);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.`);
    }
    
    console.log(`✅ Node.js version: ${nodeVersion}`);
    
    // Check internet connectivity
    try {
      await this.connection.getVersion();
      console.log('✅ Internet connectivity to Solana DevNet');
    } catch (error) {
      throw new Error('Failed to connect to Solana DevNet. Please check your internet connection.');
    }
    
    console.log('✅ Prerequisites check passed\n');
  }

  async setupEnvironmentVariables() {
    console.log('📝 Setting up environment variables...');
    
    const requiredVars = {
      'SUPABASE_URL': 'Your Supabase project URL',
      'SUPABASE_SERVICE_ROLE_KEY': 'Your Supabase service role key',
      'JWT_SECRET': 'Your JWT secret key'
    };
    
    const missingVars = [];
    
    for (const [varName, description] of Object.entries(requiredVars)) {
      if (!process.env[varName]) {
        missingVars.push(`${varName} - ${description}`);
      } else {
        console.log(`✅ ${varName} is set`);
      }
    }
    
    if (missingVars.length > 0) {
      console.log('\n⚠️  Missing required environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('\nPlease add these to your .env file and run the setup again.');
      throw new Error('Missing required environment variables');
    }
    
    // Set Solana-specific environment variables
    await this.setSolanaEnvironmentVars();
    
    console.log('✅ Environment variables setup completed\n');
  }

  async setSolanaEnvironmentVars() {
    console.log('🔧 Configuring Solana environment...');
    
    const solanaEnvVars = {
      'SOLANA_NETWORK': 'devnet',
      'SOLANA_RPC_URL': 'https://api.devnet.solana.com',
      'MAX_USDT_PER_TX': '10000',
      'MIN_SOL_BALANCE': '0.1'
    };
    
    let envContent = '';
    
    if (existsSync(this.envPath)) {
      envContent = readFileSync(this.envPath, 'utf8');
    }
    
    let updated = false;
    
    for (const [varName, value] of Object.entries(solanaEnvVars)) {
      if (!process.env[varName]) {
        if (!envContent.includes(`${varName}=`)) {
          envContent += `\n${varName}=${value}`;
          updated = true;
          console.log(`✅ Added ${varName}=${value}`);
        }
      } else {
        console.log(`✅ ${varName} already set`);
      }
    }
    
    if (updated) {
      writeFileSync(this.envPath, envContent);
      console.log('📝 Updated .env file');
    }
  }

  async generateTestWallets() {
    console.log('💰 Generating test wallets...');
    
    // Check if fee payer wallet already exists
    if (process.env.SOLANA_FEE_PAYER_PRIVATE_KEY) {
      console.log('✅ Fee payer wallet already configured');
      return;
    }
    
    // Generate new fee payer wallet
    const feePayerWallet = Keypair.generate();
    
    const envContent = readFileSync(this.envPath, 'utf8');
    const updatedContent = envContent + `\nSOLANA_FEE_PAYER_PRIVATE_KEY=[${Array.from(feePayerWallet.secretKey).join(',')}]`;
    
    writeFileSync(this.envPath, updatedContent);
    
    console.log(`✅ Generated fee payer wallet: ${feePayerWallet.publicKey.toString()}`);
    console.log('✅ Added wallet to .env file');
    
    // Update process.env for current session
    process.env.SOLANA_FEE_PAYER_PRIVATE_KEY = `[${Array.from(feePayerWallet.secretKey).join(',')}]`;
    
    this.testWallets.feePayer = feePayerWallet;
    
    console.log('✅ Test wallets generation completed\n');
  }

  async fundTestWallets() {
    console.log('💸 Funding test wallets...');
    
    if (!this.testWallets.feePayer) {
      // Load existing wallet from env
      try {
        const privateKeyArray = JSON.parse(process.env.SOLANA_FEE_PAYER_PRIVATE_KEY);
        this.testWallets.feePayer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      } catch (error) {
        throw new Error('Failed to load fee payer wallet from environment');
      }
    }
    
    const walletAddress = this.testWallets.feePayer.publicKey;
    
    // Check current balance
    const currentBalance = await this.connection.getBalance(walletAddress);
    const currentSOL = currentBalance / LAMPORTS_PER_SOL;
    
    console.log(`💰 Current balance: ${currentSOL} SOL`);
    
    if (currentSOL < 1) {
      console.log('💰 Requesting SOL from DevNet faucet...');
      
      try {
        const signature = await this.connection.requestAirdrop(walletAddress, 2 * LAMPORTS_PER_SOL);
        
        // Wait for confirmation
        await this.connection.confirmTransaction(signature, 'confirmed');
        
        const newBalance = await this.connection.getBalance(walletAddress);
        const newSOL = newBalance / LAMPORTS_PER_SOL;
        
        console.log(`✅ Airdrop successful! New balance: ${newSOL} SOL`);
        console.log(`🔗 Transaction: ${signature}`);
        
      } catch (error) {
        console.log(`⚠️  Automatic funding failed: ${error.message}`);
        console.log(`💡 Manual funding required: https://faucet.solana.com/`);
        console.log(`📋 Wallet address: ${walletAddress.toString()}`);
      }
    } else {
      console.log('✅ Wallet already has sufficient SOL');
    }
    
    console.log('✅ Wallet funding completed\n');
  }

  async verifyDatabaseConnection() {
    console.log('🗄️ Verifying database connection...');
    
    try {
      // Test Supabase connection
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/version`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ Supabase connection successful');
      } else {
        throw new Error(`Database connection failed: ${response.status}`);
      }
      
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
    
    console.log('✅ Database connection verified\n');
  }

  async runMigrations() {
    console.log('🔄 Running database migrations...');
    
    try {
      // Import and run migrations
      const { runMigrations } = await import('../database/migrate.js');
      await runMigrations();
      
      console.log('✅ Database migrations completed');
      
    } catch (error) {
      console.log(`⚠️  Migration failed: ${error.message}`);
      console.log('💡 You may need to run migrations manually');
    }
    
    console.log('✅ Migration step completed\n');
  }

  async verifyConfiguration() {
    console.log('🔍 Verifying configuration...');
    
    // Check all required components
    const checks = [
      {
        name: 'Solana Network Connection',
        test: async () => {
          await this.connection.getVersion();
          return true;
        }
      },
      {
        name: 'Fee Payer Wallet',
        test: async () => {
          return !!process.env.SOLANA_FEE_PAYER_PRIVATE_KEY;
        }
      },
      {
        name: 'Database Access',
        test: async () => {
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          return response.ok;
        }
      }
    ];
    
    for (const check of checks) {
      try {
        const passed = await check.test();
        if (passed) {
          console.log(`✅ ${check.name}`);
        } else {
          console.log(`❌ ${check.name}`);
        }
      } catch (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
      }
    }
    
    console.log('✅ Configuration verification completed\n');
  }
}

// Run setup
const setup = new SolanaTestEnvSetup();
setup.run(); 