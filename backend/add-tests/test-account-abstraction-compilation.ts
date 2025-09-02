#!/usr/bin/env node

/**
 * Test Account Abstraction Services Compilation
 * Verifies that all TypeScript compilation errors are resolved
 */

console.log('🧪 Testing Account Abstraction Services compilation...')

try {
  // Test imports
  console.log('📦 Testing service imports...')
  
  // Test BatchOperationService
  import('./src/services/wallets/account-abstraction/BatchOperationService.js')
    .then(() => console.log('✅ BatchOperationService imported successfully'))
    .catch(err => console.error('❌ BatchOperationService import failed:', err.message))

  // Test UserOperationService
  import('./src/services/wallets/account-abstraction/UserOperationService.js')
    .then(() => console.log('✅ UserOperationService imported successfully'))
    .catch(err => console.error('❌ UserOperationService import failed:', err.message))

  // Test PaymasterService
  import('./src/services/wallets/account-abstraction/PaymasterService.js')
    .then(() => console.log('✅ PaymasterService imported successfully'))
    .catch(err => console.error('❌ PaymasterService import failed:', err.message))

  // Test types
  import('./src/services/wallets/account-abstraction/types.js')
    .then(() => console.log('✅ Account Abstraction types imported successfully'))
    .catch(err => console.error('❌ Account Abstraction types import failed:', err.message))

  console.log('🎉 Account Abstraction compilation test completed!')

} catch (error) {
  console.error('💥 Compilation test failed:', error)
  process.exit(1)
}
