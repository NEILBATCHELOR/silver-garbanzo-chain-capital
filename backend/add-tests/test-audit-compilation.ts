import { AuditService } from './services/audit/AuditService.js'
import { AuditCategory, AuditSeverity } from './services/audit/types.js'

// Simple test script to validate audit service TypeScript compilation
console.log('Testing audit service TypeScript compilation...')

const auditService = new AuditService()

// Test basic audit event creation
auditService.createAuditEvent({
  action: 'TEST_ACTION',
  category: AuditCategory.SYSTEM_PROCESS,
  severity: AuditSeverity.LOW,
  details: 'Test audit event',
  source: 'test'
}).then(result => {
  console.log('✅ Audit service compiles and runs successfully')
  process.exit(0)
}).catch(error => {
  console.error('❌ Audit service error:', error)
  process.exit(1)
})
