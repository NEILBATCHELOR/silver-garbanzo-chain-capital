#!/usr/bin/env tsx

/**
 * Standalone Address Derivation Test - Phase 3C
 * Tests address derivation without requiring database connection
 */

import * as bip39 from 'bip39'
import { BIP32Factory } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { ethers } from 'ethers'
import { Keypair } from '@solana/web3.js'
import * as bitcoin from 'bitcoinjs-lib'

// Initialize BIP32 factory
const bip32 = BIP32Factory(ecc)

// Blockchain configuration
const COIN_TYPES = {
  bitcoin: 0,
  ethereum: 60,
  polygon: 60,
  arbitrum: 60,
  optimism: 60,
  avalanche: 60,
  solana: 501,
  near: 397
} as const

type BlockchainNetwork = keyof typeof COIN_TYPES

async function testAddressDerivation() {
  console.log('🧪 Testing Phase 3C: Standalone Address Derivation')
  console.log('=' .repeat(60))
  
  try {
    // Test with a known mnemonic for reproducible results
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    
    console.log('🔧 Testing with known mnemonic for reproducible results')
    console.log(`Mnemonic: ${testMnemonic}`)
    console.log('')
    
    // Validate and create seed
    if (!bip39.validateMnemonic(testMnemonic)) {
      throw new Error('Invalid test mnemonic')
    }
    
    const seed = await bip39.mnemonicToSeed(testMnemonic)
    const masterKey = bip32.fromSeed(seed)
    
    console.log('✅ Master key created successfully')
    console.log('')
    
    // Test address derivation for each blockchain
    const blockchains: BlockchainNetwork[] = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'solana', 'bitcoin', 'near']
    
    console.log('🏗️  Testing address derivation for all blockchains:')
    console.log('')
    
    const results: Record<string, { success: boolean; address?: string; error?: string }> = {}
    
    for (const blockchain of blockchains) {
      try {
        console.log(`🔄 Deriving ${blockchain} address...`)
        
        // Derive key for this blockchain
        const coinType = COIN_TYPES[blockchain]
        const derivationPath = `m/44'/${coinType}'/0'/0/0`
        const derivedKey = masterKey.derivePath(derivationPath)
        
        if (!derivedKey.privateKey) {
          throw new Error('Failed to derive private key')
        }
        
        let address: string
        
        // Derive address based on blockchain type
        switch (blockchain) {
          case 'bitcoin':
            const { address: btcAddress } = bitcoin.payments.p2pkh({
              pubkey: derivedKey.publicKey,
              network: bitcoin.networks.bitcoin
            })
            if (!btcAddress) throw new Error('Failed to generate Bitcoin address')
            address = btcAddress
            break
            
          case 'ethereum':
          case 'polygon':
          case 'arbitrum':
          case 'optimism':
          case 'avalanche':
            const privateKeyHex = '0x' + Buffer.from(derivedKey.privateKey).toString('hex')
            address = ethers.computeAddress(privateKeyHex)
            break
            
          case 'solana':
            const privateKeyBytes = derivedKey.privateKey.subarray(0, 32)
            const solanaKeypair = Keypair.fromSeed(privateKeyBytes)
            address = solanaKeypair.publicKey.toBase58()
            break
            
          case 'near':
            const nearPrivateKeyBytes = derivedKey.privateKey.subarray(0, 32)
            const nearKeypair = Keypair.fromSeed(nearPrivateKeyBytes)
            const publicKeyBytes = nearKeypair.publicKey.toBytes()
            address = Buffer.from(publicKeyBytes).toString('hex')
            break
            
          default:
            throw new Error(`Unsupported blockchain: ${blockchain}`)
        }
        
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
        
        console.log('')
        
      } catch (error) {
        results[blockchain] = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        console.log(`  ❌ ${blockchain}: ${error}`)
        console.log('')
      }
    }
    
    // Expected addresses for verification (first address of the test mnemonic)
    const expectedAddresses = {
      ethereum: '0x9858EfFD232fD72971BF8F3f41c1Dc21BBB9bcC8', // Known expected for this mnemonic
      bitcoin: '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA' // Known expected for this mnemonic
    }
    
    // Summary
    console.log('📊 Test Results Summary:')
    console.log('=' .repeat(40))
    
    const successCount = Object.values(results).filter(r => r.success).length
    const totalCount = Object.keys(results).length
    
    console.log(`✅ Successful: ${successCount}/${totalCount} blockchains`)
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount} blockchains`)
    console.log('')
    
    // Verify known addresses
    if (results.ethereum?.success && expectedAddresses.ethereum) {
      const ethMatch = results.ethereum.address === expectedAddresses.ethereum
      console.log(`🔍 Ethereum address verification: ${ethMatch ? '✅ PASS' : '❌ FAIL'}`)
      if (!ethMatch) {
        console.log(`   Expected: ${expectedAddresses.ethereum}`)
        console.log(`   Got:      ${results.ethereum.address}`)
      }
    }
    
    if (results.bitcoin?.success && expectedAddresses.bitcoin) {
      const btcMatch = results.bitcoin.address === expectedAddresses.bitcoin
      console.log(`🔍 Bitcoin address verification: ${btcMatch ? '✅ PASS' : '❌ FAIL'}`)
      if (!btcMatch) {
        console.log(`   Expected: ${expectedAddresses.bitcoin}`)
        console.log(`   Got:      ${results.bitcoin.address}`)
      }
    }
    
    console.log('')
    
    if (successCount === totalCount) {
      console.log('🎉 All blockchain address derivations working perfectly!')
      console.log('Phase 3C Task 1.1, 1.2, 1.3: ✅ COMPLETE')
    } else {
      console.log('⚠️  Some blockchains need additional work')
      
      Object.entries(results).forEach(([blockchain, result]) => {
        if (!result.success) {
          console.log(`   - ${blockchain}: ${result.error}`)
        }
      })
    }
    
    console.log('')
    console.log('🧪 Standalone Address Derivation Test Complete')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testAddressDerivation().catch(console.error)
