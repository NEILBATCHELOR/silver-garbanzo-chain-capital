#!/usr/bin/env node

/**
 * Test script for EnhancedLiveRPCStatusService
 * Tests both public and premium endpoints from environment variables
 * Run with: node scripts/test-enhanced-rpc-status.js
 */

import EnhancedLiveRPCStatusService from '../src/services/blockchain/EnhancedLiveRPCStatusService.js';

async function testEnhancedRPCStatus() {
  console.log('🔍 Testing Enhanced Live RPC Status Service...\n');
  
  const service = EnhancedLiveRPCStatusService.getInstance();
  
  try {
    console.log('📡 Fetching live RPC status from public + premium endpoints...');
    const startTime = Date.now();
    
    const endpoints = await service.getAllRPCStatus();
    
    const totalTime = Date.now() - startTime;
    const premiumCount = endpoints.filter(e => e.isPrivate).length;
    const publicCount = endpoints.filter(e => !e.isPrivate).length;
    
    console.log(`✅ Completed in ${totalTime}ms\n`);
    
    console.log('📊 Results:');
    console.log('═'.repeat(90));
    
    // Group by type
    const premiumEndpoints = endpoints.filter(e => e.isPrivate);
    const publicEndpoints = endpoints.filter(e => !e.isPrivate);
    
    if (premiumEndpoints.length > 0) {
      console.log('🛡️  PREMIUM ENDPOINTS (from .env):');
      console.log('─'.repeat(50));
      
      for (const endpoint of premiumEndpoints) {
        const statusIcon = endpoint.status === 'operational' ? '🟢' : 
                          endpoint.status === 'degraded' ? '🟡' : '🔴';
        
        console.log(`${statusIcon} ${endpoint.name}`);
        console.log(`   Status: ${endpoint.status.toUpperCase()}`);
        console.log(`   Provider: ${endpoint.provider}`);
        console.log(`   Response: ${endpoint.responseTime}ms`);
        console.log(`   Network: ${endpoint.network}`);
        
        if (endpoint.blockHeight) {
          console.log(`   Block/Height: ${endpoint.blockHeight.toLocaleString()}`);
        }
        
        if (endpoint.error) {
          console.log(`   Error: ${endpoint.error}`);
        }
        
        console.log('');
      }
    }
    
    if (publicEndpoints.length > 0) {
      console.log('🌐 PUBLIC ENDPOINTS:');
      console.log('─'.repeat(50));
      
      for (const endpoint of publicEndpoints) {
        const statusIcon = endpoint.status === 'operational' ? '🟢' : 
                          endpoint.status === 'degraded' ? '🟡' : '🔴';
        
        console.log(`${statusIcon} ${endpoint.name}`);
        console.log(`   Status: ${endpoint.status.toUpperCase()}`);
        console.log(`   Provider: ${endpoint.provider}`);
        console.log(`   Response: ${endpoint.responseTime}ms`);
        console.log(`   Network: ${endpoint.network}`);
        
        if (endpoint.blockHeight) {
          console.log(`   Block/Height: ${endpoint.blockHeight.toLocaleString()}`);
        }
        
        if (endpoint.error) {
          console.log(`   Error: ${endpoint.error}`);
        }
        
        console.log('');
      }
    }
    
    // Get health summary
    const health = await service.getHealthSummary();
    console.log('📈 Health Summary:');
    console.log('─'.repeat(50));
    console.log(`Total Endpoints: ${health.total}`);
    console.log(`🛡️  Premium: ${health.premiumEndpoints}`);
    console.log(`🌐 Public: ${health.publicEndpoints}`);
    console.log(`🟢 Operational: ${health.operational}`);
    console.log(`🟡 Degraded: ${health.degraded}`);
    console.log(`🔴 Outage: ${health.outage}`);
    console.log(`⚡ Avg Response: ${health.averageResponseTime}ms`);
    
    // Test provider grouping
    console.log('\n🏢 Endpoints by Provider:');
    console.log('─'.repeat(50));
    
    const byProvider = await service.getEndpointsByProvider();
    for (const [provider, providerEndpoints] of Object.entries(byProvider)) {
      const operational = providerEndpoints.filter(e => e.status === 'operational').length;
      console.log(`${provider}: ${providerEndpoints.length} endpoints (${operational} operational)`);
    }
    
  } catch (error) {
    console.error('❌ Error testing enhanced RPC status:', error);
  }
}

// Run the test
testEnhancedRPCStatus();
