/**
 * Commodity Pool Service
 * 
 * Wraps TransactionBuilder for commodity trade finance pool operations
 * Handles: Supply, Withdraw, Borrow, Repay, Liquidate
 * 
 * Reuses: 95% of existing TransactionBuilder infrastructure
 * New: 5% commodity-specific encoding and validation
 * 
 * UPDATE: Now queries contract_masters database for pool address
 */

import { ethers } from 'ethers';
import { transactionBuilder, type TransactionRequest, type GasEstimate, type SignedTransaction, type BroadcastResult } from '@/services/wallet/builders/TransactionBuilder';
import { ChainType } from '@/services/wallet/AddressUtils';
import { TradeFinanceContractService } from './ContractDeploymentService';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CommodityPoolConfig {
  poolAddress?: string; // Optional - will query from database if not provided
  chainType: ChainType;
  chainId: number;
  networkType: 'mainnet' | 'testnet';
}

export interface SupplyParams {
  userAddress: string;
  commodityToken: string;
  amount: string;
  privateKey: string;
}

export interface WithdrawParams {
  userAddress: string;
  commodityToken: string;
  amount: string;
  privateKey: string;
}

export interface BorrowParams {
  userAddress: string;
  asset: string; // USDC, USDT, DAI
  amount: string;
  privateKey: string;
}

export interface RepayParams {
  userAddress: string;
  asset: string;
  amount: string;
  privateKey: string;
}

export interface LiquidateParams {
  liquidatorAddress: string;
  borrower: string;
  collateralAsset: string;
  debtAsset: string;
  debtToCover: string;
  liquidatorPrivateKey: string;
  receivecToken: boolean; // If true, receive cToken instead of underlying
}

export interface HealthFactorResult {
  healthFactor: number;
  totalCollateralETH: string;
  totalDebtETH: string;
  availableBorrowsETH: string;
  currentLiquidationThreshold: number;
  ltv: number;
}

// ============================================================================
// COMMODITY LENDING POOL ABI (Minimal for now)
// ============================================================================

const COMMODITY_POOL_ABI = [
  // Supply
  'function supply(address asset, uint256 amount) external',
  
  // Withdraw
  'function withdraw(address asset, uint256 amount) external returns (uint256)',
  
  // Borrow
  'function borrow(address asset, uint256 amount) external',
  
  // Repay
  'function repay(address asset, uint256 amount) external returns (uint256)',
  
  // Liquidate
  'function liquidate(address borrower, address collateralAsset, address debtAsset, uint256 debtToCover, bool receivecToken) external',
  
  // View functions
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  
  // Get reserve data
  'function getReserveData(address asset) external view returns (uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, address cTokenAddress, bool isActive, bool isFrozen)'
];

// ============================================================================
// COMMODITY POOL SERVICE
// ============================================================================

export class CommodityPoolService {
  private poolAddress: string | null = null;
  private chainType: ChainType;
  private chainId: number;
  private networkType: 'mainnet' | 'testnet';
  private poolInterface: ethers.Interface;
  
  constructor(config: CommodityPoolConfig) {
    // Use provided address or will query from database
    this.poolAddress = config.poolAddress || null;
    this.chainType = config.chainType;
    this.chainId = config.chainId;
    this.networkType = config.networkType;
    this.poolInterface = new ethers.Interface(COMMODITY_POOL_ABI);
  }
  
  /**
   * Get pool address from database or config
   */
  private async getPoolAddress(): Promise<string> {
    // If already have address, return it
    if (this.poolAddress) {
      return this.poolAddress;
    }
    
    // Query from database
    const network = this.networkType === 'testnet' ? 'hoodi' : 'mainnet';
    const environment = this.networkType;
    
    const address = await TradeFinanceContractService.getProxyAddress(
      'commodity_lending_pool',
      network,
      environment
    );
    
    if (!address) {
      throw new Error(`CommodityLendingPool not found in database for ${network}/${environment}`);
    }
    
    // Cache it
    this.poolAddress = address;
    return address;
  }
  
