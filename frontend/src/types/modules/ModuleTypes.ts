/**
 * Module Configuration Types
 * 
 * Comprehensive type definitions for all 52 extension modules
 * across 6 token standards (ERC20, ERC721, ERC1155, ERC3525, ERC4626, ERC1400)
 * 
 * Last Updated: Based on ERC721 Module Configuration Complete Implementation
 */

// ============ UNIVERSAL MODULE CONFIGURATIONS ============

/**
 * Compliance Module Configuration
 * Used across all token standards for KYC/AML compliance
 */
export interface ComplianceConfig {
  kycRequired?: boolean;
  whitelistRequired?: boolean;
  whitelistAddresses?: string;
  kycProvider?: string;
  restrictedCountries?: string[];
}

/**
 * Vesting Module Configuration
 * Used for token lockup and vesting schedules
 */
export interface VestingConfig {
  cliffPeriod?: number; // Cliff period in seconds
  totalPeriod?: number; // Total vesting period in seconds
  releaseFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  beneficiaries?: Array<{
    address: string;
    amount: string;
    startTime: number;
  }>;
}

/**
 * Document Module Configuration
 * For attaching legal documents and disclosures
 */
export interface DocumentConfig {
  documentHash?: string;
  documentUri?: string;
  documentType?: 'prospectus' | 'terms' | 'disclosure' | 'other';
  ipfsHash?: string;
}

/**
 * Policy Engine Configuration
 * For complex transaction validation rules
 */
export interface PolicyEngineConfig {
  rulesEnabled?: string[];
  validatorsEnabled?: string[];
  customRules?: Array<{
    ruleId: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
  }>;
}

// ============ ERC20 MODULE CONFIGURATIONS ============

/**
 * Fees Module Configuration (ERC20)
 */
export interface FeesConfig {
  transferFeeBps: number; // Transfer fee in basis points (100 = 1%)
  feeRecipient: string; // Address receiving fees
  exemptAddresses?: string[]; // Addresses exempt from fees
}

/**
 * Timelock Module Configuration (ERC20)
 */
export interface TimelockConfig {
  minDelay: number; // Minimum delay in seconds before actions can be executed
  gracePeriod?: number; // Optional grace period for executing queued actions
}

/**
 * Temporary Approval Module Configuration (ERC20)
 */
export interface TemporaryApprovalConfig {
  defaultDuration: number; // Default approval duration in seconds (default: 3600 = 1 hour)
  maxDuration?: number; // Maximum allowed duration
}

/**
 * Flash Mint Module Configuration (ERC20)
 * Note: No configuration needed, just enable/disable
 */
export interface FlashMintConfig {
  flashFee?: number; // Optional flash loan fee in basis points
}

// ============ ERC721 MODULE CONFIGURATIONS ============

/**
 * Royalty Module Configuration (ERC721/ERC1155)
 * EIP-2981 NFT Royalty Standard
 */
export interface RoyaltyConfig {
  defaultRoyaltyBps: number; // Royalty percentage in basis points (250 = 2.5%)
  royaltyRecipient: string; // Address receiving royalty payments
  perTokenRoyalties?: Array<{
    tokenId: string;
    royaltyBps: number;
    recipient: string;
  }>;
}

/**
 * Rental Module Configuration (ERC721)
 * For NFT lending/rental functionality
 */
export interface RentalConfig {
  maxRentalDuration: number; // Maximum rental period in seconds
  minRentalDuration?: number; // Minimum rental period in seconds
  minRentalPrice?: string; // Minimum rental price in wei
  rentalRecipient?: string; // Address receiving rental payments (defaults to owner)
  autoReturn?: boolean; // Automatically return NFT after rental period
}

/**
 * Fractionalization Module Configuration (ERC721)
 * For splitting NFTs into fractional ownership
 */
export interface FractionalizationConfig {
  minFractions: number; // Minimum number of fractional shares per NFT
  maxFractions?: number; // Maximum number of fractional shares
  fractionPrice?: string; // Price per fraction in wei
  buyoutMultiplier?: number; // Multiplier for buyout price (e.g., 1.5 = 150%)
}

/**
 * Soulbound Module Configuration (ERC721)
 * Note: Typically no configuration needed, just enable/disable
 */
export interface SoulboundConfig {
  transferable?: boolean; // Allow one-time transfer (e.g., for account recovery)
  burnableByOwner?: boolean; // Allow owner to burn soulbound token
}

/**
 * Consecutive Module Configuration (ERC721)
 * For gas-efficient batch minting with sequential IDs
 */
export interface ConsecutiveConfig {
  batchSize?: number; // Default batch size for consecutive minting
}

/**
 * Metadata Events Module Configuration (ERC721)
 * For emitting events when metadata changes
 */
export interface MetadataEventsConfig {
  emitBatchUpdates?: boolean; // Emit events for batch metadata updates
}

// ============ ERC1155 MODULE CONFIGURATIONS ============

/**
 * Supply Cap Module Configuration (ERC1155)
 */
