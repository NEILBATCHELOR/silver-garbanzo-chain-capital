// Module Registry Service
// Provides automatic module address resolution from contract_masters table
// Users select features, system resolves addresses automatically

import { supabase } from '@/infrastructure/database/client';

/**
 * Module metadata from contract_masters
 */
export interface ModuleRegistryEntry {
  id: string;
  contractType: string;
  contractAddress: string;
  network: string;
  environment: string;
  version: string;
  abiVersion: string;
  abi: any;
  deployedAt: string;
  isActive: boolean;
  contractDetails?: Record<string, any>;
}

/**
 * Module selection by feature (no addresses needed from user)
 */
export interface ModuleSelection {
  // Feature toggles (user-friendly)
  compliance?: boolean;
  kyc?: boolean;
  vesting?: boolean;
  fees?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  flashMint?: boolean;
  votes?: boolean;
  timelock?: boolean;
  payable?: boolean;
  temporaryApproval?: boolean;
  
  // Module-specific configurations (optional)
  complianceConfig?: {
    kycRequired?: boolean;
    whitelistRequired?: boolean;
    [key: string]: any;
  };
  vestingConfig?: {
    [key: string]: any;
  };
  feesConfig?: {
    transferFeeBps?: number;
    feeRecipient?: string;
    [key: string]: any;
  };
  
  // Resolved addresses (automatic, hidden from user)
  resolvedAddresses?: {
    complianceModuleAddress?: string;
    vestingModuleAddress?: string;
    feesModuleAddress?: string;
    policyEngineAddress?: string;
    permitModuleAddress?: string;
    snapshotModuleAddress?: string;
    flashMintModuleAddress?: string;
    votesModuleAddress?: string;
    timelockModuleAddress?: string;
    payableModuleAddress?: string;
    temporaryApprovalModuleAddress?: string;
  };
}

/**
 * Service for automatic module address resolution
 */
export class ModuleRegistryService {
  /**
   * Get available modules for a network/environment
   */
  static async getAvailableModules(
    network: string,
    environment: string = 'testnet'
  ): Promise<Map<string, ModuleRegistryEntry>> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .like('contract_type', '%module%');

    if (error) {
      console.error('Failed to fetch module registry:', error);
      throw new Error(`Module registry lookup failed: ${error.message}`);
    }

    const registry = new Map<string, ModuleRegistryEntry>();
    
    data?.forEach((entry: any) => {
      registry.set(entry.contract_type, {
        id: entry.id,
        contractType: entry.contract_type,
        contractAddress: entry.contract_address,
        network: entry.network,
        environment: entry.environment,
        version: entry.version,
        abiVersion: entry.abi_version,
        abi: entry.abi,
        deployedAt: entry.deployed_at,
        isActive: entry.is_active,
        contractDetails: entry.contract_details
      });
    });

    return registry;
  }

  /**
   * Resolve module addresses based on feature selection
   * This is the KEY method - users select features, system resolves addresses
   */
  static async resolveModuleAddresses(
    selection: ModuleSelection,
    network: string,
    tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400',
    environment: string = 'testnet'
  ): Promise<ModuleSelection['resolvedAddresses']> {
    const registry = await this.getAvailableModules(network, environment);
    const resolved: ModuleSelection['resolvedAddresses'] = {};

    // Universal modules (work across all standards)
    if (selection.compliance) {
      const module = registry.get('compliance_module');
      if (module) resolved.complianceModuleAddress = module.contractAddress;
    }

    if (selection.vesting) {
      const module = registry.get('vesting_module');
      if (module) resolved.vestingModuleAddress = module.contractAddress;
    }

    if (selection.fees) {
      const module = registry.get('fee_module');
      if (module) resolved.feesModuleAddress = module.contractAddress;
    }

    // Policy engine (required for policy-aware operations)
    const policyEngine = registry.get('policy_engine');
    if (policyEngine) {
      resolved.policyEngineAddress = policyEngine.contractAddress;
    }

    // ERC20-specific modules
    if (tokenStandard === 'erc20') {
      if (selection.permit) {
        const module = registry.get('permit_module');
        if (module) resolved.permitModuleAddress = module.contractAddress;
      }

      if (selection.snapshot) {
        const module = registry.get('snapshot_module');
        if (module) resolved.snapshotModuleAddress = module.contractAddress;
      }

      if (selection.flashMint) {
        const module = registry.get('flash_mint_module');
        if (module) resolved.flashMintModuleAddress = module.contractAddress;
      }

      if (selection.votes) {
        const module = registry.get('votes_module');
        if (module) resolved.votesModuleAddress = module.contractAddress;
      }

      if (selection.timelock) {
        const module = registry.get('timelock_module');
        if (module) resolved.timelockModuleAddress = module.contractAddress;
      }

      if (selection.payable) {
        const module = registry.get('payable_module');
        if (module) resolved.payableModuleAddress = module.contractAddress;
      }

      if (selection.temporaryApproval) {
        const module = registry.get('temporary_approval_module');
        if (module) resolved.temporaryApprovalModuleAddress = module.contractAddress;
      }
    }

    return resolved;
  }

  /**
   * Get module metadata (for displaying in UI)
   */
  static async getModuleMetadata(
    contractType: string,
    network: string,
    environment: string = 'testnet'
  ): Promise<ModuleRegistryEntry | null> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      contractType: data.contract_type,
      contractAddress: data.contract_address,
      network: data.network,
      environment: data.environment,
      version: data.version,
      abiVersion: data.abi_version,
      abi: data.abi,
      deployedAt: data.deployed_at,
      isActive: data.is_active,
      contractDetails: data.contract_details
    };
  }

  /**
   * Check if a module is available for a network
   */
  static async isModuleAvailable(
    moduleType: string,
    network: string,
    environment: string = 'testnet'
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('id')
      .eq('contract_type', moduleType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  }

  /**
   * Get all available features for a token standard on a network
   */
  static async getAvailableFeatures(
    tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400',
    network: string,
    environment: string = 'testnet'
  ): Promise<string[]> {
    const registry = await this.getAvailableModules(network, environment);
    const availableFeatures: string[] = [];

    // Universal features
    if (registry.has('compliance_module')) availableFeatures.push('compliance');
    if (registry.has('vesting_module')) availableFeatures.push('vesting');
    if (registry.has('fee_module')) availableFeatures.push('fees');

    // Standard-specific features
    if (tokenStandard === 'erc20') {
      if (registry.has('permit_module')) availableFeatures.push('permit');
      if (registry.has('snapshot_module')) availableFeatures.push('snapshot');
      if (registry.has('flash_mint_module')) availableFeatures.push('flashMint');
      if (registry.has('votes_module')) availableFeatures.push('votes');
      if (registry.has('timelock_module')) availableFeatures.push('timelock');
      if (registry.has('payable_module')) availableFeatures.push('payable');
      if (registry.has('temporary_approval_module')) availableFeatures.push('temporaryApproval');
    }

    return availableFeatures;
  }
}
