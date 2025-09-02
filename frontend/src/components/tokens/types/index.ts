/**
 * Tokenization Platform - Core Type Definitions
 * 
 * This file contains shared types for token components across the platform,
 * including configuration interfaces for all supported ERC standards.
 * 
 * These types are aligned with the enhanced database schema that uses dedicated tables
 * for each token standard's specific properties.
 */

import { 
  TokenStandard,
  TokenERC20Properties,
  TokenERC721Properties,
  TokenERC721Attribute,
  TokenERC1155Properties,
  TokenERC1155Type,
  TokenERC1155Balance,
  TokenERC1155UriMapping,
  TokenERC1400Properties,
  TokenERC1400Partition,
  TokenERC1400Controller,
  TokenERC1400Document,
  TokenERC3525Properties,
  TokenERC3525Slot,
  TokenERC3525Allocation,
  TokenERC4626Properties,
  TokenERC4626StrategyParam,
  TokenERC4626AssetAllocation,
  TokenERC4626VaultStrategy,
  TokenERC4626FeeTier,
  TokenERC4626PerformanceMetric
} from "@/types/core/centralModels";

// Re-export the imported types and enums so they can be used by other components
// TokenStandard is exported as a regular export since it's used as a runtime value
export { TokenStandard };

export type {
  TokenERC20Properties,
  TokenERC721Properties,
  TokenERC721Attribute,
  TokenERC1155Properties,
  TokenERC1155Type,
  TokenERC1155Balance,
  TokenERC1155UriMapping,
  TokenERC1400Properties,
  TokenERC1400Partition,
  TokenERC1400Controller,
  TokenERC1400Document,
  TokenERC3525Properties,
  TokenERC3525Slot,
  TokenERC3525Allocation,
  TokenERC4626Properties,
  TokenERC4626StrategyParam,
  TokenERC4626AssetAllocation,
  TokenERC4626VaultStrategy,
  TokenERC4626FeeTier,
  TokenERC4626PerformanceMetric
};

/**
 * Enhanced token data interface that contains all standard-specific properties
 */
export interface EnhancedTokenData {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  standard: TokenStandard;
  status: string;
  blocks?: Record<string, any>;
  metadata?: Record<string, any>;
  projectId?: string;
  reviewers?: string[];
  approvals?: string[];
  contractPreview?: string;
  totalSupply?: string;
  configMode?: string;
  configurationLevel?: 'basic' | 'advanced' | 'min' | 'max';
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Standard-specific properties - these align with the database tables
  erc20Properties?: TokenERC20Properties;
  erc721Properties?: TokenERC721Properties;
  erc721Attributes?: TokenERC721Attribute[];
  erc1155Properties?: TokenERC1155Properties;
  erc1155Types?: TokenERC1155Type[];
  erc1155Balances?: TokenERC1155Balance[];
  erc1155UriMappings?: TokenERC1155UriMapping[];
  erc1400Properties?: TokenERC1400Properties;
  erc1400Partitions?: TokenERC1400Partition[] | EnhancedPartition[];
  erc1400Controllers?: TokenERC1400Controller[];
  erc1400Documents?: TokenERC1400Document[];
  erc3525Properties?: TokenERC3525Properties;
  erc3525Slots?: TokenERC3525Slot[];
  erc3525Allocations?: TokenERC3525Allocation[];
  erc4626Properties?: TokenERC4626Properties;
  erc4626StrategyParams?: TokenERC4626StrategyParam[];
  erc4626AssetAllocations?: TokenERC4626AssetAllocation[];
  erc4626VaultStrategies?: TokenERC4626VaultStrategy[];
  erc4626FeeTiers?: TokenERC4626FeeTier[];
  erc4626PerformanceMetrics?: TokenERC4626PerformanceMetric[];
}

// Base token form data interface
export interface TokenFormData {
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  standard: TokenStandard;
  blocks?: Record<string, any>;
  standardProperties?: Record<string, any>; // For direct standard-specific properties
  standardArrays?: Record<string, any[]>;   // For direct array data like tokenAttributes, slots, etc.
  