export interface SupplyCapConfig {
  defaultCap: number; // Default supply cap for new token IDs (0 = unlimited)
  perTokenCaps?: Array<{
    tokenId: string;
    cap: number;
  }>;
}

/**
 * URI Management Module Configuration (ERC1155)
 */
export interface UriManagementConfig {
  baseURI: string; // Base URI for metadata
  useTokenIdSubstitution?: boolean; // Replace {id} in URI with token ID
  perTokenUris?: Array<{
    tokenId: string;
    uri: string;
  }>;
}

// ============ ERC3525 MODULE CONFIGURATIONS ============

/**
 * Slot Approvable Module Configuration (ERC3525)
 * Note: Typically no configuration needed
 */
export interface SlotApprovableConfig {
  approvalMode?: 'slot' | 'token' | 'both';
}

/**
 * Slot Manager Module Configuration (ERC3525)
 */
export interface SlotManagerConfig {
  slotRules?: Array<{
    slotId: number;
    restrictions: Record<string, any>;
  }>;
  defaultSlotMetadata?: string;
}

/**
 * Value Exchange Module Configuration (ERC3525)
 */
export interface ValueExchangeConfig {
  exchangeFeeBps: number; // Fee for value exchanges in basis points
  feeRecipient?: string; // Address receiving exchange fees
  allowCrossSlotExchange?: boolean; // Allow exchanges between different slots
}

// ============ ERC4626 MODULE CONFIGURATIONS ============

/**
 * Fee Strategy Module Configuration (ERC4626)
 */
export interface FeeStrategyConfig {
  managementFeeBps: number; // Annual management fee in basis points (100 = 1%)
  performanceFeeBps: number; // Performance fee in basis points (1000 = 10%)
  feeRecipient?: string; // Address receiving fees
  managementFeeFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}

/**
 * Withdrawal Queue Module Configuration (ERC4626)
 */
export interface WithdrawalQueueConfig {
  maxQueueSize: number; // Maximum number of pending withdrawals
  processingDelay?: number; // Delay before processing withdrawals (seconds)
  priorityFee?: number; // Optional fee for priority processing (basis points)
}

/**
 * Yield Strategy Module Configuration (ERC4626)
 */
export interface YieldStrategyConfig {
  harvestFrequency: number; // How often yields are harvested (in seconds, default 86400 = 24h)
  rebalanceThreshold: number; // Threshold to trigger rebalancing (in basis points, default 100 = 1%)
  strategies?: Array<{
    strategyAddress: string;
    allocationBps: number;
  }>;
}

/**
 * Async Vault Module Configuration (ERC4626)
 */
export interface AsyncVaultConfig {
  minimumFulfillmentDelay: number; // Minimum time between request and fulfillment (in seconds, default 86400 = 1 day)
  maxPendingRequestsPerUser: number; // Maximum pending requests per user (default 10)
  requestExpiry?: number; // Request expiration period in seconds
  partialFulfillment?: boolean; // Allow partial fulfillment of requests
}

/**
 * Native Vault Module Configuration (ERC4626)
 * For ETH/native token vaults
 */
export interface NativeVaultConfig {
  wrapNative?: boolean; // Automatically wrap native token to ERC20
  wrappedTokenAddress?: string; // Address of wrapped token (e.g., WETH)
}

/**
 * Router Module Configuration (ERC4626)
 */
export interface RouterConfig {
  allowedVaults?: string[]; // List of allowed vault addresses
  slippageTolerance?: number; // Maximum slippage tolerance in basis points
}

/**
 * Multi-Asset Vault Module Configuration (ERC4626)
 */
export interface MultiAssetVaultConfig {
  priceOracle: string; // Address of price oracle contract
  baseAsset: string; // Address of base asset for valuation
  assets?: Array<{
    assetAddress: string;
    weight: number; // Weight in basis points (total must equal 10000)
  }>;
  rebalanceThreshold?: number; // Threshold for triggering rebalance (basis points)
}

// ============ ERC1400 MODULE CONFIGURATIONS ============

/**
 * Transfer Restrictions Module Configuration (ERC1400)
 */
export interface TransferRestrictionsConfig {
  partitionRestrictions?: Array<{
    partition: string;
    restrictions: {
      lockupPeriod?: number;
      maxHoldersPerPartition?: number;
      transferWindows?: Array<{
        start: number;
        end: number;
      }>;
    };
  }>;
}

/**
 * Controller Module Configuration (ERC1400)
 */
export interface ControllerConfig {
  controllable: boolean; // Enable controller functions (default true)
  controllerOperations?: string[]; // List of allowed controller operations
}

/**
 * ERC1400 Document Module Configuration (ERC1400)
 */
export interface ERC1400DocumentConfig {
  documentHash?: string;
  documentUri?: string;
  partitionDocuments?: Array<{
    partition: string;
    documentHash: string;
    documentUri: string;
  }>;
}

// ============ MODULE DEPLOYMENT RESULT ============

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
  status: 'deployed' | 'failed';
  error?: string;
}

/**
 * Token Standard Type
 */
export type TokenStandard = 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400';
