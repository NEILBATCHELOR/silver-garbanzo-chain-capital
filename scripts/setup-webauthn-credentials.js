#!/usr/bin/env node

/**
 * DFNS WebAuthn Credential Setup Script
 * 
 * This script helps you register WebAuthn credentials with DFNS for User Action Signing
 * Run this to enable wallet creation and other sensitive operations
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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

// Check WebAuthn credential registration status
async function checkCredentialStatus(env) {
  const baseUrl = env.VITE_DFNS_BASE_URL || 'https://api.dfns.io';
  const token = env.VITE_DFNS_PERSONAL_ACCESS_TOKEN;
  
  if (!token) {
    console.log('❌ No PAT token found, cannot check credentials');
    return;
  }
  
  console.log(`🔍 Checking WebAuthn credentials at: ${baseUrl}`);
  
  try {
    const response = await fetch(`${baseUrl}/auth/credentials`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully connected to DFNS API');
      console.log(`📊 Found ${data.items?.length || 0} credentials`);
      
      if (data.items?.length > 0) {
        console.log('🔑 Your DFNS Credentials:');
        data.items.forEach((credential, index) => {
          console.log(`  ${index + 1}. ${credential.name || 'Unnamed'}`);
          console.log(`     Type: ${credential.kind}`);
          console.log(`     Status: ${credential.isActive ? 'Active' : 'Inactive'}`);
          console.log(`     ID: ${credential.credentialId}`);
          console.log('');
        });
        
        const webauthnCredentials = data.items.filter(c => c.kind === 'Fido2');
        if (webauthnCredentials.length > 0) {
          console.log('✅ You have WebAuthn credentials set up!');
          console.log('🎉 User Action Signing should work for wallet creation');
          return true;
        } else {
          console.log('⚠️  No WebAuthn (Fido2) credentials found');
          console.log('💡 You have other credential types but need WebAuthn for User Action Signing');
          return false;
        }
      } else {
        console.log('📝 No credentials found - you need to set up WebAuthn credentials');
        return false;
      }
    } else {
      console.log(`❌ Credentials API Error: ${response.status} ${response.statusText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

// Provide setup instructions
function showSetupInstructions(hasWebAuthn) {
  console.log('📋 WebAuthn Credential Setup Instructions');
  console.log('==========================================');
  
  if (hasWebAuthn) {
    console.log('✅ You already have WebAuthn credentials set up!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Try creating a wallet in the DFNS dashboard');
    console.log('2. You should be prompted for biometric authentication');
    console.log('3. If wallet creation works, User Action Signing is working correctly');
    return;
  }
  
  console.log('🚀 To set up WebAuthn credentials for User Action Signing:');
  console.log('');
  console.log('📱 Option 1: Use the Web Interface (Recommended)');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Navigate to: http://localhost:5173/wallet/dfns/auth');
  console.log('3. Use the WebAuthn Setup component to register credentials');
  console.log('4. Follow the browser prompts (Touch ID, Windows Hello, etc.)');
  console.log('');
  console.log('🖥️  Option 2: Use DFNS Dashboard');
  console.log('1. Log in to your DFNS dashboard: https://app.dfns.co/');
  console.log('2. Go to Settings > Credentials');
  console.log('3. Add a new WebAuthn credential');
  console.log('4. Follow the setup wizard');
  console.log('');
  console.log('🔧 Option 3: Manual API Setup (Advanced)');
  console.log('1. Call DFNS credential creation API');
  console.log('2. Handle WebAuthn registration flow');
  console.log('3. Store credential information');
  console.log('');
  console.log('📝 What you need for WebAuthn:');
  console.log('• Modern browser with WebAuthn support (Chrome, Firefox, Safari, Edge)');
  console.log('• Biometric device (Touch ID, Windows Hello, YubiKey, etc.)');
  console.log('• HTTPS connection (required for WebAuthn)');
  console.log('');
  console.log('🛡️  Why you need WebAuthn credentials:');
  console.log('• DFNS requires User Action Signing for sensitive operations');
  console.log('• Wallet creation, transfers, and key operations need cryptographic signatures');
  console.log('• PAT tokens alone are not sufficient for these operations');
  console.log('• WebAuthn provides the cryptographic keys needed for signing');
}

// Check environment configuration
function checkEnvironment(env) {
  console.log('🔧 Environment Configuration Check');
  console.log('==================================');
  
  const requiredVars = {
    'VITE_DFNS_BASE_URL': env.VITE_DFNS_BASE_URL,
    'VITE_DFNS_APP_ID': env.VITE_DFNS_APP_ID,
    'VITE_DFNS_PERSONAL_ACCESS_TOKEN': env.VITE_DFNS_PERSONAL_ACCESS_TOKEN,
    'VITE_DFNS_USER_ID': env.VITE_DFNS_USER_ID,
    'VITE_DFNS_USERNAME': env.VITE_DFNS_USERNAME,
  };
  
  const optionalVars = {
    'VITE_DFNS_APP_ORIGIN': env.VITE_DFNS_APP_ORIGIN,
    'VITE_DFNS_RP_ID': env.VITE_DFNS_RP_ID,
  };
  
  let allRequired = true;
  
  console.log('📋 Required Environment Variables:');
  Object.entries(requiredVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = value ? (key.includes('TOKEN') ? '[HIDDEN]' : value) : '[MISSING]';
    console.log(`  ${status} ${key}: ${displayValue}`);
    if (!value) allRequired = false;
  });
  
  console.log('');
  console.log('📋 Optional Environment Variables:');
  Object.entries(optionalVars).forEach(([key, value]) => {
    const status = value ? '✅' : '⚠️ ';
    const displayValue = value || '[NOT SET - using defaults]';
    console.log(`  ${status} ${key}: ${displayValue}`);
  });
  
  console.log('');
  if (allRequired) {
    console.log('✅ All required environment variables are configured');
  } else {
    console.log('❌ Some required environment variables are missing');
    console.log('💡 Check your .env file in the frontend directory');
  }
  
  return allRequired;
}

// Main execution
async function main() {
  console.log('🔐 DFNS WebAuthn Credential Setup');
  console.log('=================================');
  console.log('');
  
  const env = loadEnv();
  
  // Check environment configuration
  const envConfigured = checkEnvironment(env);
  console.log('');
  
  if (!envConfigured) {
    console.log('❌ Environment not properly configured');
    console.log('🔧 Please set up your environment variables first');
    return;
  }
  
  // Check current credential status
  const hasWebAuthn = await checkCredentialStatus(env);
  console.log('');
  
  // Show setup instructions
  showSetupInstructions(hasWebAuthn);
}

// Run the setup check
main().catch(console.error);

export { loadEnv, checkCredentialStatus };