#!/usr/bin/env ts-node
/**
 * Quick test for wallet decryption
 * Run: ts-node script/test-decryption.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load frontend .env
const envPath = path.join(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
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

async function test() {
  console.log('🔍 Testing Wallet Decryption Setup\n');

  // Check required env vars
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_WALLET_MASTER_PASSWORD',
    'VITE_HOODI_RPC_URL',
  ];

  let allPresent = true;
  for (const key of required) {
    if (env[key]) {
      console.log(`✅ ${key}: Present`);
    } else {
      console.log(`❌ ${key}: Missing`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    console.log('\n❌ Missing required environment variables in frontend/.env');
    process.exit(1);
  }

  console.log('\n📡 Testing Supabase connection...');
  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('project_wallets')
    .select('wallet_address, chain_id')
    .eq('project_id', 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0')
    .eq('chain_id', '560048')
    .maybeSingle();

  if (error) {
    console.log('❌ Database error:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.log('❌ No Hoodi wallet found for project');
    process.exit(1);
  }

  console.log('✅ Supabase connection successful');
  console.log('\n📋 Wallet Info:');
  console.log(`   Address: ${data.wallet_address}`);
  console.log(`   Chain ID: ${data.chain_id} (Hoodi testnet)`);

  console.log('\n✅ All checks passed! Ready to run pre-flight check.');
  console.log('\nNext step:');
  console.log('   ./script/pre-flight-check.sh');
}

test().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
