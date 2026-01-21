/**
 * Exchange Service - Multi-Network Orchestrator
 * 
 * Routes exchange operations to blockchain-specific adapters
 * Supports Injective, Ethereum, Polygon, and other EVM chains
 * 
 * ARCHITECTURE:
 * - Blockchain-agnostic API
 * - Routes to chain-specific adapters
 * - Uses environment variables for RPC configuration
 * - Database integration for all operations
 */

import { InjectiveExchangeAdapter } from './adapters/InjectiveExchangeAdapter';
import { EVMExchangeAdapter } from './adapters/EVMExchangeAdapter';

import {
  DeployMarketMakerParams,
  ConfigureMarketParams,
  ProvideLiquidityParams,
  DeploymentResult,
  ConfigurationResult,
  LiquidityResult,
  MarketInfo
} from './types';

// ============================================================================
// ORCHESTRATOR SERVICE
// ============================================================================

export class ExchangeService {
  /**
   * Deploy market maker contract
   * Routes to appropriate blockchain adapter
   * 
   * @param params - Deployment parameters including blockchain and network
   * @param deployerPrivateKey - Private key for deployment
   * @param useHSM - Whether to use HSM for signing
   * @returns Deployment result with contract address
   */
  static async deployMarketMaker(
    params: DeployMarketMakerParams,
    deployerPrivateKey: string,
    useHSM: boolean = false
  ): Promise<DeploymentResult> {
    const adapter = this.getAdapter(params.blockchain, params.network);
    return adapter.deployMarketMaker(params, deployerPrivateKey, useHSM);
  }

  /**
   * Configure product market on deployed contract
   * 
   * @param params - Configuration parameters
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Configuration result
   */
  static async configureMarket(
    params: ConfigureMarketParams,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<ConfigurationResult> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.configureMarket(params, oraclePrivateKey, useHSM);
  }

  /**
   * Provide liquidity by placing orders
   * 
   * @param params - Liquidity parameters
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Liquidity provision result
   */
  static async provideLiquidity(
    params: ProvideLiquidityParams,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<LiquidityResult> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.provideLiquidity(params, oraclePrivateKey, useHSM);
  }

  /**
   * Cancel orders for a product
   * 
   * @param contractAddress - Market maker contract address
   * @param productId - Product ID
   * @param subaccountId - Subaccount ID
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash
   */
  static async cancelOrders(
    contractAddress: string,
    productId: string,
    subaccountId: string,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.cancelOrders(
      contractAddress,
      productId,
      subaccountId,
      oraclePrivateKey,
      useHSM
    );
  }

  /**
   * Update market configuration
   * 
   * @param contractAddress - Market maker contract address
   * @param productId - Product ID
   * @param updates - Configuration updates
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash
   */
  static async updateMarketConfig(
    contractAddress: string,
    productId: string,
    updates: Partial<ConfigureMarketParams>,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.updateMarketConfig(
      contractAddress,
      productId,
      updates,
      oraclePrivateKey,
      useHSM
    );
  }

  /**
   * Get market information
   * 
   * @param contractAddress - Market maker contract address
   * @param productId - Product ID
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns Market information
   */
  static async getMarketInfo(
    contractAddress: string,
    productId: string,
    blockchain: string,
    network: string
  ): Promise<MarketInfo> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.getMarketInfo(contractAddress, productId);
  }

  /**
   * Check if contract is a valid market maker
   * 
   * @param contractAddress - Contract address to check
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns True if valid market maker contract
   */
  static async isValidMarketMaker(
    contractAddress: string,
    blockchain: string,
    network: string
  ): Promise<boolean> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.isValidMarketMaker(contractAddress);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get blockchain-specific adapter
   * 
   * @param blockchain - Blockchain name
   * @param network - Network name (mainnet, testnet)
   * @returns Adapter instance
   */
  private static getAdapter(blockchain: string, network: string): any {
    const chain = blockchain.toLowerCase();
    const net = network.toLowerCase() as 'mainnet' | 'testnet';

    switch (chain) {
      case 'injective':
        return new InjectiveExchangeAdapter(net);

      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'base':
      case 'hoodi':
      case 'avalanche':
      case 'bsc':
        return new EVMExchangeAdapter();

      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }
}
