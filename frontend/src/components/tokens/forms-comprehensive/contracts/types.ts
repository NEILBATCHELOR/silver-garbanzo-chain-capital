/**
 * Type definitions for contract configuration components
 * These mirror the Solidity contract initialization parameters
 */

// ============ Master Contract Configurations ============

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
 * NOTE: Rebasing is configured post-deployment via rebase() function
 */
export interface ERC20RebasingMasterConfig {
  name: string;
  symbol: string;
  initialSupply: string;
  owner: string;
  // Rebasing parameters NOT in initialize - configured via rebase() calls
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
  defaultPartitions: string[];  // Initial partition names (as bytes32)
  owner: string;
  isControllable: boolean;      // Whether token can be controlled
}

// ============ Universal Extension Configurations ============

export interface ComplianceModuleConfig {
  enabled: boolean;
  kycRequired: boolean;
  whitelistRequired: boolean;
}

export interface VestingModuleConfig {
  enabled: boolean;
  // Vesting schedules configured post-deployment via PolicyAwareLockOperation
}

export interface DocumentModuleConfig {
  enabled: boolean;
  // Documents uploaded post-deployment
}

export interface PolicyEngineConfig {
  enabled: boolean;
  rulesEnabled: string[];
  validatorsEnabled: string[];
}

// ============ ERC20-Specific Extension Configurations ============

export interface FeeModuleConfig {
  enabled: boolean;
  transferFeeBps: number;       // Basis points (e.g., 50 = 0.5%)
  feeRecipient: string;
}

export interface FlashMintModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface PermitModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface SnapshotModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface TimelockModuleConfig {
  enabled: boolean;
  minDelay: number;             // Seconds
}

export interface VotesModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface PayableTokenModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface TemporaryApprovalModuleConfig {
  enabled: boolean;
  defaultDuration: number;      // Seconds (default: 3600)
}

// ============ ERC721-Specific Extension Configurations ============

export interface RoyaltyModuleConfig {
  enabled: boolean;
  defaultRoyaltyBps: number;    // Basis points (e.g., 250 = 2.5%)
  royaltyRecipient: string;
}

export interface RentalModuleConfig {
  enabled: boolean;
  maxRentalDuration: number;    // Seconds
}

export interface SoulboundModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface FractionalizationModuleConfig {
  enabled: boolean;
  minFractions: number;
}

export interface ConsecutiveModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface MetadataEventsModuleConfig {
  enabled: boolean;
  // No additional config needed
}

// ============ ERC1155-Specific Extension Configurations ============

export interface SupplyCapModuleConfig {
  enabled: boolean;
  defaultCap: number;           // 0 = unlimited
}

export interface URIManagementModuleConfig {
  enabled: boolean;
  baseURI: string;
}

export interface GranularApprovalModuleConfig {
  enabled: boolean;
  // No additional config needed - ERC-5216 granular approvals for ERC-1155
}

// ============ ERC3525-Specific Extension Configurations ============

export interface SlotApprovableModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface SlotManagerModuleConfig {
  enabled: boolean;
  // Slot-specific rules configured post-deployment
}

export interface ValueExchangeModuleConfig {
  enabled: boolean;
  exchangeFeeBps: number;
}

// ============ ERC4626-Specific Extension Configurations ============

export interface FeeStrategyModuleConfig {
  enabled: boolean;
  managementFeeBps: number;     // Annual management fee
  performanceFeeBps: number;    // Performance fee
}

export interface WithdrawalQueueModuleConfig {
  enabled: boolean;
  maxQueueSize: number;
}

export interface YieldStrategyModuleConfig {
  enabled: boolean;
  targetYieldBps: number;       // Target annual yield
}

export interface AsyncVaultModuleConfig {
  enabled: boolean;
  settlementDelay: number;      // Seconds (default: 86400 = 1 day)
}

export interface NativeVaultModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface RouterModuleConfig {
  enabled: boolean;
  // No additional config needed
}

export interface MultiAssetVaultModuleConfig {
  enabled: boolean;
  maxAssets: number;
}

// ============ ERC1400-Specific Extension Configurations ============

export interface TransferRestrictionsModuleConfig {
  enabled: boolean;
  // Restrictions configured post-deployment
}

export interface ControllerModuleConfig {
  enabled: boolean;
  controllers: string[];        // Array of controller addresses
}

export interface ERC1400DocumentModuleConfig {
  enabled: boolean;
  // Documents uploaded post-deployment
}

// ============ Complete Module Configuration Type ============

export interface CompleteModuleConfiguration {
  // Universal modules
  compliance?: ComplianceModuleConfig;
  vesting?: VestingModuleConfig;
  document?: DocumentModuleConfig;
  policyEngine?: PolicyEngineConfig;

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
  uriManagement?: URIManagementModuleConfig;
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

// ============ Props Types for Configuration Components ============

export interface ModuleConfigProps<T> {
  config: T;
  onChange: (config: T) => void;
  disabled?: boolean;
}

export interface MasterConfigProps<T> {
  config: T;
  onChange: (config: T) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

// ============ Validation Helper Types ============

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
