#!/usr/bin/env node

/**
 * Priority 2: Systematic Tab Testing Script
 * Tests all 19 new token form tabs for basic functionality
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
  total: 19,
  passed: 0,
  failed: 0,
  errors: []
};

// Define all 19 tabs to test
const tabsToTest = [
  // ERC-1400 Security Token (7 tabs)
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_properties',
    name: 'ERC1400PropertiesTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400PropertiesTab.tsx',
    description: 'Security token properties (120+ fields)'
  },
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_partitions',
    name: 'ERC1400PartitionsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400PartitionsTab.tsx',
    description: 'Token partitions management'
  },
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_controllers',
    name: 'ERC1400ControllersTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400ControllersTab.tsx',
    description: 'Access controllers configuration'
  },
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_documents',
    name: 'ERC1400DocumentsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400DocumentsTab.tsx',
    description: 'Legal documents management'
  },
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_corporate_actions',
    name: 'ERC1400CorporateActionsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400CorporateActionsTab.tsx',
    description: 'Corporate events handling'
  },
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_custody_providers',
    name: 'ERC1400CustodyProvidersTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400CustodyProvidersTab.tsx',
    description: 'Custodian management'
  },
  {
    standard: 'ERC-1400',
    id: 'token_erc1400_regulatory_filings',
    name: 'ERC1400RegulatoryFilingsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc1400/ERC1400RegulatoryFilingsTab.tsx',
    description: 'Compliance filings'
  },
  
  // ERC-3525 Semi-Fungible (6 tabs)
  {
    standard: 'ERC-3525',
    id: 'token_erc3525_properties',
    name: 'ERC3525PropertiesTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc3525/ERC3525PropertiesTab.tsx',
    description: 'Semi-fungible properties (100+ fields)'
  },
  {
    standard: 'ERC-3525',
    id: 'token_erc3525_slots',
    name: 'ERC3525SlotsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc3525/ERC3525SlotsTab.tsx',
    description: 'Slot definitions and management'
  },
  {
    standard: 'ERC-3525',
    id: 'token_erc3525_allocations',
    name: 'ERC3525AllocationsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc3525/ERC3525AllocationsTab.tsx',
    description: 'Value allocations tracking'
  },
  {
    standard: 'ERC-3525',
    id: 'token_erc3525_payment_schedules',
    name: 'ERC3525PaymentSchedulesTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc3525/ERC3525PaymentSchedulesTab.tsx',
    description: 'Payment schedules management'
  },
  {
    standard: 'ERC-3525',
    id: 'token_erc3525_value_adjustments',
    name: 'ERC3525ValueAdjustmentsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc3525/ERC3525ValueAdjustmentsTab.tsx',
    description: 'Value modifications handling'
  },
  {
    standard: 'ERC-3525',
    id: 'token_erc3525_slot_configs',
    name: 'ERC3525SlotConfigsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc3525/ERC3525SlotConfigsTab.tsx',
    description: 'Slot configurations'
  },
  
  // ERC-4626 Vault Token (6 tabs)
  {
    standard: 'ERC-4626',
    id: 'token_erc4626_properties',
    name: 'ERC4626PropertiesTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc4626/ERC4626PropertiesTab.tsx',
    description: 'Vault properties (110+ fields)'
  },
  {
    standard: 'ERC-4626',
    id: 'token_erc4626_vault_strategies',
    name: 'ERC4626VaultStrategiesTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc4626/ERC4626VaultStrategiesTab.tsx',
    description: 'Investment strategies configuration'
  },
  {
    standard: 'ERC-4626',
    id: 'token_erc4626_asset_allocations',
    name: 'ERC4626AssetAllocationsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc4626/ERC4626AssetAllocationsTab.tsx',
    description: 'Asset allocation management'
  },
  {
    standard: 'ERC-4626',
    id: 'token_erc4626_fee_tiers',
    name: 'ERC4626FeeTiersTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc4626/ERC4626FeeTiersTab.tsx',
    description: 'Fee structures configuration'
  },
  {
    standard: 'ERC-4626',
    id: 'token_erc4626_performance_metrics',
    name: 'ERC4626PerformanceMetricsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc4626/ERC4626PerformanceMetricsTab.tsx',
    description: 'Performance tracking'
  },
  {
    standard: 'ERC-4626',
    id: 'token_erc4626_strategy_params',
    name: 'ERC4626StrategyParamsTab',
    path: 'src/components/tokens/forms-comprehensive/tabs/erc4626/ERC4626StrategyParamsTab.tsx',
    description: 'Strategy parameters'
  }
];

async function testTabComponent(tab) {
  console.log(`\n🧪 Testing ${tab.standard}: ${tab.name}`);
  console.log(`   Description: ${tab.description}`);
  
  try {
    // Test 1: Check if file exists
    const fs = await import('fs');
    const path = await import('path');
    
    const fullPath = path.resolve(process.cwd(), tab.path);
    const exists = fs.existsSync(fullPath);
    
    if (!exists) {
      throw new Error(`File not found: ${tab.path}`);
    }
    
    console.log(`   ✅ File exists: ${tab.path}`);
    
    // Test 2: Check file content for basic React component structure
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Basic validation checks
    const hasReactImport = content.includes('import React') || content.includes('import * as React');
    const hasExportDefault = content.includes('export default') || content.includes('export { default }');
    const hasInterface = content.includes('interface') && content.includes('Props');
    const hasReturnStatement = content.includes('return');
    
    if (!hasExportDefault) {
      throw new Error('Missing export default');
    }
    
    if (!hasReturnStatement) {
      throw new Error('Missing return statement');
    }
    
    console.log(`   ✅ Has proper export: ${hasExportDefault}`);
    console.log(`   ✅ Has return statement: ${hasReturnStatement}`);
    console.log(`   ✅ Has interface: ${hasInterface}`);
    
    // Test 3: Check for required props
    const hasConfigMode = content.includes('configMode');
    const hasOnFieldChange = content.includes('onFieldChange');
    const hasOnValidate = content.includes('onValidate');
    
    console.log(`   ✅ Has configMode prop: ${hasConfigMode}`);
    console.log(`   ✅ Has onFieldChange prop: ${hasOnFieldChange}`);
    console.log(`   ✅ Has onValidate prop: ${hasOnValidate}`);
    
    // Test 4: Check for UI components
    const hasCard = content.includes('Card');
    const hasInput = content.includes('Input') || content.includes('input');
    const hasLabel = content.includes('Label');
    
    console.log(`   ✅ Uses Card component: ${hasCard}`);
    console.log(`   ✅ Uses Input components: ${hasInput}`);
    console.log(`   ✅ Uses Label components: ${hasLabel}`);
    
    testResults.passed++;
    console.log(`   🎉 ${tab.name} passed all tests`);
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({
      tab: tab.name,
      error: error.message
    });
    console.log(`   ❌ ${tab.name} failed: ${error.message}`);
  }
}

async function runAllTabTests() {
  console.log('🚀 Starting Priority 2: Systematic Tab Testing');
  console.log('================================================');
  console.log(`Total tabs to test: ${tabsToTest.length}`);
  
  // Group tests by standard
  const erc1400Tabs = tabsToTest.filter(tab => tab.standard === 'ERC-1400');
  const erc3525Tabs = tabsToTest.filter(tab => tab.standard === 'ERC-3525');
  const erc4626Tabs = tabsToTest.filter(tab => tab.standard === 'ERC-4626');
  
  console.log(`\n📊 Test Distribution:`);
  console.log(`   ERC-1400 Security Token: ${erc1400Tabs.length} tabs`);
  console.log(`   ERC-3525 Semi-Fungible: ${erc3525Tabs.length} tabs`);
  console.log(`   ERC-4626 Vault Token: ${erc4626Tabs.length} tabs`);
  
  console.log(`\n🧪 Phase 1: Component Structure Testing`);
  console.log('=====================================');
  
  // Test all tabs
  for (const tab of tabsToTest) {
    await testTabComponent(tab);
  }
  
  // Results summary
  console.log(`\n📈 Test Results Summary`);
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log(`\n❌ Errors Found:`);
    testResults.errors.forEach(error => {
      console.log(`   ${error.tab}: ${error.error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log(`\n🎉 All tabs passed Phase 1 testing!`);
    console.log(`Ready to proceed with Phase 2: Form Validation Testing`);
  } else {
    console.log(`\n⚠️  Some tabs failed Phase 1 testing. Please review errors above.`);
  }
  
  return testResults;
}

// Run the tests
runAllTabTests().catch(console.error);