  // Token specific properties matching the new schema
  erc20Properties?: Partial<TokenERC20Properties>;
  erc721Properties?: Partial<TokenERC721Properties>;
  erc721Attributes?: Partial<TokenERC721Attribute>[];
  erc1155Properties?: Partial<TokenERC1155Properties>;
  erc1155Types?: Partial<TokenERC1155Type>[];
  erc1155Balances?: Partial<TokenERC1155Balance>[];
  erc1155UriMappings?: Partial<TokenERC1155UriMapping>[];
  erc1400Properties?: Partial<TokenERC1400Properties>;
  erc1400Partitions?: Partial<TokenERC1400Partition>[];
  erc1400Controllers?: Partial<TokenERC1400Controller>[];
  erc1400Documents?: Partial<TokenERC1400Document>[];
  erc3525Properties?: Partial<TokenERC3525Properties>;
  erc3525Slots?: Partial<TokenERC3525Slot>[];
  erc3525Allocations?: Partial<TokenERC3525Allocation>[];
  erc4626Properties?: Partial<TokenERC4626Properties>;
  erc4626StrategyParams?: Partial<TokenERC4626StrategyParam>[];
  erc4626AssetAllocations?: Partial<TokenERC4626AssetAllocation>[];
  
  // Common fields across standards (camelCase) - these are for backward compatibility
  initialSupply?: string;
  cap?: string;
  isMintable?: boolean;
  isBurnable?: boolean;
  isPausable?: boolean;
  baseUri?: string;
  metadataStorage?: string;
  hasRoyalty?: boolean;
  royaltyPercentage?: string;
  royaltyReceiver?: string;
  accessControl?: string;
  
  // ERC-20 specific fields
  tokenType?: string;
  allowanceManagement?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  feeOnTransfer?: any;
  rebasing?: any;
  governanceFeatures?: any;
  
  // ERC-721 specific fields
  maxSupply?: string;
  assetType?: string;
  mintingMethod?: string;
  autoIncrementIds?: boolean;
  enumerable?: boolean;
  uriStorage?: string;
  updatableUris?: boolean;
  tokenAttributes?: any[];
  
  // ERC-1155 specific fields
  supplyTracking?: boolean;
  enableApprovalForAll?: boolean;
  tokenTypes?: any[];
  uriMappings?: any[];
  initialBalances?: any[];
  
  // ERC-1400 specific fields
  documentUri?: string;
  documentHash?: string;
  controllerAddress?: string;
  enforceKYC?: boolean;
  securityType?: string;
  issuingJurisdiction?: string;
  issuingEntityName?: string;
  issuingEntityLei?: string;
  transferRestrictions?: any;
  forcedTransfersEnabled?: boolean;
  isIssuable?: boolean;
  partitions?: any[];
  controllers?: any[];
  documentNames?: string[];
  documentUris?: string[];
  documentTypes?: string[];
  documentHashes?: string[];
  
  // ERC-3525 specific fields
  valueDecimals?: number;
  slotType?: string;
  slotApprovals?: boolean;
  valueApprovals?: boolean;
  updatableSlots?: boolean;
  valueTransfersEnabled?: boolean;
  mergable?: boolean;
  splittable?: boolean;
  slots?: any[];
  allocations?: any[];
  
  // ERC-4626 specific fields
  assetAddress?: string;
  assetName?: string;
  assetSymbol?: string;
  assetDecimals?: number;
  vaultType?: string;
  vaultStrategy?: string;
  customStrategy?: boolean;
  strategyController?: string;
  flashLoans?: boolean;
  emergencyShutdown?: boolean;
  fee?: any;
  feeStructure?: any;
  rebalancingRules?: any;
  performanceMetrics?: boolean;
  yieldStrategy?: any;
  assetAllocation?: any[];
  
  [key: string]: any; // Allow for additional fields
}

// Configuration categories for financial product types
export enum FinancialProductCategory {
  // Traditional Assets
  STRUCTURED_PRODUCT = "structured_product",
  EQUITY = "equity",
  COMMODITY = "commodity",
  FUND = "fund",
  BOND = "bond",
  QUANT_STRATEGY = "quant_strategy",
  
