#!/usr/bin/env node

/**
 * Chain Capital Wallet Test Runner
 * 
 * Flexible test runner for wallet services with filtering and reporting options.
 * 
 * Usage:
 *   node test-runner.js                    # Interactive menu
 *   node test-runner.js --all              # Run all tests
 *   node test-runner.js --phase 1          # Run specific phase
 *   node test-runner.js --service hsm      # Run specific service tests
 *   node test-runner.js --quick            # Run quick validation tests
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Test suite definitions
const testSuites = [
  {
    id: 'foundation',
    name: 'Phase 1 & 2: Foundation Services',
    file: 'test-phase-1-2-foundation.js',
    description: 'HD Wallet + Transaction Infrastructure',
    emoji: '🏗️',
    phase: [1, 2],
    priority: 'high',
    estimatedTime: '30s'
  },
  {
    id: 'smart-contract',
    name: 'Phase 3A: Smart Contract Foundation',
    file: 'test-phase-3a-smart-contract.js',
    description: 'Diamond Proxy + WebAuthn + Guardian Recovery',
    emoji: '💎',
    phase: [3],
    priority: 'high',
    estimatedTime: '25s'
  },
  {
    id: 'account-abstraction',
    name: 'Phase 3B: Account Abstraction',
    file: 'test-phase-3b-account-abstraction.js',
    description: 'EIP-4337 + Gasless Transactions + Paymasters',
    emoji: '⚡',
    phase: [3],
    priority: 'medium',
    estimatedTime: '20s'
  },
  {
    id: 'multi-sig',
    name: 'Phase 3C: Multi-Signature Wallets',
    file: 'test-phase-3c-multi-sig.js',
    description: 'Multi-Sig + Gnosis Safe + Proposal System',
    emoji: '🔐',
    phase: [3],
    priority: 'high',
    estimatedTime: '35s'
  },
  {
    id: 'integration',
    name: 'Phase 3D: Smart Contract Integration',
    file: 'test-phase-3d-integration.js',
    description: 'Unified Interface + Signature Migration + Restrictions',
    emoji: '🔧',
    phase: [3],
    priority: 'medium',
    estimatedTime: '25s'
  },
  {
    id: 'hsm',
    name: 'HSM Integration: Hardware Security',
    file: 'test-hsm-comprehensive.js',
    description: 'AWS CloudHSM + Azure Key Vault + Google Cloud KMS',
    emoji: '🛡️',
    phase: ['hsm'],
    priority: 'medium',
    estimatedTime: '40s'
  },
  {
    id: 'blockchain',
    name: 'Blockchain Perfection: 8-Chain Support',
    file: 'test-blockchain-perfection.js',
    description: 'Bitcoin + Ethereum + Polygon + Arbitrum + Optimism + Avalanche + Solana + NEAR',
    emoji: '🌐',
    phase: ['blockchain'],
    priority: 'high',
    estimatedTime: '45s'
  },
  {
    id: 'cross-service',
    name: 'Integration Tests: Cross-Service',
    file: 'test-wallet-integration.js',
    description: 'End-to-end wallet workflows across all phases',
    emoji: '🔗',
    phase: ['integration'],
    priority: 'high',
    estimatedTime: '50s'
  }
]

// Parse command line arguments
const args = process.argv.slice(2)
const flags = {
  all: args.includes('--all'),
  quick: args.includes('--quick'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  phase: args.find(arg => arg.startsWith('--phase'))?.split('=')[1] || 
         args[args.indexOf('--phase') + 1],
  service: args.find(arg => arg.startsWith('--service'))?.split('=')[1] || 
           args[args.indexOf('--service') + 1],
  priority: args.find(arg => arg.startsWith('--priority'))?.split('=')[1] || 
            args[args.indexOf('--priority') + 1]
}

// Helper functions
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

function displayHeader() {
  console.log('🚀 Chain Capital Wallet Test Runner')
  console.log('=' .repeat(50))
  console.log(`📊 Available Test Suites: ${testSuites.length}`)
  console.log(`⏱️  Estimated Total Time: ${getTotalEstimatedTime()}`)
  console.log()
}

function getTotalEstimatedTime() {
  const totalSeconds = testSuites.reduce((total, suite) => {
    const seconds = parseInt(suite.estimatedTime.replace('s', ''))
    return total + seconds
  }, 0)
  return `${Math.ceil(totalSeconds / 60)}min ${totalSeconds % 60}s`
}

function filterTestSuites(suites, criteria) {
  return suites.filter(suite => {
    if (criteria.phase) {
      const phase = parseInt(criteria.phase)
      if (!suite.phase.includes(phase)) return false
    }
    
    if (criteria.service) {
      if (!suite.id.includes(criteria.service.toLowerCase())) return false
    }
    
    if (criteria.priority) {
      if (suite.priority !== criteria.priority) return false
    }
    
    if (criteria.quick) {
      return suite.priority === 'high'
    }
    
    return true
  })
}

async function runTestSuite(testSuite, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    if (!options.silent) {
      console.log(`\n${testSuite.emoji} Starting: ${testSuite.name}`)
      console.log(`   Description: ${testSuite.description}`)
      console.log(`   Estimated Time: ${testSuite.estimatedTime}`)
      console.log('   ' + '-'.repeat(40))
    }
    
    const child = spawn('node', [testSuite.file], {
      stdio: options.verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    })
    
    let output = ''
    if (!options.verbose) {
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      child.stderr.on('data', (data) => {
        output += data.toString()
      })
    }
    
    child.on('close', (code) => {
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(1)
      const success = code === 0
      
      if (!options.silent) {
        console.log(`   ${success ? '✅ PASSED' : '❌ FAILED'}: ${testSuite.name} (${duration}s)`)
        
        if (!success && !options.verbose) {
          console.log('   📄 Output:')
          console.log(output.split('\n').map(line => `     ${line}`).join('\n'))
        }
      }
      
      resolve({ 
        ...testSuite, 
        success, 
        code, 
        duration: parseFloat(duration),
        output: options.verbose ? '' : output
      })
    })
    
    child.on('error', (error) => {
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(1)
      
      if (!options.silent) {
        console.error(`   ❌ ERROR: ${testSuite.name} - ${error.message} (${duration}s)`)
      }
      
      resolve({ 
        ...testSuite, 
        success: false, 
        error,
        duration: parseFloat(duration)
      })
    })
  })
}

async function runTestSuites(suites, options = {}) {
  const startTime = Date.now()
  const results = []
  
  console.log(`🎯 Running ${suites.length} test suite${suites.length === 1 ? '' : 's'}...\n`)
  
  for (const suite of suites) {
    const result = await runTestSuite(suite, options)
    results.push(result)
  }
  
  // Generate summary report
  const endTime = Date.now()
  const totalDuration = ((endTime - startTime) / 1000).toFixed(1)
  const passed = results.filter(r => r.success).length
  const failed = results.length - passed
  const successRate = ((passed / results.length) * 100).toFixed(1)
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RUNNER SUMMARY')
  console.log('='.repeat(60))
  console.log(`⏱️  Total Duration: ${totalDuration}s`)
  console.log(`📈 Success Rate: ${successRate}% (${passed}/${results.length})`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (results.length > 1) {
    console.log('\n📋 Individual Results:')
    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      console.log(`  ${result.emoji} ${status} - ${result.name} (${result.duration}s)`)
    })
  }
  
  if (failed > 0) {
    console.log('\n⚠️  Failed Test Details:')
    results.filter(r => !r.success).forEach(result => {
      console.log(`  ${result.emoji} ${result.name}:`)
      if (result.error) {
        console.log(`    Error: ${result.error.message}`)
      }
      console.log(`    Command: node ${result.file}`)
    })
  }
  
  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('💎 Chain Capital Wallet Infrastructure: OPERATIONAL')
  } else {
    console.log(`\n🔧 ${failed} test suite(s) require attention`)
  }
  
  return results
}

function displayInteractiveMenu() {
  console.log('📋 Select test suite to run:')
  console.log()
  
  testSuites.forEach((suite, index) => {
    const priority = suite.priority === 'high' ? '🔥' : '⭐'
    console.log(`  ${index + 1}. ${suite.emoji} ${suite.name} ${priority}`)
    console.log(`     ${suite.description} (${suite.estimatedTime})`)
    console.log()
  })
  
  console.log(`  ${testSuites.length + 1}. 🚀 Run All Tests (${getTotalEstimatedTime()})`)
  console.log(`  ${testSuites.length + 2}. ⚡ Quick Tests (High Priority Only)`)
  console.log(`  0. ❌ Exit`)
  console.log()
}

async function interactiveMode() {
  const rl = createInterface()
  
  while (true) {
    displayInteractiveMenu()
    
    const answer = await new Promise(resolve => {
      rl.question('Enter your choice: ', resolve)
    })
    
    const choice = parseInt(answer)
    
    if (choice === 0) {
      console.log('👋 Goodbye!')
      break
    } else if (choice === testSuites.length + 1) {
      // Run all tests
      await runTestSuites(testSuites, { verbose: false })
    } else if (choice === testSuites.length + 2) {
      // Quick tests
      const quickSuites = testSuites.filter(suite => suite.priority === 'high')
      await runTestSuites(quickSuites, { verbose: false })
    } else if (choice >= 1 && choice <= testSuites.length) {
      // Run specific test
      const selectedSuite = testSuites[choice - 1]
      await runTestSuites([selectedSuite], { verbose: true })
    } else {
      console.log('❌ Invalid choice. Please try again.\n')
      continue
    }
    
    // Ask if user wants to continue
    const continueAnswer = await new Promise(resolve => {
      rl.question('\nRun another test? (y/N): ', resolve)
    })
    
    if (!continueAnswer.toLowerCase().startsWith('y')) {
      console.log('👋 Goodbye!')
      break
    }
    
    console.log('\n' + '='.repeat(50) + '\n')
  }
  
  rl.close()
}

async function main() {
  displayHeader()
  
  // Command line mode
  if (flags.all) {
    await runTestSuites(testSuites, { verbose: flags.verbose })
  } else if (flags.quick) {
    const quickSuites = testSuites.filter(suite => suite.priority === 'high')
    await runTestSuites(quickSuites, { verbose: flags.verbose })
  } else if (flags.phase || flags.service || flags.priority) {
    const filteredSuites = filterTestSuites(testSuites, flags)
    if (filteredSuites.length === 0) {
      console.log('❌ No test suites match the specified criteria.')
      process.exit(1)
    }
    await runTestSuites(filteredSuites, { verbose: flags.verbose })
  } else if (args.length === 0) {
    // Interactive mode
    await interactiveMode()
  } else {
    // Show help
    console.log('Usage:')
    console.log('  node test-runner.js                    # Interactive menu')
    console.log('  node test-runner.js --all              # Run all tests')
    console.log('  node test-runner.js --quick            # Run high priority tests')
    console.log('  node test-runner.js --phase 1          # Run phase 1 tests')
    console.log('  node test-runner.js --service hsm      # Run HSM tests')
    console.log('  node test-runner.js --priority high    # Run high priority tests')
    console.log('  node test-runner.js --verbose          # Show detailed output')
    console.log()
    console.log('Available phases: 1, 2, 3, hsm, blockchain, integration')
    console.log('Available services: foundation, smart-contract, account-abstraction, multi-sig, integration, hsm, blockchain, cross-service')
    console.log('Available priorities: high, medium')
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled Rejection:', error.message)
  process.exit(1)
})

// Run the test runner
main().catch(error => {
  console.error('\n💥 Test runner failed:', error.message)
  process.exit(1)
})
