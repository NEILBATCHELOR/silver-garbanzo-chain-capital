#!/usr/bin/env node

/**
 * Test script for LiveRPCStatusService
 * Run with: node scripts/test-rpc-status.js
 */

import LiveRPCStatusService from '../src/services/blockchain/LiveRPCStatusService.js';

async function testRPCStatus() {
  console.log('🔍 Testing Live RPC Status Service...\n');
  
  const service = LiveRPCStatusService.getInstance();
  
  try {
    console.log('📡 Fetching live RPC status from real blockchain endpoints...');
    const startTime = Date.now();
    
    const endpoints = await service.getAllRPCStatus();
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Completed in ${totalTime}ms\n`);
    
    console.log('📊 Results:');
    console.log('═'.repeat(80));
    
    for (const endpoint of endpoints) {
      const statusIcon = endpoint.status === 'operational' ? '🟢' : 
                        endpoint.status === 'degraded' ? '🟡' : '🔴';
      
      console.log(`${statusIcon} ${endpoint.name}`);
      console.log(`   Status: ${endpoint.status.toUpperCase()}`);
      console.log(`   Response: ${endpoint.responseTime}ms`);
      console.log(`   Network: ${endpoint.network}`);
      
      if (endpoint.blockHeight) {
        console.log(`   Block: ${endpoint.blockHeight.toLocaleString()}`);
      }
      
      if (endpoint.error) {
        console.log(`   Error: ${endpoint.error}`);
      }
      
      console.log('');
    }
    
    // Get health summary
    const health = await service.getHealthSummary();
    console.log('📈 Health Summary:');
    console.log('─'.repeat(40));
    console.log(`Total Endpoints: ${health.total}`);
    console.log(`🟢 Operational: ${health.operational}`);
    console.log(`🟡 Degraded: ${health.degraded}`);
    console.log(`🔴 Outage: ${health.outage}`);
    console.log(`⚡ Avg Response: ${health.averageResponseTime}ms`);
    
  } catch (error) {
    console.error('❌ Error testing RPC status:', error);
  }
}

// Run the test
testRPCStatus();
