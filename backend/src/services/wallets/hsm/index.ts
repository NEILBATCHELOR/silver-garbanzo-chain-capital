export { HSMKeyManagementService } from './HSMKeyManagementService'
export { AWSCloudHSMService } from './AWSCloudHSMService'
export { AzureKeyVaultService } from './AzureKeyVaultService'
export { GoogleCloudKMSService } from './GoogleCloudKMSService'

export type {
  HSMProvider,
  HSMConfig,
  HSMCredentials,
  HSMKeySpecs,
  HSMOptions,
  HSMOperationResult,
  HSMOperationMetadata,
  HSMKeyData,
  HSMKeyGenerationRequest,
  HSMKeyAttributes,
  HSMSigningRequest,
  HSMSigningResult,
  AWSCloudHSMConfig,
  AWSCloudHSMKey,
  AzureKeyVaultConfig,
  AzureKeyVaultKey,
  GoogleCloudKMSConfig,
  GoogleCloudKMSKey,
  HSMAuditLog,
  HSMComplianceReport,
  HSMComplianceFinding,
  HSMHealthStatus,
  HSMCapability,
  HSMMetrics,
  HSMValidationResult,
  HSMValidationError,
  HSMEnvironmentConfig,
  HSMCostEstimate
} from './types'

export { DEFAULT_HSM_CONFIGS, HSM_SECURITY_STANDARDS } from './types'

// HSM Service Factory
import { HSMKeyManagementService } from './HSMKeyManagementService'
import { AWSCloudHSMService } from './AWSCloudHSMService'
import { AzureKeyVaultService } from './AzureKeyVaultService'
import { GoogleCloudKMSService } from './GoogleCloudKMSService'
import { HSMConfig, HSMProvider, DEFAULT_HSM_CONFIGS } from './types'

/**
 * HSM Service Factory
 * Creates and configures HSM services based on provider configuration
 */
export class HSMServiceFactory {
  /**
   * Create HSM Key Management Service with configured provider
   */
  static createHSMKeyManagementService(config?: HSMConfig): HSMKeyManagementService {
    const hsmConfig = config || { provider: 'memory' }
    
    // Apply default configurations
    const finalConfig = {
      ...DEFAULT_HSM_CONFIGS[hsmConfig.provider],
      ...hsmConfig
    }
    
    return new HSMKeyManagementService(finalConfig)
  }

  /**
   * Create provider-specific HSM service
   */
  static createHSMProviderService(config: HSMConfig): AWSCloudHSMService | AzureKeyVaultService | GoogleCloudKMSService | null {
    switch (config.provider) {
      case 'aws-cloudhsm':
        return new AWSCloudHSMService(config as any)
      
      case 'azure-keyvault':
        return new AzureKeyVaultService(config as any)
      
      case 'google-cloud-kms':
        return new GoogleCloudKMSService(config as any)
      
      case 'memory':
        return null // Memory operations don't need provider-specific service
      
      default:
        throw new Error(`Unsupported HSM provider: ${config.provider}`)
    }
  }

  /**
   * Get HSM configuration from environment variables
   */
  static getHSMConfigFromEnv(): HSMConfig {
    const provider = (process.env.HSM_PROVIDER as HSMProvider) || 'memory'
    
    const baseConfig: HSMConfig = {
      provider,
      region: process.env.HSM_REGION
    }

    switch (provider) {
      case 'aws-cloudhsm':
        return {
          ...baseConfig,
          clusterEndpoint: process.env.AWS_CLOUDHSM_CLUSTER_ENDPOINT,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN
          }
        }
      
      case 'azure-keyvault':
        return {
          ...baseConfig,
          vaultUrl: process.env.AZURE_KEY_VAULT_URL || '',
          managedIdentity: process.env.AZURE_USE_MANAGED_IDENTITY === 'true',
          credentials: {
            tenantId: process.env.AZURE_TENANT_ID,
            clientId: process.env.AZURE_CLIENT_ID,
            clientSecret: process.env.AZURE_CLIENT_SECRET,
            subscriptionId: process.env.AZURE_SUBSCRIPTION_ID
          }
        }
      
      case 'google-cloud-kms':
        return {
          ...baseConfig,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
          location: process.env.GOOGLE_CLOUD_KMS_LOCATION || 'global',
          keyRingId: process.env.GOOGLE_CLOUD_KMS_KEY_RING_ID || 'wallet-keys',
          protectionLevel: (process.env.GOOGLE_CLOUD_KMS_PROTECTION_LEVEL as 'SOFTWARE' | 'HSM') || 'HSM',
          credentials: {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            location: process.env.GOOGLE_CLOUD_KMS_LOCATION
          }
        }
      
      default:
        return baseConfig
    }
  }

  /**
   * Validate HSM configuration
   */
  static validateHSMConfig(config: HSMConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.provider) {
      errors.push('HSM provider is required')
    }

    switch (config.provider) {
      case 'aws-cloudhsm':
        if (!config.clusterEndpoint) {
          errors.push('AWS CloudHSM cluster endpoint is required')
        }
        if (!config.credentials?.accessKeyId) {
          errors.push('AWS access key ID is required')
        }
        if (!config.credentials?.secretAccessKey) {
          errors.push('AWS secret access key is required')
        }
        break
      
      case 'azure-keyvault':
        if (!config.vaultUrl) {
          errors.push('Azure Key Vault URL is required')
        }
        if (!config.managedIdentity && (!config.credentials?.tenantId || !config.credentials?.clientId || !config.credentials?.clientSecret)) {
          errors.push('Azure credentials (tenant ID, client ID, client secret) are required when not using managed identity')
        }
        break
      
      case 'google-cloud-kms':
        if (!config.projectId) {
          errors.push('Google Cloud project ID is required')
        }
        if (!config.location) {
          errors.push('Google Cloud KMS location is required')
        }
        if (!config.keyRingId) {
          errors.push('Google Cloud KMS key ring ID is required')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Convenience functions for common operations
export const createHSMService = HSMServiceFactory.createHSMKeyManagementService
export const createProviderService = HSMServiceFactory.createHSMProviderService
export const getEnvConfig = HSMServiceFactory.getHSMConfigFromEnv
export const validateConfig = HSMServiceFactory.validateHSMConfig
