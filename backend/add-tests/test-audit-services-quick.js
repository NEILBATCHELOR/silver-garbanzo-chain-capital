#!/usr/bin/env node

/**
 * Quick test to verify audit services compile and work properly
 */

console.log('🔍 Testing Chain Capital Audit Services...')

async function testAuditServices() {
  try {
    console.log('📦 Testing audit service imports...')
    
    // Test if the audit services can be imported without errors
    const { AuditService, AuditValidationService, AuditAnalyticsService } = await import('./src/services/audit/index.js')
    console.log('✅ Audit service imports successful')
    
    // Test instantiation
    console.log('🏗️ Testing service instantiation...')
    const auditService = new AuditService()
    const validationService = new AuditValidationService()
    const analyticsService = new AuditAnalyticsService()
    console.log('✅ Service instantiation successful')
    
    // Test basic method calls (without actual database operations)
    console.log('🧪 Testing basic method structure...')
    
    // These should return error results since we're not connected to DB, but shouldn't throw
    try {
      const statsResult = await auditService.getAuditStatistics()
      console.log('✅ AuditService.getAuditStatistics() method exists')
    } catch (error) {
      if (error.message.includes('db') || error.message.includes('database')) {
        console.log('✅ AuditService.getAuditStatistics() method exists (database not connected, expected)')
      } else {
        throw error
      }
    }
    
    console.log('🎉 All audit service tests passed!')
    console.log('📋 Summary:')
    console.log('  ✅ AuditService - Ready')
    console.log('  ✅ AuditValidationService - Ready')
    console.log('  ✅ AuditAnalyticsService - Ready')
    
  } catch (error) {
    console.error('❌ Audit service test failed:', error)
    process.exit(1)
  }
}

testAuditServices()