  // ============================================================================
  // SUPPLY COLLATERAL
  // ============================================================================
  
  /**
   * Supply commodity token as collateral
   * @example
   * ```typescript
   * const result = await poolService.supply({
   *   userAddress: '0x123...',
   *   commodityToken: '0xabc...',
   *   amount: '1000000000000000000', // 1 token (18 decimals)
   *   privateKey: '0x...'
   * });
   * ```
   */
  async supply(params: SupplyParams): Promise<BroadcastResult> {
    const poolAddress = await this.getPoolAddress();
    
    // 1. Encode function data
    const data = this.poolInterface.encodeFunctionData('supply', [
      params.commodityToken,
      ethers.parseEther(params.amount)
    ]);
    
    // 2. Build transaction
    const tx: TransactionRequest = {
      from: params.userAddress,
      to: poolAddress,
      data,
      chainId: this.chainId
    };
    
    // 3. Estimate gas (uses existing TransactionBuilder)
    const gasEstimate: GasEstimate = await transactionBuilder.estimateGas(
      this.chainType,
      tx,
      this.networkType
    );
    
    // 4. Sign transaction
    const signedTx: SignedTransaction = await transactionBuilder.signTransaction(
      this.chainType,
      { ...tx, gasLimit: gasEstimate.gasLimit },
      params.privateKey,
      this.networkType
    );
    
    // 5. Broadcast
    return transactionBuilder.broadcastTransaction(
      this.chainType,
      signedTx,
      this.networkType
    );
  }
  
  // ============================================================================
  // WITHDRAW COLLATERAL
  // ============================================================================
  
  /**
   * Withdraw commodity collateral from pool
   */
  async withdraw(params: WithdrawParams): Promise<BroadcastResult> {
    const poolAddress = await this.getPoolAddress();
    
    const data = this.poolInterface.encodeFunctionData('withdraw', [
      params.commodityToken,
      ethers.parseEther(params.amount)
    ]);
    
    const tx: TransactionRequest = {
      from: params.userAddress,
      to: poolAddress,
      data,
      chainId: this.chainId
    };
    
    const gasEstimate = await transactionBuilder.estimateGas(
      this.chainType,
      tx,
      this.networkType
    );
    
    const signedTx = await transactionBuilder.signTransaction(
      this.chainType,
      { ...tx, gasLimit: gasEstimate.gasLimit },
      params.privateKey,
      this.networkType
    );
    
    return transactionBuilder.broadcastTransaction(
      this.chainType,
      signedTx,
      this.networkType
    );
  }
  
  // ============================================================================
  // BORROW
  // ============================================================================
  
  /**
   * Borrow against commodity collateral
   */
  async borrow(params: BorrowParams): Promise<BroadcastResult> {
    const poolAddress = await this.getPoolAddress();
    
    const data = this.poolInterface.encodeFunctionData('borrow', [
      params.asset,
      ethers.parseEther(params.amount)
    ]);
    
    const tx: TransactionRequest = {
      from: params.userAddress,
      to: poolAddress,
      data,
      chainId: this.chainId
    };
    
    const gasEstimate = await transactionBuilder.estimateGas(
      this.chainType,
      tx,
      this.networkType
    );
    
    const signedTx = await transactionBuilder.signTransaction(
      this.chainType,
      { ...tx, gasLimit: gasEstimate.gasLimit },
      params.privateKey,
      this.networkType
    );
    
    return transactionBuilder.broadcastTransaction(
      this.chainType,
      signedTx,
      this.networkType
    );
  }
  
  // ============================================================================
  // REPAY
  // ============================================================================
  
