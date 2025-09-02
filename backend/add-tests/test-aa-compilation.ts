#!/usr/bin/env tsx

/**
 * Account Abstraction TypeScript Compilation Test
 * Verifies that all TypeScript errors are resolved
 */

import { spawn } from 'child_process'
import path from 'path'

console.log('🔧 Testing Account Abstraction TypeScript Compilation...')

const backendDir = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend'

// Test TypeScript compilation
const tsProcess = spawn('npx', ['tsc', '--noEmit', '--project', '.'], {
  cwd: backendDir,
  stdio: 'pipe'
})

let stdout = ''
let stderr = ''

tsProcess.stdout.on('data', (data) => {
  stdout += data.toString()
})

tsProcess.stderr.on('data', (data) => {
  stderr += data.toString()
})

tsProcess.on('close', (code) => {
  console.log('\n📊 TypeScript Compilation Results:')
  
  if (code === 0) {
    console.log('✅ All TypeScript compilation errors resolved!')
    console.log('✅ Account Abstraction services are ready for use!')
  } else {
    console.log('❌ TypeScript compilation errors found:')
    
    // Filter for only account abstraction related errors
    const lines = stderr.split('\n')
    const aaErrors = lines.filter(line => 
      line.includes('account-abstraction') ||
      line.includes('BatchOperationService') ||
      line.includes('UserOperationService') ||
      line.includes('PaymasterService')
    )
    
    if (aaErrors.length > 0) {
      console.log('\n🎯 Account Abstraction specific errors:')
      aaErrors.forEach(error => console.log('  ', error))
    } else {
      console.log('\n✅ No Account Abstraction specific errors found!')
      console.log('ℹ️  Other TypeScript errors may exist in the project')
    }
  }
  
  process.exit(code)
})
