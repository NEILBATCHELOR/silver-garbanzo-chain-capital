/**
 * EVM Exchange Adapter
 * 
 * Standard EVM implementation for Exchange Service
 * Supports: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC
 * 
 * Uses:
 * - WalletHelper for key management
 * - Database for ABI storage
 * - .env for RPC URLs
 * - Standard DEX integrations (Uniswap, Sushiswap, etc.)
 */

import { ethers } from 'ethers';
import WalletHelper from '../../injective/WalletHelper';
import { getSupabaseClient } from '../../../infrastructure/database/supabase';
import {
  DeployMarketMakerParams,
  DeploymentResult,
  ConfigureMarketParams,
  ConfigurationResult,
  ProvideLiquidityParams,
  LiquidityResult,
  CancelOrdersParams,
  CancelResult,
  UpdateMarketConfigParams,
  MarketInfo,
  IExchangeAdapter
} from '../types';

/**
 * Get RPC URL from environment
 */
function getRPCUrl(blockchain: string, network: string): string {
  const key = `${blockchain.toUpperCase()}_${network.toUpperCase()}_RPC_URL`;
  const url = process.env[key];
  
  if (!url) {
    throw new Error(`RPC URL not configured: ${key} in .env`);
  }
  
  return url;
}

/**
 * Get Chain ID from environment
 */
function getChainId(blockchain: string, network: string): string {
  const key = `${blockchain.toUpperCase()}_${network.toUpperCase()}_CHAIN_ID`;
  const chainId = process.env[key];
  
  if (!chainId) {
    throw new Error(`Chain ID not configured: ${key} in .env`);
  }
  
  return chainId;
}

/**
 * EVM Exchange Adapter
 * 
 * Implements market making on standard EVM chains using DEX integrations
 */
export class EVMExchangeAdapter implements IExchangeAdapter {
  
