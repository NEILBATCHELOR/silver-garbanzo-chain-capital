#!/usr/bin/env node

/**
 * Backend Server Verification Script
 * Tests that all server files can be imported and built without errors
 */

console.log('🧪 Testing Chain Capital Backend Server Implementation...\n')

async function testServerImports() {
  const tests = [
    { name: 'Main Server Router', file: './src/server.ts' },
    { name: 'Development Server', file: './src/server-development.ts' },
    { name: 'Production Server', file: './src/server-production.ts' },
    { name: 'Test Server', file: './src/server-test.ts' }
  ]

  let allPassed = true

  for (const test of tests) {
    try {
      console.log(`📝 Testing ${test.name}...`)
      
      // Try to import the module
      await import(test.file)
      
      console.log(`   ✅ ${test.name} imported successfully`)
    } catch (error) {
      console.log(`   ❌ ${test.name} failed:`, error.message)
      allPassed = false
    }
  }

  return allPassed
}

async function testServiceIntegration() {
  console.log('\n🔧 Testing Service Integration...')
  
  try {
    // Test that we can import core services
    const { ProjectService } = await import('./src/services/projects/ProjectService.js')
    const { InvestorService } = await import('./src/services/investors/InvestorService.js')
    const { AuditService } = await import('./src/services/audit/AuditService.js')
    const { createLogger } = await import('./src/utils/logger.js')
    
    console.log('   ✅ Core services can be imported')
    console.log('   ✅ ProjectService available')
    console.log('   ✅ InvestorService available') 
    console.log('   ✅ AuditService available')
    console.log('   ✅ Logger utility available')
    
    return true
  } catch (error) {
    console.log('   ❌ Service integration test failed:', error.message)
    return false
  }
}

async function testTypeScriptCompilation() {
  console.log('\n📦 Testing TypeScript Compilation...')
  
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --project tsconfig.json')
    
    if (stderr && !stderr.includes('warning')) {
      throw new Error(stderr)
    }
    
    console.log('   ✅ TypeScript compilation successful')
    if (stdout) {
      console.log('   📝 Compiler output:', stdout.trim())
    }
    
    return true
  } catch (error) {
    console.log('   ❌ TypeScript compilation failed:', error.message)
    return false
  }
}

async function testPackageScripts() {
  console.log('\n📋 Testing Package Scripts...')
  
  try {
    const fs = await import('fs/promises')
    const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf-8'))
    
    const requiredScripts = [
      'dev', 'dev:production', 'dev:test',
      'start:production', 'start:development', 'start:test',
      'build', 'start'
    ]
    
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script])
    
    if (missingScripts.length > 0) {
      throw new Error(`Missing scripts: ${missingScripts.join(', ')}`)
    }
    
    console.log('   ✅ All required scripts present in package.json')
    console.log(`   📊 Total scripts: ${Object.keys(packageJson.scripts).length}`)
    
    return true
  } catch (error) {
    console.log('   ❌ Package scripts test failed:', error.message)
    return false
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Backend Server Implementation Tests...\n')
  
  const testResults = []
  
  // Test server imports
  const importTest = await testServerImports()
  testResults.push({ name: 'Server Imports', passed: importTest })
  
  // Test service integration
  const serviceTest = await testServiceIntegration()
  testResults.push({ name: 'Service Integration', passed: serviceTest })
  
  // Test TypeScript compilation
  const tsTest = await testTypeScriptCompilation()
  testResults.push({ name: 'TypeScript Compilation', passed: tsTest })
  
  // Test package scripts
  const scriptTest = await testPackageScripts()
  testResults.push({ name: 'Package Scripts', passed: scriptTest })
  
  // Summary
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  
  const passedTests = testResults.filter(t => t.passed).length
  const totalTests = testResults.length
  
  testResults.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL'
    console.log(`   ${status} ${test.name}`)
  })
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Backend server implementation is ready.')
    console.log('\n📝 Next steps:')
    console.log('   1. Run: npm run dev (start development server)')
    console.log('   2. Visit: http://localhost:3001/docs (API documentation)')
    console.log('   3. Check: http://localhost:3001/health (health status)')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues before proceeding.')
    process.exit(1)
  }
}

// Run if called directly
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})
