/**
 * Test Working DFNS Client
 * 
 * Simple test to verify the working client bypasses SDK issues
 */

import { getWorkingDfnsClient } from './src/infrastructure/dfns/working-client';

async function testWorkingClient() {
  console.log('🧪 Testing Working DFNS Client...\n');

  try {
    const client = getWorkingDfnsClient();
    
    // Test 1: Check configuration
    console.log('📋 Test 1: Configuration');
    const config = client.getConfig();
    console.log('✅ Configuration loaded:', {
      baseUrl: config.baseUrl,
      hasToken: config.hasToken,
      userId: config.userId,
      username: config.username
    });
    
    // Test 2: Test connection
    console.log('\n📡 Test 2: Connection Test');
    const isConnected = await client.testConnection();
    console.log(isConnected ? '✅ Connection successful' : '❌ Connection failed');
    
    // Test 3: Get connection status with details
    console.log('\n📊 Test 3: Connection Status');
    const status = await client.getConnectionStatus();
    console.log('Status:', status);
    
    if (status.connected) {
      console.log('✅ Working client is functional!');
      console.log(`📈 Found ${status.walletsCount} wallets`);
      console.log(`🔑 Found ${status.credentialsCount} credentials`);
    } else {
      console.log('❌ Working client failed:', status.error);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testWorkingClient();
