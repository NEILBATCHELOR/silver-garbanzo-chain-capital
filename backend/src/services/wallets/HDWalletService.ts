import { BaseService } from '../BaseService'
import { ServiceResult } from '../../types/index'
import { 
  HDWalletData, 
  BlockchainNetwork, 
  COIN_TYPES, 
  DEFAULT_DERIVATION_PATHS,
  SECURITY_CONFIG 
} from './types'
import * as bip39 from 'bip39'
import { BIP32Factory, BIP32Interface } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import * as bitcoin from 'bitcoinjs-lib'
import { ethers } from 'ethers'
import { Keypair } from '@solana/web3.js'
import { connect, keyStores, utils } from 'near-api-js'

// Initialize BIP32 factory with elliptic curve library
const bip32 = BIP32Factory(ecc)

export class HDWalletService extends BaseService {

  constructor() {
    super('HDWallet')
  }

  /**
   * Generate mnemonic phrase (standalone method for tests/compatibility)
   */
  async generateMnemonic(strength: number = SECURITY_CONFIG.MNEMONIC_STRENGTH): Promise<ServiceResult<string>> {
    try {
      // Validate strength (128 = 12 words, 256 = 24 words)
      if (strength !== 128 && strength !== 256) {
        return this.error('Invalid mnemonic strength. Use 128 or 256', 'INVALID_STRENGTH', 400)
      }

      const mnemonic = bip39.generateMnemonic(strength)
      this.logInfo('Mnemonic generated successfully')
      return this.success(mnemonic)
    } catch (error) {
      this.logError('Failed to generate mnemonic', { error, strength })
      return this.error('Failed to generate mnemonic', 'MNEMONIC_GENERATION_FAILED')
    }
  }

  /**
   * Generate new HD wallet with mnemonic phrase
   */
  async generateHDWallet(strength: number = SECURITY_CONFIG.MNEMONIC_STRENGTH): Promise<ServiceResult<HDWalletData>> {
    try {
      // Validate strength (128 = 12 words, 256 = 24 words)
      if (strength !== 128 && strength !== 256) {
        return this.error('Invalid mnemonic strength. Use 128 or 256', 'INVALID_STRENGTH', 400)
      }

      // Generate mnemonic and seed
      const mnemonic = bip39.generateMnemonic(strength)
      const seed = await bip39.mnemonicToSeed(mnemonic)
      const masterKey = bip32.fromSeed(seed)

      // Encrypt the seed for storage (in production, use HSM)
      const encryptedSeed = this.encryptSeed(seed.toString('hex'))
      const masterPublicKey = masterKey.publicKey.toString('hex')

      // Generate derivation paths for supported chains
      const derivationPaths: Record<string, string> = {}
      Object.keys(COIN_TYPES).forEach(blockchain => {
        const coinType = COIN_TYPES[blockchain as BlockchainNetwork]
        derivationPaths[blockchain] = `m/44'/${coinType}'/0'/0/0`
      })

      const hdWalletData: HDWalletData = {
        mnemonic,
        seed,
        encryptedSeed,
        masterPublicKey,
        derivationPaths
      }

      this.logInfo('HD wallet generated successfully')
      return this.success(hdWalletData)

    } catch (error) {
      this.logError('Failed to generate HD wallet', { error })
      return this.error('Failed to generate HD wallet', 'GENERATION_FAILED')
    }
  }

  /**
   * Restore HD wallet from mnemonic phrase
   */
  async restoreFromMnemonic(mnemonic: string): Promise<ServiceResult<HDWalletData>> {
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        return this.error('Invalid mnemonic phrase', 'INVALID_MNEMONIC', 400)
      }

      const seed = await bip39.mnemonicToSeed(mnemonic)
      const masterKey = bip32.fromSeed(seed)

      const encryptedSeed = this.encryptSeed(seed.toString('hex'))
      const masterPublicKey = masterKey.publicKey.toString('hex')

      const derivationPaths: Record<string, string> = {}
      Object.keys(COIN_TYPES).forEach(blockchain => {
        const coinType = COIN_TYPES[blockchain as BlockchainNetwork]
        derivationPaths[blockchain] = `m/44'/${coinType}'/0'/0/0`
      })

      const hdWalletData: HDWalletData = {
        mnemonic,
        seed,
        encryptedSeed,
        masterPublicKey,
        derivationPaths
      }

