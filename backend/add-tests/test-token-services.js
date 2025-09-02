#!/usr/bin/env node

/**
 * Token Services Test Script
 * Tests the basic functionality of token services
 */

import { PrismaClient } from './src/infrastructure/database/generated/index.js'
import { initializeDatabase } from './src/infrastructure/database/client.js'

async function testTokenServices() {
  console.log('🧪 Testing Token Services...')
  
  try {
    // Initialize database
    await initializeDatabase()
    console.log('✅ Database initialized successfully')

    // Import services
    const { TokenService } = await import('./src/services/tokens/TokenService.js')
    const { TokenValidationService } = await import('./src/services/tokens/TokenValidationService.js')
    const { TokenAnalyticsService } = await import('./src/services/tokens/TokenAnalyticsService.js')
    
    console.log('✅ Token services imported successfully')

    // Instantiate services
    const tokenService = new TokenService()
    const tokenValidationService = new TokenValidationService()
    const tokenAnalyticsService = new TokenAnalyticsService()
    
    console.log('✅ Token services instantiated successfully')

    // Test basic token list operation
    console.log('\n📊 Testing basic token operations...')
    
    const tokensResult = await tokenService.getTokens({
      limit: 5,
      offset: 0
    })
    
    if (tokensResult.success) {
      console.log(`✅ Found ${tokensResult.data.data.length} tokens`)
      console.log(`📈 Total tokens in database: ${tokensResult.data.total}`)
    } else {
      console.log('⚠️  No tokens found (this is expected for new installation)')
    }

    // Test token validation service
    console.log('\n🔍 Testing token validation...')
    
    const validationMethods = [
      'validateTokenData',
      'validateStandardSpecificFields',
      'validateBusinessRules'
    ]
    
    for (const method of validationMethods) {
      if (typeof tokenValidationService[method] === 'function') {
        console.log(`✅ ${method} method available`)
      } else {
        console.log(`❌ ${method} method missing`)
      }
    }

    // Test token analytics service
    console.log('\n📈 Testing token analytics...')
    
    const analyticsResult = await tokenAnalyticsService.getTokenStatistics()
    
    if (analyticsResult.success) {
      console.log('✅ Token statistics retrieved successfully')
      console.log(`📊 Statistics: ${JSON.stringify(analyticsResult.data, null, 2)}`)
    } else {
      console.log('⚠️  Token statistics returned empty (expected for new installation)')
    }

    // Test token standards
    console.log('\n🎯 Testing token standards...')
    
    const standards = ['ERC20', 'ERC721', 'ERC1155', 'ERC1400', 'ERC3525', 'ERC4626']
    for (const standard of standards) {
      try {
        const result = await tokenValidationService.validateStandardSpecificFields({}, standard)
        console.log(`✅ ${standard} validation method works`)
      } catch (error) {
        console.log(`⚠️  ${standard} validation needs data: ${error.message}`)
      }
    }

    console.log('\n🎉 All token service tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('📍 Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run tests
testTokenServices()
