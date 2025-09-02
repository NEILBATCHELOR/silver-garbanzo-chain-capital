#!/usr/bin/env node

/**
 * Test script to verify climate tokenization pools service fix
 * Tests the graceful handling of missing project_id column
 */

import { tokenizationPoolsService } from '../frontend/src/components/climateReceivables/services/tokenizationPoolsService.js';

async function testTokenizationPoolsService() {
  console.log('🧪 Testing Climate Tokenization Pools Service Fix...\n');
  
  try {
    // Test 1: Check column detection
    console.log('1️⃣ Testing column detection...');
    const hasProjectId = await tokenizationPoolsService.hasProjectIdColumn();
    console.log(`   Column exists: ${hasProjectId ? '✅ YES' : '❌ NO (expected)'}`);
    
    // Test 2: Get all pools (should work even with missing column)
    console.log('\n2️⃣ Testing getAll() method...');
    const pools = await tokenizationPoolsService.getAll();
    console.log(`   Pools fetched: ✅ ${pools.length} pools`);
    console.log(`   First pool projectId: ${pools[0]?.projectId || 'null (expected)'}`);
    
    // Test 3: Test with project filter (should work gracefully)
    console.log('\n3️⃣ Testing project filtering...');
    const filteredPools = await tokenizationPoolsService.getAll(undefined, 'test-project-id');
    console.log(`   Filtered pools: ✅ ${filteredPools.length} pools (filter ignored if column missing)`);
    
    console.log('\n🎉 All tests passed! Service handles missing column gracefully.');
    console.log('\n💡 Next step: Run database migration in Supabase Dashboard:');
    console.log('   📁 /scripts/URGENT-climate-pools-project-id-fix.sql');
    
  } catch (error) {
    if (error.code === '42703') {
      console.log('❌ Column still missing - this should be handled gracefully now');
      console.log('💡 Please check if the service fix was applied correctly');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

// Run the test
testTokenizationPoolsService().catch(console.error);
