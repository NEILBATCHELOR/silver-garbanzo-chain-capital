/**
 * Test script for verifying Mapbox geocoding integration with WeatherDataService
 * This tests the specific "London, Ontario, Canada" geocoding issue that was reported
 */

import { WeatherDataService } from './weather-data-service';

/**
 * Test the geocoding functionality for problematic locations
 */
export async function testGeocodingIntegration() {
  console.log('=== Testing Weather Service Geocoding Integration ===');
  
  const testLocations = [
    'London, Ontario, Canada',
    'London, England',
    'New York, NY',
    'Tokyo, Japan',
    'Invalid Location XYZ123'
  ];
  
  for (const location of testLocations) {
    console.log(`\n--- Testing: ${location} ---`);
    
    try {
      const weatherData = await WeatherDataService.getWeatherData(location);
      console.log(`✅ SUCCESS: Got weather data for ${location}`);
      console.log(`   - Temperature: ${weatherData.temperature}°C`);
      console.log(`   - Wind Speed: ${weatherData.windSpeed} m/s`);
      console.log(`   - Sunlight Hours: ${weatherData.sunlightHours}h`);
    } catch (error) {
      console.log(`❌ ERROR: Failed for ${location}`);
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// Auto-run if this file is executed directly
if (typeof window === 'undefined') {
  testGeocodingIntegration().catch(console.error);
}
