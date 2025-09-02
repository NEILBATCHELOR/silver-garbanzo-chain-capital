#!/usr/bin/env node

/**
 * Test script to verify RedemptionCalendarService fix
 * Tests the calendar endpoints that were causing Prisma errors
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const TEST_PROJECT_ID = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📡 Endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint);
    const status = response.status;
    const statusText = response.statusText;
    
    if (status === 200) {
      console.log(`✅ SUCCESS: ${status} ${statusText}`);
      
      // Try to get a small preview of content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        console.log(`📄 Response type: JSON`);
        console.log(`📊 Keys: ${Object.keys(json).join(', ')}`);
      } else if (contentType && contentType.includes('text/')) {
        const text = await response.text();
        console.log(`📄 Response type: ${contentType}`);
        console.log(`📏 Content length: ${text.length} characters`);
        if (text.length > 0 && text.length < 200) {
          console.log(`📋 Preview: ${text.substring(0, 100)}...`);
        }
      } else {
        console.log(`📄 Response type: ${contentType || 'Unknown'}`);
      }
    } else {
      console.log(`❌ FAILED: ${status} ${statusText}`);
      const text = await response.text();
      if (text) {
        console.log(`📋 Error: ${text.substring(0, 200)}...`);
      }
    }
  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log(`🔧 Hint: Backend server may not be running on ${BASE_URL}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting RedemptionCalendarService Fix Verification');
  console.log('==================================================');
  
  // Test 1: Basic health check
  await testEndpoint(`${BASE_URL}/health`, 'Basic Backend Health Check');
  
  // Test 2: Calendar RSS endpoint (this was causing Prisma errors)
  await testEndpoint(`${BASE_URL}/api/v1/calendar/redemption/rss`, 'Calendar RSS Feed (No Project)');
  
  // Test 3: Calendar RSS with project filter (this was causing Prisma errors)
  await testEndpoint(`${BASE_URL}/api/v1/calendar/redemption/rss?project=${TEST_PROJECT_ID}`, 'Calendar RSS Feed (With Project)');
  
  // Test 4: Calendar iCal endpoint (this was causing Prisma errors)
  await testEndpoint(`${BASE_URL}/api/v1/calendar/redemption/ical`, 'Calendar iCal Feed (No Project)');
  
  // Test 5: Calendar iCal with project filter (this was causing Prisma errors)
  await testEndpoint(`${BASE_URL}/api/v1/calendar/redemption/ical?project=${TEST_PROJECT_ID}`, 'Calendar iCal Feed (With Project)');
  
  // Test 6: API status endpoint
  await testEndpoint(`${BASE_URL}/api/v1/status`, 'API Status Endpoint');
  
  console.log('\n🎯 Test Summary');
  console.log('===============');
  console.log('✅ SUCCESS: Endpoints return 200 OK (fix worked)');
  console.log('❌ FAILED: Endpoints return errors (fix needs work)');
  console.log('💥 ERROR: Connection refused (server not running)');
  console.log('\nIf all calendar endpoints return 200 OK, the Prisma relationship fix worked! 🎉');
}

// Run the tests
runTests().catch(console.error);
