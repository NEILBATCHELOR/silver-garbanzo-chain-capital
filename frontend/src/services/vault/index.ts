/**
 * Vault Service Exports
 * 
 * Multi-chain vault operations with database-driven ABI loading
 */

export { MultiVaultService } from './MultiVaultService';

export type {
  // Database models
  VaultContract,
  VaultPosition,
  VaultStrategy,
  
  // Parameters
  DeployVaultParams,
  DepositParams,
  WithdrawParams,
  UpdateExchangeRateParams,
  AddStrategyParams,
  GetVaultBalanceParams,
  
  // Results
  DeploymentResult,
  DepositResult,
  WithdrawResult,
  UpdateRateResult,
  StrategyResult,
  VaultBalance,
  VaultInfo,
  
  // Configuration
  ChainInfo,
  IVaultAdapter,
  
  // ABI loading
  ContractMaster,
  AbiLoadParams,
  LoadedAbi
} from './types';
