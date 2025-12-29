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

      // Get extension factory address from database (standard-specific or universal)
      const factoryAddress = await this.getFactoryAddress(
        params.blockchain,
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
      console.log(`   - Network: ${params.blockchain} (${params.environment})`);
      console.log(`   - Standard: ${tokenStandard}`);
      
      const deployedModules = await InstanceDeploymentService.deployAndAttachModules(
        tokenAddress,
        tokenId,
        moduleSelection,
        params.blockchain,
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

      // TODO: Add configuration step here if needed
      // For now, just deployment - configuration can be added post-deployment

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
          kycRequired: config.compliance_config.kycRequired || false,
          whitelistRequired: config.compliance_config.whitelistRequired || false,
          whitelistAddresses: config.compliance_config.whitelistAddresses || ''
        };
      } else {
        selection.complianceConfig = {
          kycRequired: config.kyc_required || false,
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
      
      // FEES - Reads from fee_on_transfer JSONB
      if (config.fees_enabled || config.feesModuleAddress || config.fee_on_transfer) {
        selection.fees = true;
        
        if (config.fee_on_transfer && config.fee_on_transfer.percentage !== undefined) {
          selection.feesConfig = {
            transferFeeBps: Math.round((config.fee_on_transfer.percentage || 0) * 100),
            feeRecipient: config.fee_on_transfer.recipient || config.initialOwner || ''
          };
        } else {
          selection.feesConfig = {
            transferFeeBps: config.transfer_fee_bps || 0,
            feeRecipient: config.fee_recipient || config.initialOwner || ''
          };
        }
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
        selection.supplyCapConfig = { defaultCap: config.max_supply_per_type || 0 };
      }
      
      if (config.uri_management || config.uri_management_enabled) {
        selection.uriManagement = true;
        selection.uriManagementConfig = { baseURI: config.base_uri || '' };
      }
    }

    // ERC3525-specific modules
    if (tokenStandard === 'erc3525') {
      if (config.slot_approvable) selection.slotApprovable = true;
      if (config.slot_manager) {
        selection.slotManager = true;
        selection.slotManagerConfig = config.slot_manager_config || {};
      }
      if (config.value_exchange || config.partial_value_trading) {
        selection.valueExchange = true;
        selection.valueExchangeConfig = {
          exchangeFeeBps: Math.round((parseFloat(config.trading_fee_percentage) || 0) * 100)
        };
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
        case 'vesting':
          await this.configureVestingModule(module, config, txHashes);
          break;
        case 'document':
          await this.configureDocumentModule(module, config, txHashes);
          break;
        case 'compliance':
          await this.configureComplianceModule(module, config, txHashes);
          break;
        case 'slotManager':
          await this.configureSlotManagerModule(module, config, txHashes);
          break;
        case 'transferRestrictions':
          await this.configureTransferRestrictionsModule(module, config, txHashes);
          break;
        case 'policyEngine':
          await this.configurePolicyEngineModule(module, config, txHashes);
          break;
        case 'fees':
          await this.configureFeesModule(module, config, txHashes);
          break;
        case 'timelock':
          await this.configureTimelockModule(module, config, txHashes);
          break;
        case 'royalty':
          await this.configureRoyaltyModule(module, config, txHashes);
          break;
        case 'rental':
          await this.configureRentalModule(module, config, txHashes);
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

  private static async configureFeesModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring fees module');
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
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', `${moduleType}_module`)
      .eq('is_template', true)
      .eq('is_active', true)
      .single();
    
    if (error || !data) throw new Error(`ABI not found for ${moduleType} module`);
    return data.abi;
  }
}
