/**
 * Vault Service - Multi-Network Orchestrator
 * 
 * Routes vault operations to blockchain-specific adapters
 * Supports Injective, Ethereum, Polygon, and other EVM chains
 * 
 * ARCHITECTURE:
 * - Blockchain-agnostic API
 * - Routes to chain-specific adapters
 * - Uses environment variables for RPC configuration
 * - Database integration for all operations
 */

import { InjectiveVaultAdapter } from './adapters/InjectiveVaultAdapter';
import { EVMVaultAdapter } from './adapters/EVMVaultAdapter';

import {
  DeployVaultParams,
  DepositParams,
  WithdrawParams,
  UpdateRateParams,
  DeploymentResult,
  VaultInfo,
  VaultPosition,
  VaultStrategy
} from './types';

// ============================================================================
// ORCHESTRATOR SERVICE
// ============================================================================

export class VaultService {
  /**
   * Deploy vault contract
   * Routes to appropriate blockchain adapter
   * 
   * @param params - Deployment parameters including blockchain and network
   * @param deployerPrivateKey - Private key for deployment
   * @param useHSM - Whether to use HSM for signing
   * @returns Deployment result with contract address
   */
  static async deployVault(
    params: DeployVaultParams,
    deployerPrivateKey: string,
    useHSM: boolean = false
  ): Promise<DeploymentResult> {
    const adapter = this.getAdapter(params.blockchain, params.network);
    return adapter.deployVault(params, deployerPrivateKey, useHSM);
  }

  /**
   * Deposit underlying tokens to vault
   * 
   * @param params - Deposit parameters
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param userPrivateKey - User's private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash and shares received
   */
  static async deposit(
    params: DepositParams,
    blockchain: string,
    network: string,
    userPrivateKey: string,
    useHSM: boolean = false
  ): Promise<{ txHash: string; shares: string }> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.deposit(params, userPrivateKey, useHSM);
  }

  /**
   * Withdraw underlying tokens from vault
   * 
   * @param params - Withdrawal parameters
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param userPrivateKey - User's private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash and amount received
   */
  static async withdraw(
    params: WithdrawParams,
    blockchain: string,
    network: string,
    userPrivateKey: string,
    useHSM: boolean = false
  ): Promise<{ txHash: string; amount: string }> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.withdraw(params, userPrivateKey, useHSM);
  }

  /**
   * Update vault exchange rate (backend oracle only)
   * 
   * @param params - Rate update parameters
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash
   */
  static async updateExchangeRate(
    params: UpdateRateParams,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.updateExchangeRate(params, oraclePrivateKey, useHSM);
  }

  /**
   * Add yield strategy to vault
   * 
   * @param vaultAddress - Vault contract address
   * @param strategyName - Strategy name
   * @param allocationPct - Allocation percentage (basis points)
   * @param targetApy - Target APY (basis points)
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash
   */
  static async addStrategy(
    vaultAddress: string,
    strategyName: string,
    allocationPct: number,
    targetApy: number,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.addStrategy(
      vaultAddress,
      strategyName,
      allocationPct,
      targetApy,
      oraclePrivateKey,
      useHSM
    );
  }

  /**
   * Update strategy allocation
   * 
   * @param vaultAddress - Vault contract address
   * @param strategyName - Strategy name
   * @param allocationPct - New allocation percentage (basis points)
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Transaction hash
   */
  static async updateStrategyAllocation(
    vaultAddress: string,
    strategyName: string,
    allocationPct: number,
    blockchain: string,
    network: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.updateStrategyAllocation(
      vaultAddress,
      strategyName,
      allocationPct,
      oraclePrivateKey,
      useHSM
    );
  }

  /**
   * Get vault information
   * 
   * @param vaultAddress - Vault contract address
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns Vault information
   */
  static async getVaultInfo(
    vaultAddress: string,
    blockchain: string,
    network: string
  ): Promise<VaultInfo> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.getVaultInfo(vaultAddress);
  }

  /**
   * Get user's vault position
   * 
   * @param vaultAddress - Vault contract address
   * @param userAddress - User's address
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns User's position
   */
  static async getUserPosition(
    vaultAddress: string,
    userAddress: string,
    blockchain: string,
    network: string
  ): Promise<VaultPosition> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.getUserPosition(vaultAddress, userAddress);
  }

  /**
   * Get all strategies for a vault
   * 
   * @param vaultAddress - Vault contract address
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns List of strategies
   */
  static async getStrategies(
    vaultAddress: string,
    blockchain: string,
    network: string
  ): Promise<VaultStrategy[]> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.getStrategies(vaultAddress);
  }

  /**
   * Check if contract is a valid vault
   * 
   * @param contractAddress - Contract address to check
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns True if valid vault contract
   */
  static async isValidVault(
    contractAddress: string,
    blockchain: string,
    network: string
  ): Promise<boolean> {
    const adapter = this.getAdapter(blockchain, network);
    return adapter.isValidVault(contractAddress);
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
        return new InjectiveVaultAdapter(net);

      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'base':
      case 'hoodi':
      case 'avalanche':
      case 'bsc':
        return new EVMVaultAdapter();

      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }
}
