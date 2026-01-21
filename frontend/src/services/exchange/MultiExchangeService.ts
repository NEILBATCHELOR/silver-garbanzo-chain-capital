/**
 * MultiExchangeService - Multi-Chain Exchange Operations
 * 
 * Blockchain-agnostic service for deploying and managing market makers,
 * redemption contracts, and yield vaults across multiple chains.
 * 
 * Pattern: Similar to FactoryDeploymentService - chain-agnostic with adapters
 */

import { supabase } from '@/infrastructure/database/client';
import {
  DeployMarketMakerParams,
  ConfigureMarketParams,
  ProvideLiquidityParams,
  CancelOrderParams,
  UpdateMarketConfigParams,
  DeploymentResult,
  ConfigurationResult,
  LiquidityResult,
  CancelResult,
  MarketInfo,
  ExchangeContract,
  ProductMarket,
  IExchangeAdapter,
  ChainInfo,
  AbiLoadParams,
  LoadedAbi,
  ContractMaster
} from './types';

export class MultiExchangeService {
  // ============================================================================
  // ABI MANAGEMENT - DATABASE DRIVEN
  // ============================================================================

  /**
   * Load ABI from contract_masters table
   * 
   * STRATEGY:
   * 1. Query by contract_type, network, environment
   * 2. Filter to active contracts only
   * 3. If version specified, use exact match
   * 4. Otherwise, use latest version (sort by version DESC)
   * 5. Return ABI + metadata
   * 
   * UPGRADE HANDLING:
   * - Multiple versions can exist per network
   * - is_active = true for current version
   * - deprecated_at set for old versions
   * - upgrade_history tracks version lineage
   */
  static async loadAbi(params: AbiLoadParams): Promise<LoadedAbi> {
    try {
      // Build query
      let query = supabase
        .from('contract_masters')
        .select('*')
        .eq('contract_type', params.contractType)
        .eq('network', params.network)
        .eq('environment', params.environment)
        .eq('is_active', true); // Only active contracts

      // If version specified, use exact match
      if (params.version) {
        query = query.eq('version', params.version);
      }

      // Execute query
      const { data, error } = await query
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        throw new Error(
          `Failed to load ABI for ${params.contractType} on ${params.network}/${params.environment}: ${error?.message || 'No active contract found'}`
        );
      }

      const contract = data as ContractMaster;

      return {
        abi: contract.abi || [],
        bytecode: contract.deployment_data?.bytecode,
        version: contract.version,
        contractAddress: contract.is_template ? undefined : contract.contract_address,
        isTemplate: contract.is_template
      };
    } catch (error) {
      console.error('Error loading ABI:', error);
      throw error;
    }
  }

  /**
   * Get all versions of a contract type on a network
   * Useful for upgrade management
   */
  static async getContractVersions(
    contractType: string,
    network: string,
    environment: string
  ): Promise<ContractMaster[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .order('deployed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get contract versions: ${error.message}`);
    }

    return data as ContractMaster[];
  }

  // ============================================================================
  // MARKET MAKER DEPLOYMENT
  // ============================================================================

  /**
   * Deploy market maker contract
   */
  static async deployMarketMaker(
    params: DeployMarketMakerParams
  ): Promise<DeploymentResult> {
    try {
      // Get adapter for blockchain
      const adapter = this.getAdapter(params.blockchain);
      
      // Deploy contract
      const result = await adapter.deployMarketMaker(params);
      
      if (!result.success || !result.contractAddress) {
        return result;
      }
      
      // Save to database
      await this.saveContractToDatabase({
        contractType: 'market_maker',
        contractName: params.contractName,
        contractAddress: result.contractAddress,
        blockchain: params.blockchain,
        network: params.environment,
        chainId: result.chainId || '',
        deployerAddress: params.backendOracleAddress,
        deploymentTxHash: result.transactionHash,
        deploymentBlockNumber: result.blockNumber?.toString(),
        backendOracleAddress: params.backendOracleAddress,
        projectId: params.projectId,
        productId: params.productId,
        productType: params.productType
      });
      
      return result;
    } catch (error) {
      console.error('Error deploying market maker:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Configure market for a product
   */
  static async configureMarket(
    params: ConfigureMarketParams
  ): Promise<ConfigurationResult> {
    try {
      // Get adapter for blockchain
      const adapter = this.getAdapter(params.blockchain);
      
      // Configure market on-chain
      const result = await adapter.configureMarket(params);
      
      if (!result.success) {
        return result;
      }
      
      // Save configuration to database
      const { data, error } = await supabase
        .from('product_markets')
        .insert({
          project_id: params.projectId,
          product_id: params.productId,
          blockchain: params.blockchain,
          network: params.network,
          chain_id: await this.getChainId(params.blockchain, params.network),
          market_id: params.marketId,
          market_maker_contract: params.contractAddress,
          spread_bps: params.spread,
          order_size: params.orderSize,
          min_order_size: params.minOrderSize,
          max_order_size: params.maxOrderSize,
          use_nav_pricing: params.useNAVPricing || false,
          oracle_config: params.oracleConfig || null,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving market configuration:', error);
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }
      
      // Log operation
      await this.logOperation({
        marketId: params.marketId,
        blockchain: params.blockchain,
        network: params.network,
        projectId: params.projectId,
        productId: params.productId,
        contractAddress: params.contractAddress,
        operationType: 'create',
        parameters: params,
        executor: params.contractAddress,
        success: true
      });
      
      return {
        ...result,
        productMarketId: data.id
      };
    } catch (error) {
      console.error('Error configuring market:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Provide liquidity to market
   */
  static async provideLiquidity(
    params: ProvideLiquidityParams
  ): Promise<LiquidityResult> {
    try {
      // Get adapter for blockchain
      const adapter = this.getAdapter(params.blockchain);
      
      // Provide liquidity
      const result = await adapter.provideLiquidity(params);
      
      if (!result.success) {
        return result;
      }
      
      // Update last order timestamp
      await supabase
        .from('product_markets')
        .update({
          last_order_at: new Date().toISOString(),
          total_orders_placed: supabase.rpc('increment', { value: 2 }) // Buy + Sell
        })
        .eq('market_id', params.marketId)
        .eq('blockchain', params.blockchain)
        .eq('network', params.network);
      
      // Log operation
      await this.logOperation({
        marketId: params.marketId,
        blockchain: params.blockchain,
        network: params.network,
        productId: params.productId,
        contractAddress: params.contractAddress,
        operationType: 'create',
        parameters: params,
        executor: params.subaccountId,
        transactionHash: result.transactionHash,
        success: true
      });
      
      return result;
    } catch (error) {
      console.error('Error providing liquidity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Cancel order
   */
  static async cancelOrder(
    params: CancelOrderParams
  ): Promise<CancelResult> {
    try {
      // Get adapter for blockchain
      const adapter = this.getAdapter(params.blockchain);
      
      // Cancel order
      const result = await adapter.cancelOrder(params);
      
      if (!result.success) {
        return result;
      }
      
      // Log operation
      await this.logOperation({
        marketId: params.marketId,
        blockchain: params.blockchain,
        network: params.network,
        productId: params.productId,
        operationType: 'cancel_order',
        parameters: { orderHash: params.orderHash },
        executor: params.subaccountId,
        transactionHash: result.transactionHash,
        success: true
      });
      
      return result;
    } catch (error) {
      console.error('Error canceling order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Update market configuration
   */
  static async updateMarketConfig(
    params: UpdateMarketConfigParams
  ): Promise<ConfigurationResult> {
    try {
      // Get adapter for blockchain
      const adapter = this.getAdapter(params.blockchain);
      
      // Update configuration on-chain
      const result = await adapter.updateMarketConfig(params);
      
      if (!result.success) {
        return result;
      }
      
      // Update database
      const updateData: any = {};
      if (params.newSpread !== undefined) {
        updateData.spread_bps = params.newSpread;
      }
      if (params.newOrderSize !== undefined) {
        updateData.order_size = params.newOrderSize;
      }
      if (params.pause !== undefined) {
        updateData.is_active = !params.pause;
      }
      
      await supabase
        .from('product_markets')
        .update(updateData)
        .eq('market_id', params.marketId)
        .eq('blockchain', params.blockchain)
        .eq('network', params.network);
      
      // Log operation
      await this.logOperation({
        marketId: params.marketId,
        blockchain: params.blockchain,
        network: params.network,
        productId: params.productId,
        contractAddress: params.contractAddress,
        operationType: params.pause ? 'pause' : 'update_spread',
        parameters: params,
        executor: params.contractAddress,
        transactionHash: result.transactionHash,
        success: true
      });
      
      return result;
    } catch (error) {
      console.error('Error updating market config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get market information
   */
  static async getMarketInfo(
    marketId: string,
    blockchain: string,
    network: string
  ): Promise<MarketInfo | null> {
    try {
      // Get from database
      const { data, error } = await supabase
        .from('product_markets')
        .select('*')
        .eq('market_id', marketId)
        .eq('blockchain', blockchain)
        .eq('network', network)
        .single();
      
      if (error || !data) {
        console.error('Error fetching market info:', error);
        return null;
      }
      
      return {
        marketId: data.market_id || '',
        ticker: '', // Would need to fetch from market
        baseDenom: '', // Would need to fetch from market
        quoteDenom: '', // Would need to fetch from market
        blockchain: data.blockchain,
        network: data.network,
        spreadBps: data.spread_bps || 0,
        orderSize: data.order_size || '0',
        isActive: data.is_active,
        lastOrderAt: data.last_order_at,
        totalOrders: data.total_orders_placed || 0,
        totalVolume: data.total_volume || '0'
      };
    } catch (error) {
      console.error('Error getting market info:', error);
      return null;
    }
  }
  
  /**
   * Get product markets
   */
  static async getProductMarkets(
    projectId: string,
    blockchain?: string,
    network?: string
  ): Promise<ProductMarket[]> {
    try {
      let query = supabase
        .from('product_markets')
        .select('*')
        .eq('project_id', projectId);
      
      if (blockchain) {
        query = query.eq('blockchain', blockchain);
      }
      if (network) {
        query = query.eq('network', network);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching product markets:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting product markets:', error);
      return [];
    }
  }
  
  /**
   * Get exchange contracts
   */
  static async getExchangeContracts(
    blockchain?: string,
    network?: string,
    contractType?: 'market_maker' | 'redemption' | 'vault'
  ): Promise<ExchangeContract[]> {
    try {
      let query = supabase
        .from('exchange_contracts')
        .select('*')
        .eq('is_active', true);
      
      if (blockchain) {
        query = query.eq('blockchain', blockchain);
      }
      if (network) {
        query = query.eq('network', network);
      }
      if (contractType) {
        query = query.eq('contract_type', contractType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching exchange contracts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting exchange contracts:', error);
      return [];
    }
  }
  
  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================
  
  /**
   * Get adapter for blockchain
   */
  private static getAdapter(blockchain: string): IExchangeAdapter {
    // Import adapters (lazy loaded)
    const { InjectiveExchangeAdapter } = require('./adapters/InjectiveExchangeAdapter');
    const { EVMExchangeAdapter } = require('./adapters/EVMExchangeAdapter');
    
    switch (blockchain.toLowerCase()) {
      case 'injective':
        return new InjectiveExchangeAdapter();
      
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'base':
      case 'avalanche':
      case 'bsc':
        return new EVMExchangeAdapter();
      
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }
  
  /**
   * Save contract to database
   */
  private static async saveContractToDatabase(params: {
    contractType: 'market_maker' | 'redemption' | 'vault';
    contractName: string;
    contractAddress: string;
    blockchain: string;
    network: string;
    chainId: string;
    deployerAddress: string;
    deploymentTxHash?: string;
    deploymentBlockNumber?: string;
    backendOracleAddress?: string;
    projectId?: string;
    productId?: string;
    productType?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('exchange_contracts')
      .insert({
        contract_type: params.contractType,
        contract_name: params.contractName,
        contract_address: params.contractAddress,
        blockchain: params.blockchain,
        network: params.network,
        chain_id: params.chainId,
        deployer_address: params.deployerAddress,
        deployment_tx_hash: params.deploymentTxHash,
        deployment_block_number: params.deploymentBlockNumber ? BigInt(params.deploymentBlockNumber) : null,
        deployment_timestamp: new Date().toISOString(),
        backend_oracle_address: params.backendOracleAddress,
        project_id: params.projectId,
        product_id: params.productId,
        product_type: params.productType,
        is_active: true,
        verified: false
      });
    
    if (error) {
      console.error('Error saving contract to database:', error);
      throw error;
    }
  }
  
  /**
   * Log operation to database
   */
  private static async logOperation(params: {
    marketId?: string;
    blockchain: string;
    network: string;
    projectId?: string;
    productId?: string;
    contractAddress?: string;
    operationType: 'create' | 'update_spread' | 'update_size' | 'pause' | 'resume' | 'cancel_order';
    parameters?: any;
    executor: string;
    transactionHash?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const chainId = await this.getChainId(params.blockchain, params.network);
    
    const { error } = await supabase
      .from('market_maker_operations')
      .insert({
        market_id: params.marketId,
        blockchain: params.blockchain,
        network: params.network,
        chain_id: chainId,
        project_id: params.projectId,
        product_id: params.productId,
        contract_address: params.contractAddress,
        operation_type: params.operationType,
        parameters: params.parameters,
        executed_at: new Date().toISOString(),
        executor: params.executor,
        transaction_hash: params.transactionHash,
        success: params.success,
        error_message: params.errorMessage
      });
    
    if (error) {
      console.error('Error logging operation:', error);
      // Don't throw - logging failure shouldn't fail the operation
    }
  }
  
  /**
   * Get chain ID for blockchain/network combination
   */
  private static async getChainId(blockchain: string, network: string): Promise<string> {
    // Map blockchain + network to chain ID
    const chainIds: Record<string, Record<string, string>> = {
      injective: {
        mainnet: '1776',
        testnet: '1439'
      },
      ethereum: {
        mainnet: '1',
        testnet: '11155111' // Sepolia
      },
      polygon: {
        mainnet: '137',
        testnet: '80002' // Mumbai
      },
      // Add more as needed
    };
    
    return chainIds[blockchain]?.[network] || '';
  }
}
