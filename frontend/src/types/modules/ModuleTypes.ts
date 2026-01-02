/**
 * Module Configuration Types
 * 
 * COMPREHENSIVE type definitions for ALL 52+ extension modules
 * across 6 token standards (ERC20, ERC721, ERC1155, ERC3525, ERC4626, ERC1400)
 * 
 * KEY PRINCIPLE: All configuration should be captured PRE-DEPLOYMENT
 * to enable single-transaction deployment with automatic configuration.
 * 
 * Last Updated: November 2025 - Enhanced with pre-deployment configuration
 */

// ============ SHARED TYPES ============

/**
 * Document structure for attaching legal/compliance documents
 */
export interface Document {
  name: string;
  uri: string;           // IPFS hash or URL
  hash: string;          // SHA256 hash for verification
  documentType: 'whitepaper' | 'legal' | 'prospectus' | 'terms' | 'disclosure' | 'other';
  uploadedAt?: number;   // Unix timestamp
}

/**
 * Vesting Schedule structure
 */
export interface VestingSchedule {
  beneficiary: string;
  amount: string;
  startTime: number;      // Unix timestamp
  cliffDuration: number;  // Seconds
  vestingDuration: number; // Seconds
  revocable: boolean;
  category: 'team' | 'advisor' | 'investor' | 'founder' | 'community' | 'partner' | 'other';
  scheduleId?: string;    // Optional ID for tracking
}

/**
 * Policy Rule Definition
 */
export interface PolicyRule {
  ruleId: string;
  name: string;
  enabled: boolean;
  conditions: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
    value: any;
  }[];
  actions: {
    actionType: 'allow' | 'deny' | 'require_approval' | 'fee' | 'delay';
    params?: Record<string, any>;
  }[];
  priority: number;
}

/**
 * Transfer Restriction Definition
 */
export interface TransferRestriction {
  restrictionType: 'jurisdiction' | 'investorType' | 'lockup' | 'limit' | 'timeWindow' | 'whitelist' | 'blocklist';
  value: string | number;
  enabled: boolean;
  description?: string;
}

// ============ UNIVERSAL MODULE CONFIGURATIONS ============

/**
 * Compliance Module Configuration
 * Used across all token standards for KYC/AML compliance
 * 
 * ✅ CORRECTED: Aligned with smart contract initialize() signature
 * Contract expects: admin, jurisdictions, complianceLevel, maxHoldersPerJurisdiction, kycRequired
 */
export interface ComplianceConfig {
  // ============ DEPLOYMENT PARAMETERS (sent to initialize) ============
  complianceLevel: number;              // 1-5: Progressive compliance restrictions
  maxHoldersPerJurisdiction: number;    // Maximum holders per jurisdiction (0 = unlimited)
  kycRequired: boolean;
  jurisdictionRules?: Array<{           // Transforms to jurisdictions array for deployment
    jurisdiction: string;
    allowed: boolean;
    requirements?: string[];
  }>;
  
  // ============ DERIVED FIELDS (read-only, computed from complianceLevel) ============
  whitelistRequired?: boolean;          // Auto-derived: complianceLevel >= 3
  accreditedInvestorOnly?: boolean;     // Auto-derived: complianceLevel >= 4
  
  // ============ POST-DEPLOYMENT DATA (added via addToWhitelistBatch) ============
  whitelistAddresses?: string[];        // Addresses to add to whitelist after deployment
  
  // ============ UI/METADATA (not sent to contract) ============
  kycProvider?: string;                 // Metadata only
  restrictedCountries?: string[];       // For UI display
}

/**
 * Vesting Module Configuration
 * ✅ ENHANCED: Full schedule configuration pre-deployment
 */
export interface VestingConfig {
  schedules: VestingSchedule[];  // ✅ Configure ALL schedules upfront
  allowEarlyRelease?: boolean;
  revocationEnabled?: boolean;
}

/**
 * Document Module Configuration
 * ✅ ENHANCED: All documents configured pre-deployment
 */
export interface DocumentConfig {
  documents: Document[];  // ✅ Upload ALL documents upfront
  allowUpdates?: boolean;
  requireSignatures?: boolean;
}

