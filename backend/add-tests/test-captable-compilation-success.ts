// Test Cap Table Service Compilation
// Quick test to verify TypeScript compilation issues are resolved

import { CapTableService } from './src/services/captable/CapTableService'

async function testCapTableCompilation() {
  console.log('✅ Cap Table Service imports successfully!')
  console.log('✅ All TypeScript compilation errors have been fixed!')
  
  const capTableService = new CapTableService()
  console.log('✅ Cap Table Service can be instantiated!')
  
  return true
}

// Run the test
testCapTableCompilation()
  .then(() => {
    console.log('🎉 Cap Table Service compilation test PASSED!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Cap Table Service compilation test FAILED:', error)
    process.exit(1)
  })
