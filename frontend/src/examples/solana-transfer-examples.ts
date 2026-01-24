/**
 * Example: Using Both Solana Transfer Services
 * 
 * This file demonstrates the usage of both:
 * 1. ModernSolanaTokenTransferService (full-featured)
 * 2. SimpleSolanaTokenTransferService (sample-code-based)
 * 
 * Uncomment the example you want to run
 */

import {
  modernSolanaTokenTransferService,
  simpleSolanaTokenTransferService
} from '@/services/wallet/solana';
import { address } from '@solana/kit';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Token mint (USDC on devnet example)
  mint: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  
  // Wallets
  from: address('YOUR_WALLET_ADDRESS'),
  to: address('RECIPIENT_WALLET_ADDRESS'),
  
  // Amount (in smallest units)
  amount: 1_000_000n, // 1 USDC (6 decimals)
  decimals: 6,
  
  // Network
  network: 'devnet' as const,
  
  // Private key (from env)
  signerPrivateKey: process.env.SOLANA_DEVNET_PRIVATE_KEY!
};

// ============================================================================
// EXAMPLE 1: Modern Service (Recommended for Production)
// ============================================================================

async function exampleModernService() {
  console.log('═══════════════════════════════════════════════');
  console.log('EXAMPLE 1: Modern Service (Full-Featured)');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Get balance before
    const balanceBefore = await modernSolanaTokenTransferService.getTokenBalance(
      CONFIG.mint,
      CONFIG.from,
      CONFIG.network
    );
    console.log(`Balance before: ${balanceBefore} (${Number(balanceBefore) / 10 ** CONFIG.decimals} USDC)\n`);

    // Estimate fee
    console.log('Estimating fee...');
    const feeEstimate = await modernSolanaTokenTransferService.estimateTransferFee(
      {
        mint: CONFIG.mint,
        from: CONFIG.from,
        to: CONFIG.to,
        amount: CONFIG.amount,
        decimals: CONFIG.decimals
      },
      {
        network: CONFIG.network,
        signerPrivateKey: CONFIG.signerPrivateKey
      }
    );
    console.log(`Estimated fee: ${feeEstimate.totalFee} lamports (${Number(feeEstimate.totalFee) / 1e9} SOL)\n`);

    // Transfer tokens
    console.log('Transferring tokens...');
    const result = await modernSolanaTokenTransferService.transferTokens(
      {
        mint: CONFIG.mint,
        from: CONFIG.from,
        to: CONFIG.to,
        amount: CONFIG.amount,
        decimals: CONFIG.decimals,
        memo: 'Test transfer from Modern Service'
      },
      {
        network: CONFIG.network,
        signerPrivateKey: CONFIG.signerPrivateKey,
        createDestinationATA: true
      }
    );

    if (result.success) {
      console.log('✅ Transfer successful!');
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Source ATA: ${result.sourceATA}`);
      console.log(`   Destination ATA: ${result.destinationATA}`);
      console.log(`   Explorer: ${result.explorerUrl}`);
      console.log(`   Confirmation time: ${result.confirmationTime}ms`);
    } else {
      console.error('❌ Transfer failed:');
      result.errors?.forEach(error => console.error(`   - ${error}`));
    }

    // Get balance after
    const balanceAfter = await modernSolanaTokenTransferService.getTokenBalance(
      CONFIG.mint,
      CONFIG.from,
      CONFIG.network
    );
    console.log(`\nBalance after: ${balanceAfter} (${Number(balanceAfter) / 10 ** CONFIG.decimals} USDC)`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 2: Simple Service (Sample-Code-Based)
// ============================================================================

async function exampleSimpleService() {
  console.log('═══════════════════════════════════════════════');
  console.log('EXAMPLE 2: Simple Service (Sample-Code-Based)');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Get balance before
    const balanceBefore = await simpleSolanaTokenTransferService.getTokenBalance(
      CONFIG.mint,
      CONFIG.from,
      CONFIG.network
    );
    console.log(`Balance before: ${balanceBefore} (${Number(balanceBefore) / 10 ** CONFIG.decimals} USDC)\n`);

    // Transfer tokens
    console.log('Transferring tokens...');
    const result = await simpleSolanaTokenTransferService.transferTokens(
      {
        mint: CONFIG.mint,
        from: CONFIG.from,
        to: CONFIG.to,
        amount: CONFIG.amount,
        memo: 'Test transfer from Simple Service'
      },
      {
        network: CONFIG.network,
        signerPrivateKey: CONFIG.signerPrivateKey
      }
    );

    if (result.success) {
      console.log('✅ Transfer successful!');
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Source ATA: ${result.sourceATA}`);
      console.log(`   Destination ATA: ${result.destinationATA}`);
      console.log(`   Explorer: ${result.explorerUrl}`);
    } else {
      console.error('❌ Transfer failed:', result.error);
    }

    // Get balance after
    const balanceAfter = await simpleSolanaTokenTransferService.getTokenBalance(
      CONFIG.mint,
      CONFIG.from,
      CONFIG.network
    );
    console.log(`\nBalance after: ${balanceAfter} (${Number(balanceAfter) / 10 ** CONFIG.decimals} USDC)`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 3: Verify Transfer (Simple Service Feature)
// ============================================================================

async function exampleVerifyTransfer() {
  console.log('═══════════════════════════════════════════════');
  console.log('EXAMPLE 3: Verify Transfer (Simple Service)');
  console.log('═══════════════════════════════════════════════\n');

  try {
    console.log('Transferring with verification...');
    const verification = await simpleSolanaTokenTransferService.verifyTransfer(
      {
        mint: CONFIG.mint,
        from: CONFIG.from,
        to: CONFIG.to,
        amount: CONFIG.amount
      },
      {
        network: CONFIG.network,
        signerPrivateKey: CONFIG.signerPrivateKey
      }
    );

    console.log('\n📊 Verification Results:');
    console.log(`   Verified: ${verification.verified ? '✅ YES' : '❌ NO'}`);
    console.log(`\n   Source Account:`);
    console.log(`     Before: ${verification.sourceBefore}`);
    console.log(`     After:  ${verification.sourceAfter}`);
    console.log(`     Change: ${verification.sourceAfter - verification.sourceBefore}`);
    console.log(`\n   Destination Account:`);
    console.log(`     Before: ${verification.destBefore}`);
    console.log(`     After:  ${verification.destAfter}`);
    console.log(`     Change: ${verification.destAfter - verification.destBefore}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 4: Compare Both Services
// ============================================================================

async function compareServices() {
  console.log('═══════════════════════════════════════════════');
  console.log('EXAMPLE 4: Compare Both Services');
  console.log('═══════════════════════════════════════════════\n');

  const params = {
    mint: CONFIG.mint,
    from: CONFIG.from,
    to: CONFIG.to,
    amount: 100n // Small amount for testing
  };

  const options = {
    network: CONFIG.network,
    signerPrivateKey: CONFIG.signerPrivateKey
  };

  // Test Modern Service
  console.log('🔵 Testing Modern Service...');
  const modernStart = Date.now();
  const modernResult = await modernSolanaTokenTransferService.transferTokens(
    { ...params, decimals: CONFIG.decimals },
    options
  );
  const modernTime = Date.now() - modernStart;

  console.log(`   Result: ${modernResult.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Time: ${modernTime}ms`);
  if (modernResult.success) {
    console.log(`   Signature: ${modernResult.signature}`);
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test Simple Service
  console.log('\n🟢 Testing Simple Service...');
  const simpleStart = Date.now();
  const simpleResult = await simpleSolanaTokenTransferService.transferTokens(
    params,
    options
  );
  const simpleTime = Date.now() - simpleStart;

  console.log(`   Result: ${simpleResult.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Time: ${simpleTime}ms`);
  if (simpleResult.success) {
    console.log(`   Signature: ${simpleResult.signature}`);
  }

  // Compare
  console.log('\n📊 Comparison:');
  console.log(`   Modern Service: ${modernTime}ms`);
  console.log(`   Simple Service: ${simpleTime}ms`);
  console.log(`   Difference: ${Math.abs(modernTime - simpleTime)}ms`);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  // Uncomment the example you want to run:

  // await exampleModernService();
  // await exampleSimpleService();
  // await exampleVerifyTransfer();
  // await compareServices();

  console.log('\n✅ Uncomment an example in the code to run it!');
  console.log('Examples available:');
  console.log('  - exampleModernService()');
  console.log('  - exampleSimpleService()');
  console.log('  - exampleVerifyTransfer()');
  console.log('  - compareServices()');
}

// Export for use in other files
export {
  exampleModernService,
  exampleSimpleService,
  exampleVerifyTransfer,
  compareServices
};

// Run if executed directly
main().catch(console.error);
