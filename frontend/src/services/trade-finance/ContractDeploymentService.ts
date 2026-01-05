/**
 * Trade Finance Contract Deployment Service
 * 
 * Queries contract_masters database for deployed trade finance contracts
 * Handles proxy address resolution and upgrade history tracking
 */

import { supabase } from '@/infrastructure/database/client';

interface ContractRecord {
  id: string;
  network: string;
  environment: string;
  contract_type: string;
  contract_address: string;
  version: string;
  abi: any;
  is_active: boolean;
  deployment_data: {
    proxy_address?: string;
    implementation_address?: string;
    initialization_params?: any;
    contractKey?: string;
    category?: string;
    upgrade_history?: UpgradeHistoryEntry[];
  };
  contract_details?: {
    category?: string;
    features?: string[];
    upgrade_pattern?: string;
  };
  deployed_at?: string;
  verification_status?: string;
}

interface UpgradeHistoryEntry {
  version: string;
  implementation: string;
  upgraded_at: string;
  upgraded_by: string;
  reason: string;
  tx_hash: string;
}

export class TradeFinanceContractService {
  private static DEFAULT_NETWORK = 'hoodi';
  private static DEFAULT_ENVIRONMENT = 'testnet';

  /**
   * Get proxy address by contract type
   */
  static async getProxyAddress(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching proxy address:', error);
      return null;
    }

    return data?.contract_address || null;
  }

  /**
   * Get full contract record by type
   */
  static async getContract(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<ContractRecord | null> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching contract:', error);
      return null;
    }

    return data as ContractRecord | null;
  }

  /**
   * Get all trade finance contracts by category
   */
  static async getContractsByCategory(
    category: 'governance' | 'core' | 'risk' | 'liquidation' | 'rewards' | 'treasury' | 'infrastructure',
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<ContractRecord[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .contains('deployment_data', { category: `trade_finance_${category}` });

    if (error) {
      console.error('Error fetching contracts by category:', error);
      return [];
    }

    return data as ContractRecord[];
  }

  /**
   * Get all active trade finance contracts
   */
  static async getAllTradeFinanceContracts(
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<ContractRecord[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .or(
        'deployment_data->>category.eq.trade_finance_governance,' +
        'deployment_data->>category.eq.trade_finance_core,' +
        'deployment_data->>category.eq.trade_finance_risk,' +
        'deployment_data->>category.eq.trade_finance_liquidation,' +
        'deployment_data->>category.eq.trade_finance_rewards,' +
        'deployment_data->>category.eq.trade_finance_treasury,' +
        'deployment_data->>category.eq.trade_finance_infrastructure'
      )
      .order('contract_type');

    if (error) {
      console.error('Error fetching trade finance contracts:', error);
      return [];
    }

    return data as ContractRecord[];
  }

  /**
   * Get upgrade history for a contract
   */
  static async getUpgradeHistory(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<UpgradeHistoryEntry[]> {
    const contract = await this.getContract(contractType, network, environment);
    return contract?.deployment_data?.upgrade_history || [];
  }

  /**
   * Get implementation address for UUPS contract
   */
  static async getImplementationAddress(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<string | null> {
    const contract = await this.getContract(contractType, network, environment);
    return contract?.deployment_data?.implementation_address || null;
  }

  /**
   * Get ABI for contract type
   */
  static async getContractABI(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<any | null> {
    const contract = await this.getContract(contractType, network, environment);
    return contract?.abi || null;
  }

  /**
   * Get initialization parameters
   */
  static async getInitializationParams(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<any | null> {
    const contract = await this.getContract(contractType, network, environment);
    return contract?.deployment_data?.initialization_params || null;
  }

  /**
   * Check if contract is upgradeable (UUPS)
   */
  static async isUpgradeable(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<boolean> {
    const contract = await this.getContract(contractType, network, environment);
    return contract?.contract_details?.upgrade_pattern === 'UUPS';
  }

  /**
   * Get contract metadata summary
   */
  static async getContractSummary(
    contractType: string,
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<{
    address: string;
    version: string;
    isUpgradeable: boolean;
    category: string;
    verificationStatus: string;
    upgradeCount: number;
  } | null> {
    const contract = await this.getContract(contractType, network, environment);
    if (!contract) return null;

    return {
      address: contract.contract_address,
      version: contract.version,
      isUpgradeable: contract.contract_details?.upgrade_pattern === 'UUPS',
      category: contract.deployment_data?.category || 'unknown',
      verificationStatus: contract.verification_status || 'unverified',
      upgradeCount: contract.deployment_data?.upgrade_history?.length || 0,
    };
  }

  /**
   * Get all governance contracts (commonly needed together)
   */
  static async getGovernanceContracts(
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<{
    poolAddressesProvider: string | null;
    aclManager: string | null;
    poolConfigurator: string | null;
  }> {
    const [provider, acl, configurator] = await Promise.all([
      this.getProxyAddress('pool_addresses_provider', network, environment),
      this.getProxyAddress('acl_manager', network, environment),
      this.getProxyAddress('pool_configurator', network, environment),
    ]);

    return {
      poolAddressesProvider: provider,
      aclManager: acl,
      poolConfigurator: configurator,
    };
  }

  /**
   * Get all liquidation contracts (commonly needed together)
   */
  static async getLiquidationContracts(
    network: string = this.DEFAULT_NETWORK,
    environment: string = this.DEFAULT_ENVIRONMENT
  ): Promise<{
    dutchAuction: string | null;
    graceful: string | null;
    flash: string | null;
    dexAdapter: string | null;
    dataProvider: string | null;
  }> {
    const [dutch, graceful, flash, dex, data] = await Promise.all([
      this.getProxyAddress('dutch_auction_liquidator', network, environment),
      this.getProxyAddress('graceful_liquidation', network, environment),
      this.getProxyAddress('flash_liquidation', network, environment),
      this.getProxyAddress('dex_liquidation_adapter', network, environment),
      this.getProxyAddress('liquidation_data_provider', network, environment),
    ]);

    return {
      dutchAuction: dutch,
      graceful,
      flash,
      dexAdapter: dex,
      dataProvider: data,
    };
  }
}

export default TradeFinanceContractService;