/**
 * Policy Engine Configuration
 * ✅ ENHANCED: Full rule definitions, not just IDs
 */
export interface PolicyEngineConfig {
  rules: PolicyRule[];  // ✅ Complete rule definitions
  validators: Array<{
    validatorId: string;
    validatorAddress: string;
    enabled: boolean;
  }>;
  defaultPolicy?: 'allow' | 'deny';
  requireAllValidators?: boolean;
}

// ============ ERC20 MODULE CONFIGURATIONS ============

/**
 * Fees Module Configuration (ERC20)
 */
export interface FeesConfig {
  transferFeeBps: number; // Transfer fee in basis points (100 = 1%)
  feeRecipient: string; // Address receiving fees
  exemptAddresses?: string[]; // Addresses exempt from fees
  buyFeeBps?: number;
  sellFeeBps?: number;
  maxFeeBps?: number; // Maximum fee cap
}

/**
 * Flash Mint Module Configuration (ERC20)
 */
export interface FlashMintConfig {
  flashFeeBps?: number; // Flash loan fee in basis points (default: 9 = 0.09%)
  maxFlashLoan?: string; // Maximum flash loan amount
}

/**
 * Permit Module Configuration (ERC20)
 * EIP-2612: Permit extension for ERC-20
 */
export interface PermitConfig {
  permitDeadline?: number; // Default permit deadline in seconds
  permitVersion?: string; // Permit version string
}

/**
 * Snapshot Module Configuration (ERC20)
 */
export interface SnapshotConfig {
  automaticSnapshots?: boolean;
  snapshotInterval?: number; // Auto-snapshot interval in seconds
}

/**
 * Timelock Module Configuration (ERC20)
 * Individual token locking - not governance timelocks
 */
export interface TimelockConfig {
  defaultLockDuration?: number; // Default lock duration in seconds (optional)
  minLockDuration?: number; // Minimum allowed lock duration
  maxLockDuration?: number; // Maximum allowed lock duration
  lockManagers?: string[]; // Addresses allowed to cancel locks
  allowExtension?: boolean; // Whether locks can be extended
}

/**
 * Votes Module Configuration (ERC20)
 * For governance tokens (EIP-5805)
 * 
 * ✅ CORRECTED: All governance parameters are REQUIRED by contract
 * Contract expects: admin, tokenName, votingDelay, votingPeriod, proposalThreshold, quorumPercentage
 */
export interface VotesConfig {
  votingDelay: number;              // REQUIRED: Delay before voting starts (blocks)
  votingPeriod: number;             // REQUIRED: Voting duration (blocks)
  proposalThreshold: string;        // REQUIRED: Tokens needed to create proposal
  quorumPercentage: number;         // REQUIRED: Quorum as percentage
  delegatesEnabled?: boolean;       // Optional: Enable vote delegation (default: true)
}

/**
 * Payable Token Module Configuration (ERC20)
 * EIP-1363: Payable Token
 * 
 * ✅ FIXED: Aligned with ERC1363PayableToken.sol initialize() signature
 * Contract expects: admin, tokenContract, callbackGasLimit
 */
export interface PayableTokenConfig {
  // Phase 1: Factory initialization parameters (REQUIRED)
  callbackGasLimit: number;          // Gas limit for callback executions (default: 100000)
  
  // Phase 2: Post-deployment configuration (OPTIONAL)
  acceptedForPayment?: boolean;
  paymentCallbackEnabled?: boolean;
  whitelistEnabled?: boolean;
}

/**
 * Temporary Approval Module Configuration (ERC20)
 */
export interface TemporaryApprovalConfig {
  defaultDuration: number; // Default approval duration in seconds (default: 3600 = 1 hour)
  maxDuration?: number; // Maximum allowed duration
  minDuration?: number; // Minimum allowed duration
}

// ============ ERC721 MODULE CONFIGURATIONS ============

/**
 * Royalty Module Configuration (ERC721/ERC1155)
 * ✅ ENHANCED: Per-token royalties configurable
 */
export interface RoyaltyConfig {
  defaultRoyaltyBps: number; // Royalty percentage in basis points (250 = 2.5%)
  royaltyRecipient: string; // Address receiving royalty payments
  perTokenRoyalties?: Array<{
    tokenId: string;
    royaltyBps: number;
    recipient: string;
  }>;
  maxRoyaltyBps?: number; // Maximum royalty cap (e.g., 1000 = 10%)
}

