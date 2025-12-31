/**
 * Type definitions for contract configuration components
 * 
 * MIGRATION COMPLETE: Now imports comprehensive types from @/types/modules
 * Master contract types remain here as they're deployment-specific
 */

// Import comprehensive module types
import type {
  // Shared types
  Document,
  VestingSchedule,
  PolicyRule,
  TransferRestriction,
  
  // Universal module configs
  ComplianceConfig,
  VestingConfig,
  DocumentConfig,
  PolicyEngineConfig,
  
  // ERC20 module configs
  FeesConfig,
  FlashMintConfig,
  PermitConfig,
  SnapshotConfig,
  TimelockConfig,
  VotesConfig,
  PayableTokenConfig,
  TemporaryApprovalConfig,
  
  // ERC721 module configs
  RoyaltyConfig,
  RentalConfig,
  SoulboundConfig,
  FractionalizationConfig,
  ConsecutiveConfig,
  MetadataEventsConfig,
  
  // ERC1155 module configs
  SupplyCapConfig,
  UriManagementConfig,
  GranularApprovalConfig,
  
  // ERC3525 module configs
  SlotDefinition,
  SlotManagerConfig,
  SlotApprovableConfig,
  ValueExchangeConfig,
  
  // ERC4626 module configs
  FeeStrategyConfig,
  WithdrawalQueueConfig,
  YieldStrategyConfig,
  AsyncVaultConfig,
  NativeVaultConfig,
  RouterConfig,
  MultiAssetVaultConfig,
  
  // ERC1400 module configs
  TransferRestrictionsConfig,
  ControllerConfig,
  ERC1400DocumentConfig,
  PartitionConfig
} from '@/types/modules';

// Re-export all module types for backward compatibility
export type {
  // Shared types
  Document,
  VestingSchedule,
  PolicyRule,
  TransferRestriction,
  
  // Universal configs
  ComplianceConfig,
  VestingConfig,
  DocumentConfig,
  PolicyEngineConfig,
  
  // ERC20 configs
  FeesConfig,
  FlashMintConfig,
  PermitConfig,
  SnapshotConfig,
  TimelockConfig,
  VotesConfig,
  PayableTokenConfig,
  TemporaryApprovalConfig,
  
  // ERC721 configs
  RoyaltyConfig,
  RentalConfig,
  SoulboundConfig,
  FractionalizationConfig,
  ConsecutiveConfig,
  MetadataEventsConfig,
  
  // ERC1155 configs
  SupplyCapConfig,
  UriManagementConfig,
  GranularApprovalConfig,
  
  // ERC3525 configs
  SlotDefinition,
  SlotManagerConfig,
  SlotApprovableConfig,
  ValueExchangeConfig,
  
  // ERC4626 configs
  FeeStrategyConfig,
  WithdrawalQueueConfig,
  YieldStrategyConfig,
  AsyncVaultConfig,
  NativeVaultConfig,
  RouterConfig,
  MultiAssetVaultConfig,
  
  // ERC1400 configs
  TransferRestrictionsConfig,
  ControllerConfig,
  ERC1400DocumentConfig,
  PartitionConfig
};

// ============ LEGACY COMPATIBILITY LAYER ============
// These types extend the comprehensive configs with 'enabled' property

export interface ComplianceModuleConfig extends ComplianceConfig {
  enabled: boolean;
}

export interface VestingModuleConfig extends VestingConfig {
  enabled: boolean;
}

export interface DocumentModuleConfig extends DocumentConfig {
  enabled: boolean;
}

export interface PolicyEngineModuleConfig extends PolicyEngineConfig {
  enabled: boolean;
}

export interface FeeModuleConfig extends FeesConfig {
  enabled: boolean;
}

export interface FlashMintModuleConfig extends FlashMintConfig {
  enabled: boolean;
}

export interface PermitModuleConfig extends PermitConfig {
  enabled: boolean;
}

export interface SnapshotModuleConfig extends SnapshotConfig {
  enabled: boolean;
}

export interface TimelockModuleConfig extends TimelockConfig {
  enabled: boolean;
}

export interface VotesModuleConfig extends VotesConfig {
  enabled: boolean;
}

