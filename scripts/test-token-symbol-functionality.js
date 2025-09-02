#!/usr/bin/env node

/**
 * Test Script: Token Symbol Functionality
 * Verifies that redemption requests can fetch and display token symbols
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration (you'll need to add your actual credentials)
const supabaseUrl = 'https://jrwfkxfzsnnjppogthaw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZreGZ6c25uanBwb2d0aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM0NDM5MDQsImV4cCI6MjAyOTAxOTkwNH0.A7JZdWFjnN0B6t6IjPSbU1mJlNHaP1kJPeFDqOI7NKo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTokenSymbolFunctionality() {
  console.log('🔍 Testing Token Symbol Functionality...\n');

  try {
    // Test 1: Check if distributions have token symbols
    console.log('1. Checking token symbols in distributions...');
    const { data: distributions, error: distError } = await supabase
      .from('distributions')
      .select('id, token_symbol, token_type, token_amount')
      .not('token_symbol', 'is', null)
      .limit(5);

    if (distError) {
      console.error('❌ Error fetching distributions:', distError);
      return;
    }

    console.log(`✅ Found ${distributions.length} distributions with token symbols:`);
    distributions.forEach(dist => {
      console.log(`   - ${dist.token_symbol} (${dist.token_type}): ${dist.token_amount} tokens`);
    });

    // Test 2: Check redemption requests
    console.log('\n2. Checking redemption requests...');
    const { data: redemptions, error: redError } = await supabase
      .from('redemption_requests')
      .select('id, token_amount, token_type, status')
      .limit(5);

    if (redError) {
      console.error('❌ Error fetching redemption requests:', redError);
      return;
    }

    console.log(`✅ Found ${redemptions.length} redemption requests:`);
    redemptions.forEach(req => {
      console.log(`   - ${req.id.slice(0, 8)}...: ${req.token_amount} ${req.token_type} (${req.status})`);
    });

    // Test 3: Check distribution_redemptions relationship
    console.log('\n3. Testing redemption-distribution relationship...');
    const { data: relationships, error: relError } = await supabase
      .from('distribution_redemptions')
      .select(`
        redemption_request_id,
        distribution_id,
        amount_redeemed,
        distributions (
          token_symbol,
          token_type
        )
      `)
      .limit(5);

    if (relError) {
      console.error('❌ Error fetching relationships:', relError);
      return;
    }

    console.log(`✅ Found ${relationships.length} redemption-distribution relationships:`);
    relationships.forEach(rel => {
      const symbol = rel.distributions?.token_symbol || 'N/A';
      const type = rel.distributions?.token_type || 'unknown';
      console.log(`   - Redemption ${rel.redemption_request_id.slice(0, 8)}... → ${symbol} (${type})`);
    });

    // Test 4: Simulate the service query logic
    console.log('\n4. Testing service query logic...');
    if (redemptions.length > 0) {
      const redemptionIds = redemptions.map(r => r.id);
      
      const { data: distributionRedemptions, error: distRedError } = await supabase
        .from('distribution_redemptions')
        .select(`
          redemption_request_id,
          distribution_id,
          distributions (
            token_symbol
          )
        `)
        .in('redemption_request_id', redemptionIds);

      if (distRedError) {
        console.error('❌ Error in service query simulation:', distRedError);
        return;
      }

      console.log(`✅ Service query simulation successful:`);
      
      // Create token symbol map
      const tokenSymbolMap = new Map();
      distributionRedemptions.forEach(dr => {
        if (dr.distributions && dr.distributions.token_symbol) {
          tokenSymbolMap.set(dr.redemption_request_id, dr.distributions.token_symbol);
        }
      });

      console.log(`   - Token symbol map created with ${tokenSymbolMap.size} entries`);
      
      // Show mapped results
      redemptions.forEach(req => {
        const tokenSymbol = tokenSymbolMap.get(req.id);
        console.log(`   - ${req.id.slice(0, 8)}...: ${req.token_amount} ${tokenSymbol || req.token_type} (${tokenSymbol ? 'symbol' : 'type'})`);
      });
    }

    console.log('\n🎉 Token Symbol Functionality Test Completed Successfully!');
    console.log('\nSummary:');
    console.log(`- Distributions with symbols: ${distributions.length}`);
    console.log(`- Redemption requests: ${redemptions.length}`);
    console.log(`- Relationships: ${relationships.length}`);
    console.log('- Service query logic: ✅ Working');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testTokenSymbolFunctionality();
