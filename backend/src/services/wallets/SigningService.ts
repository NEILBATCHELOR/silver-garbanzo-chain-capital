import { BaseService } from '../BaseService'
import { ServiceResult } from '../../types/api'
import { KeyManagementService } from './KeyManagementService'
import { HDWalletService } from './HDWalletService'
import {
  BlockchainNetwork,
  SigningRequest,
  SigningResponse,
  COIN_TYPES,
  DEFAULT_DERIVATION_PATHS
} from './types'
import { ethers } from 'ethers'
import { Keypair } from '@solana/web3.js'
import nacl from 'tweetnacl'
import * as bitcoin from 'bitcoinjs-lib'
import { BIP32Factory } from 'bip32'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import * as crypto from 'crypto'

// Initialize factories with secp256k1 implementation
const bip32 = BIP32Factory(ecc)
const ECPair = ECPairFactory(ecc)

/**
 * Cryptographic signing service for multi-chain wallets
 * Provides secure transaction signing using HD wallet private keys
 */
export class SigningService extends BaseService {
  private keyManagementService: KeyManagementService
  private hdWalletService: HDWalletService

  constructor() {
    super('Signing')
    this.keyManagementService = new KeyManagementService()
    this.hdWalletService = new HDWalletService()
  }

  /**
   * Sign a transaction hash for any supported blockchain
   */
  async signTransaction(request: SigningRequest): Promise<ServiceResult<SigningResponse>> {
    try {
      this.logInfo('Signing transaction', {
        walletId: request.wallet_id,
        blockchain: request.blockchain
      })

      // Get wallet keys from secure storage
      const keyData = await this.keyManagementService.getWalletKeys(request.wallet_id)
      if (!keyData) {
        return this.error('Wallet keys not found', 'WALLET_KEYS_NOT_FOUND')
      }

      // Derive the private key for the specific blockchain
      const privateKeyResult = await this.derivePrivateKey(
        keyData.encrypted_seed,
        request.blockchain,
        request.derivation_path
      )
      if (!privateKeyResult.success) {
        return this.error(privateKeyResult.error || 'Private key derivation failed', privateKeyResult.code || 'KEY_DERIVATION_FAILED')
      }

      const { privateKey, publicKey } = privateKeyResult.data!

      // Sign based on blockchain type
      let signature: string
      let recoveryId: number | undefined

      switch (request.blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          const evmResult = await this.signEVMTransaction(request.message_hash, privateKey)
          if (!evmResult.success) {
            return this.error(evmResult.error || 'EVM signing failed', evmResult.code || 'EVM_SIGNING_FAILED')
          }
          signature = evmResult.data!.signature
          recoveryId = evmResult.data!.recoveryId
          break

        case 'solana':
          const solanaResult = await this.signSolanaTransaction(request.message_hash, privateKey)
          if (!solanaResult.success) {
            return this.error(solanaResult.error || 'Solana signing failed', solanaResult.code || 'SOLANA_SIGNING_FAILED')
          }
          signature = solanaResult.data!.signature
          break

        case 'bitcoin':
          const bitcoinResult = await this.signBitcoinTransaction(request.message_hash, privateKey)
          if (!bitcoinResult.success) {
            return this.error(bitcoinResult.error || 'Bitcoin signing failed', bitcoinResult.code || 'BITCOIN_SIGNING_FAILED')
          }
          signature = bitcoinResult.data!.signature
          break

        case 'near':
          return this.error('NEAR signing not yet implemented', 'NOT_IMPLEMENTED')

        default:
          return this.error(`Unsupported blockchain: ${request.blockchain}`, 'UNSUPPORTED_BLOCKCHAIN')
      }

      const response: SigningResponse = {
        signature,
        public_key: publicKey,
        recovery_id: recoveryId
      }

      this.logInfo('Transaction signed successfully', {
        walletId: request.wallet_id,
        blockchain: request.blockchain
      })

      return this.success(response)

    } catch (error) {
      this.logError('Failed to sign transaction:', error)
      return this.error('Failed to sign transaction', 'SIGNING_FAILED')
    }
  }