  // Alternative Assets
  PRIVATE_EQUITY = "private_equity",
  PRIVATE_DEBT = "private_debt",
  REAL_ESTATE = "real_estate",
  ENERGY = "energy",
  INFRASTRUCTURE = "infrastructure",
  COLLECTIBLE = "collectible",
  ASSET_BACKED = "asset_backed",
  RENEWABLE_ENERGY = "renewable_energy",
  CARBON_CREDIT = "carbon_credit",
  
  // Digital Assets
  DIGITAL_FUND = "digital_fund"
}

// Blockchain networks supported for deployment
export enum BlockchainNetwork {
  ETHEREUM = "ethereum",
  POLYGON = "polygon",
  OPTIMISM = "optimism",
  ARBITRUM = "arbitrum",
  BASE = "base",
  AVALANCHE = "avalanche",
  XRP = "xrp",
  APTOS = "aptos",
  SUI = "sui",
  NEAR = "near"
}

// Network environments
export enum NetworkEnvironment {
  MAINNET = "mainnet",
  TESTNET = "testnet"
}

// Base configuration interface for all standards
export interface BaseTokenConfig {
  name: string;
  symbol: string;
  description?: string;
  productCategory?: FinancialProductCategory;
}

// Base component props for configuration forms
export interface BaseConfigProps {
  tokenForm: TokenFormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setTokenForm: React.Dispatch<React.SetStateAction<TokenFormData>>;
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

//------------------------------------------------------------------------------
// ERC-20 (Fungible Token) Configuration Types
//------------------------------------------------------------------------------

export interface ERC20Config extends BaseTokenConfig {
  decimals: number;
  initialSupply: string;
  isMintable: boolean;
  isBurnable: boolean;
  isPausable: boolean;
  cap?: string;
  tokenType?: "currency" | "utility" | "share" | "commodity" | "security" | "governance" | "stablecoin" | "asset_backed" | "debt";
  accessControl?: "ownable" | "roles" | "none";
  allowanceManagement?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  feeOnTransfer?: {
    enabled: boolean;
    fee: string;
    recipient: string;
    feeType?: "flat" | "percentage";
  };
  rebasing?: {
    enabled: boolean;
    mode: "automatic" | "governance";
    targetSupply: string;
  };
  governanceFeatures?: {
    enabled: boolean;
    votingPeriod?: number;
    votingThreshold?: string;
  };
}

export interface ERC20SimpleConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC20Config>;
}

export interface ERC20DetailedConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC20Config>;
}

//------------------------------------------------------------------------------
// ERC-721 (Non-Fungible Token) Configuration Types
//------------------------------------------------------------------------------

export interface ERC721Config extends BaseTokenConfig {
  baseUri: string;
  metadataStorage: "ipfs" | "arweave" | "centralized";
  maxSupply?: string;
  hasRoyalty: boolean;
  royaltyPercentage?: string;
  royaltyReceiver?: string;
  // Critical missing field from Phase 1 analysis - now added in Phase 2
  isMintable?: boolean;
  isBurnable?: boolean;
  isPausable?: boolean;
  assetType?: "unique_asset" | "real_estate" | "ip_rights" | "financial_instrument";
  mintingMethod?: "open" | "whitelist" | "auction" | "lazy";
  provenanceTracking?: boolean;
  tokenAttributes?: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "date";
    required?: boolean;
  }>;
}

export interface ERC721SimpleConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC721Config>;
}

export interface ERC721DetailedConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC721Config>;
}

//------------------------------------------------------------------------------
// ERC-1155 (Multi-Token Standard) Configuration Types - ENHANCED WITH ALL DATABASE FIELDS
//------------------------------------------------------------------------------

// Enhanced token type interface with ALL database fields from token_erc1155_type_configs
export interface ERC1155TokenType {
  id: string;
  name: string;
  description?: string;
  supply: string;
  fungible: boolean;
  maxSupply?: string;
  metadataUri?: string;
  fungibilityType?: "fungible" | "non-fungible" | "semi-fungible";
  metadata?: Record<string, any>;
  
  // Enhanced type configuration fields (token_erc1155_type_configs)
  supplyCap?: string;
  mintPrice?: string;
  isTradeable?: boolean;
  isTransferable?: boolean;
  utilityType?: "weapon" | "armor" | "consumable" | "currency" | "collectible" | "access_pass" | "membership" | string;
  rarityTier?: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  rarityLevel?: string; // Added this missing property
  experienceValue?: number;
  craftingMaterials?: Record<string, any>;
  burnRewards?: Record<string, any>;
}

