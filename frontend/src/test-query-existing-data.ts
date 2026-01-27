/**
 * Test Querying Existing Injective Data
 * Queries real data from Injective testnet
 */

import { InjectiveWalletService } from '@/services/wallet/injective';
import { Network } from '@injectivelabs/networks';

async function testQueryExistingData() {
  console.log('🔍 Testing Queries on Injective Testnet...\n');

  const walletService = new InjectiveWalletService(Network.Testnet);

  // Test 1: Query INJ balance of a known address
  try {
    console.log('Test 1: Query INJ Balance');
    const testAddress = 'inj1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqe2hm49';
    const balance = await walletService.getBalance(testAddress, 'inj');
    console.log('✓ Balance query successful:');
    console.log(`  Address: ${testAddress}`);
    console.log(`  INJ Balance: ${balance}`);
  } catch (error) {
    console.error('✗ Balance query failed:', error);
  }

  // Test 2: Query all balances
  try {
    console.log('\nTest 2: Query All Balances');
    const testAddress = 'inj1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqe2hm49';
    const allBalances = await walletService.getAllBalances(testAddress);
    console.log('✓ All balances query successful:');
    console.log(`  Found ${allBalances.length} token(s)`);
    if (allBalances.length > 0) {
      allBalances.forEach(bal => {
        console.log(`  - ${bal.denom}: ${bal.amount}`);
      });
    }
  } catch (error) {
    console.error('✗ All balances query failed:', error);
  }

  // Test 3: Query well-known testnet token (wINJ)
  try {
    console.log('\nTest 3: Query wINJ Token Info (MTS Example)');
    const wINJAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const { getMTSDenom, mtsUtilitiesTestnet } = await import('@/services/wallet/injective');
    
    const denom = getMTSDenom(wINJAddress);
    console.log('✓ MTS denom generated:', denom);
    
    // Check if MTS enabled
    const isMTS = await mtsUtilitiesTestnet.checkMTSStatus(wINJAddress);
    console.log('✓ MTS Status:', isMTS ? 'ENABLED' : 'NOT ENABLED');
    
  } catch (error) {
    console.error('✗ wINJ query failed:', error);
  }

  console.log('\n✅ Query test complete!');
  console.log('\n💡 These queries work because they read existing blockchain data');
  console.log('   No deployment needed!');
}

testQueryExistingData().catch(console.error);
