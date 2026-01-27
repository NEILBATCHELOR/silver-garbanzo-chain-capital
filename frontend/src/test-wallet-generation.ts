/**
 * Test Wallet Generation
 * Generates Injective testnet wallet without deployment
 */

import { InjectiveWalletService } from '@/services/wallet/injective';
import { Network } from '@injectivelabs/networks';

async function testWalletGeneration() {
  console.log('🔑 Testing Injective Wallet Generation...\n');

  const walletService = new InjectiveWalletService(Network.Testnet);

  // Generate account
  const account = await walletService.generateAccount({
    includePrivateKey: true,
    includeMnemonic: true
  });

  console.log('✅ Wallet Generated Successfully!\n');
  console.log('Address:', account.address);
  console.log('Public Key:', account.publicKey);
  console.log('Mnemonic:', account.mnemonic);
  console.log('\n⚠️  SAVE PRIVATE KEY SECURELY (not shown here for security)');
  console.log('\n📝 Next Steps:');
  console.log('1. Fund this address with testnet INJ: https://testnet.faucet.injective.network/');
  console.log('2. Use this address for token deployment');
}

testWalletGeneration().catch(console.error);
