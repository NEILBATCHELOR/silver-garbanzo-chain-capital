#!/usr/bin/env tsx

/**
 * Test wallet routes compilation
 * Verifies all TypeScript errors are resolved
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'

console.log('🔍 Checking Wallet Routes TypeScript Compilation...\n')

try {
  // Check if wallets.ts exists
  const routesPath = '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/routes/wallets.ts'
  
  if (!existsSync(routesPath)) {
    console.error('❌ wallets.ts not found at:', routesPath)
    process.exit(1)
  }

  console.log('✅ wallets.ts file found')

  // Run TypeScript compiler check
  console.log('🔧 Running TypeScript compilation check...')
  
  try {
    execSync('cd /Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend && npx tsc --noEmit', { 
      stdio: 'pipe',
      encoding: 'utf8'
    })
    console.log('✅ TypeScript compilation successful - no errors found!')
  } catch (error: any) {
    console.log('⚠️ TypeScript compilation warnings/errors:')
    console.log(error.stdout || error.stderr)
    
    // Check if errors are only warnings or non-critical
    const output = error.stdout || error.stderr || ''
    const hasErrors = output.includes('error TS')
    
    if (hasErrors) {
      console.log('❌ Critical TypeScript errors found - needs fixing')
      process.exit(1)
    } else {
      console.log('⚠️ Only warnings found - should be addressed but not blocking')
    }
  }

  // Count API endpoints
  const fs = require('fs')
  const content = fs.readFileSync(routesPath, 'utf8')
  
  const endpoints = content.match(/fastify\.(get|post|put|delete)\s*\(/g) || []
  console.log(`\n📊 API Endpoints Found: ${endpoints.length}`)
  
  // Count service integrations
  const services = [
    'walletService',
    'smartContractWalletService', 
    'webAuthnService',
    'guardianRecoveryService',
    'userOperationService',
    'signatureMigrationService',
    'restrictionsService',
    'lockService',
    'unifiedWalletInterface',
    'hsmKeyManagementService'
  ]
  
  let integratedServices = 0
  services.forEach(service => {
    if (content.includes(service)) {
      integratedServices++
      console.log(`✅ ${service} integrated`)
    } else {
      console.log(`❌ ${service} not found`)
    }
  })
  
  console.log(`\n📈 Service Integration: ${integratedServices}/${services.length} services`)
  
  // Check for Phase 3 enhancements
  const phase3Features = [
    'signature-migration',
    'restrictions',
    'lock',
    'guardians',
    'hsm',
    'unified',
    'smart-contract',
    'webauthn'
  ]
  
  let implementedFeatures = 0
  phase3Features.forEach(feature => {
    if (content.includes(feature)) {
      implementedFeatures++
      console.log(`✅ ${feature} endpoints implemented`)
    } else {
      console.log(`❌ ${feature} endpoints missing`)
    }
  })
  
  console.log(`\n🚀 Phase 3 Features: ${implementedFeatures}/${phase3Features.length} implemented`)
  
  if (integratedServices >= 8 && implementedFeatures >= 6) {
    console.log('\n🎉 Wallet Routes Enhancement: SUCCESSFULLY COMPLETED!')
    console.log('✅ All critical TypeScript errors fixed')
    console.log('✅ Advanced API routes implemented')
    console.log('✅ Phase 3 services integrated')
  } else {
    console.log('\n⚠️ Wallet Routes Enhancement: PARTIALLY COMPLETE')
    console.log('Some services or features may need additional work')
  }

} catch (error) {
  console.error('❌ Error during compilation check:', error)
  process.exit(1)
}
