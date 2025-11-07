// Module Registry Service
// Provides automatic module address resolution from contract_masters table
// Users select features, system resolves addresses automatically

import { supabase } from '@/infrastructure/database/client';
import type {
  ComplianceConfig,
  VestingConfig,
  DocumentConfig,
  PolicyEngineConfig,
  FeesConfig,
  TimelockConfig,
  TemporaryApprovalConfig,
  FlashMintConfig,
  RoyaltyConfig,
  RentalConfig,
  FractionalizationConfig,
  SoulboundConfig,
  ConsecutiveConfig,
  MetadataEventsConfig,
  SupplyCapConfig,
  UriManagementConfig,
  SlotApprovableConfig,
  SlotManagerConfig,
  ValueExchangeConfig,
  FeeStrategyConfig,
  WithdrawalQueueConfig,
  YieldStrategyConfig,
  AsyncVaultConfig,
  NativeVaultConfig,
  RouterConfig,
  MultiAssetVaultConfig,
  TransferRestrictionsConfig,
  ControllerConfig,
  ERC1400DocumentConfig,
  TokenStandard
} from '@/types/modules';

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
 * ✅ UPDATED: Uses shared types from @/types/modules
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
  // Universal
  complianceConfig?: ComplianceConfig;
  vestingConfig?: VestingConfig;
  documentConfig?: DocumentConfig;
  policyEngineConfig?: PolicyEngineConfig;
  
  // ERC20
  feesConfig?: FeesConfig;
  timelockConfig?: TimelockConfig;
  temporaryApprovalConfig?: TemporaryApprovalConfig;
  flashMintConfig?: FlashMintConfig;
  
  // ERC721
  royaltyConfig?: RoyaltyConfig;
  rentalConfig?: RentalConfig;
  fractionConfig?: FractionalizationConfig;
  soulboundConfig?: SoulboundConfig;
  consecutiveConfig?: ConsecutiveConfig;
  metadataEventsConfig?: MetadataEventsConfig;
  
  // ERC1155
  supplyCapConfig?: SupplyCapConfig;
  uriManagementConfig?: UriManagementConfig;
  
  // ERC3525
  slotApprovableConfig?: SlotApprovableConfig;
  slotManagerConfig?: SlotManagerConfig;
  valueExchangeConfig?: ValueExchangeConfig;
  
  // ERC4626
  feeStrategyConfig?: FeeStrategyConfig;
  withdrawalQueueConfig?: WithdrawalQueueConfig;
  yieldStrategyConfig?: YieldStrategyConfig;
  asyncVaultConfig?: AsyncVaultConfig;
  nativeVaultConfig?: NativeVaultConfig;
  routerConfig?: RouterConfig;
  multiAssetVaultConfig?: MultiAssetVaultConfig;
  
  // ERC1400
  transferRestrictionsConfig?: TransferRestrictionsConfig;
  controllerConfig?: ControllerConfig;
  erc1400DocumentConfig?: ERC1400DocumentConfig;
  
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
   * ✅ ENHANCED: Now filters by is_template=true to get only template contracts
   */
  static async getAvailableModules(
    network: string,
    environment: string = 'testnet'
  ): Promise<Map<string, ModuleRegistryEntry>> {
    console.log('[ModuleRegistry] Fetching module templates for', { network, environment });
    
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .eq('is_template', true) // ✅ NEW: Only get template contracts
      .like('contract_type', '%module%');

    if (error) {
      console.error('[ModuleRegistry] Failed to fetch module registry:', error);
      throw new Error(`Module registry lookup failed: ${error.message}`);
    }

    console.log('[ModuleRegistry] Found', data?.length || 0, 'module templates');

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
    tokenStandard: TokenStandard,
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

    // ============ ERC721-SPECIFIC MODULES ============
    if (tokenStandard === 'erc721') {
      if (selection.royalty) {
        const module = registry.get('royalty_module');
        if (module) resolved.royaltyModuleAddress = module.contractAddress;
      }

      if (selection.rental) {
        const module = registry.get('rental_module');
        if (module) resolved.rentalModuleAddress = module.contractAddress;
      }

      if (selection.soulbound) {
        const module = registry.get('soulbound_module');
        if (module) resolved.soulboundModuleAddress = module.contractAddress;
      }

      if (selection.fraction) {
        const module = registry.get('fractionalization_module');
        if (module) resolved.fractionModuleAddress = module.contractAddress;
      }

      if (selection.consecutive) {
        const module = registry.get('consecutive_module');
        if (module) resolved.consecutiveModuleAddress = module.contractAddress;
      }

      if (selection.metadataEvents) {
        const module = registry.get('metadata_events_module');
        if (module) resolved.metadataEventsModuleAddress = module.contractAddress;
      }
    }

    // ============ ERC1155-SPECIFIC MODULES ============
    if (tokenStandard === 'erc1155') {
      if (selection.royalty) {
        const module = registry.get('royalty_module');
        if (module) resolved.royaltyModuleAddress = module.contractAddress;
      }

      if (selection.supplyCap) {
        const module = registry.get('supply_cap_module');
        if (module) resolved.supplyCapModuleAddress = module.contractAddress;
      }

      if (selection.uriManagement) {
        const module = registry.get('uri_management_module');
        if (module) resolved.uriManagementModuleAddress = module.contractAddress;
      }
    }

    // ============ ERC3525-SPECIFIC MODULES ============
    if (tokenStandard === 'erc3525') {
      if (selection.slotApprovable) {
        const module = registry.get('slot_approvable_module');
        if (module) resolved.slotApprovableModuleAddress = module.contractAddress;
      }

      if (selection.slotManager) {
        const module = registry.get('slot_manager_module');
        if (module) resolved.slotManagerModuleAddress = module.contractAddress;
      }

      if (selection.valueExchange) {
        const module = registry.get('value_exchange_module');
        if (module) resolved.valueExchangeModuleAddress = module.contractAddress;
      }
    }

    // ============ ERC4626-SPECIFIC MODULES ============
    if (tokenStandard === 'erc4626') {
      if (selection.feeStrategy) {
        const module = registry.get('fee_strategy_module');
        if (module) resolved.feeStrategyModuleAddress = module.contractAddress;
      }

      if (selection.withdrawalQueue) {
        const module = registry.get('withdrawal_queue_module');
        if (module) resolved.withdrawalQueueModuleAddress = module.contractAddress;
      }

      if (selection.yieldStrategy) {
        const module = registry.get('yield_strategy_module');
        if (module) resolved.yieldStrategyModuleAddress = module.contractAddress;
      }

      if (selection.asyncVault) {
        const module = registry.get('async_vault_module');
        if (module) resolved.asyncVaultModuleAddress = module.contractAddress;
      }

      if (selection.nativeVault) {
        const module = registry.get('native_vault_module');
        if (module) resolved.nativeVaultModuleAddress = module.contractAddress;
      }

      if (selection.router) {
        const module = registry.get('router_module');
        if (module) resolved.routerModuleAddress = module.contractAddress;
      }

      if (selection.multiAssetVault) {
        const module = registry.get('multi_asset_vault_module');
        if (module) resolved.multiAssetVaultModuleAddress = module.contractAddress;
      }
    }

    // ============ ERC1400-SPECIFIC MODULES ============
    if (tokenStandard === 'erc1400') {
      if (selection.transferRestrictions) {
        const module = registry.get('transfer_restrictions_module');
        if (module) resolved.transferRestrictionsModuleAddress = module.contractAddress;
      }

      if (selection.controller) {
        const module = registry.get('controller_module');
        if (module) resolved.controllerModuleAddress = module.contractAddress;
      }

      if (selection.erc1400Document) {
        const module = registry.get('erc1400_document_module');
        if (module) resolved.erc1400DocumentModuleAddress = module.contractAddress;
      }
    }

    return resolved;
  }

  /**
   * Get module metadata (for displaying in UI)
   * ✅ ENHANCED: Now filters by is_template=true
   */
  static async getModuleMetadata(
    contractType: string,
    network: string,
    environment: string = 'testnet'
  ): Promise<ModuleRegistryEntry | null> {
    console.log('[ModuleRegistry] Fetching metadata for', { contractType, network, environment });
    
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .eq('is_template', true) // ✅ NEW: Only get template contract
      .single();

    if (error || !data) {
      console.warn('[ModuleRegistry] Module template not found:', contractType);
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
   * ✅ ENHANCED: Now checks is_template=true
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
      .eq('is_template', true) // ✅ NEW: Only check template contracts
      .single();

    const available = !error && !!data;
    console.log('[ModuleRegistry] Module availability check:', { moduleType, network, available });
    return available;
  }

  /**
   * Get all available features for a token standard on a network
   */
  static async getAvailableFeatures(
    tokenStandard: TokenStandard,
    network: string,
    environment: string = 'testnet'
  ): Promise<string[]> {
    const registry = await this.getAvailableModules(network, environment);
    const availableFeatures: string[] = [];

    // Universal features (all standards)
    if (registry.has('compliance_module')) availableFeatures.push('compliance');
    if (registry.has('vesting_module')) availableFeatures.push('vesting');
    if (registry.has('document_module')) availableFeatures.push('document');
    if (registry.has('policy_engine')) availableFeatures.push('policyEngine');

    // Standard-specific features
    if (tokenStandard === 'erc20') {
      if (registry.has('fee_module')) availableFeatures.push('fees');
      if (registry.has('permit_module')) availableFeatures.push('permit');
      if (registry.has('snapshot_module')) availableFeatures.push('snapshot');
      if (registry.has('flash_mint_module')) availableFeatures.push('flashMint');
      if (registry.has('votes_module')) availableFeatures.push('votes');
      if (registry.has('timelock_module')) availableFeatures.push('timelock');
      if (registry.has('payable_token_module')) availableFeatures.push('payableToken');
      if (registry.has('temporary_approval_module')) availableFeatures.push('temporaryApproval');
    }
    
    if (tokenStandard === 'erc721') {
      if (registry.has('royalty_module')) availableFeatures.push('royalty');
      if (registry.has('rental_module')) availableFeatures.push('rental');
      if (registry.has('soulbound_module')) availableFeatures.push('soulbound');
      if (registry.has('fractionalization_module')) availableFeatures.push('fraction');
      if (registry.has('consecutive_module')) availableFeatures.push('consecutive');
      if (registry.has('metadata_events_module')) availableFeatures.push('metadataEvents');
    }
    
    if (tokenStandard === 'erc1155') {
      if (registry.has('royalty_module')) availableFeatures.push('royalty');
      if (registry.has('supply_cap_module')) availableFeatures.push('supplyCap');
      if (registry.has('uri_management_module')) availableFeatures.push('uriManagement');
    }
    
    if (tokenStandard === 'erc3525') {
      if (registry.has('slot_approvable_module')) availableFeatures.push('slotApprovable');
      if (registry.has('slot_manager_module')) availableFeatures.push('slotManager');
      if (registry.has('value_exchange_module')) availableFeatures.push('valueExchange');
    }
    
    if (tokenStandard === 'erc4626') {
      if (registry.has('fee_strategy_module')) availableFeatures.push('feeStrategy');
      if (registry.has('withdrawal_queue_module')) availableFeatures.push('withdrawalQueue');
      if (registry.has('yield_strategy_module')) availableFeatures.push('yieldStrategy');
      if (registry.has('async_vault_module')) availableFeatures.push('asyncVault');
      if (registry.has('native_vault_module')) availableFeatures.push('nativeVault');
      if (registry.has('router_module')) availableFeatures.push('router');
      if (registry.has('multi_asset_vault_module')) availableFeatures.push('multiAssetVault');
    }
    
    if (tokenStandard === 'erc1400') {
      if (registry.has('transfer_restrictions_module')) availableFeatures.push('transferRestrictions');
      if (registry.has('controller_module')) availableFeatures.push('controller');
      if (registry.has('erc1400_document_module')) availableFeatures.push('erc1400Document');
    }

    return availableFeatures;
  }

  /**
   * Get master contract template address for a token standard
   * ✅ NEW METHOD: Retrieves the master contract template to be used for deployment
   */
  static async getMasterTemplate(
    tokenStandard: TokenStandard,
    network: string,
    environment: string = 'testnet'
  ): Promise<ModuleRegistryEntry | null> {
    const masterType = `${tokenStandard}_master`;
    console.log('[ModuleRegistry] Fetching master template for', { tokenStandard, masterType, network, environment });
    
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('contract_type', masterType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .eq('is_template', true) // Only get template contracts
      .single();

    if (error || !data) {
      console.warn('[ModuleRegistry] Master template not found:', masterType);
      return null;
    }

    console.log('[ModuleRegistry] Master template found:', {
      type: data.contract_type,
      address: data.contract_address,
      version: data.version
    });

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
   * Get factory contract address
   * ✅ NEW METHOD: Retrieves the factory contract used for deploying instances
   */
  static async getFactory(
    network: string,
    environment: string = 'testnet'
  ): Promise<ModuleRegistryEntry | null> {
    console.log('[ModuleRegistry] Fetching factory for', { network, environment });
    
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('contract_type', 'beacon_proxy_factory')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn('[ModuleRegistry] Factory not found');
      return null;
    }

    console.log('[ModuleRegistry] Factory found:', data.contract_address);

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
}
