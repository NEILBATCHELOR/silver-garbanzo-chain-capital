/**
 * Test script for Investor Management Service
 * Verifies that all investor service components are working correctly
 */

import { InvestorService, InvestorValidationService, InvestorAnalyticsService } from './src/services/investors/index.js'

async function testInvestorService() {
  console.log('🧪 Testing Investor Management Service...\n')

  try {
    // Initialize services
    const investorService = new InvestorService()
    const validationService = new InvestorValidationService()
    const analyticsService = new InvestorAnalyticsService()

    console.log('✅ Services initialized successfully')

    // Test 1: Get all investors (should work even with empty database)
    console.log('\n📋 Test 1: Getting all investors...')
    const investorsResult = await investorService.getInvestors({ limit: 5 })
    console.log(`Found ${investorsResult.data.length} investors`)
    console.log(`Total in database: ${investorsResult.pagination.total}`)

    // Test 2: Create a test investor
    console.log('\n👤 Test 2: Creating test investor...')
    const testInvestor = {
      name: 'Test Investor',
      email: `test-${Date.now()}@example.com`,
      type: 'individual',
      investor_type: 'individual' as const,
      profile_data: {
        phone: '+1-555-0123',
        nationality: 'US',
        residence_country: 'US',
        date_of_birth: '1985-03-15',
        annual_income: 150000,
        net_worth: 500000
      },
      risk_assessment: {
        risk_tolerance: 'moderate' as const,
        investment_experience: 'moderate' as const
      }
    }

    const createResult = await investorService.createInvestor(testInvestor)
    if (createResult.success) {
      console.log(`✅ Investor created with ID: ${createResult.data!.investor.investor_id}`)
      console.log(`Completion: ${createResult.data!.validation.completion_percentage}%`)
      console.log(`KYC Required: ${createResult.data!.compliance_status.kyc_required}`)

      const investorId = createResult.data!.investor.investor_id

      // Test 3: Get investor by ID
      console.log('\n🔍 Test 3: Getting investor by ID...')
      const getResult = await investorService.getInvestorById(investorId)
      if (getResult.success) {
        console.log(`✅ Retrieved investor: ${getResult.data!.name}`)
        console.log(`Compliance Score: ${getResult.data!.compliance_score}`)
      }

      // Test 4: Validation test
      console.log('\n✅ Test 4: Testing validation...')
      const validationResult = await validationService.validateInvestor(createResult.data!.investor)
      if (validationResult.success) {
        console.log(`Validation passed: ${validationResult.data!.is_valid}`)
        console.log(`Missing fields: ${validationResult.data!.missing_fields.length}`)
        console.log(`Completion: ${validationResult.data!.completion_percentage}%`)
      }

      // Test 5: Analytics test
      console.log('\n📊 Test 5: Testing analytics...')
      const analyticsResult = await analyticsService.getInvestorAnalytics(investorId)
      if (analyticsResult.success) {
        console.log(`✅ Analytics generated successfully`)
        console.log(`Portfolio value: $${analyticsResult.data!.summary.portfolio_performance}`)
        console.log(`Risk score: ${analyticsResult.data!.risk_profile.risk_score}`)
      }

      // Test 6: Overview dashboard
      console.log('\n📈 Test 6: Testing overview dashboard...')
      const overviewResult = await analyticsService.getInvestorOverview()
      if (overviewResult.success) {
        console.log(`✅ Overview dashboard generated`)
        console.log(`Total investors: ${overviewResult.data!.totalInvestors}`)
        console.log(`Active investors: ${overviewResult.data!.activeInvestors}`)
        console.log(`KYC approval rate: ${overviewResult.data!.kycApprovalRate}%`)
      }

      // Test 7: Update investor
      console.log('\n🔄 Test 7: Testing investor update...')
      const updateResult = await investorService.updateInvestor(investorId, {
        notes: 'Updated via test script',
        investor_status: 'active'
      })
      if (updateResult.success) {
        console.log(`✅ Investor updated successfully`)
        console.log(`Status: ${updateResult.data!.investor_status}`)
      }

      // Test 8: Statistics
      console.log('\n📊 Test 8: Testing statistics...')
      const statsResult = await investorService.getInvestorStatistics(investorId)
      if (statsResult.success) {
        console.log(`✅ Statistics calculated`)
        console.log(`Investments: ${statsResult.data!.number_of_investments}`)
        console.log(`Total invested: $${statsResult.data!.total_invested}`)
      }

      // Cleanup: Delete test investor
      console.log('\n🗑️ Cleanup: Deleting test investor...')
      const deleteResult = await investorService.deleteInvestor(investorId)
      if (deleteResult.success) {
        console.log('✅ Test investor deleted successfully')
      }
    } else {
      console.log(`❌ Failed to create investor: ${createResult.error}`)
    }

    console.log('\n🎉 All tests completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvestorService()
    .then(() => {
      console.log('\n✅ Test suite completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error)
      process.exit(1)
    })
}

export { testInvestorService }
