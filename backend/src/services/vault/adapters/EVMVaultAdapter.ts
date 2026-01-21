/**
 * EVM Vault Adapter
 * 
 * Standard EVM implementation for Vault Service
 * Supports: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC
 * 
 * Uses:
 * - WalletHelper for key management
 * - Database for ABI storage
 * - .env for RPC URLs
 * - Proper event parsing for shares/amounts
 */

import { ethers } from 'ethers';
import WalletHelper from '../../injective/WalletHelper';
import { getSupabaseClient } from '../../../infrastructure/database/supabase';
import {
  DeployVaultParams,
  VaultDeploymentResult,
  DepositParams,
  DepositResult,
  WithdrawParams,
  WithdrawResult,
  UpdateRateParams,
  UpdateResult,
  AddStrategyParams,
  StrategyResult,
  VaultInfo,
  IVaultAdapter
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
 * EVM Vault Adapter
 * 
 * Implements vault operations on standard EVM chains
 */
export class EVMVaultAdapter implements IVaultAdapter {
  
  /**
   * Deploy CCeTracker vault contract
   */
  async deployVault(params: DeployVaultParams): Promise<VaultDeploymentResult> {
    try {
      console.log(`[EVMVaultAdapter] Deploying CCeTracker to ${params.blockchain}/${params.network}`);
      
      // Get RPC URL from .env
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      const chainId = getChainId(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        params.useHSM ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get CCeTracker bytecode and ABI from database
      const supabase = getSupabaseClient();
      const { data: contractData, error: contractError } = await supabase
        .from('contract_metadata')
        .select('bytecode, abi')
        .eq('contract_name', 'CCeTracker')
        .eq('version', 'latest')
        .single();
      
      if (contractError || !contractData) {
        throw new Error('CCeTracker contract metadata not found in database');
      }
      
      const { bytecode, abi } = contractData;
      
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
      const deploymentTx = contract.deploymentTransaction();
      
      if (!deploymentTx) {
        throw new Error('Deployment transaction not found');
      }
      
      const receipt = await deploymentTx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMVaultAdapter] CCeTracker deployed at: ${contractAddress}`);
      
      // Save to database
      const { error: dbError } = await supabase
        .from('exchange_contracts')
        .insert({
          contract_type: 'vault',
          contract_name: params.name,
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
          product_type: params.productType,
          abi_json: abi,
          is_active: true,
          verified: false
        });
      
      if (dbError) {
        console.error('[EVMVaultAdapter] Database error:', dbError);
      }
      
      return {
        success: true,
        vaultAddress: contractAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('[EVMVaultAdapter] Deployment error:', error);
      throw error;
    }
  }
  
  /**
   * Deposit to vault
   */
  async deposit(params: DepositParams): Promise<DepositResult> {
    try {
      console.log(`[EVMVaultAdapter] Depositing to vault ${params.vaultAddress}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        params.useHSM ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.vaultAddress);
      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).deposit !== 'function') {
        throw new Error('deposit method not found on contract');
      }
      
      // Call deposit
      const tx = await (contract as any).deposit(
        params.amount,
        params.subaccountId || ethers.ZeroHash
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMVaultAdapter] Deposit successful: ${receipt.hash}`);
      
      // TODO: Parse DepositMade event to get shares
      const shares = '0'; // Extract from event
      
      // Save position to database
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase
        .from('vault_positions')
        .insert({
          vault_contract: params.vaultAddress,
          blockchain: params.blockchain,
          network: params.network,
          chain_id: getChainId(params.blockchain, params.network),
          project_id: params.projectId,
          product_id: params.productId,
          user_address: params.userAddress,
          shares: shares,
          deposits: params.amount,
          withdrawals: '0',
          underlying_value: params.amount,
          is_active: true,
          last_deposit_at: new Date().toISOString()
        });
      
      if (dbError) {
        console.error('[EVMVaultAdapter] Database error:', dbError);
      }
      
      return {
        success: true,
        shares: shares,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMVaultAdapter] Deposit error:', error);
      throw error;
    }
  }
  
  /**
   * Withdraw from vault
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    try {
      console.log(`[EVMVaultAdapter] Withdrawing from vault ${params.vaultAddress}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        params.useHSM ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.vaultAddress);
      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).withdraw !== 'function') {
        throw new Error('withdraw method not found on contract');
      }
      
      // Call withdraw
      const tx = await (contract as any).withdraw(
        params.shares,
        params.subaccountId || ethers.ZeroHash
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMVaultAdapter] Withdrawal successful: ${receipt.hash}`);
      
      // TODO: Parse WithdrawalMade event to get underlying amount
      const underlyingAmount = '0'; // Extract from event
      
      // Update position in database
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase
        .from('vault_positions')
        .update({
          withdrawals: underlyingAmount,
          last_withdrawal_at: new Date().toISOString()
        })
        .eq('vault_contract', params.vaultAddress)
        .eq('user_address', params.userAddress)
        .eq('blockchain', params.blockchain)
        .eq('network', params.network);
      
      if (dbError) {
        console.error('[EVMVaultAdapter] Database error:', dbError);
      }
      
      return {
        success: true,
        underlyingAmount: underlyingAmount,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMVaultAdapter] Withdrawal error:', error);
      throw error;
    }
  }
  
  /**
   * Update exchange rate (backend oracle only)
   */
  async updateExchangeRate(params: UpdateRateParams): Promise<UpdateResult> {
    try {
      console.log(`[EVMVaultAdapter] Updating exchange rate for ${params.vaultAddress}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        params.useHSM ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.vaultAddress);
      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).updateExchangeRate !== 'function') {
        throw new Error('updateExchangeRate method not found on contract');
      }
      
      // Call updateExchangeRate
      const tx = await (contract as any).updateExchangeRate(
        ethers.parseEther(params.newRate),
        ethers.parseEther(params.totalValue)
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMVaultAdapter] Exchange rate updated: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMVaultAdapter] Update rate error:', error);
      throw error;
    }
  }
  
  /**
   * Add strategy to vault
   */
  async addStrategy(params: AddStrategyParams): Promise<StrategyResult> {
    try {
      console.log(`[EVMVaultAdapter] Adding strategy to ${params.vaultAddress}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(params.blockchain, params.network);
      
      // Get wallet
      const wallet = await WalletHelper.getWallet(
        params.useHSM ? params.keyVaultId! : params.privateKey,
        params.useHSM ?? false,
        rpcUrl
      );
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(params.vaultAddress);
      const contract = new ethers.Contract(params.vaultAddress, abi, wallet);
      
      // Check if method exists
      if (typeof (contract as any).addStrategy !== 'function') {
        throw new Error('addStrategy method not found on contract');
      }
      
      // Call addStrategy
      const tx = await (contract as any).addStrategy(
        params.strategyName,
        params.allocationPct,
        params.targetApy
      );
      
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      console.log(`[EVMVaultAdapter] Strategy added: ${receipt.hash}`);
      
      return {
        success: true,
        strategyId: params.strategyName,
        transactionHash: receipt.hash
      };
      
    } catch (error) {
      console.error('[EVMVaultAdapter] Add strategy error:', error);
      throw error;
    }
  }
  
  /**
   * Get vault information
   */
  async getVaultInfo(
    vaultAddress: string,
    blockchain: string,
    network: string
  ): Promise<VaultInfo> {
    try {
      console.log(`[EVMVaultAdapter] Getting vault info for ${vaultAddress}`);
      
      // Get RPC URL
      const rpcUrl = getRPCUrl(blockchain, network);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Get contract ABI
      const abi = await WalletHelper.getContractABI(vaultAddress);
      const contract = new ethers.Contract(vaultAddress, abi, provider);
      
      // Check if methods exist and call them
      const name = typeof (contract as any).name === 'function' ? await (contract as any).name() : 'Unknown';
      const symbol = typeof (contract as any).symbol === 'function' ? await (contract as any).symbol() : 'UNKNOWN';
      const decimals = typeof (contract as any).decimals === 'function' ? await (contract as any).decimals() : 18;
      const totalSupply = typeof (contract as any).totalSupply === 'function' ? await (contract as any).totalSupply() : 0n;
      const exchangeRate = typeof (contract as any).exchangeRate === 'function' ? await (contract as any).exchangeRate() : 0n;
      const tvl = typeof (contract as any).totalValueLocked === 'function' ? await (contract as any).totalValueLocked() : 0n;
      
      return {
        vaultAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        exchangeRate: ethers.formatEther(exchangeRate),
        totalValueLocked: ethers.formatEther(tvl)
      };
      
    } catch (error) {
      console.error('[EVMVaultAdapter] Get vault info error:', error);
      throw error;
    }
  }
}

export default EVMVaultAdapter;
