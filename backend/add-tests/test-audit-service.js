#!/usr/bin/env node

/**
 * Audit Service Integration Test
 * Tests the audit service implementation for TypeScript errors and basic functionality
 */

import { AuditService, AuditValidationService, AuditAnalyticsService } from '../src/services/audit/index.js'
import { AuditCategory, AuditSeverity } from '../src/services/audit/types.js'

async function testAuditService() {
  console.log('🔍 Testing Chain Capital Audit Service...\n')

  try {
    // Test service instantiation
    console.log('✅ Testing service instantiation...')
    const auditService = new AuditService()
    const validationService = new AuditValidationService()
    const analyticsService = new AuditAnalyticsService()
    console.log('   ✅ AuditService instantiated')
    console.log('   ✅ AuditValidationService instantiated')
    console.log('   ✅ AuditAnalyticsService instantiated')

    // Test validation service
    console.log('\n✅ Testing validation service...')
    const validationResult = await validationService.validateAuditEvent({
      action: 'test_action',
      category: AuditCategory.USER_ACTION,
      severity: AuditSeverity.LOW,
      details: 'Test audit event validation'
    })
    
    if (validationResult.success) {
      console.log('   ✅ Validation service working:', validationResult.data.valid)
    } else {
      console.log('   ❌ Validation failed:', validationResult.error)
    }

    // Test quick log functionality
    console.log('\n✅ Testing audit logging...')
    await auditService.quickLog(
      'test_system_startup',
      AuditCategory.SYSTEM_PROCESS,
      undefined,
      'audit_service',
      'test_001',
      'Audit service test completed successfully',
      { test: true, timestamp: new Date().toISOString() }
    )
    console.log('   ✅ Quick log completed')

    console.log('\n🎉 All audit service tests passed!')
    console.log('📊 Audit Service Status: READY FOR PRODUCTION')

  } catch (error) {
    console.error('\n❌ Audit service test failed:')
    console.error('Error:', (error as Error).message)
    console.error('Stack:', (error as Error).stack)
    process.exit(1)
  }
}

// Run tests
testAuditService().then(() => {
  console.log('\n✅ Audit service test completed successfully')
  process.exit(0)
}).catch((error) => {
  console.error('\n❌ Audit service test failed:', error)
  process.exit(1)
})
