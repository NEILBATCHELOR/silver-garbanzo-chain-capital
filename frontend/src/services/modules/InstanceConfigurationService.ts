/**
 * Instance Configuration Service - ENHANCED
 * 
 * Orchestrates module deployment AND configuration in one service
 * 
 * RESPONSIBILITIES:
 * 1. Deploy module instances via InstanceDeploymentService
 * 2. Configure deployed instances with user settings
 * 3. Extract module selection from JSONB database fields
 * 4. Handle complete deployment + configuration flow
 * 
 * REPLACES: enhancedModuleDeploymentService (merged logic)
 * USES: InstanceDeploymentService (renamed from ModuleDeploymentService)
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import { InstanceDeploymentService } from './InstanceDeploymentService';
import { ModuleRegistryService, type ModuleSelection } from './ModuleRegistryService';
import type { CompleteModuleConfiguration } from '@/types/modules';
import type { FoundryDeploymentParams } from '@/components/tokens/interfaces/TokenInterfaces';
import { CHAIN_ID_TO_NAME } from '@/infrastructure/web3/utils/chainIds';

// ============ TYPES & INTERFACES ============

export interface ConfigurationResult {
  moduleType: string;
  configured: boolean;
  transactionHashes: string[];
  error?: string;
}

export interface ConfigurationProgress {
  current: number;
  total: number;
  module: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message: string;
}

export interface EnhancedModuleDeploymentResult {
  deployed: Array<{
    moduleType: string;
    instanceAddress: string;
    masterAddress: string;
    txHash: string;
  }>;
  failed: Array<{
    moduleType: string;
    error: string;
  }>;
}

// ============ MAIN SERVICE CLASS ============

/**
 * Service for deploying AND configuring module instances
 * 
 * PHASE 1 CONSOLIDATION: Merged logic from enhancedModuleDeploymentService
 */
export class InstanceConfigurationService {
  
  // ============ ORCHESTRATION METHODS (NEW) ============
  
  /**
   * Deploy and configure module instances for a token
   * 
   * MAIN ENTRY POINT for foundryDeploymentService
   * 
   * FLOW:
   * 1. Extract module selection from JSONB config
   * 2. Deploy module instances via InstanceDeploymentService
   * 3. Configure deployed instances with user settings
   * 4. Return comprehensive result
   * 
   * @param tokenAddress - Address of deployed token
   * @param tokenId - Database ID of token
   * @param wallet - Signer wallet
   * @param params - Deployment parameters with JSONB config
   * @param userId - User ID for audit logging
   */
  static async deployAndConfigureModules(
    tokenAddress: string,
    tokenId: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams,
    userId: string
  ): Promise<EnhancedModuleDeploymentResult> {
    const result: EnhancedModuleDeploymentResult = {
      deployed: [],
      failed: []
    };

    try {
      // Extract module selection from JSONB config
      const moduleSelection = this.extractModuleSelection(params);
      
      // Check if any modules selected - EARLY RETURN
      if (!this.hasAnyModulesSelected(moduleSelection)) {
        console.log('ℹ️ No extension modules selected for deployment - skipping module deployment');
        return result; // Return immediately with empty result
      }

      console.log('🏭 Deploying NEW module instances for token:', tokenAddress);
      console.log('📦 Selected modules:', Object.keys(moduleSelection).filter(k => !k.endsWith('Config') && moduleSelection[k as keyof ModuleSelection]));

      // Determine token standard first (needed for factory lookup)
      const tokenStandard = this.getTokenStandard(params.tokenType);

      // ✅ FIX: Normalize network name (convert chain ID to network name if needed)
      const networkName = this.normalizeNetworkName(params.blockchain);
      console.log(`🔄 Network parameter normalized: '${params.blockchain}' → '${networkName}'`);

      // Get extension factory address from database (standard-specific or universal)
      const factoryAddress = await this.getFactoryAddress(
        networkName,  // ✅ Use normalized network name
        params.environment,
        tokenStandard  // ✅ FIX: Pass token standard for correct factory lookup
      );

      if (!factoryAddress) {
        console.warn('⚠️ No extension factory found, cannot deploy module instances');
        result.failed.push({
          moduleType: 'all',
          error: 'Extension factory contract not found in database. Modules must be deployed manually.'
        });
        return result; // Return early - don't fail entire deployment
      }

      console.log(`✅ Using extension factory at: ${factoryAddress}`);

      // Deploy module instances using InstanceDeploymentService
      console.log('🔄 Calling InstanceDeploymentService.deployAndAttachModules...');
      console.log(`   - Token: ${tokenAddress}`);
      console.log(`   - Factory: ${factoryAddress}`);
      console.log(`   - Network: ${networkName} (${params.environment})`);  // ✅ Use normalized name
      console.log(`   - Standard: ${tokenStandard}`);
      
      const deployedModules = await InstanceDeploymentService.deployAndAttachModules(
        tokenAddress,
        tokenId,
        moduleSelection,
        networkName,  // ✅ Use normalized network name
        tokenStandard,
        params.environment,
        wallet,
        factoryAddress
      );

      console.log('✅ InstanceDeploymentService completed');
      
      // Transform results for return
      result.deployed = deployedModules.map(module => ({
        moduleType: module.moduleType,
        instanceAddress: module.moduleAddress,
        masterAddress: module.masterAddress,
        txHash: module.deploymentTxHash
      }));

      console.log(`✅ Deployed ${result.deployed.length} NEW module instances`);

      // ============ PHASE 2: CONFIGURATION ============
      // Apply user's configuration settings to deployed module instances
      
      if (result.deployed.length > 0) {
        console.log('🔄 Starting Phase 2: Module Configuration...');
        
        try {
          // Convert deployed modules to format expected by configureModuleInstances
          const deployedModulesForConfig = result.deployed.map(m => ({
            moduleType: m.moduleType,
            instanceAddress: m.instanceAddress
          }));
          
          // Build complete module configuration from moduleSelection
          const moduleConfigs: any = {};
          for (const [moduleType, enabled] of Object.entries(moduleSelection)) {
            if (enabled && typeof enabled === 'object') {
              // Module has configuration
              moduleConfigs[moduleType] = enabled;
            } else if (enabled === true) {
              // Module is enabled but has no config object
              const configKey = `${moduleType}Config`;
              if (moduleSelection[configKey as keyof ModuleSelection]) {
                moduleConfigs[moduleType] = moduleSelection[configKey as keyof ModuleSelection];
              }
            }
          }
          
          console.log(`   - Configuring ${deployedModulesForConfig.length} modules`);
          console.log(`   - Module configs:`, Object.keys(moduleConfigs));
          
          // Apply configuration to all deployed modules
          const configResults = await this.configureModuleInstances(
            deployedModulesForConfig,
            moduleConfigs as any,
            wallet,
            (progress) => {
              console.log(`   [${progress.current}/${progress.total}] ${progress.message}`);
            }
          );
          
          // Log configuration results
          const successfulConfigs = configResults.filter(r => r.configured).length;
          const failedConfigs = configResults.filter(r => !r.configured).length;
          
          console.log(`✅ Phase 2 Complete: ${successfulConfigs} configured, ${failedConfigs} failed`);
          
          if (failedConfigs > 0) {
            console.warn('⚠️ Some module configurations failed:', 
              configResults.filter(r => !r.configured).map(r => ({
                module: r.moduleType,
                error: r.error
              }))
            );
          }
          
        } catch (configError) {
          console.error('❌ Phase 2 configuration failed:', configError);
          // Don't fail the entire deployment if configuration fails
          // Modules are deployed, they just need manual configuration
        }
      }

      // Log success
      await logActivity({
        action: 'module_instances_deployed',
        entity_type: 'token',
        entity_id: tokenAddress,
        details: {
          tokenId,
          deployed: result.deployed.map(m => ({
            type: m.moduleType,
            instance: m.instanceAddress,
            master: m.masterAddress
          })),
          count: result.deployed.length
        },
        status: 'success'
      });

    } catch (error) {
      console.error('❌ Module deployment failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.failed.push({
        moduleType: 'deployment_process',
        error: errorMessage
      });

      await logActivity({
        action: 'module_deployment_failed',
        entity_type: 'token',
        entity_id: tokenAddress,
        details: {
          tokenId,
          error: errorMessage
        },
        status: 'error'
      });
    }

