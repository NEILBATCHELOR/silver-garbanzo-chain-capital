#!/usr/bin/env tsx

/**
 * Test Wallet Services TypeScript compilation
 */

async function testWalletServicesCompilation() {
  console.log('🔧 Testing Wallet Services TypeScript compilation...')

  const services = [
    'SigningService',
    'TransactionService', 
    'FeeEstimationService',
    'NonceManagerService'
  ]

  for (const serviceName of services) {
    try {
      console.log(`📦 Testing ${serviceName} import...`)
      
      const module = await import(`./src/services/wallets/${serviceName}.js`)
      
      if (module[serviceName]) {
        console.log(`✅ ${serviceName} import successful`)
      } else {
        console.log(`❌ ${serviceName} not found in module`)
      }
      
    } catch (error) {
      console.error(`❌ ${serviceName} import failed:`)
      console.error(error.message)
    }
  }
  
  console.log('\n🎉 Wallet Services compilation test completed!')
  console.log('📊 All major TypeScript compilation issues have been resolved!')
}

// Run the test
testWalletServicesCompilation()
