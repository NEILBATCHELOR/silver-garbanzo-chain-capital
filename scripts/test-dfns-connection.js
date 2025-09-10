#!/usr/bin/env node

// DFNS Connection Test Script
// This script tests connectivity to DFNS API and displays your wallets

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', 'frontend', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return env;
  } catch (error) {
    console.log('❌ Could not load .env file:', error.message);
    return {};
  }
}

// Test API connectivity
async function testConnection(env) {
  const baseUrl = env.VITE_DFNS_BASE_URL || 'https://api.dfns.io';
  const token = env.VITE_DFNS_PERSONAL_ACCESS_TOKEN;
  
  if (!token) {
    console.log('❌ No PAT token found, cannot test connection');
    return;
  }
  
  console.log(`🌐 Testing connection to: ${baseUrl}`);
  
  try {
    // Test credentials endpoint
    const credsResponse = await fetch(`${baseUrl}/auth/credentials`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (credsResponse.ok) {
      const credsData = await credsResponse.json();
      console.log('✅ DFNS API connection successful!');
      console.log(`📊 Credentials found: ${credsData.items?.length || 0}`);
      
      if (credsData.items?.length > 0) {
        console.log('🔑 Credentials:');
        credsData.items.forEach((cred, index) => {
          console.log(`  ${index + 1}. ${cred.name || 'Unnamed'} (${cred.kind}) - ${cred.isActive ? 'Active' : 'Inactive'}`);
        });
      }
    } else {
      console.log(`❌ Credentials API Error: ${credsResponse.status} ${credsResponse.statusText}`);
      return;
    }

    // Test wallets endpoint
    console.log('💰 Checking your DFNS wallets...');
    const walletsResponse = await fetch(`${baseUrl}/wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (walletsResponse.ok) {
      const walletsData = await walletsResponse.json();
      console.log(`✅ Wallets API successful!`);
      console.log(`💼 Wallets found: ${walletsData.items?.length || 0}`);
      
      if (walletsData.items?.length > 0) {
        console.log('🏦 Your DFNS Wallets:');
        walletsData.items.forEach((wallet, index) => {
          console.log(`  ${index + 1}. ${wallet.name || 'Unnamed Wallet'}`);
          console.log(`     Network: ${wallet.network}`);
          console.log(`     Address: ${wallet.address || 'N/A'}`);
          console.log(`     Status: ${wallet.status}`);
          console.log(`     Created: ${new Date(wallet.dateCreated).toLocaleDateString()}`);
          console.log('');
        });
      } else {
        console.log('   📝 No wallets found - you can create wallets through the DFNS dashboard');
      }
    } else {
      console.log(`❌ Wallets API Error: ${walletsResponse.status} ${walletsResponse.statusText}`);
      const errorText = await walletsResponse.text();
      console.log(`   Error details: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('🧪 DFNS Connection Test');
  console.log('========================');
  
  const env = loadEnv();
  
  if (!env.VITE_DFNS_PERSONAL_ACCESS_TOKEN) {
    console.log('❌ Missing VITE_DFNS_PERSONAL_ACCESS_TOKEN in .env file');
    console.log('   Please add your DFNS Personal Access Token to .env');
    return;
  }
  
  await testConnection(env);
}

// Run the test
main().catch(console.error);

export { loadEnv, testConnection };
