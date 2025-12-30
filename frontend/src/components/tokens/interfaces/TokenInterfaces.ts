import { DeploymentStatus } from '@/types/deployment/TokenDeploymentTypes';
import { TokenType } from '@/types/core/centralModels';

/**
 * Interface for token details displayed in various token-related components
 */
export interface TokenDetails {
  id: string;
  name: string;
  symbol: string;
  standard: string;
  blocks?: Record<string, any>;
  address?: string;
  blockchain?: string;
  decimals: number;
  total_supply?: string;
  deployment_status?: DeploymentStatus;
  deployment_transaction?: string;
  deployment_block?: number;
  deployment_timestamp?: string;
  deployment_environment?: string;
  configurationLevel?: 'basic' | 'advanced' | 'min' | 'max';
}

/**
 * Interface for token configuration used in deployment forms
 */
export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  standard?: string;
  initialHolderAddress?: string;
  features?: {
    isBurnable?: boolean;
    isMintable?: boolean;
    isPausable?: boolean;
    isUpgradeable?: boolean;
  };
  metadata?: Record<string, string>;
}

/**
 * Interface for token deployment parameters
 */
export interface TokenDeploymentParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  blockchain: string;
  environment: 'mainnet' | 'testnet';
  tokenType: TokenType;
  features?: {
    burnable?: boolean;
    mintable?: boolean;
    pausable?: boolean;
    upgradeable?: boolean;
  };
  customOptions?: Record<string, any>;
}

/**
 * Interface for token deployment result
 */
export interface TokenDeploymentResult {
  tokenAddress: string;
  transactionHash: string;
  blockNumber?: number;
  timestamp?: number;
  status: 'pending' | 'success' | 'failed';
}

/**
 * Interface for token transaction details
 */
export interface TokenTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  type: 'transfer' | 'mint' | 'burn' | 'approve' | 'other';
  status: 'pending' | 'confirmed' | 'failed';
}

// ===== NEW FOUNDRY CONTRACT INTERFACES =====

/**
 * ERC20 Token Configuration for Foundry deployment
 */
export interface FoundryERC20Config {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string; // In token units (not wei)
  maxSupply: string; // 0 means no cap
  transfersPaused: boolean;
  mintingEnabled: boolean;
  burningEnabled: boolean;
  votingEnabled: boolean;
  initialOwner: string;
}

/**
 * ERC721 Royalty Configuration
 */
export interface ERC721RoyaltyConfig {
  defaultRoyaltyBps: number; // Royalty in basis points (250 = 2.5%)
  royaltyRecipient: string; // Address receiving royalties
}

/**
 * ERC721 Rental Configuration
 */
export interface ERC721RentalConfig {
  maxRentalDuration: number; // Maximum rental period in seconds
  minRentalPrice?: string; // Minimum rental price in wei (optional)
  rentalRecipient?: string; // Address receiving rental payments (optional)
}

/**
 * ERC721 Fractionalization Configuration
 */
export interface ERC721FractionalizationConfig {
  minFractions: number; // Minimum number of fractional shares per NFT
  maxFractions?: number; // Maximum number of fractional shares (optional)
  fractionPrice?: string; // Price per fraction in wei (optional)
}

/**
 * ERC721 Token Configuration for Foundry deployment
 * ✅ UPDATED: Now includes module configurations for all ERC721 extensions
 */
export interface FoundryERC721Config {
  // Base Configuration
  name: string;
  symbol: string;
  baseURI: string;
  maxSupply: number; // 0 means no cap
  mintPrice: string; // In wei
  transfersPaused: boolean;
  mintingEnabled: boolean;
  burningEnabled: boolean;
  publicMinting: boolean;
  initialOwner: string;
  
  // ============ MODULE SELECTION ============
  // Universal Modules (All Standards)
  compliance?: boolean;
  vesting?: boolean;
  document?: boolean;
  policyEngine?: boolean;
  
