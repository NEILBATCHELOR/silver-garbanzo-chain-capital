#!/usr/bin/env node

/**
 * Chain Capital Wallet Services - Comprehensive Test Suite
 * 
 * Tests all wallet services across 4 development phases:
 * - Phase 1 & 2: HD Wallet Foundation + Transaction Infrastructure
 * - Phase 3A: Smart Contract Foundation  
 * - Phase 3B: Account Abstraction
 * - Phase 3C: Multi-Signature Wallets
 * - Phase 3D: Smart Contract Integration
 * - HSM Integration: Hardware Security Module
 * 
 * Status: Ready for comprehensive testing of production wallet infrastructure
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Chain Capital Wallet Services - Comprehensive Test Suite')
console.log('=' .repeat(70))

// Test categories and their services
const testSuites = {
  'Phase 1 & 2: Foundation Services': [
    'WalletService',
    'HDWalletService',
    'KeyManagementService',
    'WalletValidationService',
    'TransactionService',
    'SigningService',
    'FeeEstimationService',
    'NonceManagerService'
  ],
  'Phase 3A: Smart Contract Foundation': [
    'SmartContractWalletService',
    'FacetRegistryService',
    'WebAuthnService', 
    'GuardianRecoveryService'
  ],
  'Phase 3B: Account Abstraction': [
    'UserOperationService',
    'PaymasterService',
    'BatchOperationService'
  ],
  'Phase 3C: Multi-Signature Wallets': [
    'MultiSigWalletService',
    'TransactionProposalService',
    'MultiSigSigningService',
    'GnosisSafeService'
  ],
  'Phase 3D: Smart Contract Integration': [
    'SignatureMigrationService',
    'RestrictionsService',
    'LockService',
    'UnifiedWalletInterface'
  ],
  'HSM Integration: Hardware Security': [
    'HSMKeyManagementService',
    'AWSCloudHSMService',
    'AzureKeyVaultService',
    'GoogleCloudKMSService'
  ]
}

async function runComprehensiveTests() {
  console.log('📋 Test Coverage Overview:')
  
  let totalServices = 0
  Object.entries(testSuites).forEach(([phase, services]) => {
    console.log(`\n${phase}:`)
    services.forEach(service => {
      console.log(`  ✓ ${service}`)
      totalServices++
    })
  })
  
  console.log(`\n🎯 Total Services to Test: ${totalServices}`)
  console.log('=' .repeat(70))

  // Run individual test phases
  console.log('\n🔬 Starting Comprehensive Test Execution...\n')
  
  try {
    // Phase 1 & 2: Foundation Services
    console.log('⚡ Testing Phase 1 & 2: Foundation Services')
    await runTestFile('test-phase-1-2-foundation.js')
    
    // Phase 3A: Smart Contract Foundation
    console.log('\n🔐 Testing Phase 3A: Smart Contract Foundation')
    await runTestFile('test-phase-3a-smart-contract.js')
    
    // Phase 3B: Account Abstraction
    console.log('\n⛽ Testing Phase 3B: Account Abstraction')
    await runTestFile('test-phase-3b-account-abstraction.js')
    
    // Phase 3C: Multi-Signature Wallets
    console.log('\n✋ Testing Phase 3C: Multi-Signature Wallets')
    await runTestFile('test-phase-3c-multi-sig.js')
    
    // Phase 3D: Smart Contract Integration
    console.log('\n🔗 Testing Phase 3D: Smart Contract Integration')
    await runTestFile('test-phase-3d-integration.js')
    
    // HSM Integration
    console.log('\n🛡️ Testing HSM Integration: Hardware Security')
    await runTestFile('test-hsm-integration.js')
    
    console.log('\n' + '='.repeat(70))
    console.log('🎉 All Wallet Service Tests Completed Successfully!')
    console.log(`✅ ${totalServices} Services Tested`)
    console.log('💰 Estimated Business Value: $1M+ in wallet infrastructure')
    
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error.message)
    process.exit(1)
  }
}

async function runTestFile(filename) {
  const testPath = path.join(__dirname, filename)
  
  try {
    execSync(`node "${testPath}"`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    })
  } catch (error) {
    throw new Error(`Test file ${filename} failed: ${error.message}`)
  }
}

// Run the comprehensive test suite
runComprehensiveTests().catch(error => {
  console.error('❌ Comprehensive test suite failed:', error)
  process.exit(1)
})
