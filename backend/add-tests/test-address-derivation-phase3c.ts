#!/usr/bin/env tsx

/**
 * Test script for Phase 3C: Blockchain Perfection - Address Derivation
 * Tests the improved address derivation for all 8 supported blockchains
 */

import { HDWalletService } from './src/services/wallets/HDWalletService.js'
import { ethers } from 'ethers'

async function testAddressDerivation() {
  console.log('🧪 Testing Phase 3C: Blockchain Perfection - Address Derivation')
  console.log('=' .repeat(60))
  
  const hdWalletService = new HDWalletService()
  
  try {
    // Test with a known mnemonic for reproducible results
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    
    console.log('🔧 Testing with known mnemonic for reproducible results')
    console.log(`Mnemonic: ${testMnemonic}`)
    console.log('')
    
    // Restore wallet from test mnemonic
    const walletResult = await hdWalletService.restoreFromMnemonic(testMnemonic)
    
    if (!walletResult.success) {
      console.error('❌ Failed to restore wallet from mnemonic:', walletResult.error)
      return
    }
    
    console.log('✅ Wallet restored successfully')
    const walletData = walletResult.data!
    
    // Create master key for derivation
    const masterKeyResult = await hdWalletService.createMasterKeyFromEncryptedSeed(walletData.encryptedSeed)
    if (!masterKeyResult.success) {
      console.error('❌ Failed to create master key:', masterKeyResult.error)
      return
    }
    
    const masterKey = masterKeyResult.data!
    console.log('✅ Master key created successfully')
    console.log('')
    
    // Test address derivation for each blockchain
    const blockchains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'solana', 'bitcoin', 'near'] as const
    
    console.log('🏗️  Testing address derivation for all blockchains:')
    console.log('')
    
    const results: Record<string, { success: boolean; address?: string; error?: string }> = {}
    
    for (const blockchain of blockchains) {
      try {
        console.log(`🔄 Deriving ${blockchain} address...`)
        
        const addressResult = await hdWalletService.deriveAddress(masterKey, blockchain, 0)
        
        if (addressResult.success) {
          const address = addressResult.data!
          results[blockchain] = { success: true, address }
          
          // Validate address format
          let isValidFormat = false
          let formatInfo = ''
          
          switch (blockchain) {
            case 'ethereum':
            case 'polygon':
            case 'arbitrum':
            case 'optimism':
            case 'avalanche':
              isValidFormat = ethers.isAddress(address)
              formatInfo = `Ethereum-compatible (${address.length} chars)`
              break
            case 'solana':
              isValidFormat = address.length >= 32 && address.length <= 44
              formatInfo = `Base58 format (${address.length} chars)`
              break
            case 'bitcoin':
              isValidFormat = address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')
              formatInfo = `Bitcoin format (${address.length} chars)`
              break
            case 'near':
              isValidFormat = address.length === 64 && /^[0-9a-f]+$/.test(address)
              formatInfo = `Hex implicit account (${address.length} chars)`
              break
          }
          
          if (isValidFormat) {
            console.log(`  ✅ ${blockchain}: ${address}`)
            console.log(`     Format: ${formatInfo}`)
          } else {
            console.log(`  ⚠️  ${blockchain}: ${address}`)
            console.log(`     Format: ${formatInfo} (validation failed)`)
          }
        } else {
          results[blockchain] = { success: false, error: addressResult.error }
          console.log(`  ❌ ${blockchain}: ${addressResult.error}`)
        }
        
        console.log('')
      } catch (error) {
        results[blockchain] = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        console.log(`  ❌ ${blockchain}: ${error}`)
        console.log('')
      }
    }
    
    // Summary
    console.log('📊 Test Results Summary:')
    console.log('=' .repeat(40))
    
    const successCount = Object.values(results).filter(r => r.success).length
    const totalCount = Object.keys(results).length
    
    console.log(`✅ Successful: ${successCount}/${totalCount} blockchains`)
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount} blockchains`)
    console.log('')
    
    if (successCount === totalCount) {
      console.log('🎉 All blockchain address derivations working perfectly!')
      console.log('Phase 3C Task 1.1 (Ethereum Family) and 1.2 (Solana) and 1.3 (NEAR): ✅ COMPLETE')
    } else {
      console.log('⚠️  Some blockchains need additional work')
      
      Object.entries(results).forEach(([blockchain, result]) => {
        if (!result.success) {
          console.log(`   - ${blockchain}: ${result.error}`)
        }
      })
    }
    
    console.log('')
    console.log('🧪 Address Derivation Test Complete')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testAddressDerivation().catch(console.error)
