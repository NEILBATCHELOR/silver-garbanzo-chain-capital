import { WalletService } from './WalletService'
import { HDWalletService } from './HDWalletService'
import { KeyManagementService } from './KeyManagementService'
import { WalletValidationService } from './WalletValidationService'

// Phase 2 Services - Transaction Infrastructure
import { TransactionService } from './TransactionService'
import { SigningService } from './SigningService'
import { FeeEstimationService } from './FeeEstimationService'
import { NonceManagerService } from './NonceManagerService'

// Phase 3A Services - Smart Contract Foundation
import { SmartContractWalletService } from './smart-contract/SmartContractWalletService'
import { FacetRegistryService } from './smart-contract/FacetRegistryService'
import { WebAuthnService } from './webauthn/WebAuthnService'
import { GuardianRecoveryService } from './guardian/GuardianRecoveryService'

// Phase 3B Services - Account Abstraction
import { UserOperationService } from './account-abstraction/UserOperationService'
import { PaymasterService } from './account-abstraction/PaymasterService'
import { BatchOperationService } from './account-abstraction/BatchOperationService'

// Phase 3C Services - Multi-Signature Wallets
import { 
  MultiSigWalletService,
  TransactionProposalService,
  MultiSigSigningService,
  GnosisSafeService
} from './multi-sig/index'

// Phase 3D Services - Smart Contract Integration (NEW)
import { SignatureMigrationService } from './signature-migration/SignatureMigrationService'
import { RestrictionsService } from './restrictions/RestrictionsService'
import { LockService } from './lock/LockService'
import { UnifiedWalletInterface } from './unified/UnifiedWalletInterface'

// HSM Services - Hardware Security Module Integration
import { 
  HSMKeyManagementService,
  AWSCloudHSMService,
  AzureKeyVaultService,
  GoogleCloudKMSService,
  HSMServiceFactory,
  createHSMService,
  createProviderService,
  getEnvConfig,
  validateConfig
} from './hsm/index'

export { 
  // Phase 1 - Core HD Wallet Services
  WalletService, 
  HDWalletService, 
  KeyManagementService, 
  WalletValidationService,
  
  // Phase 2 - Transaction Infrastructure
  TransactionService,
  SigningService,
  FeeEstimationService,
  NonceManagerService,
  
  // Phase 3A - Smart Contract Foundation
  SmartContractWalletService,
  FacetRegistryService,
  WebAuthnService,
  GuardianRecoveryService,
  
  // Phase 3B - Account Abstraction
  UserOperationService,
  PaymasterService,
  BatchOperationService,
  
  // Phase 3C - Multi-Signature Wallets
  MultiSigWalletService,
  TransactionProposalService,
  MultiSigSigningService,
  GnosisSafeService,
  
  // Phase 3D - Smart Contract Integration
  SignatureMigrationService,
  RestrictionsService,
  LockService,
  UnifiedWalletInterface,
  
  // HSM Services - Hardware Security Module Integration
  HSMKeyManagementService,
  AWSCloudHSMService,
  AzureKeyVaultService,
  GoogleCloudKMSService,
  HSMServiceFactory,
  createHSMService,
  createProviderService,
  getEnvConfig,
  validateConfig
}

export type {
  // Core Types
  BlockchainNetwork,
  WalletType,
  WalletStatus,
  
  // HD Wallet Types
  HDWalletData,
  WalletKeyData,
  StoredKeyData,
  
  // Request/Response Types
  CreateWalletRequest,
  WalletResponse,
  WalletBalance,
  ChainBalance,
  TokenBalance,
  
  // Transaction Types
  TransactionRequest,
  SignTransactionRequest,
  TransactionResponse,
  TransactionStatus,
  TransactionPriority,
  TransactionFeeEstimate,
  TransactionSimulationResult,
  TransactionReceipt,
  TransactionBuilder,
  BuildTransactionRequest,
  BuildTransactionResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  
  // Analytics Types
  WalletStatistics,
  
  // Validation Types
  WalletValidationResult,
  WalletValidationError,
  
  // Signing Types
  NonceInfo,
  SigningRequest,
  SigningResponse
} from './types'

