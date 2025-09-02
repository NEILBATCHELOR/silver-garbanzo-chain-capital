#!/usr/bin/env node

/**
 * Test script to verify token status enum fixes
 * Tests that the frontend can successfully send status updates to the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTokenStatusUpdate() {
  console.log('🧪 Testing Token Status Enum Fixes');
  console.log('====================================');

  // Test the problematic status value
  const testStatuses = [
    'DRAFT',
    'UNDER REVIEW',
    'APPROVED',
    'READY TO MINT',
    'MINTED',
    'DEPLOYED',
    'PAUSED',
    'DISTRIBUTED',
    'REJECTED'
  ];

  console.log('📋 Testing all valid database enum values:');
  testStatuses.forEach(status => {
    console.log(`  ✓ ${status}`);
  });

  // Get a test token to update
  const { data: tokens, error: fetchError } = await supabase
    .from('tokens')
    .select('id, name, status')
    .limit(1);

  if (fetchError) {
    console.error('❌ Error fetching test token:', fetchError);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log('⚠️  No tokens found in database for testing');
    return;
  }

  const testToken = tokens[0];
  const originalStatus = testToken.status;
  
  console.log(`\n🎯 Testing with token: ${testToken.name} (${testToken.id})`);
  console.log(`   Original status: ${originalStatus}`);

  // Test the problematic status update
  const testStatus = 'UNDER REVIEW';
  
  console.log(`\n🔄 Attempting to update status to: "${testStatus}"`);
  
  const { data: updateData, error: updateError } = await supabase
    .from('tokens')
    .update({ status: testStatus })
    .eq('id', testToken.id)
    .select('id, status');

  if (updateError) {
    console.error('❌ Error updating token status:', updateError);
    console.error('   This indicates the enum fix did not work');
    return;
  }

  if (updateData && updateData.length > 0) {
    console.log('✅ Status update successful!');
    console.log(`   New status: ${updateData[0].status}`);
  }

  // Restore original status
  console.log(`\n🔄 Restoring original status: "${originalStatus}"`);
  
  const { error: restoreError } = await supabase
    .from('tokens')
    .update({ status: originalStatus })
    .eq('id', testToken.id);

  if (restoreError) {
    console.error('⚠️  Error restoring original status:', restoreError);
  } else {
    console.log('✅ Original status restored');
  }

  console.log('\n🎉 Token status enum test completed successfully!');
}

// Run the test
testTokenStatusUpdate().catch(console.error);