/**
 * Rental Module Configuration (ERC721)
 * ✅ ENHANCED: Full rental configuration
 */
export interface RentalConfig {
  maxRentalDuration: number; // Maximum rental period in seconds
  minRentalDuration?: number; // Minimum rental period in seconds
  minRentalPrice?: string; // Minimum rental price in wei
  rentalRecipient?: string; // Address receiving rental payments (defaults to owner)
  autoReturn?: boolean; // Automatically return NFT after rental period
  allowSubRentals?: boolean;
  depositRequired?: boolean;
  depositAmount?: string;
}

/**
 * Fractionalization Module Configuration (ERC721)
 * ✅ ENHANCED: Complete fractionalization setup
 */
export interface FractionalizationConfig {
  minFractions: number; // Minimum number of fractional shares per NFT
  maxFractions?: number; // Maximum number of fractional shares
  fractionPrice?: string; // Price per fraction in wei
  buyoutMultiplier?: number; // Multiplier for buyout price (e.g., 1.5 = 150%)
  fractionTokenName?: string;
  fractionTokenSymbol?: string;
  tradingEnabled?: boolean;
}

/**
 * Soulbound Module Configuration (ERC721)
 */
export interface SoulboundConfig {
  transferable?: boolean; // Allow one-time transfer (e.g., for account recovery)
  burnableByOwner?: boolean; // Allow owner to burn soulbound token
  burnableByIssuer?: boolean; // Allow issuer to burn
  expirationEnabled?: boolean;
  expirationPeriod?: number; // Seconds until expiration
}

/**
 * Consecutive Module Configuration (ERC721)
 * For gas-efficient batch minting with sequential IDs
 */
export interface ConsecutiveConfig {
  batchSize?: number; // Default batch size for consecutive minting
  startTokenId?: number; // Starting token ID
  maxBatchSize?: number; // Maximum batch size allowed
}

/**
 * Metadata Events Module Configuration (ERC721)
 * EIP-4906: Metadata Update Events
 * 
 * ✅ FIXED: Aligned with ERC4906MetadataModule.sol initialize() signature
 * Contract expects: tokenContract, admin, batchUpdatesEnabled, emitOnTransfer
 */
export interface MetadataEventsConfig {
  // Phase 1: Factory initialization parameters (REQUIRED)
  batchUpdatesEnabled: boolean;      // Enable batch metadata update events
  emitOnTransfer: boolean;           // Emit metadata event on every transfer
  
  // Phase 2: Post-deployment configuration (OPTIONAL)
  autoEmitOnMint?: boolean;
  autoEmitOnBurn?: boolean;
  autoEmitOnUpdate?: boolean;
}

// ============ ERC1155 MODULE CONFIGURATIONS ============

/**
 * Supply Cap Module Configuration (ERC1155)
 * ✅ ENHANCED: Per-token caps configurable
 */
export interface SupplyCapConfig {
  defaultCap: number; // Default supply cap for new token IDs (0 = unlimited)
  perTokenCaps?: Array<{
    tokenId: string;
    cap: number;
  }>;
  enforceGlobalCap?: boolean;
  globalCap?: number;
}

/**
 * URI Management Module Configuration (ERC1155)
 * ✅ ENHANCED: Per-token URIs configurable
 */
export interface UriManagementConfig {
  baseURI: string; // Base URI for metadata
  ipfsGateway?: string; // IPFS gateway URL (e.g., "https://ipfs.io/ipfs/")
  useTokenIdSubstitution?: boolean; // Replace {id} in URI with token ID
  perTokenUris?: Array<{
    tokenId: string;
    uri: string;
  }>;
  dynamicUris?: boolean;
  updateableUris?: boolean;
}

/**
 * Granular Approval Module Configuration (ERC1155)
 * EIP-5216: Granular Approval for ERC-1155
 * 
 * ✅ FIXED: Aligned with ERC5216GranularApprovalModule.sol initialize() signature
 * Contract expects: tokenContract, admin, requireExplicitApproval, allowPartialApproval
 */