// Phase 3C Multi-Sig Types
export type {
  MultiSigWallet,
  CreateMultiSigWalletRequest,
  UpdateMultiSigWalletRequest,
  TransactionProposal,
  CreateProposalRequest,
  UpdateProposalRequest,
  MultiSigSignature,
  CreateSignatureRequest,
  SignProposalRequest,
  MultiSigTransaction,
  MultiSigConfirmation,
  GnosisSafeConfig,
  GnosisSafeDeploymentRequest,
  GnosisSafeTransaction,
  MultiSigValidationResult,
  MultiSigValidationError,
  MultiSigAnalytics,
  SignerActivity,
  MultiSigQueryOptions,
  MultiSigEvent,
  MultiSigEventType,
  ProposalStatus,
  MultiSigWalletStatus
} from './multi-sig/index'

// Phase 3D Integration Types
export type {
  // Unified Wallet Types
  UnifiedWallet,
  WalletCapabilities,
  WalletUpgradeRequest,
  UnifiedTransactionRequest,
  
  // Signature Migration Types
  SignatureMigrationRequest,
  GuardianApproval,
  SignatureMigrationStatus,
  
  // Restrictions Types
  RestrictionRule,
  RestrictionRuleData,
  TransactionValidationRequest,
  ValidationResult,
  
  // Lock Types
  WalletLock,
  LockRequest,
  UnlockRequest,
  LockStatus
} from './unified/index'

// HSM Types
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
} from './hsm/index'

export { DEFAULT_HSM_CONFIGS, HSM_SECURITY_STANDARDS } from './hsm/index'

export {
  // Constants
  COIN_TYPES,
  DEFAULT_DERIVATION_PATHS,
  SECURITY_CONFIG,
  TRANSACTION_CONFIG
} from './types'

// Service Factory Functions (lazy initialization)
function getWalletService() { return new WalletService() }
function getHDWalletService() { return new HDWalletService() }
function getKeyManagementService() { return new KeyManagementService() }
function getWalletValidationService() { return new WalletValidationService() }

// Phase 2 Service Factory Functions
function getTransactionService() { return new TransactionService() }
function getSigningService() { return new SigningService() }
function getFeeEstimationService() { return new FeeEstimationService() }
function getNonceManagerService() { return new NonceManagerService() }

// Phase 3A Service Factory Functions
function getSmartContractWalletService() { return new SmartContractWalletService() }
function getFacetRegistryService() { return new FacetRegistryService() }
function getWebAuthnService() { return new WebAuthnService() }
function getGuardianRecoveryService() { return new GuardianRecoveryService() }

// Phase 3B Service Factory Functions
function getUserOperationService() { return new UserOperationService() }
function getPaymasterService() { return new PaymasterService() }
function getBatchOperationService() { return new BatchOperationService() }

// Phase 3C Service Factory Functions - Multi-Signature Wallets
function getMultiSigWalletService() { return new MultiSigWalletService() }
function getTransactionProposalService() { return new TransactionProposalService() }
function getMultiSigSigningService() { return new MultiSigSigningService() }
function getGnosisSafeService() { return new GnosisSafeService() }

// Phase 3D Service Factory Functions - Complete Integration
function getSignatureMigrationService() { return new SignatureMigrationService() }
function getRestrictionsService() { return new RestrictionsService() }
function getLockService() { return new LockService() }
function getUnifiedWalletInterface() { return new UnifiedWalletInterface() }

// HSM Service Factory Functions - Hardware Security Module Integration
function getHSMKeyManagementService() { return createHSMService(getEnvConfig()) }
function getHSMServiceFactory() { return HSMServiceFactory }