// Crafting recipe interface (token_erc1155_crafting_recipes)
export interface ERC1155CraftingRecipe {
  id: string;
  recipeName: string;
  inputTokens: Record<string, any>;
  outputTokenTypeId: string;
  outputQuantity?: number;
  successRate?: number;
  cooldownPeriod?: number;
  requiredLevel?: number;
  isActive?: boolean;
}

// Discount tier interface (token_erc1155_discount_tiers)
export interface ERC1155DiscountTier {
  id: string;
  minQuantity: number;
  maxQuantity?: number;
  discountPercentage: string;
  tierName?: string;
  isActive?: boolean;
}

// URI mapping interface (token_erc1155_uri_mappings)
export interface ERC1155UriMapping {
  id: string;
  tokenTypeId: string;
  uri: string;
}

// COMPLETE ERC1155 Configuration with ALL 127 database fields
export interface ERC1155Config extends BaseTokenConfig {
  // Core Collection Details
  baseUri: string;
  metadataStorage: "ipfs" | "arweave" | "centralized" | "onchain";
  
  // Enhanced Token Types (now includes ALL token_erc1155_types + token_erc1155_type_configs fields)
  tokenTypes: ERC1155TokenType[];
  
  // NEW: Crafting Recipe System (token_erc1155_crafting_recipes - 12 fields)
  craftingRecipes?: ERC1155CraftingRecipe[];
  
  // NEW: Discount Tier System (token_erc1155_discount_tiers - 9 fields) 
  discountTiers?: ERC1155DiscountTier[];
  
  // NEW: URI Mapping System (token_erc1155_uri_mappings - 6 fields)
  uriMappings?: ERC1155UriMapping[];
  
  // Access Control (database fields: access_control)
  accessControl?: "ownable" | "roles" | "none";
  
  // Supply Management (database fields: supply_tracking, supply_tracking_advanced, max_supply_per_type)
  supplyTracking?: boolean;
  supplyTrackingAdvanced?: boolean;
  maxSupplyPerType?: string;
  
  // Core ERC1155 Features (database fields: is_burnable, is_pausable, enable_approval_for_all)
  isBurnable?: boolean;
  burningEnabled?: boolean;
  burnRoles?: string[];
  isPausable?: boolean;
  enableApprovalForAll?: boolean;
  
  // Batch Operations (database fields: batch_minting_enabled, batch_minting_config, batch_transfer_limits)
  batchMintingEnabled?: boolean;
  batchMintingConfig?: Record<string, any>;
  batchTransferLimits?: Record<string, any>;
  
  // Royalty Standard EIP-2981 (database fields: has_royalty, royalty_percentage, royalty_receiver)
  hasRoyalty: boolean;
  royaltyPercentage?: string;
  royaltyReceiver?: string;
  
  // Container Support (database fields: container_enabled, container_config)
  containerEnabled?: boolean;
  containerConfig?: Record<string, any>;
  
  // Sales and Pricing (database fields: sales_config, pricing_model, base_price, price_multipliers)
  salesConfig?: Record<string, any>;
  pricingModel?: "fixed" | "dynamic" | "auction" | "bonding_curve" | "oracle";
  basePrice?: string;
  priceMultipliers?: Record<string, any>;
  
  // Bulk Discount System (database fields: bulk_discount_enabled, bulk_discount_tiers)
  bulkDiscountEnabled?: boolean;
  bulkDiscountTiers?: Record<string, any>;
  
  // Referral System (database fields: referral_rewards_enabled, referral_percentage)
  referralRewardsEnabled?: boolean;
  referralPercentage?: string;
  
  // Lazy Minting (database field: lazy_minting_enabled)
  lazyMintingEnabled?: boolean;
  
  // Airdrop Features (database fields: airdrop_enabled, airdrop_snapshot_block)
  airdropEnabled?: boolean;
  airdropSnapshotBlock?: number;
  
  // Claim Mechanics (database fields: claim_period_enabled, claim_start_time, claim_end_time)
  claimPeriodEnabled?: boolean;
  claimStartTime?: string;
  claimEndTime?: string;
  