  // ERC721-Specific Modules
  royalty?: boolean;
  rental?: boolean;
  soulbound?: boolean;
  fraction?: boolean; // Fractionalization
  consecutive?: boolean;
  metadataEvents?: boolean;
  
  // ============ MODULE CONFIGURATIONS ============
  // Universal Module Configs
  complianceConfig?: {
    kycRequired?: boolean;
    whitelistRequired?: boolean;
    whitelistAddresses?: string;
  };
  vestingConfig?: {
    cliffPeriod?: number; // Cliff period in seconds
    totalPeriod?: number; // Total vesting period in seconds
    releaseFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  };
  documentConfig?: Record<string, any>;
  policyEngineConfig?: {
    rulesEnabled?: string[];
    validatorsEnabled?: string[];
  };
  
  // ERC721-Specific Module Configs
  royaltyConfig?: ERC721RoyaltyConfig;
  rentalConfig?: ERC721RentalConfig;
  fractionConfig?: ERC721FractionalizationConfig;
  
  // ============ MODULE ADDRESSES (Auto-resolved) ============
  complianceModuleAddress?: string;
  vestingModuleAddress?: string;
  documentModuleAddress?: string;
  policyEngineAddress?: string;
  royaltyModuleAddress?: string;
  rentalModuleAddress?: string;
  soulboundModuleAddress?: string;
  fractionalizationModuleAddress?: string;
  consecutiveModuleAddress?: string;
  metadataEventsModuleAddress?: string;
}

/**
 * ERC1155 Token Configuration for Foundry deployment
 */
export interface FoundryERC1155Config {
  name: string;
  symbol: string;
  baseURI: string;
  transfersPaused: boolean;
  mintingEnabled: boolean;
  burningEnabled: boolean;
  publicMinting: boolean;
  initialOwner: string;
}

/**
 * ERC1400 Security Token Configuration for Foundry deployment
 */
export interface FoundryERC1400Config {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  cap: string;
  controllerAddress: string;
  requireKyc: boolean;
  documentUri: string;
  documentHash: string;
  transfersPaused: boolean;
  mintingEnabled: boolean;
  burningEnabled: boolean;
  isControllable: boolean;
  isIssuable: boolean;
  controllers: string[];
  partitions: string[];
  initialOwner: string;
  // Security token specific properties
  securityType?: string;
  issuingJurisdiction?: string;
  regulationType?: string;
}

/**
 * ERC4626 Vault Configuration for Foundry deployment
 */
export interface FoundryERC4626Config {
  name: string;
  symbol: string;
  decimals: number;
  asset: string; // Underlying asset address
  managementFee: number; // Basis points (10000 = 100%)
  performanceFee: number; // Basis points
  depositLimit: string; // In asset units
  minDeposit: string; // In asset units
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  transfersPaused: boolean;
  initialOwner: string;
}

/**
 * ERC3525 Token Configuration for Foundry deployment
 */
export interface FoundryERC3525Config {
  name: string;
  symbol: string;
  valueDecimals: number;
  mintingEnabled: boolean;
  burningEnabled: boolean;
  transfersPaused: boolean;
  initialOwner: string;
  initialSlots: FoundryERC3525SlotInfo[];
  allocations: FoundryERC3525AllocationInfo[];
  royaltyFraction: number; // Basis points
  royaltyRecipient: string;
}

/**
 * ERC3525 Slot Information
 */
export interface FoundryERC3525SlotInfo {
  name: string;
  description: string;
  isActive: boolean;
  maxSupply: number; // 0 means no cap
  metadata: string; // Hex-encoded bytes
}

/**
 * ERC3525 Initial Allocation
 */
export interface FoundryERC3525AllocationInfo {
  slot: number;
  recipient: string;
  value: string; // Value in valueDecimals
  description: string;
}

/**
 * Union type for all Foundry token configurations
 */
export type FoundryTokenConfig = 
  | FoundryERC20Config 
  | FoundryERC721Config 
  | FoundryERC1155Config 
  | FoundryERC1400Config
  | FoundryERC3525Config
  | FoundryERC4626Config;

