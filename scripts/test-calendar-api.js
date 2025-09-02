/**
 * Calendar API Test Script
 * Tests the redemption calendar backend endpoints
 */

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_PROJECT_ID = 'cdc4f92c-8da1-4d80-a917-a94eb8cafaf0';

async function testCalendarEndpoints() {
  console.log('🗓️ Testing Redemption Calendar API Endpoints\n');

  // Test 1: Calendar Health Check
  try {
    console.log('1. Testing calendar health check...');
    const healthResponse = await fetch(`${API_BASE}/calendar/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Get Calendar Events (JSON)
  try {
    console.log('\n2. Testing calendar events JSON endpoint...');
    const eventsResponse = await fetch(`${API_BASE}/calendar/redemption/events?project=${TEST_PROJECT_ID}`);
    const eventsData = await eventsResponse.json();
    console.log('✅ Calendar events:', {
      success: eventsData.success,
      count: eventsData.count,
      sampleEvent: eventsData.data?.[0] ? {
        id: eventsData.data[0].id,
        title: eventsData.data[0].title,
        eventType: eventsData.data[0].eventType,
        startDate: eventsData.data[0].startDate
      } : 'No events'
    });
  } catch (error) {
    console.log('❌ Calendar events failed:', error.message);
  }

  // Test 3: RSS Feed
  try {
    console.log('\n3. Testing RSS feed...');
    const rssResponse = await fetch(`${API_BASE}/calendar/redemption/rss?project=${TEST_PROJECT_ID}&limit=5`);
    const rssData = await rssResponse.text();
    console.log('✅ RSS feed:', {
      contentType: rssResponse.headers.get('content-type'),
      size: rssData.length,
      containsRSS: rssData.includes('<rss version="2.0"'),
      itemCount: (rssData.match(/<item>/g) || []).length
    });
  } catch (error) {
    console.log('❌ RSS feed failed:', error.message);
  }

  // Test 4: iCal Feed
  try {
    console.log('\n4. Testing iCal feed...');
    const icalResponse = await fetch(`${API_BASE}/calendar/redemption/ical?project=${TEST_PROJECT_ID}`);
    const icalData = await icalResponse.text();
    console.log('✅ iCal feed:', {
      contentType: icalResponse.headers.get('content-type'),
      size: icalData.length,
      containsVCALENDAR: icalData.includes('BEGIN:VCALENDAR'),
      eventCount: (icalData.match(/BEGIN:VEVENT/g) || []).length
    });
  } catch (error) {
    console.log('❌ iCal feed failed:', error.message);
  }

  console.log('\n🏁 Calendar API testing complete!');
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const { default: fetch } = require('node-fetch');
  testCalendarEndpoints().catch(console.error);
} else {
  // Browser environment
  console.log('Calendar API Test Script loaded. Run testCalendarEndpoints() in console.');
  window.testCalendarEndpoints = testCalendarEndpoints;
}

export { testCalendarEndpoints };
