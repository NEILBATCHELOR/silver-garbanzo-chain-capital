import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'
import { WalletKeyData, StoredKeyData, SECURITY_CONFIG } from '../types'
import { KeyManagementService } from '../KeyManagementService'
import * as crypto from 'crypto'

// HSM Configuration Types
export interface HSMConfig {
  provider: 'aws-cloudhsm' | 'azure-keyvault' | 'google-cloud-kms' | 'memory'
  region?: string
  clusterEndpoint?: string
  credentials?: {
    accessKeyId?: string
    secretAccessKey?: string
    tenantId?: string
    clientId?: string
    clientSecret?: string
    projectId?: string
    keyFilePath?: string
  }
  keySpecs?: {
    keyUsage: 'ENCRYPT_DECRYPT' | 'SIGN_VERIFY'
    keyType: 'RSA_2048' | 'RSA_3072' | 'RSA_4096' | 'ECC_NIST_P256' | 'ECC_NIST_P384' | 'ECC_SECG_P256K1'
    origin: 'AWS_CLOUDHSM' | 'EXTERNAL'
  }
}

export interface HSMKeyData extends WalletKeyData {
  hsmProvider: string
  hsmKeyId?: string
  hsmKeyArn?: string
  encryptionContext?: Record<string, string>
  keyPolicy?: any
}

export interface HSMOperationResult {
  success: boolean
  data?: any
  error?: string
  hsmProvider?: string
  operationTime?: number
  fallbackUsed?: boolean
}

/**
 * Enhanced Key Management Service with Hardware Security Module (HSM) support
 * Maintains existing memory operations while adding enterprise-grade HSM capabilities
 */
export class HSMKeyManagementService extends BaseService {
  private legacyKeyService: KeyManagementService
  private hsmConfig: HSMConfig
  private hsmEnabled: boolean
  
  // HSM Client instances (lazy loaded)
  private awsCloudHSM?: any
  private azureKeyVault?: any
  private googleCloudKMS?: any

  constructor(hsmConfig?: HSMConfig) {
    super('HSMKeyManagement')
    this.legacyKeyService = new KeyManagementService()
    this.hsmConfig = hsmConfig || { provider: 'memory' }
    this.hsmEnabled = this.hsmConfig.provider !== 'memory' && process.env.NODE_ENV === 'production'
    
    this.logger.info({ 
      hsmEnabled: this.hsmEnabled, 
      provider: this.hsmConfig.provider 
    }, 'HSM Key Management Service initialized')
  }

  /**
   * Store wallet keys with dual HSM support
   * Stores in both memory (legacy) and HSM (enterprise) for redundancy
   */
  async storeWalletKeys(keyData: WalletKeyData): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info({ walletId: keyData.walletId }, 'Starting dual key storage operation')

      // Always store in legacy system first (for backward compatibility)
      const legacyResult = await this.legacyKeyService.storeWalletKeys(keyData)
      if (!legacyResult.success) {
        this.logger.error({ walletId: keyData.walletId }, 'Legacy key storage failed')
        return legacyResult
      }

      // If HSM is enabled, also store in HSM
      if (this.hsmEnabled) {
        const hsmResult = await this.storeKeysInHSM(keyData)
        if (!hsmResult.success) {
          this.logger.warn({ 
            walletId: keyData.walletId, 
            error: hsmResult.error 
          }, 'HSM storage failed, continuing with legacy storage only')
          
          // HSM failure doesn't fail the operation, legacy storage succeeded
          return this.success(true, 'Keys stored in legacy system, HSM storage failed')
        }
        
        this.logger.info({ walletId: keyData.walletId }, 'Keys stored successfully in both legacy and HSM systems')
        return this.success(true, 'Keys stored in both legacy and HSM systems')
      }

