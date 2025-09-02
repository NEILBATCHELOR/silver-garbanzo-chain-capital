// HSM Provider Types
export type HSMProvider = 'aws-cloudhsm' | 'azure-keyvault' | 'google-cloud-kms' | 'memory'

export interface HSMConfig {
  provider: HSMProvider
  region?: string
  clusterEndpoint?: string
  credentials?: HSMCredentials
  keySpecs?: HSMKeySpecs
  options?: HSMOptions
  // Azure Key Vault specific
  vaultUrl?: string
  managedIdentity?: boolean
  // Google Cloud KMS specific
  projectId?: string
  location?: string
  keyRingId?: string
  protectionLevel?: 'SOFTWARE' | 'HSM'
}

export interface HSMCredentials {
  // AWS CloudHSM
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
  
  // Azure Key Vault
  tenantId?: string
  clientId?: string
  clientSecret?: string
  subscriptionId?: string
  
  // Google Cloud KMS
  projectId?: string
  keyFilePath?: string
  location?: string
  keyRingId?: string
}

export interface HSMKeySpecs {
  keyUsage: 'ENCRYPT_DECRYPT' | 'SIGN_VERIFY'
  keyType: 'RSA_2048' | 'RSA_3072' | 'RSA_4096' | 'ECC_NIST_P256' | 'ECC_NIST_P384' | 'ECC_SECG_P256K1'
  origin: 'AWS_CLOUDHSM' | 'EXTERNAL'
  description?: string
}

export interface HSMOptions {
  enableFallback?: boolean
  operationTimeout?: number
  retryAttempts?: number
  auditLogging?: boolean
  compliance?: {
    fips140Level?: 2 | 3
    commonCriteria?: string
    enableTamperResistance?: boolean
  }
}

// HSM Operation Results
export interface HSMOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  hsmProvider?: HSMProvider
  operationTime?: number
  fallbackUsed?: boolean
  hsmKeyId?: string
  metadata?: HSMOperationMetadata
}

export interface HSMOperationMetadata {
  operationId?: string
  requestId?: string
  timestamp: Date
  auditTrail?: string[]
  complianceFlags?: string[]
}

// HSM Key Management Types
export interface HSMKeyData {
  walletId: string
  hsmProvider: HSMProvider
  hsmKeyId: string
  hsmKeyArn?: string
  encryptedSeed: string
  masterPublicKey: string
  addresses: Record<string, string>
  derivationPaths: Record<string, string>
  encryptionContext?: Record<string, string>
  keyPolicy?: any
  compliance?: {
    fips140Compliant: boolean
    tamperResistant: boolean
    auditLogged: boolean
  }
  createdAt: Date
  rotatedAt?: Date
}

export interface HSMKeyGenerationRequest {
  walletId: string
  keyType: 'secp256k1' | 'ed25519' | 'rsa2048' | 'rsa4096'
  purpose: 'signing' | 'encryption' | 'authentication'
  label?: string
  attributes?: HSMKeyAttributes
}

export interface HSMKeyAttributes {
  extractable: boolean
  sensitive: boolean
  encrypt: boolean
  decrypt: boolean
  sign: boolean
  verify: boolean
  wrap: boolean
  unwrap: boolean
  derive: boolean
}

export interface HSMSigningRequest {
  keyId: string
  data: Buffer
  algorithm: 'ECDSA_SHA_256' | 'EDDSA' | 'RSA_PKCS1_SHA_256' | 'RSA_PSS_SHA_256'
  encryptionContext?: Record<string, string>
}

export interface HSMSigningResult {
  signature: string
  algorithm: string
  keyId: string
  timestamp: Date
  hsmSigned: boolean
}

// AWS CloudHSM Specific Types
export interface AWSCloudHSMConfig extends HSMConfig {
  provider: 'aws-cloudhsm'
  clusterEndpoint: string
  hsmCertificate?: string
  clientCertificate?: string
  clientPrivateKey?: string
  trustedCertificates?: string[]
}

export interface AWSCloudHSMKey {
  keyHandle: string
  keyLabel: string
  keyType: string
  keyUsage: string[]
  extractable: boolean
  persistent: boolean
}

// Azure Key Vault Specific Types
export interface AzureKeyVaultConfig extends HSMConfig {
  provider: 'azure-keyvault'
  vaultUrl: string
  managedIdentity?: boolean
}

export interface AzureKeyVaultKey {
  keyId: string
  keyName: string
  keyVersion?: string
  keyType: string
  keySize?: number
  keyOperations: string[]
  enabled: boolean
  attributes?: {
    created?: Date
    updated?: Date
    expires?: Date
    notBefore?: Date
  }
}

// Google Cloud KMS Specific Types
export interface GoogleCloudKMSConfig extends HSMConfig {
  provider: 'google-cloud-kms'
  projectId: string
  location: string
  keyRingId: string
  protectionLevel?: 'SOFTWARE' | 'HSM'
}

export interface GoogleCloudKMSKey {
  name: string
  purpose: 'ENCRYPT_DECRYPT' | 'ASYMMETRIC_SIGN' | 'ASYMMETRIC_DECRYPT'
  algorithm: string
  protectionLevel: 'SOFTWARE' | 'HSM'
  state: 'ENABLED' | 'DISABLED' | 'DESTROYED'
  createTime?: Date
  nextRotationTime?: Date
}