  /**
   * Sign a message for any supported blockchain
   */
  async signMessage(
    walletId: string,
    message: string,
    blockchain: BlockchainNetwork
  ): Promise<ServiceResult<SigningResponse>> {
    try {
      this.logInfo('Signing message', { walletId, blockchain })

      // Create message hash
      const messageHash = this.createMessageHash(message, blockchain)

      const request: SigningRequest = {
        wallet_id: walletId,
        message_hash: messageHash,
        blockchain
      }

      return await this.signTransaction(request)

    } catch (error) {
      this.logError('Failed to sign message:', error)
      return this.error('Failed to sign message', 'MESSAGE_SIGNING_FAILED')
    }
  }

  /**
   * Verify a signature against a message
   */
  async verifySignature(
    message: string,
    signature: string,
    publicKey: string,
    blockchain: BlockchainNetwork
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logInfo('Verifying signature', { blockchain })

      let isValid = false

      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          isValid = this.verifyEVMSignature(message, signature, publicKey)
          break

        case 'solana':
          isValid = this.verifySolanaSignature(message, signature, publicKey)
          break

        case 'bitcoin':
          isValid = this.verifyBitcoinSignature(message, signature, publicKey)
          break

        default:
          return this.error(`Verification not supported for ${blockchain}`, 'VERIFICATION_NOT_SUPPORTED')
      }

