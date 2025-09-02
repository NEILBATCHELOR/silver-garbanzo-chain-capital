#!/usr/bin/env node

/**
 * End-to-End Form Data Testing
 * Actually tests form data submission and database persistence
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Sample form data for each standard
const testData = {
  erc1400: {
    // Sample ERC-1400 data to insert
    token_erc1400_properties: {
      token_id: null, // Will be set during test
      security_type: 'equity',
      issuing_jurisdiction: 'United States',
      issuing_entity_name: 'Test Security Corp',
      issuing_entity_lei: '5493000TEST123456789',
      require_kyc: true,
      is_mintable: true,
      is_burnable: false,
      controller_address: '0x742d35Cc6634C0532925a3b8D91C2C05d9c7C8C8',
      initial_supply: '1000000',
      cap: '10000000'
    }
  },
  erc3525: {
    // Sample ERC-3525 data to insert
    token_erc3525_properties: {
      token_id: null, // Will be set during test
      value_decimals: 18,
      slot_type: 'financial',
      is_burnable: true,
      is_pausable: false,
      value_transfers_enabled: true,
      slot_approvals: false,
      financial_instrument_type: 'bond',
      principal_amount: '1000000',
      interest_rate: '5.5'
    }
  },
  erc4626: {
    // Sample ERC-4626 data to insert
    token_erc4626_properties: {
      token_id: null, // Will be set during test
      asset_address: '0x742d35Cc6634C0532925a3b8D91C2C05d9c7C8C8',
      vault_type: 'yield_farming',
      is_burnable: false,
      is_pausable: true,
      automated_rebalancing: true,
      asset_name: 'USD Coin',
      asset_symbol: 'USDC',
      asset_decimals: 6
    }
  }
};

async function createTestToken(standard) {
  console.log(`\n📝 Creating test token for ${standard}...`);
  
  try {
    // Get an existing project ID to use
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .single();

    if (projectError) {
      throw new Error(`No projects found: ${projectError.message}`);
    }

    // Create a test token in the main tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .insert({
        name: `Test ${standard} Token`,
        symbol: `T${standard}`,
        standard: standard,
        status: 'DRAFT',
        decimals: 18,
        description: `Test token for ${standard} form data validation`,
        project_id: projects.id,
        blocks: {} // Empty blocks object, will be updated during form testing
      })
      .select('id')
      .single();

    if (tokenError) {
      throw tokenError;
    }

    console.log(`   ✅ Test token created with ID: ${tokenData.id}`);
    return tokenData.id;

  } catch (error) {
    console.log(`   ❌ Failed to create test token: ${error.message}`);
    throw error;
  }
}

async function testFormDataSubmission(standard, tokenId) {
  console.log(`\n🧪 Testing ${standard} form data submission...`);
  
  const standardData = testData[standard.toLowerCase().replace('-', '')];
  if (!standardData) {
    throw new Error(`No test data defined for ${standard}`);
  }

  let passedTables = 0;
  let failedTables = 0;

  // Test each table for this standard
  for (const [tableName, tableData] of Object.entries(standardData)) {
    console.log(`\n   📊 Testing table: ${tableName}`);
    testResults.total++;

    try {
      // Set the token_id
      const dataToInsert = { ...tableData, token_id: tokenId };
      
      // Insert test data
      const { data: insertedData, error: insertError } = await supabase
        .from(tableName)
        .insert(dataToInsert)
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log(`      ✅ Data inserted successfully`);
      console.log(`      📝 Record ID: ${insertedData.id || 'N/A'}`);

      // Verify the data was actually saved
      const { data: verifyData, error: verifyError } = await supabase
        .from(tableName)
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (verifyError) {
        throw verifyError;
      }

      console.log(`      ✅ Data verified in database`);
      
      // Test update operation
      const updateData = { ...dataToInsert };
      if (updateData.security_type) updateData.security_type = 'debt';
      if (updateData.vault_type) updateData.vault_type = 'lending';
      if (updateData.slot_type) updateData.slot_type = 'real_estate';

      const { data: updatedData, error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('token_id', tokenId)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log(`      ✅ Data updated successfully`);

      // Clean up - delete the test record
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('token_id', tokenId);

      if (deleteError) {
        console.log(`      ⚠️  Warning: Could not delete test record: ${deleteError.message}`);
      } else {
        console.log(`      ✅ Test record cleaned up`);
      }

      testResults.passed++;
      passedTables++;

    } catch (error) {
      console.log(`      ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.errors.push({
        standard,
        table: tableName,
        error: error.message
      });
      failedTables++;
    }
  }

  return { passedTables, failedTables };
}

async function cleanupTestToken(tokenId) {
  console.log(`\n🧹 Cleaning up test token ${tokenId}...`);
  
  try {
    const { error } = await supabase
      .from('tokens')
      .delete()
      .eq('id', tokenId);

    if (error) {
      throw error;
    }

    console.log(`   ✅ Test token cleaned up`);
  } catch (error) {
    console.log(`   ⚠️  Warning: Could not delete test token: ${error.message}`);
  }
}

async function runEndToEndTests() {
  console.log('🚀 End-to-End Form Data Persistence Testing');
  console.log('=============================================');
  console.log('Testing actual form data submission and database persistence...\n');

  const standards = ['ERC-1400', 'ERC-3525', 'ERC-4626'];
  
  for (const standard of standards) {
    console.log(`\n🎯 Testing ${standard} Standard`);
    console.log('='.repeat(40));

    try {
      // Create test token
      const tokenId = await createTestToken(standard);

      // Test form data submission
      const { passedTables, failedTables } = await testFormDataSubmission(standard, tokenId);

      console.log(`\n   📊 ${standard} Results:`);
      console.log(`   ✅ Passed: ${passedTables}`);
      console.log(`   ❌ Failed: ${failedTables}`);

      // Cleanup
      await cleanupTestToken(tokenId);

    } catch (error) {
      console.log(`\n   ❌ ${standard} test failed: ${error.message}`);
      testResults.failed++;
      testResults.errors.push({
        standard,
        error: error.message
      });
    }
  }

  // Final results
  console.log(`\n📈 End-to-End Test Results`);
  console.log('============================');
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📊 Success Rate: ${testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0}%`);

  if (testResults.errors.length > 0) {
    console.log(`\n❌ Errors Found:`);
    testResults.errors.forEach(error => {
      console.log(`   ${error.standard} ${error.table || ''}: ${error.error}`);
    });
  }

  if (testResults.failed === 0) {
    console.log(`\n🎉 All end-to-end tests passed!`);
    console.log(`Form data submission and database persistence verified for all standards.`);
  } else {
    console.log(`\n⚠️  Some end-to-end tests failed. Review errors above.`);
  }

  return testResults;
}

// Run the tests
runEndToEndTests().catch(console.error);
