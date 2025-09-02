#!/usr/bin/env node

/**
 * Test script to verify the anomalies endpoint is working
 * Fixes the 404 error on /audit page
 */

// Using built-in fetch (Node.js 18+)

async function testAnomaliesEndpoint() {
  console.log('🔍 Testing anomalies endpoint fix...\n');
  
  const BASE_URL = 'http://localhost:3001';
  
  try {
    // Test the anomalies endpoint
    console.log('Testing: GET /api/v1/audit/anomalies');
    const response = await fetch(`${BASE_URL}/api/v1/audit/anomalies`);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ SUCCESS: Anomalies endpoint is working!');
      console.log('Response structure:', {
        success: data.success,
        dataKeys: Object.keys(data.data || {}),
        anomaliesCount: data.data?.anomalies?.length || 0,
        patternsCount: data.data?.patterns?.length || 0
      });
    } else if (response.status === 404) {
      console.log('❌ STILL 404: Endpoint not found');
      console.log('The backend may need to be restarted');
    } else {
      const errorData = await response.json();
      console.log('⚠️  Response:', errorData);
    }
    
  } catch (error) {
    console.log('❌ ERROR: Could not connect to backend');
    console.log('Error:', error.message);
    console.log('\nIs the backend running on port 3001?');
    console.log('Run: npm run start:enhanced');
  }
}

// Run the test
testAnomaliesEndpoint();