export interface PayableTokenModuleConfig extends PayableTokenConfig {
  enabled: boolean;
}

export interface TemporaryApprovalModuleConfig extends TemporaryApprovalConfig {
  enabled: boolean;
}

export interface RoyaltyModuleConfig extends RoyaltyConfig {
  enabled: boolean;
}

export interface RentalModuleConfig extends RentalConfig {
  enabled: boolean;
}

export interface SoulboundModuleConfig extends SoulboundConfig {
  enabled: boolean;
}

export interface FractionalizationModuleConfig extends FractionalizationConfig {
  enabled: boolean;
}

export interface ConsecutiveModuleConfig extends ConsecutiveConfig {
  enabled: boolean;
}

export interface MetadataEventsModuleConfig extends MetadataEventsConfig {
  enabled: boolean;
}

export interface SupplyCapModuleConfig extends SupplyCapConfig {
  enabled: boolean;
}

export interface UriManagementModuleConfig extends UriManagementConfig {
  enabled: boolean;
}

export interface GranularApprovalModuleConfig extends GranularApprovalConfig {
  enabled: boolean;
}

export interface SlotApprovableModuleConfig extends SlotApprovableConfig {
  enabled: boolean;
}

export interface SlotManagerModuleConfig extends SlotManagerConfig {
  enabled: boolean;
}

export interface ValueExchangeModuleConfig extends ValueExchangeConfig {
  enabled: boolean;
}

export interface FeeStrategyModuleConfig extends FeeStrategyConfig {
  enabled: boolean;
}

export interface WithdrawalQueueModuleConfig extends WithdrawalQueueConfig {
  enabled: boolean;
}

export interface YieldStrategyModuleConfig extends YieldStrategyConfig {
  enabled: boolean;
}

export interface AsyncVaultModuleConfig extends AsyncVaultConfig {
  enabled: boolean;
}

export interface NativeVaultModuleConfig extends NativeVaultConfig {
  enabled: boolean;
}

export interface RouterModuleConfig extends RouterConfig {
  enabled: boolean;
}

export interface MultiAssetVaultModuleConfig extends MultiAssetVaultConfig {
  enabled: boolean;
}

export interface TransferRestrictionsModuleConfig extends TransferRestrictionsConfig {
  enabled: boolean;
}

export interface ControllerModuleConfig extends ControllerConfig {
  enabled: boolean;
}

export interface ERC1400DocumentModuleConfig extends ERC1400DocumentConfig {
  enabled: boolean;
}

// ============ MASTER CONTRACT CONFIGURATIONS ============
// These remain here as they're deployment-specific

/**
 * ERC20Master Configuration
 * Basic fungible token with max supply controls
 */
export interface ERC20MasterConfig {
  name: string;
  symbol: string;
  maxSupply: string;           // 0 = unlimited
  initialSupply: string;
  owner: string;
}

/**
 * ERC20RebasingMaster Configuration
 * Rebasing token (e.g., stETH, aTokens)
 */
export interface ERC20RebasingMasterConfig {
  name: string;
  symbol: string;
  initialSupply: string;
  owner: string;
}

/**
 * ERC20WrapperMaster Configuration
 * Wrapper for existing ERC20 tokens (e.g., WETH, wUSDC)
 */
export interface ERC20WrapperMasterConfig {
  underlyingToken: string;      // Address of token to wrap
  name: string;
  symbol: string;
  owner: string;
}

/**
 * ERC721Master Configuration
 * NFT collection with minting/burning controls
 */
export interface ERC721MasterConfig {
  name: string;
  symbol: string;
  baseTokenURI: string;         // Base URI for token metadata
  maxSupply: string;            // 0 = unlimited
  owner: string;
  mintingEnabled: boolean;      // Whether minting is initially enabled
  burningEnabled: boolean;      // Whether burning is initially enabled
}

/**
 * ERC721WrapperMaster Configuration
 * Wrapper for existing ERC721 tokens
 */
export interface ERC721WrapperMasterConfig {
  underlyingToken: string;      // Address of NFT to wrap
  name: string;
  symbol: string;
  baseTokenURI: string;         // Base URI for wrapper metadata
  owner: string;
}

