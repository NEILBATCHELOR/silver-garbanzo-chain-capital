/**
 * Test Audit API endpoints to diagnose 400 errors
 */

async function testAuditAPI() {
  const baseUrl = 'http://localhost:3001/api/v1'
  
  console.log('🧪 Testing Chain Capital Audit API...')
  console.log('📍 Base URL:', baseUrl)
  console.log('')

  // Test 1: Health check
  try {
    console.log('1️⃣  Testing general health...')
    const healthResponse = await fetch('http://localhost:3001/health')
    const healthData = await healthResponse.json()
    console.log('✅ Health:', healthResponse.status, healthData.status)
  } catch (error) {
    console.log('❌ Health check failed:', error.message)
    return
  }

  // Test 2: Audit health
  try {
    console.log('2️⃣  Testing audit health...')
    const auditHealthResponse = await fetch(`${baseUrl}/audit/health`)
    
    if (auditHealthResponse.ok) {
      const auditHealthData = await auditHealthResponse.json()
      console.log('✅ Audit Health:', auditHealthResponse.status, auditHealthData.status)
    } else {
      const errorText = await auditHealthResponse.text()
      console.log('❌ Audit Health failed:', auditHealthResponse.status, errorText)
    }
  } catch (error) {
    console.log('❌ Audit health check failed:', error.message)
  }

  // Test 3: Get audit statistics
  try {
    console.log('3️⃣  Testing audit statistics...')
    const statsResponse = await fetch(`${baseUrl}/audit/statistics`)
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json()
      console.log('✅ Audit Statistics:', statsResponse.status)
      console.log('   Total events:', statsData?.data?.total_events || 'unknown')
    } else {
      const errorText = await statsResponse.text()
      console.log('❌ Audit Statistics failed:', statsResponse.status)
      console.log('   Error:', errorText)
    }
  } catch (error) {
    console.log('❌ Audit statistics failed:', error.message)
  }

  // Test 4: Get audit events (this is what's failing)
  try {
    console.log('4️⃣  Testing audit events (the failing endpoint)...')
    const eventsResponse = await fetch(`${baseUrl}/audit/events?page=1&limit=10`)
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json()
      console.log('✅ Audit Events:', eventsResponse.status)
      console.log('   Success:', eventsData?.success)
      console.log('   Data type:', typeof eventsData?.data)
      console.log('   Events count:', Array.isArray(eventsData?.data?.data) ? eventsData.data.data.length : 'not array')
    } else {
      const errorText = await eventsResponse.text()
      console.log('❌ Audit Events failed:', eventsResponse.status)
      console.log('   Error response:', errorText)
      
      // Try to parse as JSON for more details
      try {
        const errorJson = JSON.parse(errorText)
        console.log('   Parsed error:', errorJson)
      } catch (e) {
        console.log('   Raw error text:', errorText.substring(0, 200))
      }
    }
  } catch (error) {
    console.log('❌ Audit events test failed:', error.message)
  }

  // Test 5: Create a simple audit event
  try {
    console.log('5️⃣  Testing audit event creation...')
    const createResponse = await fetch(`${baseUrl}/audit/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test_api_call',
        category: 'user_action',
        severity: 'low',
        details: 'Testing audit API from test script'
      })
    })
    
    if (createResponse.ok) {
      const createData = await createResponse.json()
      console.log('✅ Audit Event Creation:', createResponse.status)
      console.log('   Success:', createData?.success)
      console.log('   Event ID:', createData?.data?.id)
    } else {
      const errorText = await createResponse.text()
      console.log('❌ Audit Event Creation failed:', createResponse.status)
      console.log('   Error:', errorText)
    }
  } catch (error) {
    console.log('❌ Audit event creation failed:', error.message)
  }

  // Test 6: Bulk audit events (this is what frontend is calling)
  try {
    console.log('6️⃣  Testing bulk audit events (frontend calls this)...')
    const bulkResponse = await fetch(`${baseUrl}/audit/events/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        events: [{
          action: 'bulk_test_action',
          category: 'user_action',
          severity: 'low',
          details: 'Bulk test from test script'
        }]
      })
    })
    
    if (bulkResponse.ok) {
      const bulkData = await bulkResponse.json()
      console.log('✅ Bulk Audit Events:', bulkResponse.status)
      console.log('   Success:', bulkData?.success)
      console.log('   Events created:', Array.isArray(bulkData?.data) ? bulkData.data.length : 'unknown')
    } else {
      const errorText = await bulkResponse.text()
      console.log('❌ Bulk Audit Events failed:', bulkResponse.status)
      console.log('   Error:', errorText)
    }
  } catch (error) {
    console.log('❌ Bulk audit events failed:', error.message)
  }

  console.log('')
  console.log('🧪 Audit API test completed!')
  console.log('')
  console.log('💡 Analysis:')
  console.log('   If tests 1-2 pass but 3-6 fail, it\'s likely a database issue')
  console.log('   If test 4 specifically fails with 400, that matches the frontend error')
  console.log('   If test 6 fails with 400, that\'s the bulk endpoint the frontend uses')
}

// Run the test
testAuditAPI().catch(error => {
  console.error('Test script failed:', error)
  process.exit(1)
})