/**
 * Gas configuration for deployment transactions
 * ✅ FIX #5: Added for gas configuration passing
 * ✅ FIX #11: Added nonce for nonce management
 */
export interface GasConfig {
  gasPrice?: string; // Legacy gas price in Gwei
  gasLimit?: number; // Gas limit
  maxFeePerGas?: string; // EIP-1559 max fee per gas in Gwei
  maxPriorityFeePerGas?: string; // EIP-1559 max priority fee per gas in Gwei
  nonce?: number; // Transaction nonce for nonce management
}

/**
 * Enhanced deployment parameters for Foundry contracts
 * ✅ FIX #5: Added gasConfig parameter
 * ✅ FIX #6: Added tokenId and projectId for database tracking
 */
export interface FoundryDeploymentParams {
  tokenId: string; // UUID - Required for token_deployments table
  projectId: string; // UUID - Required for token_deployment_history table
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC1400' | 'ERC3525' | 'ERC4626' | 'EnhancedERC20' | 'EnhancedERC721' | 'EnhancedERC1155' | 'EnhancedERC3525' | 'EnhancedERC4626' | 'BaseERC1400' | 'EnhancedERC1400';
  config: FoundryTokenConfig;
  blockchain: string;
  environment: 'mainnet' | 'testnet';
  salt?: string; // For create2 deployment
  factoryAddress?: string; // Address of deployed factory contract
  gasConfig?: GasConfig; // ✅ FIX #5: Gas configuration
}

/**
 * Contract interaction interfaces
 */
export interface ContractFunction {
  name: string;
  inputs: ContractInput[];
  outputs: ContractOutput[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface ContractInput {
  name: string;
  type: string;
  internalType?: string;
}

export interface ContractOutput {
  name: string;
  type: string;
  internalType?: string;
}

/**
 * Contract ABI interface
 */
export interface ContractABI {
  type: 'function' | 'constructor' | 'event' | 'error';
  name?: string;
  inputs: ContractInput[];
  outputs?: ContractOutput[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
}

/**
 * Deployed contract information
 */
export interface DeployedContract {
  address: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC1400' | 'ERC3525' | 'ERC4626' | 'EnhancedERC20' | 'EnhancedERC721' | 'EnhancedERC1155' | 'EnhancedERC3525' | 'EnhancedERC4626' | 'BaseERC1400' | 'EnhancedERC1400';
  name: string;
  symbol: string;
  decimals?: number;
  valueDecimals?: number; // For ERC3525
  totalSupply?: string;
  blockchain: string;
  environment: string;
  deploymentTx: string;
  deploymentBlock: number;
  deploymentTimestamp: number;
  verified: boolean;
  abi: ContractABI[];
}

/**
 * Token factory interface
 */
export interface TokenFactory {
  address: string;
  blockchain: string;
  environment: string;
  version: string;
  supportedTokenTypes: string[];
}

/**
 * Deployment service interface for Foundry integration
 */
export interface FoundryDeploymentService {
  deployToken(params: FoundryDeploymentParams): Promise<DeployedContract>;
  verifyContract(contractAddress: string, blockchain: string, environment: string): Promise<boolean>;
  getContractInfo(contractAddress: string, blockchain: string): Promise<DeployedContract>;
  getFactoryAddress(blockchain: string, environment: string): Promise<string>;
  predictTokenAddress(params: FoundryDeploymentParams): Promise<string>;
}

/**
 * Token operation result
 */
export interface TokenOperationResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

/**
 * Token event interface
 */
export interface TokenEvent {
  eventName: string;
  tokenAddress: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  args: Record<string, any>;
  decoded: boolean;
}

/**
 * Token analytics data
 */
export interface TokenAnalytics {
  totalSupply: string;
  totalHolders: number;
  totalTransfers: number;
  volume24h: string;
  priceUSD?: string;
  marketCapUSD?: string;
  lastUpdate: number;
}