  // Gaming Features (database fields: crafting_enabled, fusion_enabled, token_recipes)
  craftingEnabled?: boolean;
  fusionEnabled?: boolean;
  tokenRecipes?: Record<string, any>;
  
  // Experience and Leveling (database fields: experience_points_enabled, leveling_enabled, consumable_tokens)
  experiencePointsEnabled?: boolean;
  levelingEnabled?: boolean;
  consumableTokens?: boolean;
  
  // Marketplace Integration (database fields: marketplace_fees_enabled, marketplace_fee_percentage, marketplace_fee_recipient)
  marketplaceFeesEnabled?: boolean;
  marketplaceFeePercentage?: string;
  marketplaceFeeRecipient?: string;
  
  // Advanced Trading (database fields: bundle_trading_enabled, atomic_swaps_enabled, cross_collection_trading)
  bundleTradingEnabled?: boolean;
  atomicSwapsEnabled?: boolean;
  crossCollectionTrading?: boolean;
  
  // Governance Features (database fields: voting_power_enabled, voting_weight_per_token, community_treasury_enabled, treasury_percentage, proposal_creation_threshold)
  votingPowerEnabled?: boolean;
  votingWeightPerToken?: Record<string, any>;
  communityTreasuryEnabled?: boolean;
  treasuryPercentage?: string;
  proposalCreationThreshold?: string;
  
  // Cross-chain Support (database fields: bridge_enabled, bridgeable_token_types, wrapped_versions, layer2_support_enabled, supported_layer2_networks)
  bridgeEnabled?: boolean;
  bridgeableTokenTypes?: string[];
  wrappedVersions?: Record<string, any>;
  layer2SupportEnabled?: boolean;
  supportedLayer2Networks?: string[];
  
  // Geographic Restrictions (database fields: use_geographic_restrictions, default_restriction_policy)
  useGeographicRestrictions?: boolean;
  defaultRestrictionPolicy?: "allow" | "deny" | "kyc_required";
  
  // Compliance and Restrictions (database fields: transfer_restrictions, whitelist_config)
  transferRestrictions?: Record<string, any>;
  whitelistConfig?: Record<string, any>;
  
  // Role Management (database fields: mint_roles)
  mintRoles?: string[];
  
  // Metadata Management (database fields: dynamic_uri_config, updatable_metadata, metadata_update_roles)
  dynamicUris?: boolean;
  dynamicUriConfig?: Record<string, any>;
  updatableUris?: boolean;
  updatableMetadata?: boolean;
  metadataUpdateRoles?: string[];
  
  // Legacy fields for backward compatibility
  productCategory?: undefined;
  erc1155Category?: "gaming" | "bundle" | "semi_fungible" | "multi_class";
  bundleSupport?: boolean;
  batchMinting?: boolean; // Legacy alias for batchMintingEnabled
}

export interface ERC1155SimpleConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC1155Config>;
}

export interface ERC1155DetailedConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC1155Config>;
}

//------------------------------------------------------------------------------
// ERC-1400 (Security Token) Configuration Types
//------------------------------------------------------------------------------

export interface ERC1400Config extends BaseTokenConfig {
  decimals: number;
  initialSupply: string;
  cap?: string;
  tokenDetails?: string;
  
  // Issuing Entity Information
  issuingJurisdiction?: string;
  issuingEntityName?: string;
  issuingEntityLei?: string;
  regulationType?: "reg-d" | "reg-a-plus" | "reg-s" | "reg-cf" | "public" | "other";
  
  // Partitions
  partitions?: Array<{
    name: string;
    amount: string;
    transferable?: boolean;
    partitionType?: "equity" | "debt" | "preferred" | "common";
  }>;
  controllers: string[];
  isIssuable: boolean;
  isMultiClass: boolean;
  transferRestrictions: boolean;
  trancheTransferability?: boolean;
  
  // KYC and Compliance
  enforceKYC?: boolean;
  forcedTransfersEnabled?: boolean;
  forcedRedemptionEnabled?: boolean;
  autoCompliance?: boolean;
  manualApprovals?: boolean;
  complianceModule?: string;
  complianceAutomationLevel?: "manual" | "semi-automated" | "fully-automated";
  
