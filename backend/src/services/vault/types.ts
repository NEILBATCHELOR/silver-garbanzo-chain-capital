/**
 * Vault Service Types
 * Multi-network types for yield-bearing vault operations
 * Supports Injective, Ethereum, Polygon, and other EVM chains
 */

// ============================================================================
// VAULT TYPES
// ============================================================================

export interface DeployVaultParams {
  projectId: string;
  productId?: string;
  blockchain: string; // injective, ethereum, polygon, etc.
  network: string; // mainnet, testnet
  name: string;
  symbol: string;
  decimals: number;
  productType?: string; // bond, reit, fund, climate, etc.
  underlyingDenom: string; // Native Cosmos denom or ERC20
  backendOracleAddress: string;
  deployerAddress: string;
  gasLimit?: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface DepositParams {
  vaultAddress: string;
  amount: string; // In underlying token units
  subaccountId: string; // Injective subaccount ID (or other chain equivalent)
  userAddress: string;
  decimals?: number;
  blockchain: string;
  network: string;
  projectId?: string;
  productId?: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface WithdrawParams {
  vaultAddress: string;
  shares: string; // In vault share units
  subaccountId: string; // Injective subaccount ID (or other chain equivalent)
  userAddress: string;
  decimals?: number;
  blockchain: string;
  network: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface UpdateRateParams {
  vaultAddress: string;
  newRate: string; // Exchange rate (18 decimals)
  totalValue: string; // Total vault value (underlying decimals)
  oracleAddress: string;
  blockchain: string;
  network: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface AddStrategyParams {
  vaultAddress: string;
  strategyName: string;
  allocationPct: number;
  targetApy: number;
  oracleAddress: string;
  blockchain: string;
  network: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  vaultAddress?: string; // Alias for vault deployments
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  blockNumber?: number;
  gasUsed?: string;
  blockchain?: string;
  network?: string;
  chainId?: string;
  error?: string;
}

export interface VaultDeploymentResult extends DeploymentResult {
  vaultAddress?: string;
}

export interface DepositResult {
  success: boolean;
  shares: string;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  underlyingAmount: string;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  error?: string;
}

export interface StrategyResult {
  success: boolean;
  strategyId: string;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  error?: string;
}

export interface VaultInfo {
  vaultAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string; // Total shares
  exchangeRate: string; // Current exchange rate
  totalValue?: string; // Total underlying value
  totalValueLocked?: string; // Alias for totalValue
  productId?: string;
  productType?: string;
  underlyingDenom?: string;
  isPaused?: boolean;
}

export interface VaultPosition {
  vaultAddress?: string;
  userAddress: string;
  shares: string;
  underlyingValue: string;
  depositedValue?: string;
  gainLoss?: string;
  exchangeRate?: string;
  blockchain?: string;
  network?: string;
}

export interface VaultStrategy {
  name: string;
  active: boolean;
  allocationPct: number; // Basis points
  targetApy: number; // Basis points
  currentValue: string;
}

// ============================================================================
// DATABASE RECORD TYPES
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
  deployment_block_number?: bigint;
  deployment_timestamp?: Date;
  backend_oracle_address?: string;
  project_id?: string;
  product_id?: string;
  product_type?: string;
  abi_json?: any;
  is_active: boolean;
  verified: boolean;
  verification_url?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface VaultPositionRecord {
  id: string;
  vault_contract: string;
  blockchain: string;
  network: string;
  chain_id: string;
  project_id?: string;
  product_id?: string;
  user_address: string;
  shares: string;
  underlying_value: string;
  deposited_at?: Date;
  withdrawn_at?: Date;
  is_active: boolean;
  total_deposited?: string;
  total_withdrawn?: string;
  last_exchange_rate?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

export interface IVaultAdapter {
  deployVault(params: DeployVaultParams): Promise<VaultDeploymentResult>;
  deposit(params: DepositParams): Promise<DepositResult>;
  withdraw(params: WithdrawParams): Promise<WithdrawResult>;
  updateExchangeRate(params: UpdateRateParams): Promise<UpdateResult>;
  addStrategy(params: AddStrategyParams): Promise<StrategyResult>;
  getVaultInfo(vaultAddress: string, blockchain: string, network: string): Promise<VaultInfo>;
}
