/**
 * Test Injective Service Initialization
 * Run this to verify all services load without errors
 */

import { 
  injectiveNativeTokenServiceTestnet,
  injectiveNativeTokenServiceMainnet,
  mtsUtilitiesTestnet,
  mtsUtilitiesMainnet,
  InjectiveWalletService
} from '@/services/wallet/injective';
import { Network } from '@injectivelabs/networks';

async function testServiceInitialization() {
  console.log('🧪 Testing Injective Service Initialization...\n');

  // Test 1: Native Token Service (Testnet)
  try {
    console.log('✓ InjectiveNativeTokenService (Testnet) loaded');
    console.log('  - Network:', injectiveNativeTokenServiceTestnet['network']);
  } catch (error) {
    console.error('✗ InjectiveNativeTokenService (Testnet) failed:', error);
  }

  // Test 2: Native Token Service (Mainnet)
  try {
    console.log('✓ InjectiveNativeTokenService (Mainnet) loaded');
    console.log('  - Network:', injectiveNativeTokenServiceMainnet['network']);
  } catch (error) {
    console.error('✗ InjectiveNativeTokenService (Mainnet) failed:', error);
  }

  // Test 3: MTS Utilities (Testnet)
  try {
    console.log('✓ MTSUtilities (Testnet) loaded');
    console.log('  - Network:', mtsUtilitiesTestnet['network']);
  } catch (error) {
    console.error('✗ MTSUtilities (Testnet) failed:', error);
  }

  // Test 4: MTS Utilities (Mainnet)
  try {
    console.log('✓ MTSUtilities (Mainnet) loaded');
    console.log('  - Network:', mtsUtilitiesMainnet['network']);
  } catch (error) {
    console.error('✗ MTSUtilities (Mainnet) failed:', error);
  }

  // Test 5: Wallet Service
  try {
    const walletService = new InjectiveWalletService(Network.Testnet);
    console.log('✓ InjectiveWalletService instantiated');
  } catch (error) {
    console.error('✗ InjectiveWalletService failed:', error);
  }

  // Test 6: Denom Format Utilities
  try {
    const { getMTSDenom, isMTSDenom, extractERC20Address } = await import('@/services/wallet/injective');
    
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const denom = getMTSDenom(testAddress);
    console.log('\n✓ MTS Helper Functions:');
    console.log('  - getMTSDenom:', denom);
    console.log('  - isMTSDenom:', isMTSDenom(denom));
    console.log('  - extractERC20Address:', extractERC20Address(denom));
  } catch (error) {
    console.error('✗ MTS Helper Functions failed:', error);
  }

  console.log('\n✅ Service initialization test complete!');
}

// Run tests
testServiceInitialization().catch(console.error);