    return result;
  }

  // ============ EXTRACTION & MAPPING METHODS ============
  
  /**
   * Extract module selection from deployment parameters
   * 
   * CRITICAL: Maps JSONB database fields to ModuleSelection format
   * 
   * This 550-line method handles all the complex mapping logic from:
   * - Database JSONB fields (fee_on_transfer, timelock_config, etc.)
   * - To ModuleSelection format expected by InstanceDeploymentService
   * - Includes conversions: percentages → basis points, etc.
   * - Provides fallbacks for old data formats
   */
  private static extractModuleSelection(params: FoundryDeploymentParams): ModuleSelection {
    // Check if moduleSelection exists in config (new format)
    const config = params.config as any;
    
    // 🔍 DEBUG: Log received config to understand data structure
    console.log('🔍 [ModuleSelection] Config keys:', Object.keys(config).filter(k => k.includes('enabled') || k.includes('_config') || k.includes('Module')));
    console.log('🔍 [ModuleSelection] Checking modules - fees_enabled:', config.fees_enabled, 'compliance_enabled:', config.compliance_enabled);
    
    if (config.moduleSelection) {
      return config.moduleSelection;
    }

    // Fallback: Build selection from boolean flags and JSONB config fields
    const selection: ModuleSelection = {};

    // ============ UNIVERSAL MODULES (All Standards) ============
    
    // COMPLIANCE - Reads from compliance_config JSONB
    if (config.compliance_enabled || config.complianceModuleAddress || config.compliance_config) {
      selection.compliance = true;
      
      if (config.compliance_config) {
        selection.complianceConfig = {
          // Required fields (with defaults for backward compatibility)
          complianceLevel: config.compliance_config.complianceLevel || 1,
          maxHoldersPerJurisdiction: config.compliance_config.maxHoldersPerJurisdiction || 0,
          kycRequired: config.compliance_config.kycRequired || false,
          // Optional fields
          whitelistRequired: config.compliance_config.whitelistRequired || false,
          whitelistAddresses: config.compliance_config.whitelistAddresses || ''
        };
      } else {
        selection.complianceConfig = {
          // Required fields (with defaults for backward compatibility)
          complianceLevel: 1, // Default: minimal compliance
          maxHoldersPerJurisdiction: 0, // Default: unlimited
          kycRequired: config.kyc_required || false,
          // Optional derived fields
          whitelistRequired: config.whitelist_required || false
        };
      }
    }

    // VESTING
    if (config.vesting_enabled || config.vestingModuleAddress) {
      selection.vesting = true;
      selection.vestingConfig = {
        cliffPeriod: config.vesting_cliff_period || 0,
        totalPeriod: config.vesting_total_period || 0,
        releaseFrequency: config.vesting_release_frequency || 'monthly',
        ...(config.vesting_config || {})
      };
    }

    // DOCUMENT
    if (config.document_enabled || config.documentModuleAddress) {
      selection.document = true;
      selection.documentConfig = config.document_config || {};
    }

    // POLICY ENGINE
    if (config.policy_engine_enabled || config.policyEngineAddress) {
      selection.policyEngine = true;
      selection.policyEngineConfig = {
        rules: config.policy_rules || [],
        validators: config.policy_validators || []
      };
    }

    // ============ TOKEN STANDARD-SPECIFIC MODULES ============
    const tokenStandard = this.getTokenStandard(params.tokenType);

    // ERC20-specific modules
    if (tokenStandard === 'erc20') {
      
      // FEES - Reads from BOTH old format (fees_enabled + fee_on_transfer) AND new format (fees_config)
      if (config.fees_enabled || config.fees_config?.enabled || config.feesModuleAddress || config.fee_on_transfer) {
        selection.fees = true;
        
        // Extract from BOTH formats - prioritize new format, fallback to old
        const feesConfig = config.fees_config || config.fee_on_transfer || {};
        const transferFeeBps = feesConfig.transferFeeBps || feesConfig.feePercentage || 0;
        const recipient = feesConfig.feeRecipient || feesConfig.recipient || config.initialOwner || 'DEPLOYER';
        
        selection.feesConfig = {
          transferFeeBps: transferFeeBps,
          feeRecipient: recipient
        };
        
        console.log('💰 [ModuleSelection] Fees enabled - TransferFeeBps:', transferFeeBps, 'Recipient:', recipient);
      }
      
      // TIMELOCK - Reads from timelock_config JSONB (individual token locks)
      if (config.timelock || config.timelockModuleAddress || config.timelock_config) {
        selection.timelock = true;
        
        if (config.timelock_config && config.timelock_config.defaultLockDuration !== undefined) {
          selection.timelockConfig = {
            defaultLockDuration: config.timelock_config.defaultLockDuration || 172800
          };
        } else if (config.governance_features && config.governance_features.voting_delay !== undefined) {
          const delayInSeconds = (config.governance_features.voting_delay || 1) * 12;
          selection.timelockConfig = { defaultLockDuration: delayInSeconds };
        } else {
          selection.timelockConfig = { defaultLockDuration: config.timelock_min_delay || 172800 };
        }
      }
      
      // TEMPORARY APPROVAL - Reads from temporary_approval_config JSONB
      if (config.temporary_approval || config.temporaryApprovalModuleAddress || config.temporary_approval_config) {
        selection.temporaryApproval = true;
        
        if (config.temporary_approval_config && config.temporary_approval_config.defaultDuration !== undefined) {
          selection.temporaryApprovalConfig = {
            defaultDuration: config.temporary_approval_config.defaultDuration || 3600
          };
        } else {
          selection.temporaryApprovalConfig = { 
            defaultDuration: config.temporary_approval_duration || 3600 
          };
        }
      }
      
      // Simple boolean modules (no config needed)
      if (config.flash_mint || config.flashMintModuleAddress) selection.flashMint = true;
      if (config.permit || config.permitModuleAddress) selection.permit = true;
      if (config.snapshot || config.snapshotModuleAddress) selection.snapshot = true;
      if (config.votes || config.votesModuleAddress) selection.votes = true;
      if (config.payable_token || config.payableTokenModuleAddress) selection.payableToken = true;
    }

    // ERC721-specific modules  
    if (tokenStandard === 'erc721') {
      // ROYALTY
      if (config.has_royalty || config.royalty_enabled || config.royaltyModuleAddress) {
        selection.royalty = true;
        
        if (config.royalty_percentage !== undefined || config.royalty_receiver) {
          selection.royaltyConfig = {
            defaultRoyaltyBps: Math.round((parseFloat(config.royalty_percentage) || 2.5) * 100),
            royaltyRecipient: config.royalty_receiver || config.initialOwner || ''
          };
        } else {
          selection.royaltyConfig = {
            defaultRoyaltyBps: config.default_royalty_bps || 250,
            royaltyRecipient: config.royalty_recipient || config.initialOwner || ''
          };
        }
      }
      
      // Other ERC721 modules
      if (config.rental_enabled || config.rentalModuleAddress || config.rental_config) {
        selection.rental = true;
        selection.rentalConfig = config.rental_config || { maxRentalDuration: 86400 };
      }
      
      if (config.enable_fractional_ownership || config.fraction_enabled) {
        selection.fraction = true;
        selection.fractionConfig = config.fractionalization_config || { minFractions: 100 };
      }
      
      if (config.soulbound || config.soulboundModuleAddress) selection.soulbound = true;
      if (config.consecutive || config.consecutiveModuleAddress) selection.consecutive = true;
      if (config.metadata_events || config.metadataEventsModuleAddress) selection.metadataEvents = true;
    }

    // ERC1155-specific modules
    if (tokenStandard === 'erc1155') {
      if (config.has_royalty || config.royalty_enabled) {
        selection.royalty = true;
        selection.royaltyConfig = {
          defaultRoyaltyBps: Math.round((parseFloat(config.royalty_percentage) || 2.5) * 100),
          royaltyRecipient: config.royalty_receiver || config.initialOwner || ''
        };
      }
      
      if (config.supply_cap_enabled) {
        selection.supplyCap = true;
        selection.supplyCapConfig = { 
          globalCap: config.global_cap || config.max_supply_per_type || 0,
          defaultCap: config.max_supply_per_type || 0 // Deprecated, keeping for backward compatibility
        };
      }
      
      if (config.uri_management || config.uri_management_enabled) {
        selection.uriManagement = true;
        selection.uriManagementConfig = { 
          baseURI: config.base_uri || ''
        };
      }
    }

    // ERC3525-specific modules
    if (tokenStandard === 'erc3525') {
      if (config.slot_approvable) selection.slotApprovable = true;
      if (config.slot_manager) {
        selection.slotManager = true;
        selection.slotManagerConfig = {
          allowDynamicSlotCreation: config.allow_dynamic_slot_creation ?? true,
          restrictCrossSlot: config.restrict_cross_slot ?? false,
          allowSlotMerging: config.allow_slot_merging ?? false,
          ...(config.slot_manager_config || {})
        };
      }
      if (config.value_exchange || config.partial_value_trading) {
        selection.valueExchange = true;
        // Note: Exchange rates configured post-deployment via setExchangeRate(fromSlot, toSlot, rate)
        selection.valueExchangeConfig = config.value_exchange_config || {};
      }
    }

    // ERC4626-specific modules
    if (tokenStandard === 'erc4626') {
      if (config.fee_strategy || config.fee_strategy_enabled) {
        selection.feeStrategy = true;
        selection.feeStrategyConfig = {
          managementFeeBps: Math.round((parseFloat(config.management_fee) || 0) * 100),
          performanceFeeBps: Math.round((parseFloat(config.performance_fee) || 0) * 100),
          feeRecipient: config.fee_recipient || config.creator_wallet_address || ''
        };
      }
      
      if (config.withdrawal_queue) {
        selection.withdrawalQueue = true;
        selection.withdrawalQueueConfig = { maxQueueSize: config.max_queue_size || 1000 };
      }
      
      if (config.yield_strategy) {
        selection.yieldStrategy = true;
        selection.yieldStrategyConfig = config.yield_strategy_config || { harvestFrequency: 86400 };
      }
      
      if (config.async_vault) {
        selection.asyncVault = true;
        selection.asyncVaultConfig = config.async_vault_config || { minimumFulfillmentDelay: 86400 };
      }
      
      if (config.native_vault) selection.nativeVault = true;
      if (config.router) selection.router = true;
      
      if (config.multi_asset_vault) {
        selection.multiAssetVault = true;
        selection.multiAssetVaultConfig = config.multi_asset_vault_config || {};
      }
    }

    // ERC1400-specific modules
    if (tokenStandard === 'erc1400') {
      if (config.transfer_restrictions) selection.transferRestrictions = true;
      
      if (config.controller_enabled || config.controllerModuleAddress) {
        selection.controller = true;
        selection.controllerConfig = { 
          controllable: true,
          controllers: [] // Will be populated later if needed
        };
      }
      
      if (config.erc1400_document) selection.erc1400Document = true;
      
      if (config.default_partitions) {
        (selection as any).defaultPartitions = Array.isArray(config.default_partitions) 
          ? config.default_partitions 
          : ['DEFAULT'];
      }
    }

    // 🔍 DEBUG: Log final module selection
    const selectedModuleNames = Object.keys(selection).filter(k => !k.endsWith('Config') && selection[k as keyof ModuleSelection]);
    console.log('✅ [ModuleSelection] Final selected modules:', selectedModuleNames);
    console.log('✅ [ModuleSelection] Full selection object:', selection);

    return selection;
  }

  /**
   * Check if any modules are selected
   */
  private static hasAnyModulesSelected(selection: ModuleSelection): boolean {
    return Object.keys(selection).some(key => 
      !key.endsWith('Config') && selection[key as keyof ModuleSelection] === true
    );
  }

  /**
   * Get token standard from token type
   */
  private static getTokenStandard(tokenType: string): 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400' {
    const normalized = tokenType.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normalized.includes('erc20')) return 'erc20';
    if (normalized.includes('erc721')) return 'erc721';
    if (normalized.includes('erc1155')) return 'erc1155';
    if (normalized.includes('erc3525')) return 'erc3525';
    if (normalized.includes('erc4626')) return 'erc4626';
    if (normalized.includes('erc1400')) return 'erc1400';
    
    return 'erc20';
  }

  /**
   * Normalize blockchain parameter to network name for database queries
   * 
   * Handles both chain IDs (e.g., '560048', '1439') and network names (e.g., 'hoodi', 'injective')
   * 
   * @param blockchain - Chain ID or network name
   * @returns Network name for database query
   */
  private static normalizeNetworkName(blockchain: string): string {
    // If it's already a known network name, return as-is
    const knownNetworks = ['hoodi', 'injective', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
    if (knownNetworks.includes(blockchain.toLowerCase())) {
      return blockchain.toLowerCase();
    }

    // Try to parse as chain ID
    const chainId = parseInt(blockchain);
    if (!isNaN(chainId)) {
      // Use the CHAIN_ID_TO_NAME mapping
      const networkName = CHAIN_ID_TO_NAME[chainId];
      if (networkName) {
        return networkName.toLowerCase();
      }
    }

    // Default: return as-is (might be a network name we don't know yet)
    return blockchain.toLowerCase();
  }

  /**
   * Get extension factory address from database based on token standard
   * 
   * ✅ FIX: Query for extension factories, not 'token_factory'
   * - ERC20 → erc20_extension_factory
   * - ERC721 → erc721_extension_factory
   * - ERC1155 → erc1155_extension_factory
   * - etc.
   * - Fallback to universal_extension_factory if standard-specific not found
   */
  private static async getFactoryAddress(
    network: string,
    environment: string,
    tokenStandard?: string
  ): Promise<string | null> {
    // Try standard-specific extension factory first
    if (tokenStandard) {
      const standardFactoryType = `${tokenStandard.toLowerCase()}_extension_factory`;
      
      const { data: standardData, error: standardError } = await supabase
        .from('contract_masters')
        .select('contract_address')
        .eq('contract_type', standardFactoryType)
        .eq('network', network)
        .eq('environment', environment)
        .eq('is_active', true)
        .maybeSingle();

      if (!standardError && standardData?.contract_address) {
        console.log(`✅ Found ${standardFactoryType} at:`, standardData.contract_address);
        return standardData.contract_address;
      }
    }

    // Fallback to universal extension factory
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', 'universal_extension_factory')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch extension factory address:', error);
      return null;
    }

    if (data?.contract_address) {
      console.log(`✅ Using universal_extension_factory at:`, data.contract_address);
    }

    return data?.contract_address || null;
  }

  // ============ CONFIGURATION METHODS (EXISTING) ============
  
  /**
   * Configure master instance with user settings
   */
  static async configureMasterInstance(
    instanceAddress: string,
    tokenStandard: string,
    config: {
      owner: string;
      features: string[];
    },
    deployer: ethers.Wallet
  ): Promise<string[]> {
    const txHashes: string[] = [];
    
    const abi = await this.getMasterABI(tokenStandard);
    const instance = new ethers.Contract(instanceAddress, abi, deployer);
    
    if (config.owner && config.owner !== deployer.address) {
      console.log(`Transferring ownership to: ${config.owner}`);
      const tx = await instance.transferOwnership(config.owner);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
    }
    
    for (const feature of config.features || []) {
      console.log(`Enabling feature: ${feature}`);
      const tx = await instance.enableFeature(feature);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
    }
    
    return txHashes;
  }

  /**
   * Configure module instances with user's specific settings
   */
  static async configureModuleInstances(
    deployedModules: Array<{
      moduleType: string;
      instanceAddress: string;
    }>,
    moduleConfigs: CompleteModuleConfiguration,
    deployer: ethers.Wallet,
    onProgress?: (progress: ConfigurationProgress) => void
  ): Promise<ConfigurationResult[]> {
    const results: ConfigurationResult[] = [];
    let current = 0;
    const total = deployedModules.length;
    
    for (const { moduleType, instanceAddress } of deployedModules) {
      current++;
      const config = (moduleConfigs as any)[moduleType];
      
      if (config) {
        onProgress?.({
          current,
          total,
          module: moduleType,
          status: 'processing',
          message: `Configuring ${moduleType}...`
        });
        
        const result = await this.configureModuleInstance(
          instanceAddress,
          moduleType,
          config,
          deployer
        );
        
        results.push(result);
        
        onProgress?.({
          current,
          total,
          module: moduleType,
          status: result.configured ? 'success' : 'error',
          message: result.configured 
            ? `${moduleType} configured successfully`
            : `Failed to configure ${moduleType}: ${result.error}`
        });
      }
    }
    
    return results;
  }

  /**
   * Configure a single module instance based on its type
   */
  private static async configureModuleInstance(
    instanceAddress: string,
    moduleType: string,
    config: any,
    deployer: ethers.Wallet
  ): Promise<ConfigurationResult> {
    try {
      const txHashes: string[] = [];
      
      const abi = await this.getModuleABI(moduleType);
      const module = new ethers.Contract(instanceAddress, abi, deployer);
      
      switch (moduleType) {
        // ============ UNIVERSAL MODULES ============
        case 'vesting':
          await this.configureVestingModule(module, config, txHashes);
          break;
        case 'document':
          await this.configureDocumentModule(module, config, txHashes);
          break;
        case 'policyEngine':
        case 'policy_engine':  // snake_case variation
          await this.configurePolicyEngineModule(module, config, txHashes);
          break;
        
        // ============ ERC20 MODULES ============
        case 'compliance':
          await this.configureComplianceModule(module, config, txHashes);
          break;
        case 'fee':
        case 'fees': // Handle both singular and plural naming
          await this.configureFeeModule(module, config, txHashes);
          break;
        case 'timelock':
          await this.configureTimelockModule(module, config, txHashes);
          break;
        case 'permit':
          await this.configurePermitModule(module, config, txHashes);
          break;
        case 'snapshot':
          await this.configureSnapshotModule(module, config, txHashes);
          break;
        case 'flashMint':
        case 'flash_mint':  // snake_case variation
          await this.configureFlashMintModule(module, config, txHashes);
          break;
        case 'votes':
          await this.configureVotesModule(module, config, txHashes);
          break;
        case 'temporaryApproval':
        case 'temporary_approval':  // snake_case variation
          await this.configureTemporaryApprovalModule(module, config, txHashes);
          break;
        case 'payableToken':
        case 'payable':  // Alternate naming
          await this.configurePayableTokenModule(module, config, txHashes);
          break;
        
        // ============ ERC721 MODULES ============
        case 'royalty':
          await this.configureRoyaltyModule(module, config, txHashes);
          break;
        case 'rental':
          await this.configureRentalModule(module, config, txHashes);
          break;
        case 'consecutive':
          await this.configureConsecutiveModule(module, config, txHashes);
          break;
        case 'fractionalization':
        case 'fraction':  // Database uses "fraction_module"
          await this.configureFractionalizationModule(module, config, txHashes);
          break;
        case 'soulbound':
          await this.configureSoulboundModule(module, config, txHashes);
          break;
        case 'metadataEvents':
        case 'metadata_events':  // snake_case variation
          await this.configureMetadataEventsModule(module, config, txHashes);
          break;
        
        // ============ ERC1155 MODULES ============
        case 'supplyCap':
        case 'supply_cap':  // snake_case variation
          await this.configureSupplyCapModule(module, config, txHashes);
          break;
        case 'uriManagement':
        case 'uri_management':  // snake_case variation
          await this.configureURIManagementModule(module, config, txHashes);
          break;
        case 'granularApproval':
        case 'granular_approval':  // snake_case variation
          await this.configureGranularApprovalModule(module, config, txHashes);
          break;
        
        // ============ ERC3525 MODULES ============
        case 'slotManager':
        case 'slot_manager':  // snake_case variation
        case 'erc3525_slot_manager':  // Full database name
          await this.configureSlotManagerModule(module, config, txHashes);
          break;
        case 'slotApprovable':
        case 'slot_approvable':  // snake_case variation
        case 'erc3525_slot_approvable':  // Full database name
          await this.configureSlotApprovableModule(module, config, txHashes);
          break;
        case 'valueExchange':
        case 'value_exchange':  // snake_case variation
        case 'erc3525_value_exchange':  // Full database name
          await this.configureValueExchangeModule(module, config, txHashes);
          break;
        
        // ============ ERC4626 MODULES ============
        case 'asyncVault':
        case 'async_vault':  // snake_case variation
        case 'erc4626_async_vault':  // Full database name
          await this.configureAsyncVaultModule(module, config, txHashes);
          break;
        case 'feeStrategy':
        case 'fee_strategy':  // snake_case variation
        case 'erc4626_fee_strategy':  // Full database name
          await this.configureFeeStrategyModule(module, config, txHashes);
          break;
        case 'nativeVault':
        case 'native_vault':  // snake_case variation
        case 'erc4626_native_vault':  // Full database name
          await this.configureNativeVaultModule(module, config, txHashes);
          break;
        case 'router':
        case 'erc4626_router':  // Full database name
          await this.configureRouterModule(module, config, txHashes);
          break;
        case 'withdrawalQueue':
        case 'withdrawal_queue':  // snake_case variation
        case 'erc4626_withdrawal_queue':  // Full database name
          await this.configureWithdrawalQueueModule(module, config, txHashes);
          break;
        case 'yieldStrategy':
        case 'yield_strategy':  // snake_case variation
        case 'erc4626_yield_strategy':  // Full database name
          await this.configureYieldStrategyModule(module, config, txHashes);
          break;
        case 'multiAssetVault':
        case 'multi_asset_vault':  // snake_case variation
          await this.configureMultiAssetVaultModule(module, config, txHashes);
          break;
        
        // ============ ERC1400 MODULES ============
        case 'transferRestrictions':
        case 'transfer_restrictions':  // snake_case variation
        case 'erc1400_transfer_restrictions':  // Full database name
          await this.configureTransferRestrictionsModule(module, config, txHashes);
          break;
        case 'controller':
        case 'erc1400_controller':  // Full database name
          await this.configureControllerModule(module, config, txHashes);
          break;
        case 'erc1400Document':
        case 'erc1400_document':  // snake_case variation
          await this.configureERC1400DocumentModule(module, config, txHashes);
          break;
        
        default:
          console.warn(`No configuration handler for module type: ${moduleType}`);
      }
      
      return {
        moduleType,
        configured: true,
        transactionHashes: txHashes
      };
      
    } catch (error: any) {
      console.error(`Failed to configure ${moduleType}:`, error);
      return {
        moduleType,
        configured: false,
        transactionHashes: [],
        error: error.message
      };
    }
  }

  // ============ MODULE-SPECIFIC CONFIGURATION METHODS ============

  private static async configureVestingModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring vesting module with schedules:', config.schedules?.length || 0);
    for (const schedule of config.schedules || []) {
      console.log(`  Creating vesting schedule for ${schedule.beneficiary}`);
      const tx = await module.createVestingSchedule(
        schedule.beneficiary,
        ethers.parseUnits(schedule.amount.toString(), 18),
        schedule.startTime,
        schedule.cliffDuration,
        schedule.vestingDuration,
        schedule.revocable,
        ethers.encodeBytes32String(schedule.category)
      );
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
    }
  }

  private static async configureDocumentModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring document module with documents:', config.documents?.length || 0);
    for (const doc of config.documents || []) {
      console.log(`  Adding document: ${doc.name}`);
      const tx = await module.setDocument(
        ethers.encodeBytes32String(doc.name),
        doc.uri,
        doc.hash
      );
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
    }
  }

  private static async configureComplianceModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring compliance module');
    
    // Set KYC and whitelist requirements
    if (config.kycRequired !== undefined) {
      const tx = await module.setKYCRequired(config.kycRequired);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.whitelistRequired !== undefined) {
      const tx = await module.setWhitelistRequired(config.whitelistRequired);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set accredited investor only requirement
    if (config.accreditedInvestorOnly !== undefined) {
      const tx = await module.setAccreditedOnly(config.accreditedInvestorOnly);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Batch whitelist addresses
    if (config.whitelistAddresses?.length > 0) {
      console.log(`Batch whitelisting ${config.whitelistAddresses.length} addresses`);
      const jurisdictions = config.whitelistAddresses.map(() => 
        ethers.encodeBytes32String('')
      );
      const tx = await module.addToWhitelistBatch(config.whitelistAddresses, jurisdictions);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure jurisdiction rules
    if (config.jurisdictionRules?.length > 0) {
      console.log(`Configuring ${config.jurisdictionRules.length} jurisdiction rules`);
      for (const rule of config.jurisdictionRules) {
        const jurisdictionBytes = ethers.encodeBytes32String(rule.jurisdiction);
        
        // Set allowed status
        const tx1 = await module.setJurisdictionAllowed(jurisdictionBytes, rule.allowed);
        txHashes.push((await tx1.wait()).transactionHash);
        
        // Set limit if specified
        if (rule.limit) {
          const tx2 = await module.setJurisdictionLimit(jurisdictionBytes, rule.limit);
          txHashes.push((await tx2.wait()).transactionHash);
        }
      }
    }
    
    // Handle restricted countries (map to jurisdiction rules)
    if (config.restrictedCountries?.length > 0) {
      console.log(`Restricting ${config.restrictedCountries.length} countries`);
      for (const country of config.restrictedCountries) {
        const countryBytes = ethers.encodeBytes32String(country);
        const tx = await module.setJurisdictionAllowed(countryBytes, false);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  private static async configureSlotManagerModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring slot manager module with slots:', config.slots?.length || 0);
    for (const slot of config.slots || []) {
      console.log(`  Creating slot: ${slot.name}`);
      const tx = await module.createSlot(
        slot.slotId,
        slot.name,
        slot.transferable,
        slot.mergeable,
        slot.splittable,
        slot.maxSupply || 0
      );
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureTransferRestrictionsModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring transfer restrictions module');
    if (config.defaultPolicy) {
      const tx = await module.setDefaultPolicy(config.defaultPolicy === 'allow' ? 0 : 1);
      txHashes.push((await tx.wait()).transactionHash);
    }
    for (const restriction of config.restrictions || []) {
      if (restriction.enabled) {
        const tx = await module.addRestriction(restriction.restrictionType, restriction.value, restriction.description || '');
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  private static async configurePolicyEngineModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring policy engine module');
    if (config.defaultPolicy) {
      const tx = await module.setDefaultPolicy(config.defaultPolicy === 'allow' ? 0 : 1);
      txHashes.push((await tx.wait()).transactionHash);
    }
    for (const rule of config.rules || []) {
      if (rule.enabled) {
        const tx = await module.addRule(rule.ruleId, rule.name, JSON.stringify(rule.conditions), JSON.stringify(rule.actions), rule.priority);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    for (const validator of config.validators || []) {
      if (validator.enabled) {
        const tx = await module.addValidator(validator.validatorId, validator.validatorAddress);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  private static async configureFeeModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring fee module');
    if (config.transferFeeBps !== undefined) {
      const tx = await module.setTransferFee(config.transferFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    if (config.feeRecipient) {
      const tx = await module.setFeeRecipient(config.feeRecipient);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureTimelockModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring timelock module');
    if (config.minDelay !== undefined) {
      const tx = await module.setMinDelay(config.minDelay);
      txHashes.push((await tx.wait()).transactionHash);
    }
    for (const proposer of config.proposers || []) {
      const tx = await module.grantRole(ethers.id('PROPOSER_ROLE'), proposer);
      txHashes.push((await tx.wait()).transactionHash);
    }
    for (const executor of config.executors || []) {
      const tx = await module.grantRole(ethers.id('EXECUTOR_ROLE'), executor);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureRoyaltyModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring royalty module');
    if (config.defaultRoyaltyBps !== undefined && config.defaultRoyaltyRecipient) {
      const tx = await module.setDefaultRoyalty(config.defaultRoyaltyRecipient, config.defaultRoyaltyBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    for (const tokenRoyalty of config.tokenRoyalties || []) {
      const tx = await module.setTokenRoyalty(tokenRoyalty.tokenId, tokenRoyalty.recipient, tokenRoyalty.royaltyBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureRentalModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring rental module');
    if (config.maxRentalDuration !== undefined) {
      const tx = await module.setMaxRentalDuration(config.maxRentalDuration);
      txHashes.push((await tx.wait()).transactionHash);
    }
    if (config.platformFeeRecipient && config.platformFeeBps !== undefined) {
      const tx = await module.setPlatformFee(config.platformFeeRecipient, config.platformFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  // ============ ERC20 ADDITIONAL MODULES ============

  private static async configurePermitModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring permit module');
    // Permit module typically requires no post-deployment configuration
    // All functionality is in the deployment initialization
    // This handler exists for consistency and future extensibility
    if (config.customDomain) {
      console.log('  Note: Custom domain configuration not currently supported');
    }
  }

  private static async configureSnapshotModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring snapshot module');
    
    // Configure snapshot schedule if provided
    if (config.automaticSnapshots && config.snapshotInterval !== undefined) {
      const tx = await module.setSnapshotInterval(config.snapshotInterval);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Add snapshot controllers
    if (config.snapshotControllers?.length > 0) {
      console.log(`  Adding ${config.snapshotControllers.length} snapshot controllers`);
      for (const controller of config.snapshotControllers) {
        const tx = await module.grantRole(ethers.id('SNAPSHOT_ROLE'), controller);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Create initial snapshot if requested
    if (config.createInitialSnapshot) {
      console.log('  Creating initial snapshot');
      const tx = await module.snapshot();
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureFlashMintModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring flash mint module');
    
    // Set flash loan fee
    if (config.flashFeeBps !== undefined) {
      const tx = await module.setFlashFee(config.flashFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set fee recipient
    if (config.feeRecipient) {
      const tx = await module.setFeeRecipient(config.feeRecipient);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set maximum flash loan amount
    if (config.maxFlashAmount !== undefined) {
      const tx = await module.setMaxFlashLoan(config.maxFlashAmount);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureVotesModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring votes module');
    
    // Configure voting parameters
    if (config.votingDelay !== undefined) {
      const tx = await module.setVotingDelay(config.votingDelay);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.votingPeriod !== undefined) {
      const tx = await module.setVotingPeriod(config.votingPeriod);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.proposalThreshold !== undefined) {
      const tx = await module.setProposalThreshold(ethers.parseUnits(config.proposalThreshold.toString(), 18));
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.quorumPercentage !== undefined) {
      const tx = await module.updateQuorumNumerator(config.quorumPercentage);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureTemporaryApprovalModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring temporary approval module');
    
    // Set default approval duration
    if (config.defaultDuration !== undefined) {
      const tx = await module.setDefaultDuration(config.defaultDuration);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set min/max duration limits
    if (config.minDuration !== undefined) {
      const tx = await module.setMinDuration(config.minDuration);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.maxDuration !== undefined) {
      const tx = await module.setMaxDuration(config.maxDuration);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configurePayableTokenModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring payable token module');
    
    // Set payment receivers
    if (config.paymentReceivers?.length > 0) {
      console.log(`  Configuring ${config.paymentReceivers.length} payment receivers`);
      for (const receiver of config.paymentReceivers) {
        const tx = await module.addPaymentReceiver(receiver);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set payment callback contract if specified
    if (config.callbackContract) {
      const tx = await module.setCallbackContract(config.callbackContract);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  // ============ ERC721 ADDITIONAL MODULES ============

  private static async configureConsecutiveModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring consecutive module');
    
    // Set batch size limits
    if (config.maxBatchSize !== undefined) {
      const tx = await module.setMaxBatchSize(config.maxBatchSize);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure sequential minting rules
    if (config.enforceSequential !== undefined) {
      const tx = await module.setEnforceSequential(config.enforceSequential);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureFractionalizationModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring fractionalization module');
    
    // Set ERC20 wrapper template if specified
    if (config.wrapperTemplate) {
      const tx = await module.setWrapperTemplate(config.wrapperTemplate);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure share distribution rules
    if (config.minSharePrice !== undefined) {
      const tx = await module.setMinSharePrice(ethers.parseUnits(config.minSharePrice.toString(), 18));
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set fractionalization fee
    if (config.fractionalizationFeeBps !== undefined) {
      const tx = await module.setFractionalizationFee(config.fractionalizationFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureSoulboundModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring soulbound module');
    
    // Configure transfer rules
    if (config.allowOneTimeTransfer !== undefined) {
      const tx = await module.setAllowOneTimeTransfer(config.allowOneTimeTransfer);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure burn permissions
    if (config.burnableByOwner !== undefined) {
      const tx = await module.setBurnableByOwner(config.burnableByOwner);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.burnableByIssuer !== undefined) {
      const tx = await module.setBurnableByIssuer(config.burnableByIssuer);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure expiration if enabled
    if (config.expirationEnabled && config.expirationPeriod !== undefined) {
      const tx = await module.setExpirationPeriod(config.expirationPeriod);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureMetadataEventsModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring metadata events module');
    
    // Enable/disable batch metadata updates
    if (config.allowBatchUpdates !== undefined) {
      const tx = await module.setAllowBatchUpdates(config.allowBatchUpdates);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure metadata update permissions
    if (config.metadataUpdaters?.length > 0) {
      console.log(`  Adding ${config.metadataUpdaters.length} metadata updaters`);
      for (const updater of config.metadataUpdaters) {
        const tx = await module.grantRole(ethers.id('METADATA_UPDATER_ROLE'), updater);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set metadata refresh interval if specified
    if (config.refreshInterval !== undefined) {
      const tx = await module.setRefreshInterval(config.refreshInterval);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable/disable automatic metadata events
    if (config.autoEmitEvents !== undefined) {
      const tx = await module.setAutoEmitEvents(config.autoEmitEvents);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  // ============ ERC1155 MODULES ============

  private static async configureSupplyCapModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring supply cap module');
    
    // Set per-token supply caps
    if (config.tokenCaps?.length > 0) {
      console.log(`  Setting supply caps for ${config.tokenCaps.length} token IDs`);
      for (const cap of config.tokenCaps) {
        const tx = await module.setSupplyCap(cap.tokenId, cap.maxSupply);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set global supply cap if specified
    if (config.globalCap !== undefined) {
      const tx = await module.setGlobalSupplyCap(config.globalCap);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureURIManagementModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring URI management module');
    
    // Set base URI
    if (config.baseURI) {
      const tx = await module.setBaseURI(config.baseURI);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set per-token URIs
    if (config.tokenURIs?.length > 0) {
      console.log(`  Setting URIs for ${config.tokenURIs.length} tokens`);
      for (const uri of config.tokenURIs) {
        const tx = await module.setURI(uri.tokenId, uri.uri);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set URI freezing rules
    if (config.allowURIUpdates !== undefined) {
      const tx = await module.setAllowURIUpdates(config.allowURIUpdates);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureGranularApprovalModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring granular approval module');
    
    // Configure approval scopes
    if (config.defaultApprovalScope) {
      const tx = await module.setDefaultApprovalScope(config.defaultApprovalScope);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set approval limits
    if (config.maxApprovalAmount !== undefined) {
      const tx = await module.setMaxApprovalAmount(config.maxApprovalAmount);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  // ============ ERC3525 ADDITIONAL MODULES ============

  private static async configureSlotApprovableModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring slot approvable module');
    
    // Configure slot-level approval rules
    if (config.slotApprovalRules?.length > 0) {
      console.log(`  Configuring ${config.slotApprovalRules.length} slot approval rules`);
      for (const rule of config.slotApprovalRules) {
        const tx = await module.setSlotApprovalRule(rule.slotId, rule.requiresApproval, rule.approvers || []);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  private static async configureValueExchangeModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring value exchange module');
    
    // Set exchange rate oracle
    if (config.exchangeOracle) {
      const tx = await module.setExchangeOracle(config.exchangeOracle);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure exchange rates
    if (config.exchangeRates?.length > 0) {
      console.log(`  Setting ${config.exchangeRates.length} exchange rates`);
      for (const rate of config.exchangeRates) {
        const tx = await module.setExchangeRate(rate.fromSlot, rate.toSlot, rate.rate);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set exchange fee
    if (config.exchangeFeeBps !== undefined) {
      const tx = await module.setExchangeFee(config.exchangeFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  // ============ ERC4626 MODULES ============

  private static async configureAsyncVaultModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring async vault module');
    
    // Set minimum fulfillment delay
    if (config.minimumFulfillmentDelay !== undefined) {
      const tx = await module.setMinimumFulfillmentDelay(config.minimumFulfillmentDelay);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set max pending requests per user
    if (config.maxPendingRequestsPerUser !== undefined) {
      const tx = await module.setMaxPendingRequests(config.maxPendingRequestsPerUser);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set request expiry
    if (config.requestExpiry !== undefined) {
      const tx = await module.setRequestExpiry(config.requestExpiry);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable/disable partial fulfillment
    if (config.partialFulfillmentEnabled !== undefined) {
      const tx = await module.setPartialFulfillmentEnabled(config.partialFulfillmentEnabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureFeeStrategyModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring fee strategy module');
    
    // Set management fee
    if (config.managementFeeBps !== undefined) {
      const tx = await module.setManagementFee(config.managementFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set performance fee
    if (config.performanceFeeBps !== undefined) {
      const tx = await module.setPerformanceFee(config.performanceFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set withdrawal fee
    if (config.withdrawalFeeBps !== undefined) {
      const tx = await module.setWithdrawalFee(config.withdrawalFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set fee recipient
    if (config.feeRecipient) {
      const tx = await module.setFeeRecipient(config.feeRecipient);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureNativeVaultModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring native vault module');
    
    // Set WETH address (if not set during initialization)
    if (config.wethAddress) {
      const tx = await module.setWETH(config.wethAddress);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable/disable native token acceptance
    if (config.acceptNativeToken !== undefined) {
      const tx = await module.setAcceptNativeToken(config.acceptNativeToken);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable/disable auto-unwrap on withdrawal
    if (config.unwrapOnWithdrawal !== undefined) {
      const tx = await module.setUnwrapOnWithdrawal(config.unwrapOnWithdrawal);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureRouterModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring router module');
    
    // Configure routing paths
    if (config.routingPaths?.length > 0) {
      console.log(`  Adding ${config.routingPaths.length} routing paths`);
      for (const path of config.routingPaths) {
        const tx = await module.addRoutingPath(path.fromVault, path.toVault, path.intermediateHops || []);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set max hops for multi-hop routing
    if (config.maxHops !== undefined) {
      const tx = await module.setMaxHops(config.maxHops);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set slippage tolerance
    if (config.slippageTolerance !== undefined) {
      const tx = await module.setSlippageTolerance(config.slippageTolerance);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureWithdrawalQueueModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring withdrawal queue module');
    
    // Set liquidity buffer
    if (config.liquidityBuffer !== undefined) {
      const tx = await module.setLiquidityBuffer(config.liquidityBuffer);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set max queue size
    if (config.maxQueueSize !== undefined) {
      const tx = await module.setMaxQueueSize(config.maxQueueSize);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set minimum withdrawal delay
    if (config.minWithdrawalDelay !== undefined) {
      const tx = await module.setMinWithdrawalDelay(config.minWithdrawalDelay);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set withdrawal amount limits
    if (config.minWithdrawalAmount !== undefined) {
      const tx = await module.setMinWithdrawalAmount(config.minWithdrawalAmount);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.maxWithdrawalAmount !== undefined) {
      const tx = await module.setMaxWithdrawalAmount(config.maxWithdrawalAmount);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set priority fee for express withdrawals
    if (config.priorityFeeBps !== undefined) {
      const tx = await module.setPriorityFee(config.priorityFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureYieldStrategyModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring yield strategy module');
    
    // Set yield strategy contract
    if (config.strategyContract) {
      const tx = await module.setStrategy(config.strategyContract);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set harvest frequency
    if (config.harvestFrequency !== undefined) {
      const tx = await module.setHarvestFrequency(config.harvestFrequency);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set rebalance threshold
    if (config.rebalanceThreshold !== undefined) {
      const tx = await module.setRebalanceThreshold(config.rebalanceThreshold);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set performance fee for yield
    if (config.performanceFeeBps !== undefined) {
      const tx = await module.setPerformanceFee(config.performanceFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureMultiAssetVaultModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring multi-asset vault module');
    
    // Set price oracle
    if (config.priceOracle) {
      const tx = await module.setPriceOracle(config.priceOracle);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set base asset for valuation
    if (config.baseAsset) {
      const tx = await module.setBaseAsset(config.baseAsset);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Add supported assets
    if (config.supportedAssets?.length > 0) {
      console.log(`  Adding ${config.supportedAssets.length} supported assets`);
      for (const asset of config.supportedAssets) {
        const tx = await module.addSupportedAsset(asset.address, asset.weight || 100);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set rebalancing parameters
    if (config.rebalanceThreshold !== undefined) {
      const tx = await module.setRebalanceThreshold(config.rebalanceThreshold);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  // ============ ERC1400 ADDITIONAL MODULES ============

  private static async configureControllerModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring controller module');
    
    // Add controllers
    if (config.controllers?.length > 0) {
      console.log(`  Adding ${config.controllers.length} controllers`);
      for (const controller of config.controllers) {
        const tx = await module.addController(controller);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Enable/disable controllable transfers
    if (config.controllableTransfers !== undefined) {
      const tx = await module.setControllable(config.controllableTransfers);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureERC1400DocumentModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring ERC1400 document module');
    
    // Similar to universal document module but with ERC1400-specific features
    if (config.documents?.length > 0) {
      console.log(`  Adding ${config.documents.length} documents`);
      for (const doc of config.documents) {
        const tx = await module.setDocument(
          ethers.encodeBytes32String(doc.name),
          doc.uri,
          doc.hash
        );
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set partition-specific documents if supported
    if (config.partitionDocuments?.length > 0) {
      console.log(`  Adding ${config.partitionDocuments.length} partition documents`);
      for (const doc of config.partitionDocuments) {
        const tx = await module.setPartitionDocument(
          ethers.encodeBytes32String(doc.partition),
          ethers.encodeBytes32String(doc.name),
          doc.uri,
          doc.hash
        );
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  // ============ UTILITY METHODS ============

  private static async getMasterABI(tokenStandard: string): Promise<any> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', `${tokenStandard}_master`)
      .eq('is_template', true)
      .eq('is_active', true)
      .single();
    
    if (error || !data) throw new Error(`ABI not found for ${tokenStandard} master`);
    return data.abi;
  }

  private static async getModuleABI(moduleType: string): Promise<any> {
    // Comprehensive mapping: Code module names (camelCase) → Database contract_type (snake_case)
    // Covers all ERC standards: ERC20, ERC721, ERC1155, ERC3525, ERC4626, ERC1400
    const moduleTypeMap: Record<string, string> = {
      // ============ UNIVERSAL MODULES (All Standards) ============
      'vesting': 'vesting_module',
      'document': 'document_module',
      'policyEngine': 'policy_engine_module',
      'policy_engine': 'policy_engine_module',
      'compliance': 'compliance_module',
      
      // ============ ERC20 MODULES ============
      'fees': 'fee_module',                           // Plural variation
      'fee': 'fee_module',
      'timelock': 'timelock_module',
      'permit': 'permit_module',
      'snapshot': 'snapshot_module',
      'flashMint': 'flash_mint_module',
      'flash_mint': 'flash_mint_module',
      'votes': 'votes_module',
      'temporaryApproval': 'temporary_approval_module',
      'temporary_approval': 'temporary_approval_module',
      'payableToken': 'payable_module',               // Code uses "payableToken", DB uses "payable_module"
      'payable': 'payable_module',
      
      // ============ ERC721 MODULES ============
      'royalty': 'erc721_royalty_module',
      'erc721_royalty': 'erc721_royalty_module',
      'rental': 'rental_module',
      'consecutive': 'consecutive_module',
      'fractionalization': 'fraction_module',         // Code uses "fractionalization", DB uses "fraction_module"
      'fraction': 'fraction_module',
      'soulbound': 'soulbound_module',
      'metadataEvents': 'metadata_events_module',
      'metadata_events': 'metadata_events_module',
      
      // ============ ERC1155 MODULES ============
      'supplyCap': 'supply_cap_module',
      'supply_cap': 'supply_cap_module',
      'uriManagement': 'uri_management_module',
      'uri_management': 'uri_management_module',
      'granularApproval': 'granular_approval_module',
      'granular_approval': 'granular_approval_module',
      'erc1155_royalty': 'erc1155_royalty_module',    // ERC1155 specific royalty
      
      // ============ ERC3525 MODULES (Semi-Fungible) ============
      'slotManager': 'erc3525_slot_manager_module',
      'slot_manager': 'erc3525_slot_manager_module',
      'erc3525_slot_manager': 'erc3525_slot_manager_module',
      'slotApprovable': 'erc3525_slot_approvable_module',
      'slot_approvable': 'erc3525_slot_approvable_module',
      'erc3525_slot_approvable': 'erc3525_slot_approvable_module',
      'valueExchange': 'erc3525_value_exchange_module',
      'value_exchange': 'erc3525_value_exchange_module',
      'erc3525_value_exchange': 'erc3525_value_exchange_module',
      
      // ============ ERC4626 MODULES (Tokenized Vaults) ============
      'asyncVault': 'erc4626_async_vault_module',
      'async_vault': 'erc4626_async_vault_module',
      'erc4626_async_vault': 'erc4626_async_vault_module',
      'feeStrategy': 'erc4626_fee_strategy_module',
      'fee_strategy': 'erc4626_fee_strategy_module',
      'erc4626_fee_strategy': 'erc4626_fee_strategy_module',
      'nativeVault': 'erc4626_native_vault_module',
      'native_vault': 'erc4626_native_vault_module',
      'erc4626_native_vault': 'erc4626_native_vault_module',
      'router': 'erc4626_router_module',
      'erc4626_router': 'erc4626_router_module',
      'withdrawalQueue': 'erc4626_withdrawal_queue_module',
      'withdrawal_queue': 'erc4626_withdrawal_queue_module',
      'erc4626_withdrawal_queue': 'erc4626_withdrawal_queue_module',
      'yieldStrategy': 'erc4626_yield_strategy_module',
      'yield_strategy': 'erc4626_yield_strategy_module',
      'erc4626_yield_strategy': 'erc4626_yield_strategy_module',
      'multiAssetVault': 'multi_asset_vault_module',
      'multi_asset_vault': 'multi_asset_vault_module',
      
      // ============ ERC1400 MODULES (Security Tokens) ============
      'transferRestrictions': 'erc1400_transfer_restrictions_module',
      'transfer_restrictions': 'erc1400_transfer_restrictions_module',
      'erc1400_transfer_restrictions': 'erc1400_transfer_restrictions_module',
      'controller': 'erc1400_controller_module',
      'erc1400_controller': 'erc1400_controller_module',
      'erc1400Document': 'erc1400_document_module',
      'erc1400_document': 'erc1400_document_module'
    };

    const contractType = moduleTypeMap[moduleType] || `${moduleType}_module`;
    
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', contractType)
      .eq('is_template', true)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.error(`❌ ABI lookup failed for module type "${moduleType}" (contract_type: "${contractType}")`, error);
      throw new Error(`ABI not found for ${moduleType} module (contract_type: ${contractType})`);
    }
    
    return data.abi;
  }
}
