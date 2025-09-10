#!/usr/bin/env node

/**
 * Test script to verify DFNS wallet ID validation fixes
 */

// Test the validation patterns directly
function testWalletIdValidation() {
  console.log('🧪 Testing DFNS Wallet ID Validation');
  console.log('=====================================');

  // Test wallet IDs from actual DFNS documentation and errors
  const testWalletIds = [
    'wa-36nio-o3cs4-92lok31j1glv68jn',      // From actual error
    'wa-1f04s-lqc9q-xxxxxxxxxxxxxxxx',      // From DFNS docs
    'wa-341e6-12nj6-xxxxxxxxxxxxxxxx',      // From DFNS docs  
    'wa-4jbf7-s8lob-xxxxxxxxxxxxxxxx',      // From DFNS docs
    'wa-1234-5678-abcdef1234567890',        // Old pattern (should fail)
    'invalid-wallet-id',                    // Invalid format
    'wa-too-short-id',                      // Too short
  ];

  // Updated validation pattern (fixed)
  const walletIdPattern = /^wa-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{16}$/;

  testWalletIds.forEach(walletId => {
    const isValid = walletIdPattern.test(walletId);
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`${status}: ${walletId}`);
  });

  console.log('\n📊 Test Results:');
  console.log('- First 4 wallet IDs should be VALID (real DFNS format)');
  console.log('- Last 3 wallet IDs should be INVALID (wrong format)');
}

// Test transfer ID validation  
function testTransferIdValidation() {
  console.log('\n🧪 Testing DFNS Transfer ID Validation');
  console.log('======================================');

  const testTransferIds = [
    'tr-12345-67890-abcdef1234567890',      // Correct format
    'tr-abc12-def34-1234567890abcdef',      // Correct format
    'tr-1234-5678-abcdef1234567890',        // Old pattern (should fail)
    'invalid-transfer-id',                   // Invalid format
  ];

  // Updated validation pattern (fixed)
  const transferIdPattern = /^tr-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{16}$/;

  testTransferIds.forEach(transferId => {
    const isValid = transferIdPattern.test(transferId);
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`${status}: ${transferId}`);
  });
}

// Run tests
async function main() {
  try {
    testWalletIdValidation();
    testTransferIdValidation();
    
    console.log('\n🎉 Validation tests completed!');
    console.log('✅ If the patterns show VALID/INVALID as expected, the fix is working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
main();
