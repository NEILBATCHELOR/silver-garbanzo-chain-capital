/**
 * Test Script: Verify Injective Wallet Key Derivation
 * 
 * This script verifies that the private key stored in the database
 * correctly derives to the expected EVM address.
 */

import WalletEncryptionService from './src/services/security/walletEncryptionService';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWalletKeyDerivation() {
  const walletId = 'c719c792-4d82-4552-b5f1-fabb623caef2';
  const expectedEVMAddress = '0xd8fa095a993c5a41efb5105af956f7922e658c65';
  
  console.log('🔍 Testing Injective Wallet Key Derivation');
  console.log('Wallet ID:', walletId);
  console.log('Expected EVM Address:', expectedEVMAddress);
  console.log();

  try {
    // Fetch wallet from database
    const { data: wallet, error } = await supabase
      .from('project_wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error || !wallet) {
      console.error('❌ Failed to fetch wallet:', error);
      return;
    }

    console.log('✅ Wallet fetched from database');
    console.log('  - Type:', wallet.wallet_type);
    console.log('  - Native Address:', wallet.wallet_address);
    console.log('  - EVM Address:', wallet.evm_address);
    console.log('  - Has Mnemonic:', !!wallet.mnemonic);
    console.log();

    // Test 1: Decrypt and derive from stored private key
    console.log('📝 Test 1: Deriving from stored private key...');
    try {
      const decryptedPrivateKey = await WalletEncryptionService.decrypt(wallet.private_key);
      
      // Ensure 0x prefix
      const formattedKey = decryptedPrivateKey.startsWith('0x') 
        ? decryptedPrivateKey 
        : `0x${decryptedPrivateKey}`;
      
      const walletFromKey = new ethers.Wallet(formattedKey);
      const derivedAddress = walletFromKey.address;
      
      console.log('  - Derived Address:', derivedAddress);
      console.log('  - Expected Address:', expectedEVMAddress);
      console.log('  - Match:', derivedAddress.toLowerCase() === expectedEVMAddress.toLowerCase() ? '✅ YES' : '❌ NO');
      console.log();
    } catch (err) {
      console.error('  ❌ Failed to derive from private key:', err);
      console.log();
    }

    // Test 2: Decrypt and derive from mnemonic (if available)
    if (wallet.mnemonic) {
      console.log('📝 Test 2: Deriving from mnemonic...');
      try {
        const decryptedMnemonic = await WalletEncryptionService.decrypt(wallet.mnemonic);
        
        // Standard Ethereum derivation path
        const derivationPath = "m/44'/60'/0'/0/0";
        const hdWallet = ethers.HDNodeWallet.fromPhrase(decryptedMnemonic, undefined, derivationPath);
        
        const derivedAddress = hdWallet.address;
        const derivedPrivateKey = hdWallet.privateKey;
        
        console.log('  - Derivation Path:', derivationPath);
        console.log('  - Derived Address:', derivedAddress);
        console.log('  - Expected Address:', expectedEVMAddress);
        console.log('  - Match:', derivedAddress.toLowerCase() === expectedEVMAddress.toLowerCase() ? '✅ YES' : '❌ NO');
        console.log('  - Derived Private Key:', derivedPrivateKey.substring(0, 10) + '...');
        console.log();
      } catch (err) {
        console.error('  ❌ Failed to derive from mnemonic:', err);
        console.log();
      }
    }

    // Test 3: Injective-specific derivation (if different)
    if (wallet.mnemonic) {
      console.log('📝 Test 3: Testing Injective derivation path...');
      try {
        const decryptedMnemonic = await WalletEncryptionService.decrypt(wallet.mnemonic);
        
        // Injective uses Ethereum derivation path
        const injectivePath = "m/44'/60'/0'/0/0";
        const hdWallet = ethers.HDNodeWallet.fromPhrase(decryptedMnemonic, undefined, injectivePath);
        
        const derivedAddress = hdWallet.address;
        
        console.log('  - Derivation Path:', injectivePath);
        console.log('  - Derived Address:', derivedAddress);
        console.log('  - Expected Address:', expectedEVMAddress);
        console.log('  - Match:', derivedAddress.toLowerCase() === expectedEVMAddress.toLowerCase() ? '✅ YES' : '❌ NO');
        console.log();
      } catch (err) {
        console.error('  ❌ Failed with Injective path:', err);
        console.log();
      }
    }

    console.log('🏁 Test Complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWalletKeyDerivation();