  /**
   * Repay borrowed amount
   */
  async repay(params: RepayParams): Promise<BroadcastResult> {
    const poolAddress = await this.getPoolAddress();
    
    const data = this.poolInterface.encodeFunctionData('repay', [
      params.asset,
      ethers.parseEther(params.amount)
    ]);
    
    const tx: TransactionRequest = {
      from: params.userAddress,
      to: poolAddress,
      data,
      chainId: this.chainId
    };
    
    const gasEstimate = await transactionBuilder.estimateGas(
      this.chainType,
      tx,
      this.networkType
    );
    
    const signedTx = await transactionBuilder.signTransaction(
      this.chainType,
      { ...tx, gasLimit: gasEstimate.gasLimit },
      params.privateKey,
      this.networkType
    );
    
    return transactionBuilder.broadcastTransaction(
      this.chainType,
      signedTx,
      this.networkType
    );
  }
  
  // ============================================================================
  // LIQUIDATE
  // ============================================================================
  
  /**
   * Liquidate undercollateralized position
   */
  async liquidate(params: LiquidateParams): Promise<BroadcastResult> {
    const poolAddress = await this.getPoolAddress();
    
    const data = this.poolInterface.encodeFunctionData('liquidate', [
      params.borrower,
      params.collateralAsset,
      params.debtAsset,
      ethers.parseEther(params.debtToCover),
      params.receivecToken
    ]);
    
    const tx: TransactionRequest = {
      from: params.liquidatorAddress,
      to: poolAddress,
      data,
      chainId: this.chainId
    };
    
    const gasEstimate = await transactionBuilder.estimateGas(
      this.chainType,
      tx,
      this.networkType
    );
    
    const signedTx = await transactionBuilder.signTransaction(
      this.chainType,
      { ...tx, gasLimit: gasEstimate.gasLimit },
      params.liquidatorPrivateKey,
      this.networkType
    );
    
    return transactionBuilder.broadcastTransaction(
      this.chainType,
      signedTx,
      this.networkType
    );
  }
  
  // ============================================================================
  // VIEW FUNCTIONS (READ-ONLY, NO TRANSACTION)
  // ============================================================================
  
  /**
   * Get user's health factor and account data
   * @returns Health factor and collateral/debt details
   */
  async getHealthFactor(userAddress: string): Promise<HealthFactorResult> {
    // TODO: Implement RPC call to read contract state
    // This is a read-only call, no transaction needed
    throw new Error('Not implemented - requires RPC provider integration');
  }
  
  /**
   * Get reserve data for a commodity asset
   */
  async getReserveData(assetAddress: string): Promise<any> {
    throw new Error('Not implemented - requires RPC provider integration');
  }
}

// ============================================================================
// SINGLETON INSTANCE (Optional - can be instantiated per pool)
// ============================================================================

/**
 * Create a pool service instance
 * Now automatically queries pool address from database if not provided
 * 
 * @example
 * ```typescript
 * // Option 1: Manual address (legacy)
 * const poolService = createCommodityPoolService({
 *   poolAddress: '0x123...',
 *   chainType: ChainType.ETHEREUM,
 *   chainId: 11155111,
 *   networkType: 'testnet'
 * });
 * 
 * // Option 2: Auto-query from database (recommended)
 * const poolService = createCommodityPoolService({
 *   chainType: ChainType.ETHEREUM,
 *   chainId: 8898,
 *   networkType: 'testnet'
 * });
 * ```
 */
export function createCommodityPoolService(config: CommodityPoolConfig): CommodityPoolService {
  return new CommodityPoolService(config);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse health factor from contract response
 */
export function parseHealthFactor(healthFactorWei: bigint): number {
  // Health factor is stored with 18 decimals
  return Number(ethers.formatEther(healthFactorWei));
}

/**
 * Check if position is liquidatable
 */
export function isLiquidatable(healthFactor: number): boolean {
  return healthFactor < 1.0;
}

/**
 * Get liquidation urgency level
 */
export function getLiquidationUrgency(healthFactor: number): 'safe' | 'warning' | 'urgent' | 'critical' {
  if (healthFactor >= 1.1) return 'safe';
  if (healthFactor >= 1.0) return 'warning';
  if (healthFactor >= 0.95) return 'urgent';
  return 'critical';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CommodityPoolService;
