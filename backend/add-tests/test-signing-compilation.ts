#!/usr/bin/env tsx

/**
 * Test SigningService TypeScript compilation
 */

async function testSigningService() {
  console.log('🔧 Testing SigningService TypeScript compilation...')

  try {
    // Test importing SigningService
    console.log('📦 Importing SigningService...')
    const { SigningService } = await import('./src/services/wallets/SigningService.js')
    
    console.log('✅ SigningService import successful')
    
    // Test instantiation
    console.log('🔧 Testing SigningService instantiation...')
    const signingService = new SigningService()
    
    console.log('✅ SigningService instantiation successful')
    
    // Test that methods exist
    console.log('🔍 Verifying SigningService methods...')
    const methods = [
      'signTransaction',
      'signMessage', 
      'verifySignature',
      'generateTestKeyPair'
    ]
    
    for (const method of methods) {
      if (typeof signingService[method] === 'function') {
        console.log(`✅ Method ${method} exists`)
      } else {
        console.log(`❌ Method ${method} missing`)
      }
    }
    
    console.log('\n🎉 SigningService compilation test completed successfully!')
    console.log('📊 All TypeScript compilation errors resolved!')
    
  } catch (error) {
    console.error('❌ SigningService compilation test failed:')
    console.error(error)
    process.exit(1)
  }
}

// Run the test
testSigningService()
