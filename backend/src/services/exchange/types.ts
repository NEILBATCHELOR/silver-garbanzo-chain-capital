/**
 * Exchange Service Types
 * Multi-network types for market maker operations
 * Supports Injective, Ethereum, Polygon, and other EVM chains
 */

// ============================================================================
// EXCHANGE (MARKET MAKER) TYPES
// ============================================================================

export interface DeployMarketMakerParams {
  projectId: string;
  productId?: string;
  blockchain: string; // injective, ethereum, polygon, etc.
  network: string; // mainnet, testnet
  backendOracleAddress: string;
  deployerAddress: string;
  contractName?: string;
  gasLimit?: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface ConfigureMarketParams {
  contractAddress: string;
  productId: string;
  projectId?: string;
  blockchain: string;
  network: string;
  marketId: string;
  baseDenom: string;
  quoteDenom: string;
  productType: string; // bond, reit, fund, climate, etc.
  spreadBps: number; // Basis points (50 = 0.5%)
  orderSize: string; // In underlying decimals
  useNavPricing?: boolean;
  minOrderSize?: string;
  maxOrderSize?: string;
  maxDailyVolume?: number;
  cooldownPeriod?: number;
  paused?: boolean;
  oracleAddress: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface ProvideLiquidityParams {
  contractAddress: string;
  productId: string;
  projectId?: string;
  blockchain: string;
  network: string;
  midPrice: string; // NAV or market mid-price
  subaccountId: string; // Injective subaccount ID (or other chain equivalent)
  decimals?: number;
  oracleAddress: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface CancelOrdersParams {
  contractAddress: string;
  productId: string;
  blockchain: string;
  network: string;
  subaccountId: string;
  oracleAddress: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface UpdateMarketConfigParams {
  contractAddress: string;
  productId: string;
  blockchain: string;
  network: string;
  spreadBps?: number;
  orderSize?: string;
  paused?: boolean;
  oracleAddress: string;
  // Wallet/signing params
  privateKey: string;
  useHSM?: boolean;
  keyVaultId?: string;
}

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  blockNumber?: number;
  gasUsed?: string;
  blockchain?: string;
  network?: string;
  chainId?: string;
  error?: string;
}

export interface ConfigurationResult {
  success: boolean;
  marketId?: string;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  error?: string;
}

export interface LiquidityResult {
  success: boolean;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  ordersPlaced?: number;
  error?: string;
}

export interface CancelResult {
  success: boolean;
  transactionHash?: string;
  txHash?: string; // Alias for compatibility
  ordersCancelled?: number;
  error?: string;
}

export interface MarketInfo {
  productId: string;
  marketId: string;
  baseDenom?: string;
  quoteDenom?: string;
  productType?: string;
  spreadBps: number;
  orderSize: string;
  useNavPricing?: boolean;
  paused?: boolean;
  isActive: boolean;
  lastOrderTime?: number;
  totalOrders?: number;
  totalVolume?: string;
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

export interface IExchangeAdapter {
  deployMarketMaker(params: DeployMarketMakerParams): Promise<DeploymentResult>;
  configureMarket(params: ConfigureMarketParams): Promise<ConfigurationResult>;
  provideLiquidity(params: ProvideLiquidityParams): Promise<LiquidityResult>;
  cancelOrders(params: CancelOrdersParams): Promise<CancelResult>;
  updateMarketConfig(params: UpdateMarketConfigParams): Promise<ConfigurationResult>;
  getMarketInfo(marketId: string, blockchain: string, network: string): Promise<MarketInfo>;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface ExchangeContractRecord {
  id: string;
  contract_type: 'market_maker' | 'redemption' | 'vault';
  contract_name: string;
  contract_address: string;
  blockchain: string;
  network: string;
  chain_id: string;
  deployer_address: string;
  deployment_tx_hash?: string;
  deployment_block_number?: number;
  deployment_timestamp?: Date;
  backend_oracle_address?: string;
  backend_service_address?: string;
  fund_manager_address?: string;
  project_id?: string;
  product_id?: string;
  product_type?: string;
  abi_json?: any;
  is_active?: boolean;
  verified?: boolean;
  verification_url?: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProductMarketRecord {
  id: string;
  project_id?: string;
  product_id?: string;
  blockchain: string;
  network: string;
  chain_id: string;
  market_id?: string;
  market_maker_contract?: string;
  spread_bps?: number;
  order_size?: string;
  min_order_size?: string;
  max_order_size?: string;
  use_nav_pricing?: boolean;
  oracle_config?: any;
  is_active?: boolean;
  configured_at?: Date;
  last_order_at?: Date;
  total_orders_placed?: number;
  total_volume?: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface MarketMakerOperationRecord {
  id: string;
  market_id?: string;
  blockchain: string;
  network: string;
  chain_id: string;
  project_id?: string;
  product_id?: string;
  contract_address?: string;
  operation_type: string;
  parameters?: any;
  executed_at?: Date;
  executor: string;
  transaction_hash?: string;
  success?: boolean;
  error_message?: string;
  created_at?: Date;
}
