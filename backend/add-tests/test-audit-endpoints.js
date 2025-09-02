#!/usr/bin/env node

/**
 * Test script to verify audit endpoints are accessible
 * Run this to debug the 404 error in FrontendAuditService
 */

// Using built-in fetch (Node 18+)

const API_BASE_URL = 'http://localhost:3001/api/v1'

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    console.log(`\n🔍 Testing ${method} ${API_BASE_URL}${endpoint}`)
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Success:`, JSON.stringify(data, null, 2).slice(0, 200) + '...')
    } else {
      console.log(`   ❌ Failed: ${response.status} ${response.statusText}`)
    }
    
    return response
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('🚀 Testing Chain Capital Backend Audit Endpoints')
  console.log(`📡 Base URL: ${API_BASE_URL}`)
  
  // Test server health first
  console.log('\n📋 Testing Server Health...')
  await testEndpoint('/audit/health')
  
  // Test the endpoint that's failing
  console.log('\n📋 Testing Bulk Events Endpoint...')
  await testEndpoint('/audit/events/bulk', 'POST', {
    events: [{
      action: 'test_event',
      category: 'user_action',
      details: 'Test event for debugging'
    }],
    batch_id: 'test_batch_123'
  })
  
  // Test individual event creation
  console.log('\n📋 Testing Single Event Endpoint...')
  await testEndpoint('/audit/events', 'POST', {
    action: 'test_single_event',
    category: 'user_action',
    details: 'Test single event for debugging'
  })
  
  // Test listing events
  console.log('\n📋 Testing List Events Endpoint...')
  await testEndpoint('/audit/events')
  
  // Test statistics
  console.log('\n📋 Testing Statistics Endpoint...')
  await testEndpoint('/audit/statistics')
  
  // Test general health check
  console.log('\n📋 Testing General Health Check...')
  await testEndpoint('/../health')
  
  console.log('\n✅ Audit endpoint testing complete!')
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason)
})

main().catch(error => {
  console.error('💥 Test script failed:', error)
  process.exit(1)
})
