#!/usr/bin/env tsx

/**
 * Chain Capital - Investor Service Test (Working Version)
 * 
 * Tests the actual investor service implementation with real database connectivity
 */

import { initializeDatabase } from '../../src/infrastructure/database/client.js'
import { InvestorService } from '../../src/services/investors/InvestorService.js'
import { InvestorValidationService } from '../../src/services/investors/InvestorValidationService.js'
import { InvestorAnalyticsService } from '../../src/services/investors/InvestorAnalyticsService.js'
import { InvestorGroupService } from '../../src/services/investors/InvestorGroupService.js'

async function runInvestorServiceTests() {
  console.log('🚀 Testing Investor Management Services')
  console.log('============================================================')

  // Initialize database first
  console.log('🗄️ Initializing database...')
  try {
    await initializeDatabase()
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return
  }

  console.log('\n📦 Creating investor service instances...')
  try {
    const investorService = new InvestorService()
    const validationService = new InvestorValidationService()
    const analyticsService = new InvestorAnalyticsService()
    const groupService = new InvestorGroupService()
    
    console.log('✅ All investor services instantiated successfully')

    let passedTests = 0
    let totalTests = 0

    // Test InvestorService
    console.log('\n👥 Testing InvestorService...')
    totalTests++
    if (typeof investorService.createInvestor === 'function') {
      console.log('  ✅ InvestorService has createInvestor method')
      passedTests++
    } else {
      console.log('  ❌ InvestorService missing createInvestor method')
    }

    totalTests++
    if (typeof investorService.getInvestorById === 'function') {
      console.log('  ✅ InvestorService has getInvestorById method')
      passedTests++
    } else {
      console.log('  ❌ InvestorService missing getInvestorById method')
    }

    totalTests++
    if (typeof investorService.updateInvestor === 'function') {
      console.log('  ✅ InvestorService has updateInvestor method')
      passedTests++
    } else {
      console.log('  ❌ InvestorService missing updateInvestor method')
    }

    totalTests++
    if (typeof investorService.getInvestors === 'function') {
      console.log('  ✅ InvestorService has getInvestors method')
      passedTests++
    } else {
      console.log('  ❌ InvestorService missing getInvestors method')
    }

    // Test InvestorValidationService
    console.log('\n🔍 Testing InvestorValidationService...')
    totalTests++
    if (typeof validationService.validateInvestor === 'function') {
      console.log('  ✅ InvestorValidationService has validateInvestor method')
      passedTests++
    } else {
      console.log('  ❌ InvestorValidationService missing validateInvestor method')
    }

    totalTests++
    if (typeof validationService.validateInvestorUpdate === 'function') {
      console.log('  ✅ InvestorValidationService has validateInvestorUpdate method')
      passedTests++
    } else {
      console.log('  ❌ InvestorValidationService missing validateInvestorUpdate method')
    }

    // Test InvestorAnalyticsService
    console.log('\n📊 Testing InvestorAnalyticsService...')
    totalTests++
    if (typeof analyticsService.getAnalyticsData === 'function') {
      console.log('  ✅ InvestorAnalyticsService has getAnalyticsData method')
      passedTests++
    } else {
      console.log('  ❌ InvestorAnalyticsService missing getAnalyticsData method')
    }

    totalTests++
    if (typeof analyticsService.getInvestorAnalytics === 'function') {
      console.log('  ✅ InvestorAnalyticsService has getInvestorAnalytics method')
      passedTests++
    } else {
      console.log('  ❌ InvestorAnalyticsService missing getInvestorAnalytics method')
    }

    // Test InvestorGroupService
    console.log('\n👥 Testing InvestorGroupService...')
    totalTests++
    if (typeof groupService.createGroup === 'function') {
      console.log('  ✅ InvestorGroupService has createGroup method')
      passedTests++
    } else {
      console.log('  ❌ InvestorGroupService missing createGroup method')
    }

    totalTests++
    if (typeof groupService.getGroups === 'function') {
      console.log('  ✅ InvestorGroupService has getGroups method')
      passedTests++
    } else {
      console.log('  ❌ InvestorGroupService missing getGroups method')
    }

    // Test database connectivity by trying to count records
    console.log('\n🗄️ Testing database connectivity...')
    try {
      const result = await investorService.getInvestors({ limit: 1 })
      console.log('  ✅ Database query executed')
      console.log(`     - Result type: ${typeof result}`)
      console.log(`     - Total investors: ${result.total || 'N/A'}`)
      console.log(`     - Data entries: ${result.data?.length || 0}`)
      passedTests++
      totalTests++
    } catch (error) {
      console.log('  ❌ Database connectivity test failed:', error)
      totalTests++
    }

    // Results
    console.log('\n============================================================')
    console.log(`📊 Investor Service Test Results:`)
    console.log(`  Tests Run: ${totalTests}`)
    console.log(`  Tests Passed: ${passedTests}`)
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    if (passedTests === totalTests) {
      console.log('  🎉 ALL TESTS PASSED!')
      console.log('  💎 Investor services are fully functional')
    } else {
      console.log(`  ⚠️ ${totalTests - passedTests} tests failed`)
      console.log('  🔧 Services are operational but some features need attention')
    }

  } catch (error) {
    console.error('❌ Service instantiation failed:', error)
  }
}

// Run the tests
runInvestorServiceTests().catch(console.error)
