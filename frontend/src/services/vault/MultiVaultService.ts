/**
 * MultiVaultService - Multi-Chain Vault Operations
 * 
 * Blockchain-agnostic service for deploying and managing yield-bearing vaults
 * across multiple chains. Follows the same pattern as MultiExchangeService.
 * 
 * KEY FEATURES:
 * - ABI loading from contract_masters database table
 * - Support for multiple contract versions per network
 * - Automatic routing to chain-specific adapters
 * - Database integration for audit trail
 * 
 * SUPPORTED CHAINS:
 * - Injective (native + EVM)
 * - Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC
 */

import { supabase } from '@/infrastructure/database/client';
import {
  DeployVaultParams,
  DepositParams,
  WithdrawParams,
  UpdateExchangeRateParams,
  AddStrategyParams,
  GetVaultBalanceParams,
  DeploymentResult,
  DepositResult,
  WithdrawResult,
  UpdateRateResult,
  StrategyResult,
  VaultBalance,
  VaultInfo,
  VaultContract,
  VaultPosition,
  IVaultAdapter,
  ChainInfo,
  AbiLoadParams,
  LoadedAbi,
  ContractMaster
} from './types';

// Import adapters (will be created)
// import { InjectiveVaultAdapter } from './adapters/InjectiveVaultAdapter';
// import { EVMVaultAdapter } from './adapters/EVMVaultAdapter';

export class MultiVaultService {
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
  // VAULT DEPLOYMENT
  // ============================================================================