  /**
   * Deploy CCMM market maker contract
   */
  async deployMarketMaker(params: DeployMarketMakerParams): Promise<DeploymentResult> {
    try {
      console.log(`[EVMExchangeAdapter] Deploying CCMM to ${params.blockchain}/${params.network}`);
      
      // Get RPC URL from .env
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      const chainId = getChainId(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        (params.useHSM ?? false) ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get CCMM bytecode and ABI from database
      // In production, you'd query a contracts_metadata table or similar
      const supabase = getSupabaseClient();
      const { data: contractData, error: contractError } = await supabase
        .from('contract_metadata')
        .select('bytecode, abi')
        .eq('contract_name', 'CCMM')
        .eq('version', 'latest')
        .single();
      
      if (contractError || !contractData) {
        throw new Error('CCMM contract metadata not found in database');
      }
      
      const { bytecode, abi } = contractData;
      
      // Deploy contract
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      const contract = await factory.deploy(params.backendOracleAddress);
      
      await contract.waitForDeployment();
      
      const contractAddress = await contract.getAddress();
      const deploymentTx = contract.deploymentTransaction();
      
      if (!deploymentTx) {
        throw new Error('Deployment transaction not found');
      }
      
      const receipt = await deploymentTx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMExchangeAdapter] CCMM deployed at: ${contractAddress}`);
      
      // Save to database (reuse existing supabase client)
      const { error: dbError } = await supabase
        .from('exchange_contracts')
        .insert({
          contract_type: 'market_maker',
          contract_name: 'ChainCapitalMarketMaker',
          contract_address: contractAddress,
          blockchain: params.blockchain,
          network: params.network,
          chain_id: chainId,
          deployer_address: params.deployerAddress,
          deployment_tx_hash: receipt.hash,
          deployment_block_number: receipt.blockNumber,
          deployment_timestamp: new Date().toISOString(),
          backend_oracle_address: params.backendOracleAddress,
          project_id: params.projectId,
          product_id: params.productId,
          abi_json: abi,
          is_active: true,
          verified: false
        });
      
      if (dbError) {
        console.error('[EVMExchangeAdapter] Database error:', dbError);
        // Don't fail deployment if database save fails
      }
      
      return {
        success: true,
        contractAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('[EVMExchangeAdapter] Deployment error:', error);
      throw error;
    }
  }
  
  /**
   * Configure product market
   */
  async configureMarket(params: ConfigureMarketParams): Promise<ConfigurationResult> {
    try {
      console.log(`[EVMExchangeAdapter] Configuring market for product ${params.productId}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        (params.useHSM ?? false) ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI from database
      const abi = await WalletHelper.getContractABI(params.contractAddress);
      
      // Create contract instance
      const contract = new ethers.Contract(params.contractAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).configureProductMarket !== 'function') {
        throw new Error('configureProductMarket method not found on contract');
      }
      
      // Call configureProductMarket
      const tx = await (contract as any).configureProductMarket(
        params.productId,
        params.marketId,
        params.baseDenom,
        params.quoteDenom,
        params.productType,
        params.spreadBps,
        params.orderSize,
        params.minOrderSize || params.orderSize,
        params.maxOrderSize || ethers.parseEther('1000000').toString(),
        params.useNavPricing || false,
        params.oracleAddress || ethers.ZeroAddress
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMExchangeAdapter] Market configured: ${receipt.hash}`);
      
      // Save to product_markets table
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase
        .from('product_markets')
        .insert({
          project_id: params.projectId,
          product_id: params.productId,
          blockchain: params.blockchain,
          network: params.network,
          chain_id: getChainId(params.blockchain, params.network),
          market_id: params.marketId,
          market_maker_contract: params.contractAddress,
          spread_bps: params.spreadBps,
          order_size: params.orderSize,
          min_order_size: params.minOrderSize,
          max_order_size: params.maxOrderSize,
          use_nav_pricing: params.useNavPricing,
          is_active: true,
          configured_at: new Date().toISOString()
        });
      
      if (dbError) {
        console.error('[EVMExchangeAdapter] Database error:', dbError);
      }
      
      return {
        success: true,
        marketId: params.marketId,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMExchangeAdapter] Configuration error:', error);
      throw error;
    }
  }
  
  /**
   * Provide liquidity (place orders on DEX)
   * 
   * For EVM chains, this integrates with Uniswap, Sushiswap, etc.
   * NOT using Exchange Precompile (that's Injective-only)
   */
  async provideLiquidity(params: ProvideLiquidityParams): Promise<LiquidityResult> {
    try {
      console.log(`[EVMExchangeAdapter] Providing liquidity for ${params.productId}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        (params.useHSM ?? false) ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.contractAddress);
      const contract = new ethers.Contract(params.contractAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).provideLiquidity !== 'function') {
        throw new Error('provideLiquidity method not found on contract');
      }
      
      // For standard EVM chains, provideLiquidity calls CCMM contract
      // which internally places orders on Uniswap/Sushiswap via Router
      const tx = await (contract as any).provideLiquidity(
        params.productId,
        ethers.parseEther(params.midPrice),
        params.subaccountId || ethers.ZeroHash
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMExchangeAdapter] Liquidity provided: ${receipt.hash}`);
      
      // Log operation
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase
        .from('market_maker_operations')
        .insert({
          market_id: params.productId,
          blockchain: params.blockchain,
          network: params.network,
          chain_id: getChainId(params.blockchain, params.network),
          project_id: params.projectId,
          product_id: params.productId,
          contract_address: params.contractAddress,
          operation_type: 'provide_liquidity',
          parameters: {
            midPrice: params.midPrice,
            subaccountId: params.subaccountId
          },
          executor: params.oracleAddress,
          transaction_hash: receipt.hash,
          success: true
        });
      
      if (dbError) {
        console.error('[EVMExchangeAdapter] Database error:', dbError);
      }
      
      return {
        success: true,
        ordersPlaced: 2, // Buy and sell orders
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMExchangeAdapter] Liquidity provision error:', error);
      throw error;
    }
  }
  
  /**
   * Cancel orders on DEX
   */
  async cancelOrders(params: CancelOrdersParams): Promise<CancelResult> {
    try {
      console.log(`[EVMExchangeAdapter] Cancelling orders for ${params.productId}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        (params.useHSM ?? false) ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.contractAddress);
      const contract = new ethers.Contract(params.contractAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).cancelOrders !== 'function') {
        throw new Error('cancelOrders method not found on contract');
      }
      
      const tx = await (contract as any).cancelOrders(
        params.productId,
        params.subaccountId || ethers.ZeroHash
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMExchangeAdapter] Orders cancelled: ${receipt.hash}`);
      
      return {
        success: true,
        ordersCancelled: 2, // Assume buy and sell
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMExchangeAdapter] Cancel orders error:', error);
      throw error;
    }
  }
  
  /**
   * Update market configuration
   */
  async updateMarketConfig(params: UpdateMarketConfigParams): Promise<ConfigurationResult> {
    try {
      console.log(`[EVMExchangeAdapter] Updating market config for ${params.productId}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        (params.useHSM ?? false) ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.contractAddress);
      const contract = new ethers.Contract(params.contractAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).updateMarketConfig !== 'function') {
        throw new Error('updateMarketConfig method not found on contract');
      }
      
      const tx = await (contract as any).updateMarketConfig(
        params.productId,
        params.spreadBps,
        params.orderSize,
        params.paused || false
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMExchangeAdapter] Market config updated: ${receipt.hash}`);
      
      // Update database
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase
        .from('product_markets')
        .update({
          spread_bps: params.spreadBps,
          order_size: params.orderSize,
          is_active: !params.paused
        })
        .eq('product_id', params.productId)
        .eq('blockchain', params.blockchain)
        .eq('network', params.network);
      
      if (dbError) {
        console.error('[EVMExchangeAdapter] Database error:', dbError);
      }
      
      return {
        success: true,
        marketId: params.productId,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMExchangeAdapter] Update config error:', error);
      throw error;
    }
  }
  
  /**
   * Get market information
   */
  async getMarketInfo(
    marketId: string,
    blockchain: string,
    network: string
  ): Promise<MarketInfo> {
    try {
      console.log(`[EVMExchangeAdapter] Getting market info for ${marketId}`);
      
      // Query database
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('product_markets')
        .select('*')
        .eq('market_id', marketId)
        .eq('blockchain', blockchain)
        .eq('network', network)
        .single();
      
      if (error || !data) {
        throw new Error(`Market ${marketId} not found`);
      }
      
      return {
        marketId: data.market_id,
        productId: data.product_id,
        spreadBps: data.spread_bps,
        orderSize: data.order_size,
        isActive: data.is_active,
        totalOrders: data.total_orders || 0,
        totalVolume: data.total_volume || '0'
      };
      
    } catch (error) {
      console.error('[EVMExchangeAdapter] Get market info error:', error);
      throw error;
    }
  }
}

export default EVMExchangeAdapter;