  // Transfer Restrictions
  whitelistEnabled?: boolean;
  geographicRestrictions?: string[];
  investorAccreditation?: boolean;
  holdingPeriod?: string;
  maxInvestorCount?: string;
  
  // Documents
  legalTerms?: string;
  prospectus?: string;
  documents?: Array<{
    name: string;
    uri: string;
    hash?: string;
    documentType?: string;
  }>;
  
  // Advanced Features
  isPausable?: boolean;
  granularControl?: boolean;
  dividendDistribution?: boolean;
  corporateActions?: boolean;
  customFeatures?: string;
  
  dividendPolicy?: {
    frequency?: "monthly" | "quarterly" | "annual";
    distributionMethod?: "automatic" | "manual";
  };
}

export interface ERC1400SimpleConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC1400Config>;
}

export interface ERC1400DetailedConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC1400Config>;
}

//------------------------------------------------------------------------------
// ERC-3525 (Semi-Fungible Token) Configuration Types
//------------------------------------------------------------------------------

export interface ERC3525Config extends BaseTokenConfig {
  decimals: number;
  baseUri: string;
  metadataStorage: "ipfs" | "arweave" | "centralized";
  slots: Array<{
    id: string;
    name: string;
    description?: string;
    valueUnits?: string;
  }>;
  financialInstrument?: "derivative" | "structured_product" | "fractional_ownership" | "multi_class_share";
  derivativeTerms?: {
    expiryDate?: string;
    strikePrice?: string;
    underlyingAsset?: string;
  };
}

export interface ERC3525SimpleConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC3525Config>;
}

export interface ERC3525DetailedConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC3525Config>;
}

//------------------------------------------------------------------------------
// ERC-4626 (Tokenized Vault) Configuration Types
//------------------------------------------------------------------------------

export interface ERC4626Config {
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  assetAddress: string;
  assetName: string;
  assetSymbol: string;
  assetDecimals: number;
  vaultType: 'yield' | 'fund' | 'staking' | 'lending';
  isMintable?: boolean;
  isBurnable?: boolean;
  isPausable?: boolean;
  pausable: boolean;
  vaultStrategy?: string;
  customStrategy?: boolean;
  strategyController?: string;
  accessControl?: 'ownable' | 'roles' | 'none';
  permit?: boolean;
  flashLoans?: boolean;
  emergencyShutdown?: boolean;
  performanceMetrics?: boolean;
  rebalancingFrequency?: 'daily' | 'weekly' | 'monthly';
  fee: {
    enabled: boolean;
    managementFee?: string;
    performanceFee?: string;
    depositFee?: string;
    withdrawalFee?: string;
    feeRecipient?: string;
  };
  // Other optional properties
  [key: string]: any;
}

export interface ERC4626SimpleConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC4626Config>;
}

export interface ERC4626DetailedConfigProps extends BaseConfigProps {
  initialConfig?: Partial<ERC4626Config>;
}

//------------------------------------------------------------------------------
// Token Operations Types
//------------------------------------------------------------------------------

export enum TokenOperationType {
  MINT = "mint",
  BURN = "burn",
  PAUSE = "pause",
  UNPAUSE = "unpause",
  LOCK = "lock",
  UNLOCK = "unlock",
  BLOCK = "block",
  UNBLOCK = "unblock",
  TRANSFER = "transfer",
  APPROVE = "approve"
}

export interface TokenOperationParams {
  tokenId: string;
  operationType: TokenOperationType;
  recipient?: string;
  amount?: string;
  sender?: string;
  targetAddress?: string;
  nftTokenId?: string;
  tokenTypeId?: string;
  slotId?: string;
  value?: string;
  partition?: string;
  assetTokenAddress?: string;
  lockDuration?: number;
  lockReason?: string;
  unlockTime?: string;
  lockId?: string;
}

//------------------------------------------------------------------------------
// Token Template Types
//------------------------------------------------------------------------------

export interface TokenTemplateConfig {
  name: string;
  description?: string;
  standard: TokenStandard; 
  blocks: {
    tokens: Array<{
      standard: TokenStandard;
      config: Record<string, any>;
    }>;
    relationships: Record<string, Record<string, string>>;
  };
  metadata?: Record<string, any>;
}

