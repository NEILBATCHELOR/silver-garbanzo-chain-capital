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
 * EXTENDED: Now supports all 52 module types across all token standards
 */
export interface ModuleSelection {
  // ============ UNIVERSAL MODULES (All Standards) ============
  compliance?: boolean;
  vesting?: boolean;
  document?: boolean;
  policyEngine?: boolean;
  
  // ============ ERC20-SPECIFIC MODULES ============
  fees?: boolean;
  flashMint?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  timelock?: boolean;
  votes?: boolean;
  payableToken?: boolean;
  temporaryApproval?: boolean;
  
  // ============ ERC721-SPECIFIC MODULES ============
  royalty?: boolean;
  rental?: boolean;
  soulbound?: boolean;
  fraction?: boolean;
  consecutive?: boolean;
  metadataEvents?: boolean;
  
  // ============ ERC1155-SPECIFIC MODULES ============
  supplyCap?: boolean;
  uriManagement?: boolean;
  
  // ============ ERC3525-SPECIFIC MODULES ============
  slotApprovable?: boolean;
  slotManager?: boolean;
  valueExchange?: boolean;
  
  // ============ ERC4626-SPECIFIC MODULES ============
  feeStrategy?: boolean;
  withdrawalQueue?: boolean;
  yieldStrategy?: boolean;
  asyncVault?: boolean;
  nativeVault?: boolean;
  router?: boolean;
  multiAssetVault?: boolean;
  
  // ============ ERC1400-SPECIFIC MODULES ============
  transferRestrictions?: boolean;
  controller?: boolean;
  erc1400Document?: boolean;
  
  // ============ MODULE-SPECIFIC CONFIGURATIONS ============
  complianceConfig?: {
    kycRequired?: boolean;
    whitelistRequired?: boolean;
    [key: string]: any;
  };
  vestingConfig?: {
    [key: string]: any;
  };
  documentConfig?: {
    [key: string]: any;
  };
  feesConfig?: {
    transferFeeBps?: number;
    feeRecipient?: string;
    [key: string]: any;
  };
  policyEngineConfig?: {
    rulesEnabled?: string[];
    validatorsEnabled?: string[];
    [key: string]: any;
  };
  timelockConfig?: {
    minDelay?: number;
    [key: string]: any;
  };
  temporaryApprovalConfig?: {
    defaultDuration?: number;
    [key: string]: any;
  };
  royaltyConfig?: {
    defaultRoyaltyBps?: number;
    royaltyRecipient?: string;
    [key: string]: any;
  };
  rentalConfig?: {
    maxRentalDuration?: number;
    [key: string]: any;
  };
  fractionConfig?: {
    minFractions?: number;
    [key: string]: any;
  };
  supplyCapConfig?: {
    defaultCap?: number;
    [key: string]: any;
  };
  uriManagementConfig?: {
    baseURI?: string;
    [key: string]: any;
  };
  slotManagerConfig?: {
    [key: string]: any;
  };
  valueExchangeConfig?: {
    exchangeFeeBps?: number;
    [key: string]: any;
  };
  feeStrategyConfig?: {
    managementFeeBps?: number;
    performanceFeeBps?: number;
    [key: string]: any;
  };
  withdrawalQueueConfig?: {
    maxQueueSize?: number;
    [key: string]: any;
  };
  yieldStrategyConfig?: {
    targetYieldBps?: number;
    [key: string]: any;
  };
  asyncVaultConfig?: {
    settlementDelay?: number;
    [key: string]: any;
  };
  nativeVaultConfig?: {
    [key: string]: any;
  };
  routerConfig?: {
    [key: string]: any;
  };
  multiAssetVaultConfig?: {
    maxAssets?: number;
    [key: string]: any;
  };
  transferRestrictionsConfig?: {
    [key: string]: any;
  };
  controllerConfig?: {
    controllers?: string[];
    [key: string]: any;
  };
  erc1400DocumentConfig?: {
    [key: string]: any;
  };
  
  // ============ RESOLVED ADDRESSES (Automatic, Hidden) ============
  resolvedAddresses?: {
    // Universal
    complianceModuleAddress?: string;
    vestingModuleAddress?: string;
    documentModuleAddress?: string;
    policyEngineAddress?: string;
    
    // ERC20
    feesModuleAddress?: string;
    flashMintModuleAddress?: string;
    permitModuleAddress?: string;
    snapshotModuleAddress?: string;
    timelockModuleAddress?: string;
    votesModuleAddress?: string;
    payableTokenModuleAddress?: string;
    temporaryApprovalModuleAddress?: string;
    
    // ERC721
    royaltyModuleAddress?: string;
    rentalModuleAddress?: string;
    soulboundModuleAddress?: string;
    fractionModuleAddress?: string;
    consecutiveModuleAddress?: string;
    metadataEventsModuleAddress?: string;
    
    // ERC1155
    supplyCapModuleAddress?: string;
    uriManagementModuleAddress?: string;
    
    // ERC3525
    slotApprovableModuleAddress?: string;
    slotManagerModuleAddress?: string;
    valueExchangeModuleAddress?: string;
    
    // ERC4626
    feeStrategyModuleAddress?: string;
    withdrawalQueueModuleAddress?: string;
    yieldStrategyModuleAddress?: string;
    asyncVaultModuleAddress?: string;
    nativeVaultModuleAddress?: string;
    routerModuleAddress?: string;
    multiAssetVaultModuleAddress?: string;
    
    // ERC1400
    transferRestrictionsModuleAddress?: string;
    controllerModuleAddress?: string;
    erc1400DocumentModuleAddress?: string;
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

      if (selection.payableToken) {
        const module = registry.get('payable_module');
        if (module) resolved.payableTokenModuleAddress = module.contractAddress;
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
