#!/usr/bin/env ts-node
/**
 * Hoodi Wallet Decryption Script
 * 
 * Automatically decrypts the Hoodi deployment wallet from the database
 * Uses existing WalletEncryptionClient from the frontend
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalents for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load frontend .env file
const frontendEnvPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(frontendEnvPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Configuration from frontend .env
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const MASTER_PASSWORD = env.VITE_WALLET_MASTER_PASSWORD;
const HOODI_RPC = env.VITE_HOODI_RPC_URL;
const ETHERSCAN_API_KEY = env.VITE_ETHERSCAN_API_KEY;

const PROJECT_ID = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';

interface EncryptedData {
  version: number;
  algorithm: string;
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}

/**
 * Decrypt using AES-256-GCM (matching backend WalletEncryptionService)
 */
function decrypt(encryptedData: EncryptedData, masterPassword: string): string {
  try {
    // Parse components (all hex-encoded in backend)
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encrypted = encryptedData.encrypted; // Already hex string
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Derive key from master password using salt (matching backend)
    const key = crypto.pbkdf2Sync(
      masterPassword,
      salt,
      100000, // iterations (must match backend)
      32, // key length (must match backend)
      'sha256'
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      iv
    );

    // Set auth tag (must be done before update)
    decipher.setAuthTag(authTag);

    // Decrypt (input is hex, output is utf8)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if data is encrypted
 */
function isEncrypted(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return parsed.version && parsed.algorithm && parsed.encrypted;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔐 Hoodi Wallet Decryption Script');
  console.log('='.repeat(50));
  console.log('');

  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase configuration in frontend/.env');
    console.error('   Required: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!MASTER_PASSWORD) {
    console.error('❌ Missing VITE_WALLET_MASTER_PASSWORD in frontend/.env');
    process.exit(1);
  }

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📡 Querying database for Hoodi wallet...');
  console.log(`   Project ID: ${PROJECT_ID}`);
  console.log('');

  // Query for Hoodi wallet (chain_id 560048)
  const { data: wallet, error } = await supabase
    .from('project_wallets')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .eq('chain_id', '560048')
    .maybeSingle();

  if (error) {
    console.error('❌ Database query failed:', error.message);
    process.exit(1);
  }

  if (!wallet) {
    console.error('❌ No Hoodi wallet found for project');
    console.error('   Make sure you have a wallet with:');
    console.error('   - project_id: cdc4f92c-8da1-4d80-a917-a94eb8cafaf0');
    console.error('   - chain_id: 560048 (Hoodi)');
    process.exit(1);
  }

  console.log('✅ Wallet found!');
  console.log(`   Address: ${wallet.wallet_address}`);
  console.log(`   Chain ID: ${wallet.chain_id || '560048'}`);
  console.log('');

  // Decrypt private key
  console.log('🔓 Decrypting private key...');
  
  let privateKey: string;
  
  if (isEncrypted(wallet.private_key)) {
    console.log('   Encryption detected: AES-256-GCM');
    const encryptedData: EncryptedData = JSON.parse(wallet.private_key);
    
    try {
      privateKey = decrypt(encryptedData, MASTER_PASSWORD);
      console.log('   ✅ Decryption successful');
    } catch (error) {
      console.error('   ❌ Decryption failed:', error instanceof Error ? error.message : String(error));
      console.error('   Check VITE_WALLET_MASTER_PASSWORD in frontend/.env');
      process.exit(1);
    }
  } else {
    // Not encrypted (plain text)
    privateKey = wallet.private_key;
    console.log('   ⚠️  Private key is not encrypted');
  }

  // Ensure private key has 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  console.log('');
  console.log('📝 Creating Foundry .env file...');

  // Create .env for Foundry
  const foundryEnvPath = path.join(__dirname, '../.env');
  const foundryEnvContent = `# Hoodi Deployment Configuration
# Auto-generated by decrypt-hoodi-wallet.ts
# DO NOT COMMIT THIS FILE

# Network Configuration
HOODI_RPC=${HOODI_RPC}
HOODI_CHAIN_ID=560048

# Deployer Wallet
HOODI_PRIVATE_KEY=${privateKey}
DEPLOYER_ADDRESS=${wallet.wallet_address}

# Etherscan Verification
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY}

# Project Info
PROJECT_ID=${PROJECT_ID}
`;

  fs.writeFileSync(foundryEnvPath, foundryEnvContent);
  console.log(`   ✅ Created: ${foundryEnvPath}`);
  console.log('');

  console.log('✅ Setup Complete!');
  console.log('');
  console.log('📋 Deployment Information:');
  console.log(`   Deployer: ${wallet.wallet_address}`);
  console.log(`   Network: Hoodi Testnet (Chain ID: 560048)`);
  console.log(`   RPC: ${HOODI_RPC}`);
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Get testnet ETH: https://hoodi.ethpandaops.io');
  console.log('   2. Check balance: cast balance ' + wallet.wallet_address + ' --rpc-url $HOODI_RPC');
  console.log('   3. Run deployment: ./script/pre-flight-check.sh');
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
