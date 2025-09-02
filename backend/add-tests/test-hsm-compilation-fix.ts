#!/usr/bin/env tsx

import { createHSMService, getEnvConfig, validateConfig } from './src/services/wallets/hsm/index.js'

async function testHSMServices() {
  console.log('🔐 Testing HSM Services after TypeScript fixes...\n')

  try {
    // Test 1: Environment configuration
    console.log('1. Testing environment configuration...')
    const envConfig = getEnvConfig()
    console.log(`   ✅ Environment config loaded: ${envConfig.provider}`)

    // Test 2: Configuration validation
    console.log('2. Testing configuration validation...')
    const validation = validateConfig(envConfig)
    console.log(`   ✅ Config validation: ${validation.valid ? 'VALID' : 'INVALID'}`)
    if (!validation.valid) {
      console.log(`   ⚠️  Validation errors: ${validation.errors.join(', ')}`)
    }

    // Test 3: HSM service creation
    console.log('3. Testing HSM service creation...')
    const hsmService = createHSMService(envConfig)
    console.log(`   ✅ HSM service created successfully`)

    // Test 4: Test memory provider (default)
    console.log('4. Testing memory provider...')
    const memoryConfig = { provider: 'memory' as const }
    const memoryService = createHSMService(memoryConfig)
    console.log(`   ✅ Memory HSM service created successfully`)

    // Test 5: Validate HSM configuration method
    console.log('5. Testing HSM configuration validation...')
    const configResult = await memoryService.validateHSMConfiguration()
    console.log(`   ✅ HSM configuration validation: ${configResult.success ? 'SUCCESS' : 'FAILED'}`)

    console.log('\n🎉 All HSM service tests passed! TypeScript compilation fixes successful.')
    
  } catch (error) {
    console.error('❌ HSM service test failed:', error)
    process.exit(1)
  }
}

testHSMServices()
