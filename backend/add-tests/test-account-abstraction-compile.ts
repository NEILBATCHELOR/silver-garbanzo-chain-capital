#!/usr/bin/env tsx

/**
 * Account Abstraction Services - TypeScript Compilation Test
 * 
 * Test script to verify TypeScript compilation of Account Abstraction services
 */

console.log('🧪 Testing Account Abstraction Services TypeScript Compilation...')

try {
  // Test imports
  const { UserOperationService } = require('./src/services/wallets/account-abstraction/UserOperationService.js')
  const { BatchOperationService } = require('./src/services/wallets/account-abstraction/BatchOperationService.js')
  const { PaymasterService } = require('./src/services/wallets/account-abstraction/PaymasterService.js')
  
  console.log('✅ All services imported successfully')
  
  // Test service instantiation
  const userOpService = new UserOperationService()
  const batchService = new BatchOperationService()
  const paymasterService = new PaymasterService()
  
  console.log('✅ All services instantiated successfully')
  console.log('✅ Account Abstraction services compilation test passed!')
  
} catch (error) {
  console.error('❌ Compilation test failed:', error.message)
  process.exit(1)
}
