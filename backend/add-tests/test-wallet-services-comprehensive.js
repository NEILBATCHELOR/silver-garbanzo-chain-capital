#!/usr/bin/env node

/**
 * Comprehensive Wallet Services Test Suite
 * 
 * This master test suite runs all wallet service tests across all phases:
 * - Phase 1: HD Wallet Foundation
 * - Phase 2: Transaction Infrastructure  
 * - Phase 3A: Smart Contract Foundation
 * - Phase 3B: Account Abstraction
 * - Phase 3C: Multi-Signature Wallets
 * - Phase 3D: Smart Contract Integration
 * - HSM Integration: Hardware Security Modules
 * 
 * Organizes and runs all phase-specific tests with detailed reporting.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Chain Capital Wallet Services - Comprehensive Test Suite')
console.log('=' .repeat(60))

const testSuites = [
  {
    name: 'Phase 1 & 2: Foundation Services',
    file: 'test-phase-1-2-foundation.js',
    description: 'HD Wallet + Transaction Infrastructure',
    emoji: '🏗️'
  },
  {
    name: 'Phase 3A: Smart Contract Foundation',
    file: 'test-phase-3a-smart-contract.js', 
    description: 'Diamond Proxy + WebAuthn + Guardian Recovery',
    emoji: '💎'
  },
  {
    name: 'Phase 3B: Account Abstraction',
    file: 'test-phase-3b-account-abstraction.js',
    description: 'EIP-4337 + Gasless Transactions + Paymasters',
    emoji: '⚡'
  },
  {
    name: 'Phase 3C: Multi-Signature Wallets',
    file: 'test-phase-3c-multi-sig.js',
    description: 'Multi-Sig + Gnosis Safe + Proposal System',
    emoji: '🔐'
  },
  {
    name: 'Phase 3D: Smart Contract Integration',
    file: 'test-phase-3d-integration.js',
    description: 'Unified Interface + Signature Migration + Restrictions',
    emoji: '🔧'
  },
  {
    name: 'HSM Integration: Hardware Security',
    file: 'test-hsm-comprehensive.js',
    description: 'AWS CloudHSM + Azure Key Vault + Google Cloud KMS',
    emoji: '🛡️'
  },
  {
    name: 'Blockchain Perfection: 8-Chain Support',
    file: 'test-blockchain-perfection.js',
    description: 'Bitcoin + Ethereum + Polygon + Arbitrum + Optimism + Avalanche + Solana + NEAR',
    emoji: '🌐'
  },
  {
    name: 'Integration Tests: Cross-Service',
    file: 'test-wallet-integration.js',
    description: 'End-to-end wallet workflows across all phases',
    emoji: '🔗'
  }
]

async function runTestSuite(testSuite) {
  return new Promise((resolve) => {
    console.log(`\n${testSuite.emoji} Starting: ${testSuite.name}`)
    console.log(`   Description: ${testSuite.description}`)
    console.log('   ' + '-'.repeat(40))
    
    const child = spawn('node', [testSuite.file], {
      stdio: 'inherit',
      cwd: __dirname
    })
    
    child.on('close', (code) => {
      const success = code === 0
      console.log(`   ${success ? '✅ PASSED' : '❌ FAILED'}: ${testSuite.name}`)
      resolve({ ...testSuite, success, code })
    })
    
    child.on('error', (error) => {
      console.error(`   ❌ ERROR: ${testSuite.name} - ${error.message}`)
      resolve({ ...testSuite, success: false, error })
    })
  })
}

async function runComprehensiveTests() {
  const startTime = Date.now()
  const results = []
  
  console.log(`📋 Running ${testSuites.length} test suites...\n`)
  
  // Run each test suite sequentially
  for (const testSuite of testSuites) {
    const result = await runTestSuite(testSuite)
    results.push(result)
  }
  
  // Generate summary report
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(1)
  const passed = results.filter(r => r.success).length
  const failed = results.length - passed
  const successRate = ((passed / results.length) * 100).toFixed(1)
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 COMPREHENSIVE TEST SUITE RESULTS')
  console.log('='.repeat(60))
  console.log(`⏱️  Total Duration: ${duration} seconds`)
  console.log(`📈 Success Rate: ${successRate}% (${passed}/${results.length})`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  
  console.log('\n📋 Detailed Results:')
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`  ${result.emoji} ${status} - ${result.name}`)
    if (!result.success) {
      console.log(`    └─ ${result.description}`)
    }
  })
  
  if (passed === results.length) {
    console.log('\n🎉 ALL WALLET SERVICES TESTS PASSED!')
    console.log('💎 Chain Capital Wallet Infrastructure: PRODUCTION READY')
    console.log('🚀 Ready for frontend integration and deployment')
  } else {
    console.log(`\n⚠️  ${failed} test suite(s) failed`)
    console.log('🔧 Review failed tests and resolve issues before deployment')
  }
  
  console.log('\n🏆 Wallet Services Test Coverage:')
  console.log('  • Phase 1: HD Wallet Foundation ✅')
  console.log('  • Phase 2: Transaction Infrastructure ✅')  
  console.log('  • Phase 3A: Smart Contract Foundation ✅')
  console.log('  • Phase 3B: Account Abstraction ✅')
  console.log('  • Phase 3C: Multi-Signature Wallets ✅')
  console.log('  • Phase 3D: Smart Contract Integration ✅')
  console.log('  • HSM Integration: Hardware Security ✅')
  console.log('  • Blockchain Perfection: 8-Chain Support ✅')
  
  process.exit(failed > 0 ? 1 : 0)
}

// Run comprehensive test suite
runComprehensiveTests().catch(error => {
  console.error('\n💥 Comprehensive test suite failed:', error)
  process.exit(1)
})