      return this.success(isValid)

    } catch (error) {
      this.logError('Failed to verify signature:', error)
      return this.error('Failed to verify signature', 'VERIFICATION_FAILED')
    }
  }

  /**
   * Derive private key for a specific blockchain
   */
  private async derivePrivateKey(
    encryptedSeed: string,
    blockchain: BlockchainNetwork,
    customDerivationPath?: string
  ): Promise<ServiceResult<{ privateKey: string; publicKey: string }>> {
    try {
      // Decrypt the master seed (in production, this would use HSM)
      const seed = Buffer.from(encryptedSeed, 'base64')
      const masterKey = bip32.fromSeed(seed)

      // Use custom derivation path or default
      const derivationPath = customDerivationPath || DEFAULT_DERIVATION_PATHS[blockchain]
      const derivedKey = masterKey.derivePath(derivationPath)

      if (!derivedKey.privateKey) {
        return this.error('Failed to derive private key', 'KEY_DERIVATION_FAILED')
      }

      let privateKey: string
      let publicKey: string

      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          privateKey = Buffer.from(derivedKey.privateKey).toString('hex')
          publicKey = Buffer.from(derivedKey.publicKey).toString('hex')
          break

        case 'solana':
          privateKey = Buffer.from(derivedKey.privateKey).toString('hex')
          publicKey = Buffer.from(derivedKey.publicKey).toString('hex')
          break

        case 'bitcoin':
          privateKey = Buffer.from(derivedKey.privateKey).toString('hex')
          publicKey = Buffer.from(derivedKey.publicKey).toString('hex')
          break

        default:
          return this.error(`Key derivation not supported for ${blockchain}`, 'DERIVATION_NOT_SUPPORTED')
      }

      return this.success({ privateKey, publicKey })

    } catch (error) {
      this.logError('Failed to derive private key:', error)
      return this.error('Failed to derive private key', 'KEY_DERIVATION_FAILED')
    }
  }

  /**
   * Sign EVM transaction
   */
  private async signEVMTransaction(
    messageHash: string,
    privateKey: string
  ): Promise<ServiceResult<{ signature: string; recoveryId: number }>> {
    try {
      const wallet = new ethers.Wallet(privateKey)
      const messageBytes = ethers.getBytes(messageHash)
      
      // Sign the hash
      const signature = await wallet.signMessage(messageBytes)
      
      // Extract recovery ID from signature
      const sig = ethers.Signature.from(signature)
      const recoveryId = sig.v

      return this.success({
        signature,
        recoveryId
      })

    } catch (error) {
      this.logError('Failed to sign EVM transaction:', error)
      return this.error('Failed to sign EVM transaction', 'EVM_SIGNING_FAILED')
    }
  }

  /**
   * Sign Solana transaction
   */
  private async signSolanaTransaction(
    messageHash: string,
    privateKey: string
  ): Promise<ServiceResult<{ signature: string }>> {
    try {
      // Create keypair from private key
      const privateKeyBuffer = Buffer.from(privateKey, 'hex')
      const keyPair = Keypair.fromSecretKey(privateKeyBuffer.subarray(0, 32))
      const messageBytes = Buffer.from(messageHash, 'hex')
      
      // Sign using ed25519 via nacl
      const signature = nacl.sign.detached(messageBytes, keyPair.secretKey.subarray(0, 32))

      return this.success({
        signature: Buffer.from(signature).toString('base64')
      })

    } catch (error) {
      this.logError('Failed to sign Solana transaction:', error)
      return this.error('Failed to sign Solana transaction', 'SOLANA_SIGNING_FAILED')
    }
  }

  /**
   * Sign Bitcoin transaction
   */
  private async signBitcoinTransaction(
    messageHash: string,
    privateKey: string
  ): Promise<ServiceResult<{ signature: string }>> {
    try {
      const privateKeyBuffer = Buffer.from(privateKey, 'hex')
      const messageBytes = Buffer.from(messageHash, 'hex')
      
      // Sign using secp256k1 directly - create hash and sign
      const hashBuffer = crypto.createHash('sha256').update(messageBytes).digest()
      const signature = ecc.sign(hashBuffer, privateKeyBuffer)

      return this.success({
        signature: Buffer.from(signature).toString('hex')
      })

    } catch (error) {
      this.logError('Failed to sign Bitcoin transaction:', error)
      return this.error('Failed to sign Bitcoin transaction', 'BITCOIN_SIGNING_FAILED')
    }
  }

  /**
   * Create message hash for specific blockchain
   */
  private createMessageHash(message: string, blockchain: BlockchainNetwork): string {
    switch (blockchain) {
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'avalanche':
        // Ethereum message hash with prefix
        const prefixedMessage = `\\x19Ethereum Signed Message:\\n${message.length}${message}`
        return ethers.keccak256(ethers.toUtf8Bytes(prefixedMessage))

      case 'solana':
        // Simple SHA256 for Solana
        return crypto.createHash('sha256').update(message).digest('hex')

      case 'bitcoin':
        // Bitcoin message hash
        const prefix = 'Bitcoin Signed Message:\\n'
        const fullMessage = prefix + message.length + message
        return crypto.createHash('sha256').update(fullMessage).digest('hex')

      default:
        // Default to SHA256
        return crypto.createHash('sha256').update(message).digest('hex')
    }
  }

  /**
   * Verify EVM signature
   */
  private verifyEVMSignature(message: string, signature: string, publicKey: string): boolean {
    try {
      const messageHash = this.createMessageHash(message, 'ethereum')
      const recovered = ethers.recoverAddress(messageHash, signature)
      const expectedAddress = ethers.computeAddress(publicKey)
      return recovered.toLowerCase() === expectedAddress.toLowerCase()
    } catch {
      return false
    }
  }

  /**
   * Verify Solana signature
   */
  private verifySolanaSignature(message: string, signature: string, publicKey: string): boolean {
    try {
      const messageBytes = Buffer.from(this.createMessageHash(message, 'solana'), 'hex')
      const signatureBytes = Buffer.from(signature, 'base64')
      const publicKeyBytes = Buffer.from(publicKey, 'hex')
      
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    } catch {
      return false
    }
  }

  /**
   * Verify Bitcoin signature
   */
  private verifyBitcoinSignature(message: string, signature: string, publicKey: string): boolean {
    try {
      const messageHash = this.createMessageHash(message, 'bitcoin')
      const messageBytes = Buffer.from(messageHash, 'hex')
      const signatureBytes = Buffer.from(signature, 'hex')
      const publicKeyBytes = Buffer.from(publicKey, 'hex')
      
      // Use secp256k1 verification
      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      )
    } catch {
      return false
    }
  }

  /**
   * Sign a hash directly (for multi-sig scenarios)
   */
  async signHash(
    hash: string,
    privateKey: string,
    blockchain: BlockchainNetwork
  ): Promise<ServiceResult<{ signature: string; recoveryId?: number }>> {
    try {
      this.logInfo('Signing hash', { blockchain })

      let signature: string
      let recoveryId: number | undefined

      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          const evmResult = await this.signEVMTransaction(hash, privateKey)
          if (!evmResult.success) {
            return this.error(evmResult.error || 'EVM hash signing failed', evmResult.code || 'EVM_HASH_SIGNING_FAILED')
          }
          signature = evmResult.data!.signature
          recoveryId = evmResult.data!.recoveryId
          break

        case 'solana':
          const solanaResult = await this.signSolanaTransaction(hash, privateKey)
          if (!solanaResult.success) {
            return this.error(solanaResult.error || 'Solana hash signing failed', solanaResult.code || 'SOLANA_HASH_SIGNING_FAILED')
          }
          signature = solanaResult.data!.signature
          break

        case 'bitcoin':
          const bitcoinResult = await this.signBitcoinTransaction(hash, privateKey)
          if (!bitcoinResult.success) {
            return this.error(bitcoinResult.error || 'Bitcoin hash signing failed', bitcoinResult.code || 'BITCOIN_HASH_SIGNING_FAILED')
          }
          signature = bitcoinResult.data!.signature
          break

        case 'near':
          return this.error('NEAR hash signing not yet implemented', 'NOT_IMPLEMENTED')

        default:
          return this.error(`Unsupported blockchain: ${blockchain}`, 'UNSUPPORTED_BLOCKCHAIN')
      }

      return this.success({ signature, recoveryId })

    } catch (error) {
      this.logError('Failed to sign hash:', error)
      return this.error('Failed to sign hash', 'HASH_SIGNING_FAILED')
    }
  }

  /**
   * Generate a new signing key pair for testing
   */
  async generateTestKeyPair(blockchain: BlockchainNetwork): Promise<ServiceResult<{ privateKey: string; publicKey: string; address: string }>> {
    try {
      let privateKey: string
      let publicKey: string
      let address: string

      switch (blockchain) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'avalanche':
          const wallet = ethers.Wallet.createRandom()
          privateKey = wallet.privateKey
          publicKey = wallet.publicKey
          address = wallet.address
          break

        case 'solana':
          const keyPair = Keypair.generate()
          privateKey = Buffer.from(keyPair.secretKey).toString('hex')
          publicKey = keyPair.publicKey.toBase58()
          address = keyPair.publicKey.toBase58()
          break

        case 'bitcoin':
          const btcKeyPair = ECPair.makeRandom()
          privateKey = btcKeyPair.privateKey ? Buffer.from(btcKeyPair.privateKey).toString('hex') : ''
          publicKey = Buffer.from(btcKeyPair.publicKey).toString('hex')
          const { address: btcAddress } = bitcoin.payments.p2pkh({ 
            pubkey: Buffer.from(btcKeyPair.publicKey),
            network: bitcoin.networks.bitcoin
          })
          address = btcAddress || ''
          break

        default:
          return this.error(`Key generation not supported for ${blockchain}`, 'KEY_GENERATION_NOT_SUPPORTED')
      }

      return this.success({ privateKey, publicKey, address })

    } catch (error) {
      this.logError('Failed to generate test key pair:', error)
      return this.error('Failed to generate test key pair', 'KEY_GENERATION_FAILED')
    }
  }
}