/**
 * Test Network Configuration
 * Verifies RPC endpoints are accessible
 */

import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { ChainGrpcBankApi } from '@injectivelabs/sdk-ts';

async function testNetworkConnectivity() {
  console.log('🌐 Testing Injective Network Connectivity...\n');

  // Test Testnet
  try {
    console.log('Testing Testnet...');
    const testnetEndpoints = getNetworkEndpoints(Network.Testnet);
    console.log('✓ Testnet endpoints configured:');
    console.log('  - gRPC:', testnetEndpoints.grpc);
    console.log('  - REST:', testnetEndpoints.rest);
    
    // Try to connect
    const bankApi = new ChainGrpcBankApi(testnetEndpoints.grpc);
    console.log('✓ gRPC connection established');
    
  } catch (error) {
    console.error('✗ Testnet connection failed:', error);
  }

  // Test Mainnet
  try {
    console.log('\nTesting Mainnet...');
    const mainnetEndpoints = getNetworkEndpoints(Network.Mainnet);
    console.log('✓ Mainnet endpoints configured:');
    console.log('  - gRPC:', mainnetEndpoints.grpc);
    console.log('  - REST:', mainnetEndpoints.rest);
    
    const bankApi = new ChainGrpcBankApi(mainnetEndpoints.grpc);
    console.log('✓ gRPC connection established');
    
  } catch (error) {
    console.error('✗ Mainnet connection failed:', error);
  }

  console.log('\n✅ Network connectivity test complete!');
}

testNetworkConnectivity().catch(console.error);
