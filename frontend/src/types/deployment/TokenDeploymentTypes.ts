import { TokenStandard, TokenType } from '@/types/core/centralModels';

/**
 * Deployment status enum - UPPERCASE convention for consistency
 */
export enum DeploymentStatus {
  PENDING = 'PENDING',
  DEPLOYING = 'DEPLOYING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ABORTED = 'ABORTED',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED'
}

/**
 * Interface for deployment result
 */
export interface DeploymentResult {
  status: DeploymentStatus;
  tokenAddress?: string;
  transactionHash?: string;
  error?: string;
  blockNumber?: number;
  timestamp?: number | string;
  explorerUrl?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

/**
 * Interface for deployment transaction details
 */
export interface DeploymentTransaction {
  tokenId: string;
  projectId: string;
  blockchain: string;
  environment: string;
  transactionHash: string;
  status: DeploymentStatus;
  timestamp: string;
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

/**
 * Interface for deployment configuration
 */
export interface DeploymentConfig {
  blockchain: string;
  environment: string;
  gasLimit?: number;
  gasPrice?: string;
  nonce?: number;
  deployerAddress?: string;
  deployerPrivateKey?: string;
  providerUrl?: string;
  timeout?: number;
}

/**
 * Type for deployment status update events
 */
export type DeploymentStatusUpdate = {
  tokenId: string;
  status: DeploymentStatus;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
};

/**
 * Interface for token deployment event
 */
export interface TokenDeploymentEvent {
  tokenId: string;
  projectId: string;
  status: DeploymentStatus;
  result?: DeploymentResult;
  error?: string;
  timestamp: number;
}

/**
 * Interface for contract compilation params
 */
export interface ContractCompilationParams {
  contractName: string;
  contractPath: string;
  solcVersion: string;
  optimizationEnabled: boolean;
  optimizationRuns: number;
  evmVersion?: string;
}

/**
 * Interface for contract verification params
 */
export interface ContractVerificationParams {
  tokenAddress: string;
  tokenType: TokenType;
  contractName: string;
  deploymentParams: TokenDeploymentParams;
  blockchain: string;
  constructorArguments: any[];
  compilerVersion?: string;
  optimizationUsed?: boolean;
  optimizationRuns?: number;
  contractSourceCode?: string;
  apiKey?: string;
}

/**
 * Complete interface for token deployment parameters
 * Consolidated from all sources to include all possible fields
 */
export interface TokenDeploymentParams {
  // Base parameters for all tokens
  name: string;
  symbol: string;
  description?: string;
  configurationLevel?: 'min' | 'max' | 'basic' | 'advanced';
  standard?: TokenStandard;
  projectId?: string;
  userId?: string;
  environment?: 'testnet' | 'mainnet';
  blockchain?: string;
  
  // ERC20 specific parameters
  decimals?: number;
  initialSupply?: string;
  cap?: string;
  isMintable?: boolean;
  isBurnable?: boolean;
  isPausable?: boolean;
  
  // ERC20 detailed parameters
  accessControl?: string;
  allowanceManagement?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  feeOnTransfer?: boolean;
  feePercentage?: number;
  feeRecipient?: string;
  rebasing?: boolean;
  rebasingMode?: string;
  targetSupply?: string;
  
  // ERC721 specific parameters
  baseURI?: string;
  contractURI?: string;
  royaltyReceiver?: string;
  royaltyRecipient?: string; // Alternative naming
  royaltyPercentage?: number;
  maxSupply?: string;
  supportsEnumeration?: boolean;
  
  // ERC1155 specific parameters
  uri?: string;
  dynamicUris?: boolean;
  batchMinting?: boolean;
  batchTransfers?: boolean;
  transferRestrictions?: boolean;
  hasRoyalty?: boolean;
  royaltyFraction?: number;
  
  // ERC3525 specific parameters
  valueDecimals?: number;
  feeStructure?: {
    transferFee?: number;
    mintFee?: number;
    slotCreationFee?: number;
  };
  slotConfiguration?: {
    initialSlots?: number[];
    slotURIs?: string[];
  };
  valueTransfersEnabled?: boolean;
  
  // ERC4626 specific parameters
  assetAddress?: string;
  assetTokenAddress?: string; // Alternative naming
  assetName?: string;
  assetSymbol?: string;
  assetDecimals?: number;
  vaultType?: string;
  vaultStrategy?: string;
  strategyController?: string;
  depositLimit?: string;
  withdrawalLimit?: string;
  minDeposit?: string;
  maxDeposit?: string;
  minWithdrawal?: string;
  maxWithdrawal?: string;
  liquidityReserve?: string;
  maxSlippage?: number;
  
  // ERC1400 specific parameters
  controllers?: string[];
  partitions?: string[];
  isIssuable?: boolean;
  isControllable?: boolean;
  isDocumentable?: boolean;
  
  // Extension/module support
  extensions?: string[];
  modules?: Record<string, any>;
  
  // Access control parameters
  adminAddress?: string;
  ownerAddress?: string;
  
  // Deployment parameters
  tokenContract?: string;
  constructorParams?: any[];
  
  // Implementation contracts (for proxy patterns)
  implementationAddress?: string;
  proxyType?: 'transparent' | 'uups' | 'beacon';
  
  // Gas and transaction parameters
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Simplified deployment parameters interface for basic use cases
 */
export interface DeploymentParams {
  // Basic token parameters
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  
  // Deployment parameters
  blockchain: string;
  environment: string;
  tokenStandard: TokenStandard;
  
  // Common features
  isMintable?: boolean;
  isBurnable?: boolean;
  isPausable?: boolean;
  isUpgradeable?: boolean;
  
  // Access control
  accessControl?: 'ownable' | 'roles' | 'custom';
  ownerAddress?: string;
  adminAddress?: string;
  
  // Additional parameters by token standard
  [key: string]: any;
}

/**
 * Mapping from TokenStandard to TokenType
 * This is used to convert between the two enum types in different parts of the system
 */
export const tokenStandardToTokenType: Record<TokenStandard, TokenType> = {
  [TokenStandard.ERC20]: TokenType.ERC20,
  [TokenStandard.ERC721]: TokenType.ERC721,
  [TokenStandard.ERC1155]: TokenType.ERC1155,
  [TokenStandard.ERC1400]: TokenType.ERC1400,
  [TokenStandard.ERC3525]: TokenType.ERC3525,
  [TokenStandard.ERC4626]: TokenType.ERC4626
};

/**
 * Mapping from TokenType to TokenStandard
 * This is used for the reverse conversion
 */
export const tokenTypeToTokenStandard = {
  'native': TokenStandard.ERC20, // Map NATIVE to ERC20 as default
  'erc20': TokenStandard.ERC20,
  'erc721': TokenStandard.ERC721,
  'erc1155': TokenStandard.ERC1155,
  'erc1400': TokenStandard.ERC1400,
  'erc3525': TokenStandard.ERC3525,
  'erc4626': TokenStandard.ERC4626
};

// Re-export for backward compatibility
export { DeploymentStatus as DeploymentStatusLegacy };
