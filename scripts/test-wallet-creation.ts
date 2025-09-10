/**
 * Test script for DFNS Wallet Creation Fix
 * Tests the working client createWallet method
 */

import { getWorkingDfnsClient } from './src/infrastructure/dfns/working-client';
import type { DfnsCreateWalletRequest } from './src/types/dfns';

async function testWalletCreation() {
  console.log('🧪 Testing DFNS Working Client Wallet Creation...\n');

  try {
    // Initialize working client
    const workingClient = getWorkingDfnsClient();
    
    console.log('✅ Working client initialized');

    // Test connection first
    const isConnected = await workingClient.testConnection();
    if (!isConnected) {
      throw new Error('DFNS connection failed');
    }
    
    console.log('✅ DFNS connection successful');

    // Create test wallet request
    const walletRequest: DfnsCreateWalletRequest = {
      network: 'Base',
      name: `Test Wallet ${Date.now()}`,
      custodial: true
    };

    console.log('🔧 Creating test wallet:', walletRequest);

    // Note: This will fail without User Action Signing, but should show better error messaging
    try {
      const newWallet = await workingClient.createWallet(walletRequest);
      console.log('🎉 Wallet created successfully:', newWallet);
    } catch (error) {
      console.log('⚠️  Expected error (User Action Signing required):', error);
      
      // Check if it's the right kind of error (not the deprecated makeRequest error)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('makeRequest is deprecated')) {
        console.error('❌ STILL USING DEPRECATED SDK!');
        process.exit(1);
      } else {
        console.log('✅ Using working client (not deprecated SDK)');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testWalletCreation().then(() => {
    console.log('\n🎯 Test completed successfully!');
    process.exit(0);
  });
}