//------------------------------------------------------------------------------
// Deployment Types
//------------------------------------------------------------------------------

export interface TokenDeploymentConfig {
  tokenId: string;
  network: BlockchainNetwork;
  environment: NetworkEnvironment;
  deployer?: string;
}

export interface TokenDeploymentResult {
  tokenId: string;
  network: BlockchainNetwork;
  environment: NetworkEnvironment;
  contractAddress: string;
  transactionHash: string;
  deployedBy: string;
  deployedAt: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  errorMessage?: string;
}

// Partition and token interfaces
export interface PartitionBalance {
  id: string;
  tokenId: string;
  partitionId: string;
  holderAddress: string;
  balance: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PartitionSupply {
  partitionId: string;
  totalSupply: string;
  circulatingSupply: string;
  frozenSupply?: string;
  updatedAt: string;
}

export interface PartitionTransferEvent {
  id: string;
  tokenId: string;
  partitionId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
  operator?: string;
  data?: string;
}

// Enhanced partition with additional metadata
export interface EnhancedPartition extends TokenERC1400Partition {
  // Additional partition metadata fields
  transferRestrictions?: {
    lockupPeriod?: string; // ISO date or duration
    transferAllowed?: boolean;
    minimumHoldingPeriod?: string; // Duration (e.g., "30d", "6m", "1y")
    jurisdictionRestrictions?: string[]; // Country codes
  };
  votingRights?: {
    hasVotingRights: boolean;
    votingPower?: number; // Multiplier of voting power (e.g., 1 for common, 2 for preferred)
    votingMechanism?: string; // "token-weighted", "quadratic", etc.
  };
  dividendRights?: {
    eligible: boolean;
    priority?: number; // Priority level for receiving dividends
    multiplier?: number; // Dividend multiplier compared to base
  };
  governanceProperties?: {
    proposalThreshold?: string; // Min tokens to submit proposal
    quorumRequirement?: string; // Min tokens needed for valid vote
  };
  // Lifecycle management
  isActive: boolean;
  canBeMerged: boolean;
  canBeSplit: boolean;
  // Compliance fields
  requiredDocuments?: string[];
  accreditationRequired?: boolean;
  // Tracking metrics
  totalHolders?: number;
  averageHoldingSize?: string;
  largestHolder?: { address: string; balance: string };
  // Supply tracking
  supply?: PartitionSupply;
  // Balances for specific addresses - sample for UI
  balances?: PartitionBalance[];
  // Most recent transfers - sample for UI
  recentTransfers?: PartitionTransferEvent[];
}

//------------------------------------------------------------------------------
// Enhanced Service Types
//------------------------------------------------------------------------------

/**
 * Service result type used across all enhanced services
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Creation result types for each standard
 */
export interface ERC20CreationResult {
  token: EnhancedTokenData;
  properties: TokenERC20Properties;
  standardInsertionResults?: Record<string, any>;
}

export interface ERC721CreationResult {
  token: EnhancedTokenData;
  properties: TokenERC721Properties;
  standardInsertionResults?: Record<string, any>;
}

export interface ERC1155CreationResult {
  token: EnhancedTokenData;
  properties: TokenERC1155Properties;
  standardInsertionResults?: Record<string, any>;
}

export interface ERC1400CreationResult {
  token: EnhancedTokenData;
  properties: TokenERC1400Properties;
  standardInsertionResults?: Record<string, any>;
}

export interface ERC3525CreationResult {
  token: EnhancedTokenData;
  properties: TokenERC3525Properties;
  standardInsertionResults?: Record<string, any>;
}

export interface ERC4626CreationResult {
  token: EnhancedTokenData;
  properties: TokenERC4626Properties;
  standardInsertionResults?: Record<string, any>;
}

/**
 * Token with properties interfaces for each standard
 */
export interface ERC20TokenWithProperties extends EnhancedTokenData {
  properties?: TokenERC20Properties;
}

export interface ERC721TokenWithProperties extends EnhancedTokenData {
  properties?: TokenERC721Properties;
}

export interface ERC1155TokenWithProperties extends EnhancedTokenData {
  properties?: TokenERC1155Properties;
}

export interface ERC1400TokenWithProperties extends EnhancedTokenData {
  properties?: TokenERC1400Properties;
}

export interface ERC3525TokenWithProperties extends EnhancedTokenData {
  properties?: TokenERC3525Properties;
}

export interface ERC4626TokenWithProperties extends EnhancedTokenData {
  properties?: TokenERC4626Properties;
}

//------------------------------------------------------------------------------
// Statistics Types for Enhanced Services
//------------------------------------------------------------------------------

export interface BaseTokenStatistics {
  total: number;
  configModeDistribution: Record<string, number>;
}

export interface ERC20Statistics extends BaseTokenStatistics {
  withGovernance: number;
  withFees: number;
  withVesting: number;
  withStaking: number;
  tokenTypes: Record<string, number>;
}

export interface ERC721Statistics extends BaseTokenStatistics {
  withRoyalties: number;
  withMetadata: number;
  assetTypes: Record<string, number>;
  mintingMethods: Record<string, number>;
}

export interface ERC1155Statistics extends BaseTokenStatistics {
  withBatchMinting: number;
  withRoyalties: number;
  tokenTypeDistribution: Record<string, number>;
  categories: Record<string, number>;
}

export interface ERC1400Statistics extends BaseTokenStatistics {
  bySecurityType: Record<string, number>;
  byRegulationType: Record<string, number>;
  withKyc: number;
  withWhitelist: number;
  withGeographicRestrictions: number;
  institutionalGrade: number;
}

export interface ERC3525Statistics extends BaseTokenStatistics {
  financialInstrumentTypes: Record<string, number>;
  withDerivativeTerms: number;
  slotDistribution: Record<string, number>;
}

export interface ERC4626Statistics extends BaseTokenStatistics {
  vaultTypes: Record<string, number>;
  withCustomStrategy: number;
  withFlashLoans: number;
  withPerformanceMetrics: number;
  assetDistribution: Record<string, number>;
}

//------------------------------------------------------------------------------
// Batch Operation Types
//------------------------------------------------------------------------------

export interface BatchOperationResult<T> {
  successful: T[];
  failed: Array<{ index: number; error: string; data: any }>;
  summary: { total: number; success: number; failed: number };
}

export interface BatchCreationData<T> {
  token: any;
  properties: T;
}

//------------------------------------------------------------------------------
// Compliance Types (ERC1400 Specific)
//------------------------------------------------------------------------------

export interface ComplianceStatus {
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
  lastChecked: string;
}

export interface ComplianceSettings {
  complianceAutomationLevel?: string;
  complianceSettings?: any;
  kycSettings?: any;
  geographicRestrictions?: any;
}

//------------------------------------------------------------------------------
// Validation Types Integration
//------------------------------------------------------------------------------

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  data?: any;
}