// Backward compatibility exports (lazy loaded)
const walletService = { get instance() { return getWalletService() } }
const hdWalletService = { get instance() { return getHDWalletService() } }
const keyManagementService = { get instance() { return getKeyManagementService() } }
const walletValidationService = { get instance() { return getWalletValidationService() } }
const transactionService = { get instance() { return getTransactionService() } }
const signingService = { get instance() { return getSigningService() } }
const feeEstimationService = { get instance() { return getFeeEstimationService() } }
const nonceManagerService = { get instance() { return getNonceManagerService() } }
const smartContractWalletService = { get instance() { return getSmartContractWalletService() } }
const facetRegistryService = { get instance() { return getFacetRegistryService() } }
const webAuthnService = { get instance() { return getWebAuthnService() } }
const guardianRecoveryService = { get instance() { return getGuardianRecoveryService() } }
const userOperationService = { get instance() { return getUserOperationService() } }
const paymasterService = { get instance() { return getPaymasterService() } }
const batchOperationService = { get instance() { return getBatchOperationService() } }
const multiSigWalletService = { get instance() { return getMultiSigWalletService() } }
const transactionProposalService = { get instance() { return getTransactionProposalService() } }
const multiSigSigningService = { get instance() { return getMultiSigSigningService() } }
const gnosisSafeService = { get instance() { return getGnosisSafeService() } }
const signatureMigrationService = { get instance() { return getSignatureMigrationService() } }
const restrictionsService = { get instance() { return getRestrictionsService() } }
const lockService = { get instance() { return getLockService() } }
const unifiedWalletInterface = { get instance() { return getUnifiedWalletInterface() } }
const hsmKeyManagementService = { get instance() { return getHSMKeyManagementService() } }
const hsmServiceFactory = { get instance() { return getHSMServiceFactory() } }

export { 
  // Phase 1 Service Instances
  walletService, 
  hdWalletService, 
  keyManagementService, 
  walletValidationService,
  
  // Phase 2 Service Instances
  transactionService,
  signingService,
  feeEstimationService,
  nonceManagerService,
  
  // Phase 3A Service Instances
  smartContractWalletService,
  facetRegistryService,
  webAuthnService,
  guardianRecoveryService,
  
  // Phase 3B Service Instances
  userOperationService,
  paymasterService,
  batchOperationService,
  
  // Phase 3C Service Instances - Multi-Signature Wallets
  multiSigWalletService,
  transactionProposalService,
  multiSigSigningService,
  gnosisSafeService,
  
  // Phase 3D Service Instances - Complete Integration
  signatureMigrationService,
  restrictionsService,
  lockService,
  unifiedWalletInterface,
  
  // HSM Service Instances - Hardware Security Module Integration
  hsmKeyManagementService,
  hsmServiceFactory
}

/**
 * Chain Capital Wallet Service Collection
 * 
 * Complete wallet infrastructure with 4 development phases:
 * 
 * Phase 1: HD Wallet Foundation ✅
 * - Traditional HD wallets with 8 blockchain support
 * - BIP32/39/44 compliance
 * - Secure key management
 * 
 * Phase 2: Transaction Infrastructure ✅
 * - Multi-chain transaction building and signing
 * - Fee estimation and optimization
 * - Nonce management and anti-double-spending
 * 
 * Phase 3A: Smart Contract Foundation ✅
 * - Diamond proxy architecture (EIP-2535)
 * - WebAuthn/Passkey support
 * - Guardian recovery system
 * - Facet registry management
 * 
 * Phase 3B: Account Abstraction ✅
 * - EIP-4337 UserOperation support
 * - Gasless transactions via paymasters
 * - Batch operations for efficiency
 * 
 * Phase 3C: Multi-Signature Wallets ✅
 * - Multi-sig wallet creation and management
 * - Transaction proposal workflow
 * - Multi-chain Gnosis Safe integration
 * - 8 blockchain multi-sig support
 * 
 * Phase 3D: Complete Integration ✅
 * - Signature migration between ECDSA ↔ WebAuthn
 * - Transaction restrictions and compliance
 * - Emergency lock/unlock functionality
 * - Unified interface for all wallet types
 * 
 * HSM Integration: Hardware Security Module Support ✅
 * - AWS CloudHSM (FIPS 140-2 Level 3)
 * - Azure Key Vault HSM (FIPS 140-2 Level 2)
 * - Google Cloud KMS (FIPS 140-2 Level 3)
 * - Dual memory/HSM operations for seamless fallback
 * - Enterprise-grade tamper-resistant key generation
 * - Professional cryptographic operations
 * - Comprehensive audit logging and compliance
 * 
 * Result: Industry-leading smart contract wallet system with:
 * - 8 blockchain support (vs. Barz's Ethereum focus)
 * - Complete Diamond proxy modularity
 * - Advanced security and compliance features
 * - Seamless traditional ↔ smart contract integration
 * - Enterprise-grade HSM security for institutional clients
 */