/**
 * ERC1155Master Configuration
 * Multi-token standard (fungible + non-fungible)
 */
export interface ERC1155MasterConfig {
  name: string;                 // Collection name
  symbol: string;               // Collection symbol
  uri: string;                  // Base URI for metadata
  owner: string;
}

/**
 * ERC3525Master Configuration
 * Semi-fungible token standard (slots + values)
 */
export interface ERC3525MasterConfig {
  name: string;
  symbol: string;
  decimals: number;             // Value decimals (uint8: 0-255)
  owner: string;
}

/**
 * ERC4626Master Configuration
 * Tokenized vault standard for yield-bearing tokens
 */
export interface ERC4626MasterConfig {
  asset: string;                // Underlying asset address
  name: string;                 // Vault share token name
  symbol: string;               // Vault share token symbol
  depositCap: string;           // Maximum total assets (0 = unlimited)
  minimumDeposit: string;       // Minimum deposit amount
  owner: string;
}

/**
 * ERC1400Master Configuration
 * Security token standard with partitions
 */
export interface ERC1400MasterConfig {
  name: string;
  symbol: string;
  decimals: number;             // Token decimals (uint8: 0-255)
  granularity: number;          // ERC-1400 MANDATORY: Minimum transferable unit (1 = fully divisible)
  defaultPartitions: string[];  // Initial partition names (as bytes32)
  owner: string;
  isControllable: boolean;      // Whether token can be controlled
  isIssuable?: boolean;         // Whether new tokens can be issued
}

// ============ COMPLETE MODULE CONFIGURATION TYPE ============

export interface CompleteModuleConfiguration {
  // Universal modules (with enabled property)
  compliance?: ComplianceModuleConfig;
  vesting?: VestingModuleConfig;
  document?: DocumentModuleConfig;
  policyEngine?: PolicyEngineModuleConfig;

  // ERC20 modules
  fees?: FeeModuleConfig;
  flashMint?: FlashMintModuleConfig;
  permit?: PermitModuleConfig;
  snapshot?: SnapshotModuleConfig;
  timelock?: TimelockModuleConfig;
  votes?: VotesModuleConfig;
  payableToken?: PayableTokenModuleConfig;
  temporaryApproval?: TemporaryApprovalModuleConfig;

  // ERC721 modules
  royalty?: RoyaltyModuleConfig;
  rental?: RentalModuleConfig;
  soulbound?: SoulboundModuleConfig;
  fractionalization?: FractionalizationModuleConfig;
  consecutive?: ConsecutiveModuleConfig;
  metadataEvents?: MetadataEventsModuleConfig;

  // ERC1155 modules
  supplyCap?: SupplyCapModuleConfig;
  uriManagement?: UriManagementConfig;
  granularApproval?: GranularApprovalModuleConfig;

  // ERC3525 modules
  slotApprovable?: SlotApprovableModuleConfig;
  slotManager?: SlotManagerModuleConfig;
  valueExchange?: ValueExchangeModuleConfig;

  // ERC4626 modules
  feeStrategy?: FeeStrategyModuleConfig;
  withdrawalQueue?: WithdrawalQueueModuleConfig;
  yieldStrategy?: YieldStrategyModuleConfig;
  asyncVault?: AsyncVaultModuleConfig;
  nativeVault?: NativeVaultModuleConfig;
  router?: RouterModuleConfig;
  multiAssetVault?: MultiAssetVaultModuleConfig;

  // ERC1400 modules
  transferRestrictions?: TransferRestrictionsModuleConfig;
  controller?: ControllerModuleConfig;
  erc1400Document?: ERC1400DocumentModuleConfig;
}

// ============ PROPS TYPES FOR CONFIGURATION COMPONENTS ============

export interface ModuleConfigProps<T> {
  config: T;
  onChange: (config: T) => void;
  disabled?: boolean;
  errors?: Record<string, string[]>;
}

export interface MasterConfigProps<T> {
  config: T;
  onChange: (config: T) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

// ============ VALIDATION HELPER TYPES ============

/**
 * Address validation result
 */
export interface AddressValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Numeric validation result with constraints
 */
export interface NumericValidation {
  isValid: boolean;
  error?: string;
  min?: number;
  max?: number;
}
