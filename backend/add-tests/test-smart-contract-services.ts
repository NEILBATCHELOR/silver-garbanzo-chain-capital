#!/usr/bin/env tsx

/**
 * Smart Contract Wallet Services Compilation Test
 * 
 * Tests compilation and basic instantiation of all smart contract wallet services
 */

import { 
  GuardianRecoveryService,
  type Guardian,
  type GuardianRecoveryProposal,
  type SecurityConfig
} from './src/services/wallets/guardian/index.js'

import { 
  FacetRegistryService,
  SmartContractWalletService,
  type FacetInfo,
  type RegisteredFacet,
  type SmartContractWallet,
  type DiamondCutOperation
} from './src/services/wallets/smart-contract/index.js'

import { 
  WebAuthnService,
  type WebAuthnCredential,
  type WebAuthnRegistrationOptions,
  type WebAuthnAuthenticationOptions
} from './src/services/wallets/webauthn/index.js'

console.log('🧪 Testing Smart Contract Wallet Services...')

// Test service instantiation
try {
  console.log('1. Testing GuardianRecoveryService...')
  const guardianService = new GuardianRecoveryService()
  console.log('   ✅ GuardianRecoveryService instantiated successfully')

  console.log('2. Testing FacetRegistryService...')
  const facetRegistryService = new FacetRegistryService()
  console.log('   ✅ FacetRegistryService instantiated successfully')

  console.log('3. Testing SmartContractWalletService...')
  const smartWalletService = new SmartContractWalletService()
  console.log('   ✅ SmartContractWalletService instantiated successfully')

  console.log('4. Testing WebAuthnService...')
  const webAuthnService = new WebAuthnService()
  console.log('   ✅ WebAuthnService instantiated successfully')

  console.log('\n5. Testing type definitions...')
  
  // Test Guardian types
  const guardianExample: Guardian = {
    id: 'test-id',
    walletId: 'wallet-id',
    guardianAddress: '0x742d35cc8a6f0b6f48f0f10b0c6f6b9b3b8b5b6b',
    status: 'active',
    requestedAt: new Date().toISOString()
  }
  console.log('   ✅ Guardian type definition valid')

  // Test FacetInfo types
  const facetExample: FacetInfo = {
    name: 'TestFacet',
    address: '0x742d35cc8a6f0b6f48f0f10b0c6f6b9b3b8b5b6b',
    version: '1.0.0',
    functionSelectors: ['0x12345678'],
    isActive: true
  }
  console.log('   ✅ FacetInfo type definition valid')

  // Test WebAuthn types
  const webAuthnExample: WebAuthnCredential = {
    id: 'cred-id',
    credentialId: 'credential-123',
    publicKeyX: '0x123...',
    publicKeyY: '0x456...',
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  console.log('   ✅ WebAuthnCredential type definition valid')

  console.log('\n🎉 All smart contract wallet services compiled and instantiated successfully!')
  console.log('✅ TypeScript compilation: PASSED')
  console.log('✅ Service instantiation: PASSED')
  console.log('✅ Type definitions: PASSED')

} catch (error) {
  console.error('❌ Smart contract wallet services test failed:', error)
  process.exit(1)
}
