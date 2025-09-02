#!/usr/bin/env tsx

// Test individual imports to isolate the problematic module
import { config } from 'dotenv'
config()

console.log('🔍 Testing individual server imports...')

async function testImport(modulePath: string, description: string) {
  try {
    await import(modulePath)
    console.log(`✅ ${description}`)
    return true
  } catch (error) {
    console.error(`❌ ${description}`)
    console.error('Error:', error instanceof Error ? error.message : error)
    return false
  }
}

async function runTests() {
  console.log('\n📦 Testing core imports...')
  await testImport('fastify', 'Fastify')
  await testImport('./src/utils/logger.js', 'Logger utility')
  await testImport('./src/infrastructure/database/client.js', 'Database client')
  await testImport('./src/config/swagger.js', 'Swagger config')
  
  console.log('\n🛡️ Testing middleware imports...')
  await testImport('./src/middleware/audit/audit-middleware.js', 'Audit middleware')
  await testImport('./src/middleware/audit/system-audit-monitor.js', 'System audit monitor')
  await testImport('./src/middleware/auth/jwt-auth.js', 'JWT auth middleware')
  
  console.log('\n🛣️ Testing route imports...')
  await testImport('./src/routes/projects.js', 'Projects routes')
  await testImport('./src/routes/investors.js', 'Investors routes')
  await testImport('./src/routes/captable.js', 'Cap table routes')
  await testImport('./src/routes/audit.js', 'Audit routes')
  await testImport('./src/routes/tokens.js', 'Tokens routes')
  await testImport('./src/routes/users.js', 'Users routes')
  await testImport('./src/routes/wallets.js', 'Wallets routes')
  await testImport('./src/routes/documents.js', 'Documents routes')
  await testImport('./src/routes/subscriptions.js', 'Subscriptions routes')
  await testImport('./src/routes/policy.js', 'Policy routes')
  await testImport('./src/routes/rules.js', 'Rules routes')
  await testImport('./src/routes/factoring.js', 'Factoring routes')
  await testImport('./src/routes/auth/index.js', 'Auth routes')
  
  console.log('\n🎯 Testing main server file...')
  const serverSuccess = await testImport('./src/server-development.js', 'Main server development file')
  
  if (serverSuccess) {
    console.log('\n🎉 All imports successful! Server should be able to start.')
  } else {
    console.log('\n⚠️ Found issues with imports. Check the errors above.')
  }
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})