  /**
   * Deploy vault contract
   * 
   * PROCESS:
   * 1. Load ABI from database
   * 2. Get chain-specific adapter
   * 3. Deploy contract
   * 4. Save deployment to database
   * 5. Return result
   */
  static async deployVault(
    params: DeployVaultParams
  ): Promise<DeploymentResult> {
    try {
      // Get adapter for blockchain
      const adapter = this.getAdapter(params.blockchain);

      // Deploy contract (adapter handles ABI loading internally)
      const result = await adapter.deployVault(params);

      if (!result.success || !result.contractAddress) {
        return result;
      }

      // Save to database
      await this.saveContractToDatabase({
        contractType: 'vault',
        contractName: params.contractName || `${params.name} Vault`,
        contractAddress: result.contractAddress,
        blockchain: params.blockchain,
        network: params.network,
        chainId: result.chainId || '',
        deployerAddress: params.deployerAddress,
        deploymentTxHash: result.txHash,
        deploymentBlockNumber: result.blockNumber?.toString(),
        backendOracleAddress: params.backendOracleAddress,
        fundManagerAddress: params.deployerAddress,
        projectId: params.projectId,
        productId: params.productId,
        productType: params.productType,
        abiVersion: result.chainId || '1.0.0' // Use version from result if available
      });

      return result;
    } catch (error) {
      console.error('Error deploying vault:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // VAULT OPERATIONS
  // ============================================================================

  /**
   * Deposit to vault
   */
  static async deposit(params: DepositParams): Promise<DepositResult> {
    try {
      // Get adapter
      const adapter = this.getAdapter(params.blockchain);

      // Execute deposit (adapter handles ABI loading)
      const result = await adapter.deposit(params);

      if (!result.success) {
        return result;
      }

      // Update position in database
      await this.updatePositionInDatabase({
        vaultContract: params.vaultAddress,
        blockchain: params.blockchain,
        network: params.network,
        userAddress: params.userAddress,
        shares: result.shares || '0',
        operation: 'deposit',
        amount: params.amount,
        txHash: result.txHash
      });

      return result;
    } catch (error) {
      console.error('Error depositing to vault:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Withdraw from vault
   */
  static async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    try {
      // Get adapter
      const adapter = this.getAdapter(params.blockchain);

      // Execute withdrawal (adapter handles ABI loading)
      const result = await adapter.withdraw(params);

      if (!result.success) {
        return result;
      }

      // Update position in database
      await this.updatePositionInDatabase({
        vaultContract: params.vaultAddress,
        blockchain: params.blockchain,
        network: params.network,
        userAddress: params.userAddress,
        shares: `-${params.shares}`, // Negative for withdrawal
        operation: 'withdraw',
        amount: result.amount || '0',
        txHash: result.txHash
      });

      return result;
    } catch (error) {
      console.error('Error withdrawing from vault:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update exchange rate (backend oracle only)
   */
  static async updateExchangeRate(
    params: UpdateExchangeRateParams
  ): Promise<UpdateRateResult> {
    try {
      // Get adapter
      const adapter = this.getAdapter(params.blockchain);

      // Update rate (adapter handles ABI loading)
      const result = await adapter.updateExchangeRate(params);

      return result;
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Add strategy to vault (backend oracle only)
   */
  static async addStrategy(
    params: AddStrategyParams
  ): Promise<StrategyResult> {
    try {
      // Get adapter
      const adapter = this.getAdapter(params.blockchain);

      // Add strategy (adapter handles ABI loading)
      const result = await adapter.addStrategy(params);

      return result;
    } catch (error) {
      console.error('Error adding strategy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get vault balance for user
   */
  static async getVaultBalance(
    params: GetVaultBalanceParams
  ): Promise<VaultBalance | null> {
    try {
      // Get adapter
      const adapter = this.getAdapter(params.blockchain);

      // Get balance (adapter handles ABI loading)
      const balance = await adapter.getVaultBalance(params);

      return balance;
    } catch (error) {
      console.error('Error getting vault balance:', error);
      return null;
    }
  }

  /**
   * Get vault information
   */
  static async getVaultInfo(
    vaultAddress: string,
    blockchain: string,
    network: string
  ): Promise<VaultInfo | null> {
    try {
      // Get adapter
      const adapter = this.getAdapter(blockchain);

      // Get info (adapter handles ABI loading)
      const info = await adapter.getVaultInfo(vaultAddress, blockchain, network);

      return info;
    } catch (error) {
      console.error('Error getting vault info:', error);
      return null;
    }
  }

  /**
   * Get user positions from database
   */
  static async getUserPositions(
    userAddress: string,
    projectId?: string
  ): Promise<VaultPosition[]> {
    let query = supabase
      .from('vault_positions')
      .select('*')
      .eq('user_address', userAddress)
      .eq('is_active', true);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting user positions:', error);
      return [];
    }

    return data as VaultPosition[];
  }

  /**
   * Get vault contracts from database
   */
  static async getVaultContracts(
    projectId?: string,
    network?: string
  ): Promise<VaultContract[]> {
    let query = supabase
      .from('exchange_contracts')
      .select('*')
      .eq('contract_type', 'vault')
      .eq('is_active', true);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (network) {
      query = query.eq('network', network);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting vault contracts:', error);
      return [];
    }

    return data as VaultContract[];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get chain-specific adapter
   */
  private static getAdapter(blockchain: string): IVaultAdapter {
    // TODO: Implement adapters
    // For now, throw error
    throw new Error(`Adapter not yet implemented for ${blockchain}`);

    // switch (blockchain.toLowerCase()) {
    //   case 'injective':
    //     return new InjectiveVaultAdapter();
    //   case 'ethereum':
    //   case 'polygon':
    //   case 'arbitrum':
    //   case 'optimism':
    //   case 'base':
    //   case 'avalanche':
    //   case 'bsc':
    //     return new EVMVaultAdapter(blockchain);
    //   default:
    //     throw new Error(`Unsupported blockchain: ${blockchain}`);
    // }
  }

  /**
   * Save contract to database
   */
  private static async saveContractToDatabase(data: {
    contractType: string;
    contractName: string;
    contractAddress: string;
    blockchain: string;
    network: string;
    chainId: string;
    deployerAddress: string;
    deploymentTxHash?: string;
    deploymentBlockNumber?: string;
    backendOracleAddress?: string;
    fundManagerAddress?: string;
    projectId?: string;
    productId?: string;
    productType?: string;
    abiVersion: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('exchange_contracts')
      .insert({
        contract_type: data.contractType,
        contract_name: data.contractName,
        contract_address: data.contractAddress,
        blockchain: data.blockchain,
        network: data.network,
        chain_id: data.chainId,
        deployer_address: data.deployerAddress,
        deployment_tx_hash: data.deploymentTxHash,
        deployment_block_number: data.deploymentBlockNumber
          ? parseInt(data.deploymentBlockNumber)
          : undefined,
        backend_oracle_address: data.backendOracleAddress,
        fund_manager_address: data.fundManagerAddress,
        project_id: data.projectId,
        product_id: data.productId,
        product_type: data.productType
      });

    if (error) {
      throw new Error(`Failed to save contract to database: ${error.message}`);
    }
  }

  /**
   * Update position in database
   */
  private static async updatePositionInDatabase(data: {
    vaultContract: string;
    blockchain: string;
    network: string;
    userAddress: string;
    shares: string;
    operation: 'deposit' | 'withdraw';
    amount: string;
    txHash?: string;
  }): Promise<void> {
    // Get existing position or create new
    const { data: existing, error: selectError } = await supabase
      .from('vault_positions')
      .select('*')
      .eq('vault_contract', data.vaultContract)
      .eq('blockchain', data.blockchain)
      .eq('network', data.network)
      .eq('user_address', data.userAddress)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // Not found is OK
      throw new Error(`Failed to query position: ${selectError.message}`);
    }

    if (existing) {
      // Update existing position
      const currentShares = parseFloat(existing.shares || '0');
      const deltaShares = parseFloat(data.shares);
      const newShares = currentShares + deltaShares;

      const currentDeposits = parseFloat(existing.deposits_total || '0');
      const currentWithdrawals = parseFloat(existing.withdrawals_total || '0');

      const { error: updateError } = await supabase
        .from('vault_positions')
        .update({
          shares: newShares.toString(),
          deposits_total:
            data.operation === 'deposit'
              ? (currentDeposits + parseFloat(data.amount)).toString()
              : existing.deposits_total,
          withdrawals_total:
            data.operation === 'withdraw'
              ? (currentWithdrawals + parseFloat(data.amount)).toString()
              : existing.withdrawals_total,
          last_deposit_at:
            data.operation === 'deposit' ? new Date().toISOString() : existing.last_deposit_at,
          last_withdrawal_at:
            data.operation === 'withdraw' ? new Date().toISOString() : existing.last_withdrawal_at,
          is_active: newShares > 0
        })
        .eq('id', existing.id);

      if (updateError) {
        throw new Error(`Failed to update position: ${updateError.message}`);
      }
    } else {
      // Create new position
      const { error: insertError } = await supabase
        .from('vault_positions')
        .insert({
          vault_contract: data.vaultContract,
          blockchain: data.blockchain,
          network: data.network,
          user_address: data.userAddress,
          shares: data.shares,
          deposits_total: data.operation === 'deposit' ? data.amount : '0',
          withdrawals_total: data.operation === 'withdraw' ? data.amount : '0',
          last_deposit_at:
            data.operation === 'deposit' ? new Date().toISOString() : undefined,
          last_withdrawal_at:
            data.operation === 'withdraw' ? new Date().toISOString() : undefined,
          is_active: true
        });

      if (insertError) {
        throw new Error(`Failed to create position: ${insertError.message}`);
      }
    }
  }

  /**
   * Get chain ID for blockchain/network combo
   */
  private static async getChainId(blockchain: string, network: string): Promise<string> {
    // Chain ID mapping (should be centralized)
    const chainIds: Record<string, Record<string, string>> = {
      injective: {
        mainnet: 'injective-1',
        testnet: 'injective-888'
      },
      ethereum: {
        mainnet: '1',
        sepolia: '11155111'
      },
      polygon: {
        mainnet: '137',
        mumbai: '80001'
      }
      // Add more chains as needed
    };

    return chainIds[blockchain]?.[network] || '';
  }
}