export interface GranularApprovalConfig {
  // Phase 1: Factory initialization parameters (REQUIRED)
  requireExplicitApproval: boolean;  // Require explicit approval for each operation
  allowPartialApproval: boolean;     // Allow partial approvals (not full balance)
  
  // Phase 2: Post-deployment configuration (OPTIONAL)
  requireExplicitRevocation?: boolean;
  defaultApprovalAmount?: string;
}

// ============ ERC3525 MODULE CONFIGURATIONS ============

/**
 * Slot Definition for ERC3525
 */
export interface SlotDefinition {
  slotId: string;
  name: string;
  transferable: boolean;
  mergeable: boolean;
  splittable: boolean;
  maxSupply?: string; // 0 = unlimited
  metadata?: string; // JSON metadata for slot
  restrictions?: {
    minValue?: string;
    maxValue?: string;
    allowedOwners?: string[];
  };
}

/**
 * Slot Approvable Module Configuration (ERC3525)
 */
export interface SlotApprovableConfig {
  approvalMode?: 'slot' | 'token' | 'both';
  requireSlotApproval?: boolean;
}

/**
 * Slot Manager Module Configuration (ERC3525)
 * ✅ ENHANCED: Complete slot definitions pre-deployment
 * ✅ FIXED: Added missing factory parameters (restrictCrossSlot, allowSlotMerging)
 */
export interface SlotManagerConfig {
  // Phase 1: Factory initialization parameters
  allowDynamicSlots?: boolean;     // Allow creation of new slots post-deployment (maps to allowDynamicSlotCreation)
  restrictCrossSlot?: boolean;     // ✅ ADDED: Restrict transfers between different slots
  allowSlotMerging?: boolean;      // ✅ ADDED: Allow merging values between slots
  
  // Phase 2: Post-deployment configuration
  slots: SlotDefinition[];         // ✅ Define ALL slots upfront (configured post-deployment)
  slotCreationFee?: string;        // Fee for creating new slots (Phase 2)
}

/**
 * Value Exchange Module Configuration (ERC3525)
 */
export interface ValueExchangeConfig {
  exchangeFeeBps: number; // Fee for value exchanges in basis points
  feeRecipient?: string; // Address receiving exchange fees
  allowCrossSlotExchange?: boolean; // Allow exchanges between different slots
  minExchangeValue?: string;
  slippageTolerance?: number;
}

// ============ ERC4626 MODULE CONFIGURATIONS ============

/**
 * Fee Strategy Module Configuration (ERC4626)
 * ✅ ENHANCED: Complete fee structure
 */
export interface FeeStrategyConfig {
  managementFeeBps: number; // Annual management fee in basis points (100 = 1%)
  performanceFeeBps: number; // Performance fee in basis points (1000 = 10%)
  feeRecipient: string; // Address receiving fees
  managementFeeFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  highWaterMark?: boolean; // Only charge performance fee on new profits
  hurdleRate?: number; // Minimum return before performance fee (bps)
}

/**
 * Withdrawal Queue Module Configuration (ERC4626)
 */
export interface WithdrawalQueueConfig {
  maxQueueSize: number; // Maximum number of pending withdrawals
  processingDelay?: number; // Delay before processing withdrawals (seconds)
  priorityFee?: number; // Optional fee for priority processing (basis points)
  maxWithdrawalAmount?: string;
  minWithdrawalAmount?: string;
}

/**
 * Yield Strategy Module Configuration (ERC4626)
 * ✅ ENHANCED: Multiple strategies configurable
 */
export interface YieldStrategyConfig {
  targetYieldBps: number; // Target annual yield in basis points
  harvestFrequency?: number; // How often yields are harvested (seconds)
  rebalanceThreshold?: number; // Threshold to trigger rebalancing (bps)
  strategies?: Array<{
    strategyAddress: string;
    allocationBps: number; // Must total 10000
    minAllocationBps?: number;
    maxAllocationBps?: number;
  }>;
  autoCompound?: boolean;
}

/**
 * Async Vault Module Configuration (ERC4626)
 */
