/**
 * Injective Exchange Adapter - Backend Implementation
 * 
 * Handles market maker operations on Injective blockchain using CCMM.sol
 * Part of the multi-network exchange service architecture
 * 
 * ARCHITECTURE:
 * - Deploys CCMM.sol to Injective EVM
 * - Uses Exchange Precompile (0x65) for trading operations
 * - Manages subaccounts for order placement
 * - NO HARDCODED RPC URLS - Uses network configuration from environment
 */

import { ethers } from 'ethers';
import { getRpcUrl, getChainId } from '../../../config/networks';

// Local types
import {
  DeployMarketMakerParams,
  ConfigureMarketParams,
  ProvideLiquidityParams,
  DeploymentResult,
  ConfigurationResult,
  LiquidityResult,
  MarketInfo
} from '../types';

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

export class InjectiveExchangeAdapter {
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
   * Deploy CCMM (ChainCapitalMarketMaker) contract on Injective
   * 
   * @param params - Deployment parameters
   * @param deployerPrivateKey - Private key for deployment
   * @param useHSM - Whether to use HSM for signing
   * @returns Deployment result with contract address
   */
  async deployMarketMaker(
    params: DeployMarketMakerParams,
    deployerPrivateKey: string,
    useHSM: boolean = false
  ): Promise<DeploymentResult> {
    try {
      // TODO: Load CCMM bytecode from Foundry artifacts
      // Path: /frontend/foundry-contracts/out/CCMM.sol/ChainCapitalMarketMaker.json
      
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
      const contract = await factory.deploy(params.backendOracleAddress);
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
      console.error('Error deploying market maker on Injective:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // MARKET CONFIGURATION
  // ============================================================================

  /**
   * Configure product market on CCMM contract
   * 
   * @param params - Configuration parameters
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Configuration result
   */
  async configureMarket(
    params: ConfigureMarketParams,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<ConfigurationResult> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      // TODO: Load CCMM ABI
      const abi: any[] = [
        'function configureProductMarket(string productId, string marketID, string baseDenom, string quoteDenom, string productType, uint256 spread, uint256 orderSize, bool useNAVPricing, uint256 minOrderSize, uint256 maxOrderSize, uint256 maxDailyVolume, uint256 cooldownPeriod, bool pauseTrading) external'
      ];

      const contract = new ethers.Contract(params.contractAddress, abi, wallet);

      if (!contract.configureProductMarket) {
        throw new Error('configureProductMarket method not found on contract');
      }

      // Call configureProductMarket
      const tx = await contract.configureProductMarket(
        params.productId,
        params.marketId,
        params.baseDenom,
        params.quoteDenom,
        params.productType,
        params.spreadBps,
        ethers.parseUnits(params.orderSize, 18),
        params.useNavPricing || false,
        params.minOrderSize ? ethers.parseUnits(params.minOrderSize, 18) : 0,
        params.maxOrderSize ? ethers.parseUnits(params.maxOrderSize, 18) : 0,
        params.maxDailyVolume || 0,
        params.cooldownPeriod || 0,
        false // Don't pause on configuration
      );

      await tx.wait();

      return {
        success: true,
        txHash: tx.hash
      };

    } catch (error: any) {
      console.error('Error configuring market on Injective:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // LIQUIDITY PROVISION
  // ============================================================================

  /**
   * Provide liquidity by placing buy/sell orders via Exchange Precompile
   * 
   * @param params - Liquidity parameters
   * @param oraclePrivateKey - Backend oracle private key
   * @param useHSM - Whether to use HSM for signing
   * @returns Liquidity provision result
   */
  async provideLiquidity(
    params: ProvideLiquidityParams,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<LiquidityResult> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      // TODO: Load CCMM ABI
      const abi: any[] = [
        'function provideLiquidity(string productId, uint256 midPrice, string fundSubaccountID) external'
      ];

      const contract = new ethers.Contract(params.contractAddress, abi, wallet);

      if (!contract.provideLiquidity) {
        throw new Error('provideLiquidity method not found on contract');
      }

      // Call provideLiquidity
      const tx = await contract.provideLiquidity(
        params.productId,
        ethers.parseUnits(params.midPrice, 18),
        params.subaccountId
      );

      await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        ordersPlaced: 2 // Buy and sell orders
      };

    } catch (error: any) {
      console.error('Error providing liquidity on Injective:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  /**
   * Cancel orders for a product
   */
  async cancelOrders(
    contractAddress: string,
    productId: string,
    subaccountId: string,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      const abi: any[] = [
        'function cancelAllOrders(string productId, string fundSubaccountID) external'
      ];

      const contract = new ethers.Contract(contractAddress, abi, wallet);

      if (!contract.cancelAllOrders) {
        throw new Error('cancelAllOrders method not found on contract');
      }

      const tx = await contract.cancelAllOrders(productId, subaccountId);
      await tx.wait();

      return tx.hash;

    } catch (error: any) {
      console.error('Error canceling orders on Injective:', error);
      throw error;
    }
  }

  // ============================================================================
  // MARKET UPDATES
  // ============================================================================

  /**
   * Update market configuration (spread, order size, etc.)
   */
  async updateMarketConfig(
    contractAddress: string,
    productId: string,
    updates: Partial<ConfigureMarketParams>,
    oraclePrivateKey: string,
    useHSM: boolean = false
  ): Promise<string> {
    try {
      if (useHSM) {
        throw new Error('HSM signing not yet implemented');
      }

      const wallet = new ethers.Wallet(oraclePrivateKey, this.provider);

      const abi: any[] = [
        'function updateSpread(string productId, uint256 newSpread) external',
        'function updateOrderSize(string productId, uint256 newSize) external',
        'function pauseProductMarket(string productId) external',
        'function resumeProductMarket(string productId) external'
      ];

      const contract = new ethers.Contract(contractAddress, abi, wallet);

      let tx;

      if (updates.spreadBps !== undefined) {
        if (!contract.updateSpread) {
          throw new Error('updateSpread method not found on contract');
        }
        tx = await contract.updateSpread(productId, updates.spreadBps);
        await tx.wait();
      }

      if (updates.orderSize !== undefined) {
        if (!contract.updateOrderSize) {
          throw new Error('updateOrderSize method not found on contract');
        }
        tx = await contract.updateOrderSize(
          productId,
          ethers.parseUnits(updates.orderSize, 18)
        );
        await tx.wait();
      }

      if (updates.paused !== undefined) {
        if (updates.paused) {
          if (!contract.pauseProductMarket) {
            throw new Error('pauseProductMarket method not found on contract');
          }
          tx = await contract.pauseProductMarket(productId);
        } else {
          if (!contract.resumeProductMarket) {
            throw new Error('resumeProductMarket method not found on contract');
          }
          tx = await contract.resumeProductMarket(productId);
        }
        await tx.wait();
      }

      return tx?.hash || '';

    } catch (error: any) {
      console.error('Error updating market config on Injective:', error);
      throw error;
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get market information from contract
   */
  async getMarketInfo(
    contractAddress: string,
    productId: string
  ): Promise<MarketInfo> {
    try {
      const abi: any[] = [
        'function getProductMarket(string productId) external view returns (tuple(string productId, string marketID, string baseDenom, string quoteDenom, string productType, uint256 spread, uint256 orderSize, bool useNAVPricing, bool pauseTrading, uint256 lastOrderTime, uint256 totalOrdersPlaced, uint256 totalVolume))'
      ];

      const contract = new ethers.Contract(contractAddress, abi, this.provider);

      if (!contract.getProductMarket) {
        throw new Error('getProductMarket method not found on contract');
      }

      const market = await contract.getProductMarket(productId);

      return {
        productId: market.productId,
        marketId: market.marketID,
        baseDenom: market.baseDenom,
        quoteDenom: market.quoteDenom,
        productType: market.productType,
        spreadBps: Number(market.spread),
        orderSize: ethers.formatUnits(market.orderSize, 18),
        useNavPricing: market.useNAVPricing,
        paused: market.pauseTrading,
        lastOrderTime: Number(market.lastOrderTime),
        totalOrders: Number(market.totalOrdersPlaced),
        totalVolume: ethers.formatUnits(market.totalVolume, 18),
        isActive: !market.pauseTrading
      };

    } catch (error: any) {
      console.error('Error fetching market info on Injective:', error);
      throw error;
    }
  }

  /**
   * Check if contract is a valid CCMM
   */
  async isValidMarketMaker(contractAddress: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(contractAddress);
      return code !== '0x';
    } catch {
      return false;
    }
  }
}