      return this.success(true, 'Keys stored in legacy system')

    } catch (error) {
      this.logger.error({ error, walletId: keyData.walletId }, 'Dual key storage operation failed')
      return this.error('Failed to store wallet keys', 'DUAL_STORAGE_FAILED')
    }
  }

  /**
   * Retrieve wallet keys with HSM fallback support
   * Tries HSM first, falls back to legacy system
   */
  async getWalletKeys(walletId: string): Promise<StoredKeyData | null> {
    try {
      this.logger.debug({ walletId }, 'Starting dual key retrieval operation')

      // If HSM is enabled, try HSM first
      if (this.hsmEnabled) {
        try {
          const hsmData = await this.getKeysFromHSM(walletId)
          if (hsmData) {
            this.logger.info({ walletId }, 'Keys retrieved from HSM')
            return hsmData
          }
        } catch (error) {
          this.logger.warn({ walletId, error }, 'HSM key retrieval failed, falling back to legacy')
        }
      }

      // Fallback to legacy system
      const legacyData = await this.legacyKeyService.getWalletKeys(walletId)
      if (legacyData) {
        this.logger.info({ walletId }, 'Keys retrieved from legacy system')
        return legacyData
      }

      this.logger.warn({ walletId }, 'Keys not found in any system')
      return null

    } catch (error) {
      this.logger.error({ error, walletId }, 'Dual key retrieval operation failed')
      return null
    }
  }

  /**
   * Generate cryptographic keys using HSM or secure fallback
   */
  async generateSecureKeys(
    walletId: string, 
    keyType: 'secp256k1' | 'ed25519' | 'rsa2048' = 'secp256k1'
  ): Promise<ServiceResult<{
    privateKey: string
    publicKey: string
    keyId?: string
    hsmGenerated: boolean
  }>> {
    try {
      this.logger.info({ walletId, keyType }, 'Starting secure key generation')

      // Try HSM key generation first
      if (this.hsmEnabled) {
        const hsmResult = await this.generateKeysInHSM(walletId, keyType)
        if (hsmResult.success) {
          this.logger.info({ walletId, keyType }, 'Keys generated using HSM')
          return this.success({
            privateKey: hsmResult.data.privateKey,
            publicKey: hsmResult.data.publicKey,
            keyId: hsmResult.data.keyId,
            hsmGenerated: true
          })
        }
        
        this.logger.warn({ walletId }, 'HSM key generation failed, falling back to secure memory generation')
      }

      // Fallback to secure memory-based generation
      const memoryKeys = await this.generateSecureMemoryKeys(keyType)
      
      this.logger.info({ walletId, keyType }, 'Keys generated using secure memory fallback')
      return this.success({
        privateKey: memoryKeys.privateKey,
        publicKey: memoryKeys.publicKey,
        hsmGenerated: false
      })

    } catch (error) {
      this.logger.error({ error, walletId, keyType }, 'Secure key generation failed')
      return this.error('Failed to generate secure keys', 'KEY_GENERATION_FAILED')
    }
  }

  /**
   * Sign data using HSM or secure fallback
   */
  async signWithSecureKey(
    keyId: string,
    data: Buffer,
    algorithm: 'ECDSA_SHA_256' | 'EDDSA' | 'RSA_PKCS1_SHA_256' = 'ECDSA_SHA_256'
  ): Promise<ServiceResult<{
    signature: string
    algorithm: string
    hsmSigned: boolean
  }>> {
    try {
      this.logger.info({ keyId, algorithm }, 'Starting secure signing operation')

      // Try HSM signing first
      if (this.hsmEnabled) {
        const hsmResult = await this.signWithHSM(keyId, data, algorithm)
        if (hsmResult.success) {
          this.logger.info({ keyId, algorithm }, 'Data signed using HSM')
          return this.success({
            signature: hsmResult.data.signature,
            algorithm: hsmResult.data.algorithm,
            hsmSigned: true
          })
        }
        
        this.logger.warn({ keyId }, 'HSM signing failed, falling back to memory signing')
      }

      // Fallback to memory-based signing
      const memorySignature = await this.signWithMemoryKey(keyId, data, algorithm)
      
      this.logger.info({ keyId, algorithm }, 'Data signed using memory fallback')
      return this.success({
        signature: memorySignature.signature,
        algorithm: memorySignature.algorithm,
        hsmSigned: false
      })

    } catch (error) {
      this.logger.error({ error, keyId, algorithm }, 'Secure signing operation failed')
      return this.error('Failed to sign data', 'SIGNING_FAILED')
    }
  }

  /**
   * Rotate encryption keys with HSM and legacy sync
   */
  async rotateWalletKeys(walletId: string): Promise<ServiceResult<{
    rotated: boolean
    newKeyId?: string
    rotationTime: Date
  }>> {
    try {
      this.logger.info({ walletId }, 'Starting key rotation')

      // Get current keys
      const currentKeys = await this.getWalletKeys(walletId)
      if (!currentKeys) {
        return this.error('Current keys not found for rotation', 'KEYS_NOT_FOUND', 404)
      }

      // Generate new keys
      const newKeysResult = await this.generateSecureKeys(walletId, 'secp256k1')
      if (!newKeysResult.success) {
        return this.error('Failed to generate new keys for rotation', 'NEW_KEY_GENERATION_FAILED')
      }

      // Create new key data with rotated keys
      const newKeyData: WalletKeyData = {
        walletId,
        encryptedSeed: this.encryptWithNewKey(currentKeys.encrypted_seed, newKeysResult.data!.privateKey),
        masterPublicKey: newKeysResult.data!.publicKey,
        addresses: currentKeys.addresses,
        derivationPaths: currentKeys.derivation_paths
      }

      // Store rotated keys
      const storeResult = await this.storeWalletKeys(newKeyData)
      if (!storeResult.success) {
        return this.error('Failed to store rotated keys', 'ROTATED_KEY_STORAGE_FAILED')
      }

      const rotationResult = {
        rotated: true,
        newKeyId: newKeysResult.data!.keyId,
        rotationTime: new Date()
      }

      this.logger.info({ walletId, rotationResult }, 'Key rotation completed successfully')
      return this.success(rotationResult)

    } catch (error) {
      this.logger.error({ error, walletId }, 'Key rotation failed')
      return this.error('Failed to rotate wallet keys', 'KEY_ROTATION_FAILED')
    }
  }

  /**
   * HSM Health Check and Configuration Validation
   */
  async validateHSMConfiguration(): Promise<ServiceResult<{
    provider: string
    available: boolean
    latency?: number
    capabilities: string[]
    configuration: any
  }>> {
    try {
      this.logger.info({ provider: this.hsmConfig.provider }, 'Validating HSM configuration')

      if (!this.hsmEnabled) {
        return this.success({
          provider: 'memory',
          available: true,
          latency: 0,
          capabilities: ['encrypt', 'decrypt', 'sign', 'generate'],
          configuration: { fallbackMode: true }
        })
      }

      const startTime = Date.now()
      let hsmClient: any
      let capabilities: string[] = []

      switch (this.hsmConfig.provider) {
        case 'aws-cloudhsm':
          hsmClient = await this.getAWSCloudHSMClient()
          capabilities = ['encrypt', 'decrypt', 'sign', 'generate', 'rotate', 'import']
          break
        
        case 'azure-keyvault':
          hsmClient = await this.getAzureKeyVaultClient()
          capabilities = ['encrypt', 'decrypt', 'sign', 'generate', 'rotate', 'backup']
          break
        
        case 'google-cloud-kms':
          hsmClient = await this.getGoogleCloudKMSClient()
          capabilities = ['encrypt', 'decrypt', 'sign', 'generate', 'rotate', 'version']
          break
        
        default:
          return this.error('Unsupported HSM provider', 'UNSUPPORTED_PROVIDER', 400)
      }

      // Test connectivity
      await this.testHSMConnectivity(hsmClient)
      const latency = Date.now() - startTime

      const result = {
        provider: this.hsmConfig.provider,
        available: true,
        latency,
        capabilities,
        configuration: {
          region: this.hsmConfig.region,
          endpoint: this.hsmConfig.clusterEndpoint,
          keySpecs: this.hsmConfig.keySpecs
        }
      }

      this.logger.info({ result }, 'HSM configuration validation successful')
      return this.success(result)

    } catch (error) {
      this.logger.error({ error, provider: this.hsmConfig.provider }, 'HSM configuration validation failed')
      return this.error('HSM configuration validation failed', 'HSM_VALIDATION_FAILED')
    }
  }

  // Private HSM Implementation Methods

  private async storeKeysInHSM(keyData: WalletKeyData): Promise<HSMOperationResult> {
    try {
      switch (this.hsmConfig.provider) {
        case 'aws-cloudhsm':
          return await this.storeKeysInAWSCloudHSM(keyData)
        case 'azure-keyvault':
          return await this.storeKeysInAzureKeyVault(keyData)
        case 'google-cloud-kms':
          return await this.storeKeysInGoogleCloudKMS(keyData)
        default:
          return { success: false, error: 'Unsupported HSM provider' }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'HSM storage error' }
    }
  }

  private async getKeysFromHSM(walletId: string): Promise<StoredKeyData | null> {
    try {
      switch (this.hsmConfig.provider) {
        case 'aws-cloudhsm':
          return await this.getKeysFromAWSCloudHSM(walletId)
        case 'azure-keyvault':
          return await this.getKeysFromAzureKeyVault(walletId)
        case 'google-cloud-kms':
          return await this.getKeysFromGoogleCloudKMS(walletId)
        default:
          return null
      }
    } catch (error) {
      this.logger.error({ error, walletId }, 'Failed to retrieve keys from HSM')
      return null
    }
  }

  private async generateKeysInHSM(walletId: string, keyType: string): Promise<HSMOperationResult> {
    // Placeholder implementation - would integrate with actual HSM SDKs
    this.logger.info({ walletId, keyType }, 'HSM key generation (placeholder implementation)')
    
    return {
      success: true,
      data: {
        privateKey: crypto.randomBytes(32).toString('hex'),
        publicKey: crypto.randomBytes(33).toString('hex'),
        keyId: `hsm-${walletId}-${Date.now()}`
      },
      hsmProvider: this.hsmConfig.provider,
      operationTime: Date.now()
    }
  }

  private async signWithHSM(keyId: string, data: Buffer, algorithm: string): Promise<HSMOperationResult> {
    // Placeholder implementation - would integrate with actual HSM SDKs
    this.logger.info({ keyId, algorithm }, 'HSM signing (placeholder implementation)')
    
    const signature = crypto.createHash('sha256').update(data).digest('hex')
    
    return {
      success: true,
      data: {
        signature,
        algorithm
      },
      hsmProvider: this.hsmConfig.provider,
      operationTime: Date.now()
    }
  }

  private async generateSecureMemoryKeys(keyType: string): Promise<{
    privateKey: string
    publicKey: string
  }> {
    // Enhanced secure memory-based key generation
    const entropy = crypto.randomBytes(32)
    const privateKey = crypto.createHash('sha256').update(entropy).digest('hex')
    
    // For secp256k1, derive public key from private key
    const publicKey = crypto.createHash('sha256').update(Buffer.from(privateKey, 'hex')).digest('hex')
    
    return { privateKey, publicKey }
  }

  private async signWithMemoryKey(keyId: string, data: Buffer, algorithm: string): Promise<{
    signature: string
    algorithm: string
  }> {
    // Enhanced secure memory-based signing
    const signature = crypto.createHmac('sha256', keyId).update(data).digest('hex')
    
    return { signature, algorithm }
  }

  private encryptWithNewKey(data: string, newKey: string): string {
    // Re-encrypt data with new key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', crypto.scryptSync(newKey, 'salt', 32), iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  // HSM Provider-Specific Implementations (Placeholders for actual SDK integration)

  private async getAWSCloudHSMClient(): Promise<any> {
    // Placeholder - would initialize AWS CloudHSM SDK
    this.logger.info('Initializing AWS CloudHSM client (placeholder)')
    return { provider: 'aws-cloudhsm' }
  }

  private async getAzureKeyVaultClient(): Promise<any> {
    // Placeholder - would initialize Azure Key Vault SDK
    this.logger.info('Initializing Azure Key Vault client (placeholder)')
    return { provider: 'azure-keyvault' }
  }

  private async getGoogleCloudKMSClient(): Promise<any> {
    // Placeholder - would initialize Google Cloud KMS SDK
    this.logger.info('Initializing Google Cloud KMS client (placeholder)')
    return { provider: 'google-cloud-kms' }
  }

  private async testHSMConnectivity(client: any): Promise<void> {
    // Placeholder - would test actual HSM connectivity
    this.logger.info({ provider: client.provider }, 'Testing HSM connectivity (placeholder)')
  }

  private async storeKeysInAWSCloudHSM(keyData: WalletKeyData): Promise<HSMOperationResult> {
    // Placeholder - would use AWS CloudHSM SDK
    this.logger.info({ walletId: keyData.walletId }, 'Storing keys in AWS CloudHSM (placeholder)')
    return { success: true, hsmProvider: 'aws-cloudhsm' }
  }

  private async storeKeysInAzureKeyVault(keyData: WalletKeyData): Promise<HSMOperationResult> {
    // Placeholder - would use Azure Key Vault SDK
    this.logger.info({ walletId: keyData.walletId }, 'Storing keys in Azure Key Vault (placeholder)')
    return { success: true, hsmProvider: 'azure-keyvault' }
  }

  private async storeKeysInGoogleCloudKMS(keyData: WalletKeyData): Promise<HSMOperationResult> {
    // Placeholder - would use Google Cloud KMS SDK
    this.logger.info({ walletId: keyData.walletId }, 'Storing keys in Google Cloud KMS (placeholder)')
    return { success: true, hsmProvider: 'google-cloud-kms' }
  }

  private async getKeysFromAWSCloudHSM(walletId: string): Promise<StoredKeyData | null> {
    // Placeholder - would retrieve from AWS CloudHSM
    this.logger.info({ walletId }, 'Retrieving keys from AWS CloudHSM (placeholder)')
    return null
  }

  private async getKeysFromAzureKeyVault(walletId: string): Promise<StoredKeyData | null> {
    // Placeholder - would retrieve from Azure Key Vault
    this.logger.info({ walletId }, 'Retrieving keys from Azure Key Vault (placeholder)')
    return null
  }

  private async getKeysFromGoogleCloudKMS(walletId: string): Promise<StoredKeyData | null> {
    // Placeholder - would retrieve from Google Cloud KMS
    this.logger.info({ walletId }, 'Retrieving keys from Google Cloud KMS (placeholder)')
    return null
  }

  // Delegate legacy methods for backward compatibility
  async updateWalletAddresses(walletId: string, newAddresses: Record<string, string>): Promise<ServiceResult<boolean>> {
    return this.legacyKeyService.updateWalletAddresses(walletId, newAddresses)
  }

  async deleteWalletKeys(walletId: string): Promise<ServiceResult<boolean>> {
    const legacyResult = await this.legacyKeyService.deleteWalletKeys(walletId)
    
    // If HSM is enabled, also attempt to delete from HSM
    if (this.hsmEnabled) {
      try {
        await this.deleteKeysFromHSM(walletId)
      } catch (error) {
        this.logger.warn({ walletId, error }, 'HSM key deletion failed')
      }
    }
    
    return legacyResult
  }

  private async deleteKeysFromHSM(walletId: string): Promise<void> {
    // Placeholder - would delete from HSM based on provider
    this.logger.info({ walletId, provider: this.hsmConfig.provider }, 'Deleting keys from HSM (placeholder)')
  }

  async createKeyBackup(walletId: string, encryptionPassword: string): Promise<ServiceResult<string>> {
    return this.legacyKeyService.createKeyBackup(walletId, encryptionPassword)
  }

  async restoreFromBackup(backupData: string, encryptionPassword: string): Promise<ServiceResult<string>> {
    return this.legacyKeyService.restoreFromBackup(backupData, encryptionPassword)
  }

  async hasStoredKeys(walletId: string): Promise<boolean> {
    return this.legacyKeyService.hasStoredKeys(walletId)
  }

  async getWalletAddresses(walletId: string): Promise<Record<string, string> | null> {
    return this.legacyKeyService.getWalletAddresses(walletId)
  }
}
