/**
 * Exchange Service Types - UPDATED
 * 
 * Types for multi-chain exchange operations (market making, trading)
 * REFACTORED: Blockchain-agnostic table structure
 */

// ============================================================================
// DATABASE TYPES (from refactored blockchain-agnostic tables)
// ============================================================================

export interface ExchangeContract {
  id: string;
  contract_type: 'market_maker' | 'redemption' | 'vault';
  contract_name: string;
  contract_address: string;
  
  // Blockchain identification (NEW)
  blockchain: string; // 'injective', 'ethereum', 'polygon', etc.
  network: 'mainnet' | 'testnet' | 'devnet';
  chain_id: string;
  
  deployer_address: string;
  deployment_tx_hash?: string;
  deployment_block_number?: bigint;
  deployment_timestamp?: string;
  backend_oracle_address?: string;
  backend_service_address?: string;
  fund_manager_address?: string;
  
  // Product linkage
  project_id?: string;
  product_id?: string; // NEW
  product_type?: string;
  
  abi_json?: any;
  is_active: boolean;
  verified: boolean;
  verification_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductMarket {
  id: string;
  
  // Product linkage
  project_id?: string;
  product_id?: string; // NEW
  
  // Blockchain identification (NEW)
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  chain_id: string;
  
  // Market linkage
  market_id?: string;
  market_maker_contract?: string;
  
  // Configuration
  spread_bps?: number;
  order_size?: string;
  min_order_size?: string;
  max_order_size?: string;
  use_nav_pricing: boolean;
  oracle_config?: any;
  
  // Status
  is_active: boolean;
  configured_at: string;
  last_order_at?: string;
  total_orders_placed: number;
  total_volume: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VaultPosition {
  id: string;
  vault_contract: string;
  
  // Blockchain identification (NEW)
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  chain_id: string;
  
  // Product linkage
  project_id?: string;
  product_id?: string; // NEW
  
  // User identification
  user_address: string;
  user_id?: string;
  
  // Position
  shares: string;
  underlying_value: string;
  exchange_rate: string;
  
  // Activity
  total_deposited: string;
  total_withdrawn: string;
  deposit_count: number;
  withdrawal_count: number;
  first_deposit_at?: string;
  last_deposit_at?: string;
  last_withdrawal_at?: string;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketMakerOperation {
  id: string;
  market_id?: string;
  
  // Blockchain identification (NEW)
  blockchain: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  chain_id: string;
  
  // Product linkage
  project_id?: string;
  product_id?: string; // NEW
  contract_address?: string;
  
  // Operation
  operation_type: 'create' | 'update_spread' | 'update_size' | 'pause' | 'resume' | 'cancel_order';
  parameters?: any;
  executed_at: string;
  executor: string;
  transaction_hash?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// ============================================================================
// SERVICE PARAMETERS
// ============================================================================

export interface DeployMarketMakerParams {
  projectId?: string;
  productId?: string; // NEW
  userId: string;
  blockchain: string; // 'injective', 'ethereum', 'polygon', etc.
  environment: 'mainnet' | 'testnet' | 'devnet';
  
  // Contract configuration
  contractName: string;
  backendOracleAddress: string;
  productType?: string;
  
  // Gas configuration
  gasConfig?: {
    gasPrice?: string;
    gasLimit?: number;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export interface ConfigureMarketParams {
  projectId?: string;
  productId: string; // NEW - REQUIRED
  productType: string;
  blockchain: string; // NEW - REQUIRED
  network: 'mainnet' | 'testnet' | 'devnet'; // NEW - REQUIRED
  marketId: string;
  contractAddress: string;
  
  // Market maker configuration
  baseDenom: string;
  quoteDenom: string;
  spread: number;
  orderSize: string;
  minOrderSize?: string;
  maxOrderSize?: string;
  useNAVPricing?: boolean;
  
  // Oracle configuration
  oracleConfig?: {
    oracleBase: string;
    oracleQuote: string;
    oracleType: string;
    oracleScaleFactor: number;
  };
}

export interface ProvideLiquidityParams {
  projectId?: string;
  productId?: string; // NEW
  blockchain: string; // NEW - REQUIRED
  network: 'mainnet' | 'testnet' | 'devnet'; // NEW - REQUIRED
  marketId: string;
  contractAddress: string;
  
  // Liquidity configuration
  midPrice: string;
  spread: number;
  orderSize: string;
  subaccountId: string;
}

export interface CancelOrderParams {
  projectId?: string;
  productId?: string; // NEW
  blockchain: string; // NEW - REQUIRED
  network: 'mainnet' | 'testnet' | 'devnet'; // NEW - REQUIRED
  marketId: string;
  orderHash: string;
  subaccountId: string;
}

export interface UpdateMarketConfigParams {
  projectId?: string;
  productId?: string; // NEW
  blockchain: string; // NEW - REQUIRED
  network: 'mainnet' | 'testnet' | 'devnet'; // NEW - REQUIRED
  marketId: string;
  contractAddress: string;
  
  // What to update
  newSpread?: number;
  newOrderSize?: string;
  pause?: boolean;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  blockNumber?: bigint;
  blockchain?: string; // NEW
  network?: string; // NEW
  chainId?: string; // NEW
  error?: string;
}

export interface ConfigurationResult {
  success: boolean;
  productMarketId?: string;
  transactionHash?: string;
  blockchain?: string; // NEW
  network?: string; // NEW
  error?: string;
}

export interface LiquidityResult {
  success: boolean;
  buyOrderHash?: string;
  sellOrderHash?: string;
  transactionHash?: string;
  blockchain?: string; // NEW
  network?: string; // NEW
  error?: string;
}

export interface CancelResult {
  success: boolean;
  transactionHash?: string;
  blockchain?: string; // NEW
  network?: string; // NEW
  error?: string;
}

export interface MarketInfo {
  marketId: string;
  ticker: string;
  baseDenom: string;
  quoteDenom: string;
  blockchain: string; // NEW
  network: string; // NEW
  spreadBps: number;
  orderSize: string;
  isActive: boolean;
  lastOrderAt?: string;
  totalOrders: number;
  totalVolume: string;
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

/**
 * Interface that all chain-specific exchange adapters must implement
 */
export interface IExchangeAdapter {
  deployMarketMaker(params: DeployMarketMakerParams): Promise<DeploymentResult>;
  configureMarket(params: ConfigureMarketParams): Promise<ConfigurationResult>;
  provideLiquidity(params: ProvideLiquidityParams): Promise<LiquidityResult>;
  cancelOrder(params: CancelOrderParams): Promise<CancelResult>;
  updateMarketConfig(params: UpdateMarketConfigParams): Promise<ConfigurationResult>;
  getMarketInfo(marketId: string, blockchain: string, network: string): Promise<MarketInfo>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ContractType = 'market_maker' | 'redemption' | 'vault';
export type Network = 'mainnet' | 'testnet' | 'devnet';
export type Blockchain = 'injective' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'bsc';

export interface ChainInfo {
  blockchain: Blockchain;
  chainId: string;
  network: Network;
  rpcUrl: string;
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

export interface ExchangeContractFilter {
  blockchain?: string;
  network?: Network;
  contractType?: ContractType;
  productId?: string;
  projectId?: string;
  isActive?: boolean;
}

export interface ProductMarketFilter {
  blockchain?: string;
  network?: Network;
  productId?: string;
  projectId?: string;
  isActive?: boolean;
}

export interface VaultPositionFilter {
  blockchain?: string;
  network?: Network;
  vaultContract?: string;
  productId?: string;
  userAddress?: string;
  isActive?: boolean;
}

// ============================================================================
// ABI LOADING FROM DATABASE
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
  contractType: string; // 'market_maker', 'vault', 'redemption', etc.
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