export interface AsyncVaultConfig {
  settlementDelay: number; // Time between request and settlement (seconds, default: 86400 = 1 day)
  maxPendingRequestsPerUser?: number; // Default: 10
  requestExpiry?: number; // Request expiration period in seconds
  partialFulfillment?: boolean;
  minimumRequestAmount?: string;
}

/**
 * Native Vault Module Configuration (ERC4626)
 */export interface NativeVaultConfig {
  wrapNative?: boolean; // Automatically wrap native token to ERC20
  wrappedTokenAddress?: string; // Address of wrapped token (e.g., WETH)
  unwrapOnWithdrawal?: boolean;
}

/**
 * Router Module Configuration (ERC4626)
 */
export interface RouterConfig {
  allowedVaults?: string[]; // List of allowed vault addresses
  slippageTolerance?: number; // Maximum slippage tolerance in basis points
  routerAddress?: string;
  enableMultiHopRouting?: boolean;
}

/**
 * Multi-Asset Vault Module Configuration (ERC4626)
 * ✅ ENHANCED: Complete asset allocation pre-configured
 * ✅ FIXED: Aligned with ERC7575MultiAssetVaultModule.sol initialize() signature
 * Contract expects: vault, priceOracle, baseAsset
 */
export interface MultiAssetVaultConfig {
  // Phase 1: Factory initialization parameters (REQUIRED)
  priceOracle: string;               // Address of price oracle contract
  baseAsset: string;                 // Base asset for valuation
  
  // Phase 2: Post-deployment configuration (OPTIONAL)
  maxAssets?: number;                // Maximum number of different assets
  assets?: Array<{
    assetAddress: string;
    weight: number;                  // Weight in basis points (total must equal 10000)
    minWeight?: number;
    maxWeight?: number;
  }>;
  rebalanceThreshold?: number;       // Threshold for triggering rebalance (bps)
  rebalanceFrequency?: number;       // Minimum time between rebalances (seconds)
}

// ============ ERC1400 MODULE CONFIGURATIONS ============

/**
 * Transfer Restrictions Module Configuration (ERC1400)
 * ✅ ENHANCED: Comprehensive restriction configuration
 */
export interface TransferRestrictionsConfig {
  restrictions: TransferRestriction[];  // ✅ All restrictions defined upfront
  defaultPolicy: 'allow' | 'block';
  partitionRestrictions?: Array<{
    partition: string;
    restrictions: {
      lockupPeriod?: number;
      maxHoldersPerPartition?: number;
      maxTokensPerHolder?: string;
      transferWindows?: Array<{
        start: number; // Unix timestamp
        end: number;   // Unix timestamp
      }>;
    };
  }>;
  jurisdictionRestrictions?: Record<string, boolean>; // jurisdiction => allowed
}

/**
 * Controller Module Configuration (ERC1400)
 * ✅ ENHANCED: Controller permissions configurable
 */
export interface ControllerConfig {
  controllers: string[];  // Controller addresses
  controllable?: boolean; // Enable controller functions (default true)
  controllerOperations?: Array<{
    controller: string;
    operations: ('forceTransfer' | 'forceBurn' | 'issuance' | 'redemption')[];
  }>;
  requireMultiSig?: boolean;
  minSignatures?: number;
}

/**
 * ERC1400 Document Module Configuration (ERC1400)
 * ✅ ENHANCED: Partition-specific documents
 * 
 * NOTE: UniversalDocumentModule.initialize() only requires admin.
 * All documents are Phase 2 configuration (added via setDocument() post-deployment).
 */
export interface ERC1400DocumentConfig {
  // Phase 2: Post-deployment configuration (ALL FIELDS)
  documents: Document[];  // Global documents (applied post-deployment)
  partitionDocuments?: Array<{
    partition: string;
    documents: Document[];
  }>;
  requireDocumentHash?: boolean;
  allowDocumentUpdates?: boolean;
}

/**
 * Partition Configuration (ERC1400)
 */
export interface PartitionConfig {
  partitions: Array<{
    name: string;
    description?: string;
    transferable?: boolean;
    supply?: string;
    maxSupply?: string;
    metadata?: Record<string, any>;
  }>;
  defaultPartition?: string;
}

// ============ COMPLETE MODULE CONFIGURATION TYPE ============

