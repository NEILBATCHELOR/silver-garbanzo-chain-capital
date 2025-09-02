/**
 * Simple test to check if validation is working
 */

async function testSimpleValidation() {
  console.log('🧪 Testing simple audit validation...')
  
  // Test with the exact format we expect should work
  const testEvent = {
    action: 'test_action',
    category: 'user_action',  // Using lowercase enum value
    severity: 'low',          // Using lowercase enum value
    details: 'Simple test'
  }
  
  try {
    console.log('📤 Sending test event:', JSON.stringify(testEvent, null, 2))
    
    const response = await fetch('http://localhost:3001/api/v1/audit/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEvent)
    })
    
    console.log('📊 Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ SUCCESS! Event created:', data.success)
      console.log('📝 Event ID:', data.data?.id)
    } else {
      const errorText = await response.text()
      console.log('❌ FAILED with error:', errorText)
      
      // Try to get more detailed error
      try {
        const errorObj = JSON.parse(errorText)
        console.log('📋 Detailed error:', JSON.stringify(errorObj, null, 2))
      } catch (e) {
        console.log('📋 Raw error:', errorText)
      }
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message)
  }
}

testSimpleValidation()
