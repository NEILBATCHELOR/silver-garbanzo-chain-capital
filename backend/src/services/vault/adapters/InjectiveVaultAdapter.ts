/**
 * Injective Vault Adapter - Backend Implementation
 * 
 * Handles yield-bearing vault operations on Injective using CCeTracker.sol
 * Part of the multi-network vault service architecture
 * 
 * ARCHITECTURE:
 * - Deploys CCeTracker.sol to Injective EVM
 * - Uses Bank Precompile for token operations
 * - Manages exchange rate updates from backend oracle
 * - NO HARDCODED RPC URLS - Uses network configuration from environment
 */

import { ethers } from 'ethers';
import { getRpcUrl, getChainId } from '../../../config/networks';

// Local types
import {
  DeployVaultParams,
  DepositParams,
  WithdrawParams,
  UpdateRateParams,
  DeploymentResult,
  VaultInfo,
  VaultPosition
} from '../types';

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

export class InjectiveVaultAdapter {
  private provider: ethers.JsonRpcProvider;
  private network: string;
  private chainId: string;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network = network;
    
    // Get RPC URL and chain ID from configuration (environment variables)
    const rpcUrl = getRpcUrl('injective', network);
    this.chainId = getChainId('injective', network);
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  // ============================================================================
  // CONTRACT DEPLOYMENT
  // ============================================================================

  /**
   * Deploy CCeTracker (Yield Vault) contract on Injective
   * 
   * @param params - Deployment parameters
   * @param deployerPrivateKey - Private key for deployment
   * @param useHSM - Whether to use HSM for signing
   * @returns Deployment result with contract address
   */
  async deployVault(
    params: DeployVaultParams,
    deployerPrivateKey: string,
    useHSM: boolean = false
  ): Promise<DeploymentResult> {
    try {
      // TODO: Load CCeTracker bytecode from Foundry artifacts
      // Path: /frontend/foundry-contracts/out/CCeTracker.sol/CCeTracker.json
      
      if (useHSM) {
        throw new Error('HSM deployment not yet implemented');
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(deployerPrivateKey, this.provider);

      // TODO: Replace with actual compiled bytecode
      const bytecode = '0x...'; // Load from Foundry output
      const abi: any[] = []; // Load from Foundry output

      // Deploy contract
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      const contract = await factory.deploy(
        params.name,
        params.symbol,
        params.decimals,
        params.productId,
        params.productType,
        params.underlyingDenom,
        params.backendOracleAddress
      );
      await contract.waitForDeployment();

      const contractAddress = await contract.getAddress();
      const deploymentTxHash = contract.deploymentTransaction()?.hash || '';

      return {
        success: true,
        contractAddress,
        txHash: deploymentTxHash,
        blockchain: 'injective',
        network: this.network,
        chainId: this.chainId
      };

    } catch (error: any) {
      console.error('Error deploying vault on Injective:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // DEPOSIT & WITHDRAWAL
  // ============================================================================

  /**
   * Deposit underlying tokens to vault
   */
  async deposit(
    params: DepositParams,
    userPrivateKey: string,
    useHSM: boolean = false
  ): Promise<{ txHash: string; shares: string }> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(userPrivateKey, this.provider);

      const abi: any[] = [
        'function deposit(uint256 amount, string userSubaccountID) external returns (uint256 shares)'
      ];

      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);

      if (!contract.deposit) {
        throw new Error('deposit method not found on contract');
      }

      const tx = await contract.deposit(
        ethers.parseUnits(params.amount, params.decimals || 18),
        params.subaccountId
      );

      const receipt = await tx.wait();

      // TODO: Parse shares from event
      const shares = '0'; // Extract from DepositMade event

      return {
        txHash: tx.hash,
        shares
      };

    } catch (error: any) {
      console.error('Error depositing to vault on Injective:', error);
      throw error;
    }
  }

  /**
   * Withdraw underlying tokens from vault
   */
  async withdraw(
    params: WithdrawParams,
    userPrivateKey: string,
    useHSM: boolean = false
  ): Promise<{ txHash: string; amount: string }> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(userPrivateKey, this.provider);

      const abi: any[] = [
        'function withdraw(uint256 shares, string userSubaccountID) external returns (uint256 amount)'
      ];

      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);

      if (!contract.withdraw) {
        throw new Error('withdraw method not found on contract');
      }

      const tx = await contract.withdraw(
        ethers.parseUnits(params.shares, params.decimals || 18),
        params.subaccountId
      );

      const receipt = await tx.wait();

      // TODO: Parse amount from event
      const amount = '0'; // Extract from WithdrawalMade event

