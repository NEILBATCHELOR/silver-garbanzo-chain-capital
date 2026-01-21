/**
 * Vault Service Types - Multi-Chain Vault Operations
 * 
 * Type definitions for deploying and managing yield-bearing vaults
 * across multiple blockchains.
 */

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface VaultContract {
  id: string;
  contract_type: 'vault';
  contract_name: string;
  contract_address: string;
  blockchain: string;
  network: string;
  chain_id: string;
  deployer_address: string;
  deployment_tx_hash?: string;
  deployment_block_number?: string;
  deployment_timestamp?: string;
  backend_oracle_address?: string;
  fund_manager_address?: string;
  project_id?: string;
  product_id?: string;
  product_type?: string;
  abi_json?: any;
  is_active: boolean;
  verified: boolean;
  verification_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VaultPosition {
  id: string;
  vault_contract: string;
  blockchain: string;
  network: string;
  chain_id: string;
  project_id?: string;
  product_id?: string;
  user_address: string;
  shares: string;
  underlying_value?: string;
  deposits_total?: string;
  withdrawals_total?: string;
  last_deposit_at?: string;
  last_withdrawal_at?: string;
  gain_loss?: string;
  gain_loss_pct?: string;
  exchange_rate?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaultStrategy {
  strategyName: string;
  active: boolean;
  allocationPct: number;
  targetApy: number;
}

// ============================================================================
// SERVICE PARAMETERS
// ============================================================================

export interface DeployVaultParams {
  // Project context
  projectId?: string;
  productId?: string;
  userId: string;
  
  // Vault configuration
  name: string;
  symbol: string;
  decimals: number;
  productType?: string;
  underlyingDenom: string;
  
  // Blockchain
  blockchain: string;
  network: string;
  
  // Addresses
  backendOracleAddress: string;
  deployerAddress: string;
  
  // Contract details (optional - for custom deployments)
  contractName?: string;
  
  // Gas configuration
  gasLimit?: number;
  gasPrice?: string;
}

export interface DepositParams {
  vaultAddress: string;
  amount: string;
  subaccountId?: string; // For Injective
  userAddress: string;
  blockchain: string;
  network: string;
  privateKey: string;
  useHSM?: boolean;
}

export interface WithdrawParams {
  vaultAddress: string;
  shares: string;
  subaccountId?: string; // For Injective
  userAddress: string;
  blockchain: string;
  network: string;
  privateKey: string;
  useHSM?: boolean;
}

export interface UpdateExchangeRateParams {
  vaultAddress: string;
  newRate: string;
  totalValue: string;
  blockchain: string;
  network: string;
  oracleAddress: string;
  privateKey: string;
  useHSM?: boolean;
}

export interface AddStrategyParams {
  vaultAddress: string;
  strategyName: string;
  allocationPct: number;
  targetApy: number;
  blockchain: string;
  network: string;
  oracleAddress: string;
  privateKey: string;
  useHSM?: boolean;
}

export interface GetVaultBalanceParams {
  vaultAddress: string;
  userAddress: string;
  blockchain: string;
  network: string;
}

// ============================================================================
// SERVICE RESULTS
// ============================================================================

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  txHash?: string;
  blockNumber?: number;
  blockchain?: string;
  network?: string;
  chainId?: string;
  error?: string;
}

export interface DepositResult {
  success: boolean;
  shares?: string;
  txHash?: string;
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  amount?: string;
  txHash?: string;
  error?: string;
}

export interface UpdateRateResult {
  success: boolean;
  newRate?: string;
  txHash?: string;
  error?: string;
}

export interface StrategyResult {
  success: boolean;
  strategyName?: string;
  txHash?: string;
  error?: string;
}

export interface VaultBalance {
  shares: string;
  underlyingValue: string;
  exchangeRate: string;
}

export interface VaultInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalAssets: string;
  exchangeRate: string;
  strategies: VaultStrategy[];
}

// ============================================================================
// CHAIN INFO
// ============================================================================

export interface ChainInfo {
  blockchain: string;
  network: string;
  chainId: string;
  rpcUrl: string;
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

export interface IVaultAdapter {
  deployVault(params: DeployVaultParams): Promise<DeploymentResult>;
  deposit(params: DepositParams): Promise<DepositResult>;
  withdraw(params: WithdrawParams): Promise<WithdrawResult>;
  updateExchangeRate(params: UpdateExchangeRateParams): Promise<UpdateRateResult>;
  addStrategy(params: AddStrategyParams): Promise<StrategyResult>;
  getVaultBalance(params: GetVaultBalanceParams): Promise<VaultBalance>;
  getVaultInfo(vaultAddress: string, blockchain: string, network: string): Promise<VaultInfo>;
}

// ============================================================================
// ABI LOADING
// ============================================================================

export interface ContractMaster {
  id: string;
  network: string;
  environment: string;
  contract_type: string;
  contract_address: string;
  version: string;
  abi_version: string;
  abi: any; // JSON
  abi_hash?: string;
  deployed_at?: string;
  deployed_by?: string;
  deployment_tx_hash?: string;
  is_active: boolean;
  deprecated_at?: string;
  deployment_data?: any;
  created_at: string;
  updated_at: string;
  contract_details?: any;
  initial_owner?: string;
  is_template: boolean;
  verification_status?: string;
  verified_at?: string;
  verification_url?: string;
  verification_error?: string;
  proxy_address?: string;
  implementation_address?: string;
  upgrade_history?: any[];
}

export interface AbiLoadParams {
  contractType: string; // 'market_maker', 'vault', etc.
  network: string;
  environment: string;
  version?: string; // Optional - defaults to latest active
}

export interface LoadedAbi {
  abi: any[];
  bytecode?: string;
  version: string;
  contractAddress?: string; // If template
  isTemplate: boolean;
}