      this.logInfo('HD wallet restored from mnemonic')
      return this.success(hdWalletData)

    } catch (error) {
      this.logError('Failed to restore HD wallet from mnemonic', { error })
      return this.error('Failed to restore HD wallet', 'RESTORE_FAILED')
    }
  }

  /**
   * Derive address for specific blockchain and account
   */
  async deriveAddress(
    masterKey: BIP32Interface, 
    blockchain: BlockchainNetwork, 
    accountIndex: number = 0
  ): Promise<ServiceResult<string>> {
    try {
      const coinType = COIN_TYPES[blockchain]
      if (coinType === undefined) {
        return this.error(`Unsupported blockchain: ${blockchain}`, 'UNSUPPORTED_BLOCKCHAIN', 400)
      }

      // BIP44 derivation path: m/44'/coin_type'/account'/change/address_index
      const derivationPath = `m/44'/${coinType}'/${accountIndex}'/0/0`
      const derived = masterKey.derivePath(derivationPath)

      let address: string

      switch (blockchain) {
        case 'bitcoin':
          address = await this.deriveBitcoinAddress(derived)
          break
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          address = await this.deriveEthereumAddress(derived)
          break
        case 'solana':
          address = await this.deriveSolanaAddress(derived)
          break
        case 'near':
          address = await this.deriveNearAddress(derived)
          break
        default:
          return this.error(`Address derivation not implemented for ${blockchain}`, 'NOT_IMPLEMENTED', 400)
      }

      return this.success(address)

    } catch (error) {
      this.logError(`Failed to derive ${blockchain} address`, { error, blockchain })
      return this.error(`Failed to derive ${blockchain} address`, 'DERIVATION_FAILED')
    }
  }

  /**
   * Derive multiple addresses for a wallet across multiple chains
   */
  async deriveMultiChainAddresses(
    masterKey: BIP32Interface,
    blockchains: BlockchainNetwork[],
    accountIndex: number = 0
  ): Promise<ServiceResult<Record<string, string>>> {
    try {
      const addresses: Record<string, string> = {}
      const errors: string[] = []

      for (const blockchain of blockchains) {
        const result = await this.deriveAddress(masterKey, blockchain, accountIndex)
        if (result.success) {
          addresses[blockchain] = result.data!
        } else {
          errors.push(`${blockchain}: ${result.error}`)
          this.logWarn('Failed to derive address for blockchain', { blockchain, error: result.error })
        }
      }

      if (Object.keys(addresses).length === 0) {
        return this.error(`Failed to derive addresses: ${errors.join(', ')}`, 'ALL_DERIVATIONS_FAILED')
      }

      if (errors.length > 0) {
        this.logWarn('Some address derivations failed', { errors })
      }

      return this.success(addresses)

    } catch (error) {
      this.logError('Failed to derive multi-chain addresses', { error, blockchains })
      return this.error('Failed to derive multi-chain addresses', 'MULTI_DERIVATION_FAILED')
    }
  }

  /**
   * Validate mnemonic phrase
   */
  async validateMnemonic(mnemonic: string): Promise<ServiceResult<boolean>> {
    try {
      const isValid = bip39.validateMnemonic(mnemonic)
      return this.success(isValid)
    } catch (error) {
      this.logError('Failed to validate mnemonic', { error })
      return this.error('Failed to validate mnemonic', 'VALIDATION_FAILED')
    }
  }

  /**
   * Get mnemonic word list for a specific language
   */
  async getMnemonicWordList(language: string = 'english'): Promise<ServiceResult<string[]>> {
    try {
      // bip39 library uses 'english' as default, but supports other languages
      const wordlist = bip39.wordlists[language as keyof typeof bip39.wordlists] || bip39.wordlists.english
      if (!wordlist) {
        return this.error(`Wordlist not available for language: ${language}`, 'WORDLIST_NOT_FOUND', 404)
      }
      return this.success(wordlist)
    } catch (error) {
      this.logError('Failed to get mnemonic word list', { error, language })
      return this.error('Failed to get mnemonic word list', 'WORDLIST_FAILED')
    }
  }

  /**
   * Generate entropy for custom mnemonic generation
   */
  async generateEntropy(strength: number = 128): Promise<ServiceResult<string>> {
    try {
      const entropy = bip39.generateMnemonic(strength)
      return this.success(entropy)
    } catch (error) {
      this.logError('Failed to generate entropy', { error, strength })
      return this.error('Failed to generate entropy', 'ENTROPY_FAILED')
    }
  }

  /**
   * Private helper methods for blockchain-specific address derivation
   */

  private async deriveBitcoinAddress(keyPair: BIP32Interface): Promise<string> {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for Bitcoin address derivation')
    }
    
    // Generate P2PKH address (starts with 1)
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin
    })
    
    if (!address) {
      throw new Error('Failed to generate Bitcoin address')
    }
    
    return address
  }

  private async deriveEthereumAddress(keyPair: BIP32Interface): Promise<string> {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for Ethereum address derivation')
    }

    // Use ethers.js for proper Ethereum address derivation with keccak256
    const privateKeyHex = '0x' + Buffer.from(keyPair.privateKey).toString('hex')
    
    try {
      // Compute the Ethereum address from the private key
      const address = ethers.computeAddress(privateKeyHex)
      
      this.logDebug('Ethereum address derived successfully', { 
        publicKey: keyPair.publicKey.toString('hex').slice(0, 16) + '...'
      })
      
      return address
    } catch (error) {
      this.logError('Failed to compute Ethereum address', { error })
      throw new Error('Failed to compute Ethereum address')
    }
  }

  private async deriveSolanaAddress(keyPair: BIP32Interface): Promise<string> {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for Solana address derivation')
    }

    try {
      // Solana uses Ed25519 keys - derive from secp256k1 private key
      // Note: This is a simplified approach - in production consider proper Ed25519 derivation
      const privateKeyBytes = keyPair.privateKey.subarray(0, 32) // Take first 32 bytes
      
      // Create Solana keypair from the derived bytes
      const solanaKeypair = Keypair.fromSeed(privateKeyBytes)
      
      // Get the base58-encoded public key (Solana address)
      const address = solanaKeypair.publicKey.toBase58()
      
      this.logDebug('Solana address derived successfully', {
        publicKey: address.slice(0, 8) + '...'
      })
      
      return address
    } catch (error) {
      this.logError('Failed to derive Solana address', { error })
      throw new Error('Failed to derive Solana address')
    }
  }

  private async deriveNearAddress(keyPair: BIP32Interface): Promise<string> {
    if (!keyPair.privateKey) {
      throw new Error('Private key required for NEAR address derivation')
    }

    try {
      // NEAR uses Ed25519 keys for implicit accounts
      // Derive Ed25519 keypair from secp256k1 private key
      const privateKeyBytes = keyPair.privateKey.subarray(0, 32)
      
      // Create NEAR-compatible keypair (using the same approach as Solana for Ed25519)
      const solanaKeypair = Keypair.fromSeed(privateKeyBytes)
      const publicKeyBytes = solanaKeypair.publicKey.toBytes()
      
      // NEAR implicit account ID is the hex representation of the public key
      const implicitAccountId = Buffer.from(publicKeyBytes).toString('hex')
      
      this.logDebug('NEAR address derived successfully', {
        accountId: implicitAccountId.slice(0, 16) + '...'
      })
      
      return implicitAccountId
    } catch (error) {
      this.logError('Failed to derive NEAR address', { error })
      throw new Error('Failed to derive NEAR address')
    }
  }

  /**
   * Encrypt seed for secure storage (development implementation)
   * In production, integrate with HSM or secure key management service
   */
  private encryptSeed(seedHex: string): string {
    // For development, just store the hex directly
    // In production, use proper encryption with HSM
    return seedHex
  }

  /**
   * Decrypt seed from storage (development implementation)
   */
  private decryptSeed(encryptedSeed: string): string {
    // For development, return the hex directly
    return encryptedSeed
  }

  /**
   * Create master key from encrypted seed
   */
  async createMasterKeyFromEncryptedSeed(encryptedSeed: string): Promise<ServiceResult<BIP32Interface>> {
    try {
      const seedHex = this.decryptSeed(encryptedSeed)
      const seed = Buffer.from(seedHex, 'hex')
      const masterKey = bip32.fromSeed(seed)
      
      return this.success(masterKey)
    } catch (error) {
      this.logError('Failed to create master key from encrypted seed', { error })
      return this.error('Failed to create master key', 'MASTER_KEY_FAILED')
    }
  }

  /**
   * Get supported blockchain networks
   */
  getSupportedBlockchains(): BlockchainNetwork[] {
    return Object.keys(COIN_TYPES) as BlockchainNetwork[]
  }

  /**
   * Get coin type for blockchain
   */
  getCoinType(blockchain: BlockchainNetwork): number | undefined {
    return COIN_TYPES[blockchain]
  }

  /**
   * Get default derivation path for blockchain
   */
  getDefaultDerivationPath(blockchain: BlockchainNetwork): string | undefined {
    return DEFAULT_DERIVATION_PATHS[blockchain]
  }
}
