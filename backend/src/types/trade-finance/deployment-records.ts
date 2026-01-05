/**
 * Trade Finance Deployment Recording Types
 * Based on CONTRACT_DEPLOYMENT_PARAMETERS.md
 * 
 * These interfaces capture all deployment information including
 * initialization parameters for each contract type.
 */

// ============================================
// BASE DEPLOYMENT RECORD
// ============================================

export interface BaseDeploymentRecord {
  network: string;
  environment: string;
  contract_type: string;
  contract_address: string; // Proxy address for UUPS
  proxy_address: string | null; // Same as contract_address for UUPS
  implementation_address: string | null; // Implementation contract
  version: string;
  abi: any[];
  abi_hash: string;
  deployment_tx_hash: string;
  deployed_by: string; // Deployer address
  deployed_at: Date;
  verification_status?: 'verified' | 'unverified' | 'pending' | 'failed';
  verification_url?: string;
  is_template?: boolean;
  initial_owner: string;
}

// ============================================
// INITIALIZATION PARAMETERS BY CONTRACT
// ============================================

export interface TradeFinanceRegistryParams {
  owner: string;
}

export interface PoolAddressesProviderParams {
  marketId: string;
  owner: string;
}

export interface ACLManagerParams {
  provider: string; // PoolAddressesProvider proxy
  owner: string;
}

export interface PoolConfiguratorParams {
  provider: string; // PoolAddressesProvider proxy
  owner: string;
}

export interface CommodityLendingPoolParams {
  provider: string; // PoolAddressesProvider proxy
  owner: string;
}

export interface CommodityOracleParams {
  provider: string; // PoolAddressesProvider proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface FuturesCurveOracleParams {
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface PriceOracleSentinelParams {
  provider: string; // PoolAddressesProvider proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface HaircutEngineParams {
  pool: string; // CommodityLendingPool proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface CircuitBreakersParams {
  pool: string; // CommodityLendingPool proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface EmergencyModuleParams {
  pool: string; // CommodityLendingPool proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface DutchAuctionLiquidatorParams {
  pool: string; // CommodityLendingPool proxy
  aclManager: string; // ACLManager proxy
  priceOracle: string; // CommodityOracle proxy
  owner: string;
}

export interface GracefulLiquidationParams {
  pool: string; // CommodityLendingPool proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface FlashLiquidationParams {
  addressesProvider: string; // PoolAddressesProvider proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface DEXLiquidationAdapterParams {
  pool: string; // CommodityLendingPool proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface LiquidationDataProviderParams {
  pool: string; // CommodityLendingPool proxy
  priceOracle: string; // CommodityOracle proxy
  owner: string;
}

export interface RewardsControllerParams {
  emissionManager: string; // EmissionManager proxy
  owner: string;
}

export interface EmissionManagerParams {
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface RewardsDistributorParams {
  rewardsController: string; // RewardsController proxy
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface CollectorParams {
  aclManager: string; // ACLManager proxy
  owner: string;
}

export interface ProtocolReserveParams {
  aclManager: string; // ACLManager proxy
  owner: string;
}

// ============================================
// NON-UPGRADEABLE CONTRACT PARAMS
// ============================================

export interface InterestRateStrategyParams {
  provider: string;
  optimalUsageRatio: number;
  baseVariableBorrowRate: number;
  variableRateSlope1: number;
  variableRateSlope2: number;
}

export interface OracleConfiguratorParams {
  oracle: string; // CommodityOracle proxy
  aclManager: string; // ACLManager proxy
}

export interface RevenueSplitterParams {
  collector: string; // Collector proxy
  reserve: string; // ProtocolReserve proxy
  aclManager: string; // ACLManager proxy
}

export interface CommodityTokenParams {
  pool: string; // CommodityLendingPool proxy
}

// ============================================
// UNION TYPE FOR ALL INIT PARAMS
// ============================================

export type ContractInitParams =
  | TradeFinanceRegistryParams
  | PoolAddressesProviderParams
  | ACLManagerParams
  | PoolConfiguratorParams
  | CommodityLendingPoolParams
  | CommodityOracleParams
  | FuturesCurveOracleParams
  | PriceOracleSentinelParams
  | HaircutEngineParams
  | CircuitBreakersParams
  | EmergencyModuleParams
  | DutchAuctionLiquidatorParams
  | GracefulLiquidationParams
  | FlashLiquidationParams
  | DEXLiquidationAdapterParams
  | LiquidationDataProviderParams
  | RewardsControllerParams
  | EmissionManagerParams
  | RewardsDistributorParams
  | CollectorParams
  | ProtocolReserveParams
  | InterestRateStrategyParams
  | OracleConfiguratorParams
  | RevenueSplitterParams
  | CommodityTokenParams;

// ============================================
// COMPLETE DEPLOYMENT RECORD
// ============================================

export interface DeploymentRecord extends BaseDeploymentRecord {
  initialization_params: ContractInitParams;
  deployment_data: {
    compiler_version: string;
    optimization: boolean;
    runs: number;
    chain_id: number;
    deployment_block?: number;
    deployment_script?: string;
    deployment_timestamp: string;
  };
  contract_details: {
    features: string[];
    upgrade_pattern?: 'UUPS' | 'Transparent' | null;
    category: 'infrastructure' | 'governance' | 'core' | 'risk' | 'rewards' | 'liquidation' | 'treasury' | 'tokens';
  };
  upgrade_history?: Array<{
    version: string;
    implementation: string;
    upgraded_at: string;
    upgraded_by: string;
    reason: string;
    tx_hash: string;
  }>;
}

// ============================================
// DEPLOYMENT PHASE GROUPING
// ============================================

export interface PhaseDeployment {
  phase_number: 1 | 2 | 3 | 4 | 5;
  phase_name: string;
  contracts: DeploymentRecord[];
  deployed_at: Date;
  total_transactions: number;
}

export interface CompleteDeployment {
  network: string;
  environment: string;
  market_id: string;
  version: string;
  deployer: string;
  super_admin: string;
  deployed_at: Date;
  infrastructure: DeploymentRecord; // TradeFinanceRegistry
  phase1_governance: DeploymentRecord[];
  phase2_core: DeploymentRecord[];
  phase3_risk: DeploymentRecord[];
  phase4_rewards: DeploymentRecord[];
  phase5_liquidation: DeploymentRecord[];
  token_templates: DeploymentRecord[];
  total_transactions: number;
}

// ============================================
// VERIFICATION UPDATE
// ============================================

export interface VerificationUpdate {
  contract_address: string;
  network: string;
  environment: string;
  verification_status: 'verified' | 'unverified' | 'pending' | 'failed';
  verification_url?: string;
}
