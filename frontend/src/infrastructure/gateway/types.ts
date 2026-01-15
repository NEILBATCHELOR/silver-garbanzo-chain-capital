/**
 * Type definitions for Cryptographic Operation Gateway
 */

import type { SupportedChain } from '../web3/adapters/IBlockchainAdapter';
import type { EnforcementMode } from '../policy/HybridPolicyEngine';

// Operation Types
export type OperationType = 
  | 'mint' 
  | 'burn' 
  | 'transfer' 
  | 'lock' 
  | 'unlock' 
  | 'block' 
  | 'unblock'
  | 'pause'
  | 'unpause'
  // 🆕 Advanced Management Operations
  | 'grantRole'
  | 'revokeRole'
  | 'setModule'
  | 'updateMaxSupply';

// Operation Request
export interface OperationRequest {
  type: OperationType;
  chain: SupportedChain;
  tokenAddress: string;
  parameters: OperationParameters;
  metadata?: OperationMetadata;
}

// Operation Parameters
export interface OperationParameters {
  amount?: string | bigint;
  from?: string;
  to?: string;
  tokenId?: string;
  duration?: number; // for lock operations (in seconds)
  reason?: string;   // for block/lock operations
  partition?: string; // for ERC-1400
  data?: any;        // additional data
  // Additional operation-specific parameters
  address?: string;  // for block/unblock operations
  lockId?: string;   // for unlock operations
  blockId?: string;  // for unblock operations
  // 🆕 Role Management Parameters
  role?: string;     // for grantRole/revokeRole operations (keccak256 hash)
  account?: string;  // for grantRole/revokeRole operations
  // 🆕 Module Management Parameters
  setterFunction?: string;  // for setModule operations (e.g., 'setComplianceModule')
  moduleAddress?: string;   // for setModule operations
  // 🆕 Max Supply Update Parameters
  newMaxSupply?: string;    // for updateMaxSupply operations
}

// Operation Metadata
export interface OperationMetadata {
  requestId?: string;
  source?: string;
  timestamp?: string;
  userId?: string;
  projectId?: string;
  notes?: string;
  // Additional metadata
  confirmations?: number;
  operator?: string;
  blockId?: string;
  lockId?: string;
}

// Operation Result
export interface OperationResult {
  success: boolean;
  transactionHash?: string;
  operationId: string;
  policyValidation: PolicyValidationSummary;
  gasUsed?: string;
  timestamp: string;
  error?: OperationError;
  blockNumber?: number;
  confirmations?: number;
}

// Policy Validation Summary
export interface PolicyValidationSummary {
  allowed: boolean;
  policiesEvaluated: number;
  violations: string[];
  warnings: string[];
  score?: number;
  metadata?: PolicyValidationMetadata;
}

// Policy Validation Metadata
export interface PolicyValidationMetadata {
  operator?: string;
  amount?: string | bigint;
  operationType?: string;
  chainId?: string;
  tokenAddress?: string;
  recipient?: string;
  sender?: string;
  enforcementMode?: EnforcementMode;
  layersEvaluated?: Array<'off-chain' | 'smart-contract' | 'oracle'>;
  [key: string]: any; // Allow additional metadata fields
}

// Operation Error
export interface OperationError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Gas Estimate
export interface GasEstimate {
  limit: bigint;
  price: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCost: string;
}

// Transaction Result
export interface TransactionResult {
  hash: string;
  blockNumber: number;
  gasUsed?: bigint;
  status: 'success' | 'failed' | 'pending';
  logs?: any[];
  timestamp: number;
  confirmations?: number;
  metadata?: Record<string, any>;
}

// Operation Validator
export interface OperationValidator {
  validate(request: OperationRequest): Promise<ValidationResult>;
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// Validation Error
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Operation Executor
export interface OperationExecutor {
  execute(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult>;
}

// Gateway Config
export interface GatewayConfig {
  policyConfig?: any;
  tokenConfig?: any;
  monitorConfig?: any;
  cacheEnabled?: boolean;
  retryCount?: number;
  timeout?: number;
  
  // 🆕 Executor Mode Selection
  executionMode?: 'basic' | 'foundry' | 'enhanced';
  
  // 🆕 Foundry Integration
  useFoundry?: boolean; // Enable Foundry smart contract execution (deprecated: use executionMode)
  foundryConfig?: FoundryGatewayConfig;
  
  // 🆕 Enhanced Executor Config (for nonce-aware execution)
  enhancedConfig?: {
    enableFoundryValidation?: boolean; // Add on-chain validation to enhanced executors
    walletConfig?: {
      walletId: string;
      walletType: 'project' | 'user';
    };
  };
  
  // 🆕 Hybrid Policy Enforcement Config (Phase 5)
  enforcementMode?: EnforcementMode; // Shortcut for hybridPolicyConfig.mode
  chainId?: number; // For PolicyChainSyncService
  signer?: any; // ethers.Signer for PolicyChainSyncService
  fallbackToOffChain?: boolean;
  criticalAmountThreshold?: bigint;
  criticalOperations?: string[];
  
  // Legacy hybrid config (deprecated in favor of top-level fields)
  hybridPolicyConfig?: {
    mode: EnforcementMode;
    fallbackToOffChain?: boolean;
    criticalAmountThreshold?: bigint;
    criticalOperations?: string[];
    enableOracleValidation?: boolean;
    enableSmartContractValidation?: boolean;
  };
}

// Foundry Gateway Configuration
export interface FoundryGatewayConfig {
  policyEngineAddress: string;
  provider: any; // ethers.Provider
  signer?: any; // ethers.Signer
  defaultGasLimit?: bigint;
  networks?: {
    [chain: string]: {
      rpcUrl: string;
      chainId: number;
      policyEngineAddress?: string; // Override per network
    };
  };
}

// Operation Context
export interface OperationContext {
  operationType: string;
  operator: string;
  chain: string;
  tokenAddress: string;
  timestamp: string;
}
