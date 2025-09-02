#!/usr/bin/env node

/**
 * Quick Backend Audit API Test
 * Tests if the backend audit service is running and accessible
 */

const BASE_URL = 'http://localhost:3001'

async function testEndpoint(url, description) {
  try {
    console.log(`🧪 Testing: ${description}`)
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS: ${response.status} ${response.statusText}`)
      console.log(`   📊 Data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`)
    } else {
      console.log(`   ❌ FAILED: ${response.status} ${response.statusText}`)
      console.log(`   📄 Error: ${JSON.stringify(data, null, 2)}`)
    }
    
    console.log('')
    return response.ok
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`)
    console.log('')
    return false
  }
}

async function runTests() {
  console.log('🚀 Chain Capital Backend Audit API Test')
  console.log('='.repeat(50))
  console.log('')
  
  const tests = [
    [`${BASE_URL}/health`, 'Backend Health Check'],
    [`${BASE_URL}/ready`, 'Backend Ready Check'],
    [`${BASE_URL}/api/v1/audit/health`, 'Audit Service Health'],
    [`${BASE_URL}/api/v1/audit/statistics`, 'Audit Statistics'],
    [`${BASE_URL}/api/v1/audit/analytics`, 'Audit Analytics'],
    [`${BASE_URL}/api/v1/audit/events?limit=5`, 'Audit Events List'],
  ]
  
  let passed = 0
  let total = tests.length
  
  for (const [url, description] of tests) {
    const success = await testEndpoint(url, description)
    if (success) passed++
  }
  
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(30))
  console.log(`✅ Passed: ${passed}/${total}`)
  console.log(`❌ Failed: ${total - passed}/${total}`)
  console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`)
  console.log('')
  
  if (passed === 0) {
    console.log('🚨 BACKEND NOT RUNNING')
    console.log('Please start the backend server:')
    console.log('   cd backend')
    console.log('   npm run dev')
    console.log('')
  } else if (passed < total) {
    console.log('⚠️  PARTIAL SUCCESS')
    console.log('Some audit endpoints are not working properly.')
    console.log('Check backend logs for specific errors.')
    console.log('')
  } else {
    console.log('🎉 ALL TESTS PASSED')
    console.log('Backend audit service is fully operational!')
    console.log('')
  }
  
  return passed === total
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { runTests, testEndpoint }