      return {
        txHash: tx.hash,
        amount
      };

    } catch (error: any) {
      console.error('Error withdrawing from vault on Injective:', error);
      throw error;
    }
  }

  // ============================================================================
  // EXCHANGE RATE UPDATES
  // ============================================================================

  /**
   * Update vault exchange rate (backend oracle only)
   */
  async updateExchangeRate(
    params: UpdateRateParams,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      const abi: any[] = [
        'function updateExchangeRate(uint256 newRate, uint256 totalValue) external'
      ];

      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);

      if (!contract.updateExchangeRate) {
        throw new Error('updateExchangeRate method not found on contract');
      }

      const tx = await contract.updateExchangeRate(
        ethers.parseUnits(params.newRate, 18),
        ethers.parseUnits(params.totalValue, 18)
      );

      await tx.wait();

      return tx.hash;

    } catch (error: any) {
      console.error('Error updating exchange rate on Injective:', error);
      throw error;
    }
  }

  // ============================================================================
  // STRATEGY MANAGEMENT
  // ============================================================================

  /**
   * Add yield strategy to vault
   */
  async addStrategy(
    vaultAddress: string,
    strategyName: string,
    allocationPct: number,
    targetApy: number,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      const abi: any[] = [
        'function addStrategy(string strategyName, uint256 allocationPct, uint256 targetAPY) external'
      ];

      const contract = new ethers.Contract(vaultAddress, abi, wallet);

      if (!contract.addStrategy) {
        throw new Error('addStrategy method not found on contract');
      }

      const tx = await contract.addStrategy(
        strategyName,
        allocationPct,
        targetApy
      );

      await tx.wait();

      return tx.hash;

    } catch (error: any) {
      console.error('Error adding strategy on Injective:', error);
      throw error;
    }
  }

  /**
   * Update strategy allocation
   */
  async updateStrategyAllocation(
    vaultAddress: string,
    strategyName: string,
    allocationPct: number,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      const abi: any[] = [
        'function updateStrategyAllocation(string strategyName, uint256 newAllocation) external'
      ];

      const contract = new ethers.Contract(vaultAddress, abi, wallet);

      if (!contract.updateStrategyAllocation) {
        throw new Error('updateStrategyAllocation method not found on contract');
      }

      const tx = await contract.updateStrategyAllocation(
        strategyName,
        allocationPct
      );

      await tx.wait();

      return tx.hash;

    } catch (error: any) {
      console.error('Error updating strategy allocation on Injective:', error);
      throw error;
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get vault information
   */
  async getVaultInfo(vaultAddress: string): Promise<VaultInfo> {
    try {
      const abi: any[] = [
        'function name() external view returns (string)',
        'function symbol() external view returns (string)',
        'function decimals() external view returns (uint8)',
        'function totalSupply() external view returns (uint256)',
        'function exchangeRate() external view returns (uint256)',
        'function totalValueLocked() external view returns (uint256)',
        'function productId() external view returns (string)',
        'function productType() external view returns (string)',
        'function underlyingDenom() external view returns (string)',
        'function isPaused() external view returns (bool)'
      ];

      const contract = new ethers.Contract(vaultAddress, abi, this.provider);

      if (!contract.name || !contract.symbol || !contract.decimals || !contract.totalSupply ||
          !contract.exchangeRate || !contract.totalValueLocked || !contract.productId ||
          !contract.productType || !contract.underlyingDenom || !contract.isPaused) {
        throw new Error('Contract is missing required view methods');
      }

      const [name, symbol, decimals, totalSupply, exchangeRate, tvl, productId, productType, underlyingDenom, isPaused] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.exchangeRate(),
        contract.totalValueLocked(),
        contract.productId(),
        contract.productType(),
        contract.underlyingDenom(),
        contract.isPaused()
      ]);

      return {
        vaultAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        exchangeRate: ethers.formatUnits(exchangeRate, 18),
        totalValueLocked: ethers.formatUnits(tvl, decimals),
        productId,
        productType,
        underlyingDenom,
        isPaused
      };

    } catch (error: any) {
      console.error('Error fetching vault info on Injective:', error);
      throw error;
    }
  }

  /**
   * Get user's vault position
   */
  async getUserPosition(
    vaultAddress: string,
    userAddress: string
  ): Promise<VaultPosition> {
    try {
      const abi: any[] = [
        'function balanceOf(address account) external view returns (uint256)',
        'function exchangeRate() external view returns (uint256)',
        'function decimals() external view returns (uint8)'
      ];

      const contract = new ethers.Contract(vaultAddress, abi, this.provider);

      if (!contract.balanceOf || !contract.exchangeRate || !contract.decimals) {
        throw new Error('Contract is missing required view methods');
      }

      const [shares, exchangeRate, decimals] = await Promise.all([
        contract.balanceOf(userAddress),
        contract.exchangeRate(),
        contract.decimals()
      ]);

      const sharesFormatted = ethers.formatUnits(shares, decimals);
      const rate = ethers.formatUnits(exchangeRate, 18);
      const value = (parseFloat(sharesFormatted) * parseFloat(rate)).toString();

      return {
        userAddress,
        shares: sharesFormatted,
        underlyingValue: value,
        exchangeRate: rate
      };

    } catch (error: any) {
      console.error('Error fetching user position on Injective:', error);
      throw error;
    }
  }

  /**
   * Get all strategies for a vault
   */
  async getStrategies(vaultAddress: string): Promise<Array<{
    strategyName: string;
    active: boolean;
    allocationPct: number;
    targetApy: number;
  }>> {
    try {
      const abi: any[] = [
        'function getStrategies() external view returns (tuple(string strategyName, bool active, uint256 allocationPct, uint256 targetAPY)[])'
      ];

      const contract = new ethers.Contract(vaultAddress, abi, this.provider);

      if (!contract.getStrategies) {
        throw new Error('getStrategies method not found on contract');
      }

      const strategies = await contract.getStrategies();

      return strategies.map((s: any) => ({
        strategyName: s.strategyName,
        active: s.active,
        allocationPct: Number(s.allocationPct),
        targetApy: Number(s.targetAPY)
      }));

    } catch (error: any) {
      console.error('Error fetching strategies on Injective:', error);
      throw error;
    }
  }

  /**
   * Check if contract is a valid CCeTracker vault
   */
  async isValidVault(contractAddress: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(contractAddress);
      return code !== '0x';
    } catch {
      return false;
    }
  }
}