// HSM Audit and Compliance Types
export interface HSMAuditLog {
  id: string
  walletId: string
  operation: 'create' | 'sign' | 'encrypt' | 'decrypt' | 'rotate' | 'delete'
  hsmProvider: HSMProvider
  keyId: string
  userId?: string
  timestamp: Date
  success: boolean
  error?: string
  metadata?: any
  complianceFlags: string[]
}

export interface HSMComplianceReport {
  reportId: string
  generatedAt: Date
  periodStart: Date
  periodEnd: Date
  hsmProvider: HSMProvider
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW'
  findings: HSMComplianceFinding[]
  recommendations: string[]
}

export interface HSMComplianceFinding {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'SECURITY' | 'PERFORMANCE' | 'AVAILABILITY' | 'COMPLIANCE'
  description: string
  affectedOperations: string[]
  remediation: string
}

// HSM Health and Monitoring Types
export interface HSMHealthStatus {
  provider: HSMProvider
  available: boolean
  latency: number
  lastChecked: Date
  capabilities: HSMCapability[]
  configuration: any
  errors: string[]
  warnings: string[]
}

export interface HSMCapability {
  name: string
  available: boolean
  description: string
  limitations?: string[]
}

export interface HSMMetrics {
  provider: HSMProvider
  timestamp: Date
  operationsPerSecond: number
  averageLatency: number
  errorRate: number
  uptime: number
  keyCount: number
  rotationsDue: number
}

// HSM Configuration Validation Types
export interface HSMValidationResult {
  valid: boolean
  provider: HSMProvider
  errors: HSMValidationError[]
  warnings: string[]
  recommendations: string[]
  estimatedCost?: {
    setup: number
    monthly: number
    perOperation: number
  }
}

export interface HSMValidationError {
  field: string
  message: string
  code: string
  severity: 'ERROR' | 'WARNING'
}

// HSM Environment Configuration
export interface HSMEnvironmentConfig {
  development: HSMConfig
  staging: HSMConfig
  production: HSMConfig
  fallback: HSMConfig
}

// Default HSM Configurations
export const DEFAULT_HSM_CONFIGS: Record<HSMProvider, Partial<HSMConfig>> = {
  'aws-cloudhsm': {
    keySpecs: {
      keyUsage: 'SIGN_VERIFY',
      keyType: 'ECC_SECG_P256K1',
      origin: 'AWS_CLOUDHSM'
    },
    options: {
      enableFallback: true,
      operationTimeout: 30000,
      retryAttempts: 3,
      auditLogging: true,
      compliance: {
        fips140Level: 3,
        enableTamperResistance: true
      }
    }
  },
  'azure-keyvault': {
    keySpecs: {
      keyUsage: 'SIGN_VERIFY',
      keyType: 'ECC_NIST_P256',
      origin: 'EXTERNAL'
    },
    options: {
      enableFallback: true,
      operationTimeout: 30000,
      retryAttempts: 3,
      auditLogging: true,
      compliance: {
        fips140Level: 2,
        enableTamperResistance: true
      }
    }
  },
  'google-cloud-kms': {
    keySpecs: {
      keyUsage: 'SIGN_VERIFY',
      keyType: 'ECC_NIST_P256',
      origin: 'EXTERNAL'
    },
    options: {
      enableFallback: true,
      operationTimeout: 30000,
      retryAttempts: 3,
      auditLogging: true,
      compliance: {
        fips140Level: 3,
        enableTamperResistance: true
      }
    }
  },
  'memory': {
    keySpecs: {
      keyUsage: 'SIGN_VERIFY',
      keyType: 'ECC_SECG_P256K1',
      origin: 'EXTERNAL'
    },
    options: {
      enableFallback: false,
      operationTimeout: 5000,
      retryAttempts: 1,
      auditLogging: false,
      compliance: {
        fips140Level: 2,
        enableTamperResistance: false
      }
    }
  }
}

// HSM Cost Estimation
export interface HSMCostEstimate {
  provider: HSMProvider
  setup: {
    hsmInstance: number
    certification: number
    integration: number
    total: number
  }
  monthly: {
    hsmInstance: number
    operations: number
    storage: number
    monitoring: number
    total: number
  }
  perOperation: {
    sign: number
    encrypt: number
    decrypt: number
    keyGeneration: number
  }
  compliance: {
    auditingCost: number
    certificationMaintenance: number
    securityAssessment: number
  }
}

// HSM Security Standards
export const HSM_SECURITY_STANDARDS = {
  FIPS_140_2: {
    level1: 'Basic security requirements',
    level2: 'Tamper-evident physical security',
    level3: 'Tamper-resistant physical security',
    level4: 'Complete envelope of protection'
  },
  COMMON_CRITERIA: {
    'EAL4+': 'Methodically designed, tested, and reviewed',
    'EAL5+': 'Semiformally designed and tested',
    'EAL6+': 'Semiformally verified design and tested',
    'EAL7': 'Formally verified design and tested'
  }
} as const