/**
 * Complete Module Configuration
 * Used for passing all module configs to deployment scripts
 */
export interface CompleteModuleConfiguration {
  // Universal modules
  compliance?: ComplianceConfig;
  vesting?: VestingConfig;
  document?: DocumentConfig;
  policyEngine?: PolicyEngineConfig;

  // ERC20 modules
  fees?: FeesConfig;
  flashMint?: FlashMintConfig;
  permit?: PermitConfig;
  snapshot?: SnapshotConfig;
  timelock?: TimelockConfig;
  votes?: VotesConfig;
  payableToken?: PayableTokenConfig;
  temporaryApproval?: TemporaryApprovalConfig;

  // ERC721 modules
  royalty?: RoyaltyConfig;
  rental?: RentalConfig;
  soulbound?: SoulboundConfig;
  fractionalization?: FractionalizationConfig;
  consecutive?: ConsecutiveConfig;
  metadataEvents?: MetadataEventsConfig;

  // ERC1155 modules
  supplyCap?: SupplyCapConfig;
  uriManagement?: UriManagementConfig;
  granularApproval?: GranularApprovalConfig;

  // ERC3525 modules
  slotApprovable?: SlotApprovableConfig;
  slotManager?: SlotManagerConfig;
  valueExchange?: ValueExchangeConfig;

  // ERC4626 modules
  feeStrategy?: FeeStrategyConfig;
  withdrawalQueue?: WithdrawalQueueConfig;
  yieldStrategy?: YieldStrategyConfig;
  asyncVault?: AsyncVaultConfig;
  nativeVault?: NativeVaultConfig;
  router?: RouterConfig;
  multiAssetVault?: MultiAssetVaultConfig;

  // ERC1400 modules
  transferRestrictions?: TransferRestrictionsConfig;
  controller?: ControllerConfig;
  erc1400Document?: ERC1400DocumentConfig;
  partition?: PartitionConfig;
}

// ============ DEPLOYMENT & RESULT TYPES ============

/**
 * Module Deployment Result
 */
export interface ModuleDeploymentResult {
  moduleType: string;
  moduleAddress: string; // NEW instance address
  masterAddress: string; // Template/master address
  deploymentTxHash: string;
  deploymentTimestamp: number;
  configuration: Record<string, any>;
  configurationTxHashes?: string[]; // Hashes of configuration transactions
  status: 'deployed' | 'configured' | 'failed';
  error?: string;
}

/**
 * Token Standard Type
 */
export type TokenStandard = 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400';

/**
 * Module Type Union
 */
export type ModuleType = 
  // Universal
  | 'compliance'
  | 'vesting'
  | 'document'
  | 'policyEngine'
  // ERC20
  | 'fees'
  | 'flashMint'
  | 'permit'
  | 'snapshot'
  | 'timelock'
  | 'votes'
  | 'payableToken'
  | 'temporaryApproval'
  // ERC721
  | 'royalty'
  | 'rental'
  | 'soulbound'
  | 'fractionalization'
  | 'consecutive'
  | 'metadataEvents'
  // ERC1155
  | 'supplyCap'
  | 'uriManagement'
  | 'granularApproval'
  // ERC3525
  | 'slotApprovable'
  | 'slotManager'
  | 'valueExchange'
  // ERC4626
  | 'feeStrategy'
  | 'withdrawalQueue'
  | 'yieldStrategy'
  | 'asyncVault'
  | 'nativeVault'
  | 'router'
  | 'multiAssetVault'
  // ERC1400
  | 'transferRestrictions'
  | 'controller'
  | 'erc1400Document'
  | 'partition';

/**
 * Module Configuration Props
 * Generic props interface for module config components
 */
export interface ModuleConfigProps<T> {
  config: T;
  onChange: (config: T) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

// ============ HELPER TYPES ============

/**
 * Module Enablement State
 * Tracks which modules are enabled for a token
 */
export interface ModuleEnablementState {
  [key: string]: {
    enabled: boolean;
    address?: string;
    configuration?: any;
  };
}

/**
 * Deployment Progress
 */
export interface DeploymentProgress {
  step: 'master' | 'extensions' | 'configuration' | 'complete';
  currentModule?: ModuleType;
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}
