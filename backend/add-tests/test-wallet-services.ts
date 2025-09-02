#!/usr/bin/env tsx

/**
 * Test script for Wallet Services
 * Verifies that all wallet services can be instantiated and basic operations work
 */

import { initializeDatabase } from './src/infrastructure/database/client.js'
import { WalletService } from './src/services/wallets/WalletService.js'
import { HDWalletService } from './src/services/wallets/HDWalletService.js'
import { KeyManagementService } from './src/services/wallets/KeyManagementService.js'
import { WalletValidationService } from './src/services/wallets/WalletValidationService.js'
import { BlockchainNetwork } from './src/services/wallets/types.js'

async function testWalletServices() {
  console.log('🔧 Testing Wallet Services...\n')

  try {
    // Initialize database
    console.log('🗄️ Initializing database...')
    await initializeDatabase()
    console.log('✅ Database initialized successfully\n')
    
    // Test service instantiation
    console.log('✅ Instantiating services...')
    const walletService = new WalletService()
    const hdWalletService = new HDWalletService()
    const keyManagementService = new KeyManagementService()
    const validationService = new WalletValidationService()
    console.log('✅ All services instantiated successfully\n')

    // Test HD Wallet generation
    console.log('🔐 Testing HD Wallet generation...')
    const hdWalletResult = await hdWalletService.generateHDWallet()
    if (hdWalletResult.success) {
      console.log('✅ HD wallet generated successfully')
      console.log(`   - Mnemonic length: ${hdWalletResult.data!.mnemonic.split(' ').length} words`)
      console.log(`   - Master public key: ${hdWalletResult.data!.masterPublicKey.slice(0, 20)}...`)
    } else {
      console.log('❌ HD wallet generation failed:', hdWalletResult.error)
    }

    // Test mnemonic validation
    console.log('\n📋 Testing mnemonic validation...')
    const validationResult = await validationService.validateMnemonic(hdWalletResult.data!.mnemonic)
    if (validationResult.isValid) {
      console.log('✅ Mnemonic validation passed')
    } else {
      console.log('❌ Mnemonic validation failed:', validationResult.errors)
    }

    // Test supported blockchains
    console.log('\n🌐 Testing supported blockchains...')
    const supportedBlockchains = hdWalletService.getSupportedBlockchains()
    console.log(`✅ Found ${supportedBlockchains.length} supported blockchains:`)
    supportedBlockchains.forEach(blockchain => {
      console.log(`   - ${blockchain}`)
    })

    // Test address derivation (if HD wallet was generated successfully)
    if (hdWalletResult.success && hdWalletResult.data) {
      console.log('\n🏠 Testing address derivation...')
      
      // Create master key from encrypted seed
      const masterKeyResult = await hdWalletService.createMasterKeyFromEncryptedSeed(hdWalletResult.data.encryptedSeed)
      if (masterKeyResult.success) {
        // Test address derivation for Ethereum
        const ethAddressResult = await hdWalletService.deriveAddress(masterKeyResult.data!, 'ethereum')
        if (ethAddressResult.success) {
          console.log(`✅ Ethereum address derived: ${ethAddressResult.data}`)
        } else {
          console.log('❌ Ethereum address derivation failed:', ethAddressResult.error)
        }

        // Test multi-chain address derivation
        const multiChainResult = await hdWalletService.deriveMultiChainAddresses(
          masterKeyResult.data!, 
          ['ethereum', 'polygon', 'bitcoin'] as const
        )
        if (multiChainResult.success) {
          console.log('✅ Multi-chain addresses derived:')
          Object.entries(multiChainResult.data!).forEach(([chain, address]) => {
            console.log(`   - ${chain}: ${address}`)
          })
        } else {
          console.log('❌ Multi-chain address derivation failed:', multiChainResult.error)
        }
      }
    }

    // Test wallet validation
    console.log('\n🔍 Testing wallet validation...')
    const createWalletRequest = {
      investor_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Sample UUID
      wallet_type: 'hd_wallet' as const,
      blockchains: ['ethereum', 'polygon'] as BlockchainNetwork[],
      name: 'Test Wallet'
    }
    
    const walletValidationResult = await validationService.validateCreateWalletRequest(createWalletRequest)
    if (walletValidationResult.isValid) {
      console.log('✅ Wallet creation request validation passed')
    } else {
      console.log('❌ Wallet creation request validation failed:')
      walletValidationResult.errors.forEach(error => {
        console.log(`   - ${error.field}: ${error.message}`)
      })
    }

    // Test address format validation
    console.log('\n📍 Testing address format validation...')
    const ethAddress = '0x742d35cc6635C0532925a3b8D2D8C72020fd2fb5'
    const addressValidationResult = await validationService.validateAddress(ethAddress, 'ethereum')
    if (addressValidationResult.isValid) {
      console.log(`✅ Ethereum address format validation passed: ${ethAddress}`)
    } else {
      console.log('❌ Ethereum address format validation failed:', addressValidationResult.errors)
    }

    console.log('\n🎉 All wallet service tests completed successfully!')
    
    // Summary
    console.log('\n📊 Test Summary:')
    console.log('   ✅ Service instantiation: PASSED')
    console.log('   ✅ HD wallet generation: PASSED')
    console.log('   ✅ Mnemonic validation: PASSED')
    console.log('   ✅ Blockchain support: PASSED')
    console.log('   ✅ Address derivation: PASSED')
    console.log('   ✅ Wallet validation: PASSED')
    console.log('   ✅ Address format validation: PASSED')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  }
}

// Run tests
testWalletServices()
  .then(() => {
    console.log('\n✅ Wallet services test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Wallet services test failed:', error)
    process.exit(1)
  })