export interface ValidationContext {
  standard: TokenStandard;
  configMode: 'min' | 'max';
  operation: 'create' | 'update';
  existingData?: any;
  projectId?: string;
}

//------------------------------------------------------------------------------
// Audit Types
//------------------------------------------------------------------------------

export interface AuditOperation {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  tokenId: string;
  oldData?: any;
  newData?: any;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

//------------------------------------------------------------------------------
// Enhanced Configuration Types
//------------------------------------------------------------------------------

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TokenConfigurationOptions {
  standard: TokenStandard;
  configMode: 'min' | 'max';
  skipOptionalFields?: boolean;
  allowUnknownFields?: boolean;
  transformData?: boolean;
}

//------------------------------------------------------------------------------
// Service Utility Types
//------------------------------------------------------------------------------

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  standard?: string;
  status?: string;
  projectId?: string;
  search?: string;
}

export interface ListResult<T> {
  tokens: T[];
  total: number;
  page: number;
  limit: number;
}

//------------------------------------------------------------------------------
// Enhanced Service Method Types
//------------------------------------------------------------------------------

export interface CloneTokenOptions {
  sourceTokenId: string;
  newTokenData: Partial<any>;
  userId?: string;
}

export interface SearchOptions extends FilterOptions {
  searchTerm: string;
  limit?: number;
}

// Type aliases for compatibility with existing code
export type ExtendedTokenERC4626Properties = TokenERC4626Properties;
export type ExtendedERC4626Properties = TokenERC4626Properties;
export type EnhancedERC4626Properties = TokenERC4626Properties;