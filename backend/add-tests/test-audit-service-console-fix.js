/**
 * Test AuditService directly to isolate the 500 error
 */

import { AuditService } from './dist/services/audit/AuditService.js'

async function testAuditService() {
  console.log('🧪 Testing AuditService directly...')
  
  try {
    console.log('📦 Creating AuditService instance...')
    const auditService = new AuditService()
    
    console.log('📤 Creating audit event...')
    const result = await auditService.createAuditEvent({
      action: 'direct_service_test',
      category: 'user_action',
      severity: 'low',
      details: 'Testing AuditService directly'
    })
    
    console.log('📊 Result:', result)
    
    if (result.success) {
      console.log('✅ SUCCESS! Event created via service')
      console.log('📝 Event ID:', result.data?.id)
    } else {
      console.log('❌ Service returned error:', result.error)
      console.log('📋 Error code:', result.code)
    }
    
  } catch (error) {
    console.log('❌ EXCEPTION in AuditService test:', error.message)
    console.log('📋 Stack trace:', error.stack)
  }
}

testAuditService()
