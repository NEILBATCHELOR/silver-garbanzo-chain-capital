/**
 * Enhanced Module Deployment Service (Integration Layer)
 * 
 * Integrates ModuleDeploymentService with Foundry token deployment flow
 * Deploys NEW module instances per token (not shared masters)
 * 
 * CRITICAL ARCHITECTURE:
 * - contract_masters table = Master/Template contracts
 * - This service = Deploys NEW instances from masters
 * - token_modules table = Records NEW instance addresses
 * 
 * JSONB CONFIGURATION MAPPING:
 * Maps ERC20PropertiesTab JSONB fields to ModuleSelection config format:
 * - fee_on_transfer → feesConfig
 * - timelock_config → timelockConfig
 * - compliance_config → complianceConfig
 * - temporary_approval_config → temporaryApprovalConfig
 * - governance_features → (informational only, not a module)
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import { ModuleDeploymentService } from '@/services/modules/ModuleDeploymentService';
import type { FoundryDeploymentParams } from '../interfaces/TokenInterfaces';
import type { ModuleSelection } from '@/services/modules/ModuleRegistryService';

/**
 * Result of module deployment operations
 */
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

/**
 * Enhanced service that DEPLOYS new module instances (not just attaches existing ones)
 */
export class EnhancedModuleDeploymentService {
  
  /**
   * Deploy and attach NEW module instances for a token
   * 
   * CRITICAL: This deploys NEW instances, does NOT reuse shared masters
   * 
   * @param tokenAddress - Address of deployed token
   * @param tokenId - Database ID of token
   * @param wallet - Signer wallet
   * @param params - Deployment parameters
   * @param userId - User ID for audit
   * @returns Result with deployed module details
   */
  async deployAndAttachModules(
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
      // Extract module selection from params
      const moduleSelection = this.extractModuleSelection(params);
      
      // Check if any modules selected
      if (!this.hasAnyModulesSelected(moduleSelection)) {
        console.log('ℹ️ No extension modules selected for deployment');
        return result;
      }

      console.log('🏭 Deploying NEW module instances for token:', tokenAddress);
      console.log('📦 Selected modules:', moduleSelection);

      // Get factory address from database
      const factoryAddress = await this.getFactoryAddress(
        params.blockchain,
        params.environment
      );

      if (!factoryAddress) {
        console.warn('⚠️ No factory found, cannot deploy module instances');
        result.failed.push({
          moduleType: 'all',
          error: 'Factory contract not found in database'
        });
        return result;
      }

      // Determine token standard
      const tokenStandard = this.getTokenStandard(params.tokenType);

      // Deploy module instances using ModuleDeploymentService
      const deployedModules = await ModuleDeploymentService.deployAndAttachModules(
        tokenAddress,
        tokenId,
        moduleSelection,
        params.blockchain,
        tokenStandard,
        params.environment,
        wallet,
        factoryAddress
      );

      // Transform results for return
      result.deployed = deployedModules.map(module => ({
        moduleType: module.moduleType,
        instanceAddress: module.moduleAddress,
        masterAddress: module.masterAddress,
        txHash: module.deploymentTxHash
      }));

      console.log(`✅ Deployed ${result.deployed.length} NEW module instances`);

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

  /**
   * Extract module selection from deployment parameters
   * 
   * ✅ ENHANCED: Now properly maps JSONB fields from ERC20PropertiesTab:
   * - fee_on_transfer → feesConfig (converts percentage to basis points)
   * - timelock_config → timelockConfig (uses minDelay directly)
   * - compliance_config → complianceConfig (kycRequired, whitelistRequired)
   * - temporary_approval_config → temporaryApprovalConfig (defaultDuration)
   */
  private extractModuleSelection(params: FoundryDeploymentParams): ModuleSelection {
    // Check if moduleSelection exists in config (new format)
    const config = params.config as any;
    if (config.moduleSelection) {
      return config.moduleSelection;
    }

    // Fallback: Build selection from boolean flags and JSONB config fields
    const selection: ModuleSelection = {};

    // ============ UNIVERSAL MODULES (All Standards) ============
    
    // ✅ COMPLIANCE - Reads from compliance_config JSONB
    if (config.compliance_enabled || config.complianceModuleAddress || config.compliance_config) {
      selection.compliance = true;
      
      if (config.compliance_config) {
        selection.complianceConfig = {
          kycRequired: config.compliance_config.kycRequired || false,
          whitelistRequired: config.compliance_config.whitelistRequired || false,
          whitelistAddresses: config.compliance_config.whitelistAddresses || ''
        };
      } else {
        // Fallback to old direct config format
        selection.complianceConfig = {
          kycRequired: config.kyc_required || false,
          whitelistRequired: config.whitelist_required || false
        };
      }
    }

    // ✅ VESTING - Reads from vesting configuration fields
    if (config.vesting_enabled || config.vestingModuleAddress) {
      selection.vesting = true;
      
      // Extract vesting schedule parameters from database fields
      selection.vestingConfig = {
        cliffPeriod: config.vesting_cliff_period || 0,
        totalPeriod: config.vesting_total_period || 0,
        releaseFrequency: config.vesting_release_frequency || 'monthly',
        // Additional config can be added post-deployment via PolicyAwareLockOperation
        ...(config.vesting_config || {})
      };
    }

    if (config.document_enabled || config.documentModuleAddress) {
      selection.document = true;
      selection.documentConfig = config.document_config || {};
    }

    if (config.policy_engine_enabled || config.policyEngineAddress) {
      selection.policyEngine = true;
      selection.policyEngineConfig = {
        rulesEnabled: config.policy_rules_enabled || [],
        validatorsEnabled: config.policy_validators_enabled || []
      };
    }

    // ============ TOKEN STANDARD-SPECIFIC MODULES ============
    const tokenStandard = this.getTokenStandard(params.tokenType);

    // ERC20-specific modules
    if (tokenStandard === 'erc20') {
      
      // ✅ FEES - Reads from fee_on_transfer JSONB
      if (config.fees_enabled || config.feesModuleAddress || config.fee_on_transfer) {
        selection.fees = true;
        
        if (config.fee_on_transfer && config.fee_on_transfer.percentage !== undefined) {
          // Convert percentage (0.2) to basis points (20)
          selection.feesConfig = {
            transferFeeBps: Math.round((config.fee_on_transfer.percentage || 0) * 100),
            feeRecipient: config.fee_on_transfer.recipient || config.initialOwner || ''
          };
        } else {
          // Fallback to old direct config format
          selection.feesConfig = {
            transferFeeBps: config.transfer_fee_bps || 0,
            feeRecipient: config.fee_recipient || config.initialOwner || ''
          };
        }
      }
      
      // ✅ TIMELOCK - Reads from timelock_config JSONB
      if (config.timelock || config.timelockModuleAddress || config.timelock_config) {
        selection.timelock = true;
        
        if (config.timelock_config && config.timelock_config.minDelay !== undefined) {
          // Use minDelay directly from JSONB (already in seconds)
          selection.timelockConfig = {
            minDelay: config.timelock_config.minDelay || 172800 // Default: 2 days
          };
        } else if (config.governance_features && config.governance_features.voting_delay !== undefined) {
          // Fallback: Convert blocks to seconds (assuming 12 sec per block)
          const delayInSeconds = (config.governance_features.voting_delay || 1) * 12;
          selection.timelockConfig = { minDelay: delayInSeconds };
        } else {
          // Fallback to old format
          selection.timelockConfig = { minDelay: config.timelock_min_delay || 172800 };
        }
      }
      
      // ✅ TEMPORARY APPROVAL - Reads from temporary_approval_config JSONB
      if (config.temporary_approval || config.temporaryApprovalModuleAddress || config.temporary_approval_config) {
        selection.temporaryApproval = true;
        
        if (config.temporary_approval_config && config.temporary_approval_config.defaultDuration !== undefined) {
          // Use defaultDuration directly from JSONB (already in seconds)
          selection.temporaryApprovalConfig = {
            defaultDuration: config.temporary_approval_config.defaultDuration || 3600 // Default: 1 hour
          };
        } else {
          // Fallback to old format
          selection.temporaryApprovalConfig = { 
            defaultDuration: config.temporary_approval_duration || 3600 
          };
        }
      }
      
      // Simple boolean modules (no config needed)
      if (config.flash_mint || config.flashMintModuleAddress) {
        selection.flashMint = true;
      }
      if (config.permit || config.permitModuleAddress) {
        selection.permit = true;
      }
      if (config.snapshot || config.snapshotModuleAddress) {
        selection.snapshot = true;
      }
      if (config.votes || config.votesModuleAddress) {
        selection.votes = true;
      }
      if (config.payable_token || config.payableTokenModuleAddress) {
        selection.payableToken = true;
      }
    }

    // ERC721-specific modules
    if (tokenStandard === 'erc721') {
      // ✅ ROYALTY - Reads from has_royalty, royalty_percentage, royalty_receiver columns
      if (config.has_royalty || config.royalty_enabled || config.royaltyModuleAddress) {
        selection.royalty = true;
        
        // Read from actual database columns
        if (config.royalty_percentage !== undefined || config.royalty_receiver) {
          selection.royaltyConfig = {
            // Convert percentage (2.5) to basis points (250)
            defaultRoyaltyBps: Math.round((parseFloat(config.royalty_percentage) || 2.5) * 100),
            royaltyRecipient: config.royalty_receiver || config.initialOwner || ''
          };
        } else {
          // Fallback to old direct config format
          selection.royaltyConfig = {
            defaultRoyaltyBps: config.default_royalty_bps || 250,
            royaltyRecipient: config.royalty_recipient || config.initialOwner || ''
          };
        }
      }
      
      // ✅ RENTAL - Reads from rental_config JSONB
      if (config.rental_enabled || config.rentalModuleAddress || config.rental_config) {
        selection.rental = true;
        
        if (config.rental_config && config.rental_config.maxRentalDuration !== undefined) {
          selection.rentalConfig = {
            maxRentalDuration: config.rental_config.maxRentalDuration || 86400,
            minRentalPrice: config.rental_config.minRentalPrice,
            rentalRecipient: config.rental_config.rentalRecipient
          };
        } else {
          // Fallback to old format
          selection.rentalConfig = {
            maxRentalDuration: config.max_rental_duration || 86400
          };
        }
      }
      
      // ✅ FRACTIONALIZATION - Reads from fractionalization_config JSONB
      if (config.enable_fractional_ownership || config.fraction_enabled || 
          config.fractionModuleAddress || config.fractionalization_config) {
        selection.fraction = true;
        
        if (config.fractionalization_config && config.fractionalization_config.minFractions !== undefined) {
          selection.fractionConfig = {
            minFractions: config.fractionalization_config.minFractions || 100,
            maxFractions: config.fractionalization_config.maxFractions,
            fractionPrice: config.fractionalization_config.fractionPrice
          };
        } else {
          // Fallback to old format
          selection.fractionConfig = {
            minFractions: config.min_fractions || 100
          };
        }
      }
      
      // ✅ COMPLIANCE - Reads from compliance_config JSONB
      if (config.compliance_enabled || config.complianceModuleAddress || config.compliance_config) {
        selection.compliance = true;
        
        if (config.compliance_config) {
          selection.complianceConfig = {
            kycRequired: config.compliance_config.kycRequired || false,
            whitelistRequired: config.compliance_config.whitelistRequired || false,
            whitelistAddresses: config.compliance_config.whitelistAddresses || ''
          };
        } else {
          // Fallback to old format
          selection.complianceConfig = {
            kycRequired: config.kyc_required || false,
            whitelistRequired: config.whitelist_required || false
          };
        }
      }
      
      // ✅ VESTING - Reads from vesting_config JSONB
      if (config.vesting_enabled || config.vestingModuleAddress || config.vesting_config) {
        selection.vesting = true;
        
        if (config.vesting_config) {
          selection.vestingConfig = {
            cliffPeriod: config.vesting_config.cliffPeriod || 0,
            totalPeriod: config.vesting_config.totalPeriod || 0,
            releaseFrequency: config.vesting_config.releaseFrequency || 'monthly'
          };
        } else {
          // Fallback to old format
          selection.vestingConfig = {
            cliffPeriod: config.vesting_cliff_period || 0,
            totalPeriod: config.vesting_total_period || 0,
            releaseFrequency: config.vesting_release_frequency || 'monthly'
          };
        }
      }
      
      // ✅ DOCUMENT - Boolean only
      if (config.document_enabled || config.documentModuleAddress) {
        selection.document = true;
        selection.documentConfig = config.document_config || {};
      }
      
      // ✅ Boolean modules (no config needed)
      if (config.soulbound || config.soulboundModuleAddress) {
        selection.soulbound = true;
      }
      if (config.consecutive || config.consecutiveModuleAddress) {
        selection.consecutive = true;
      }
      if (config.metadata_events || config.metadataEventsModuleAddress) {
        selection.metadataEvents = true;
      }
    }

    // ERC1155-specific modules
    if (tokenStandard === 'erc1155') {
      // ✅ ROYALTY - Reads from royalty_config JSONB or fallback to columns
      if (config.has_royalty || config.royalty_enabled || config.royaltyModuleAddress || config.royalty_config) {
        selection.royalty = true;
        
        if (config.royalty_config) {
          // Read from JSONB (new format)
          selection.royaltyConfig = {
            defaultRoyaltyBps: Math.round((config.royalty_config.percentage || 2.5) * 100),
            royaltyRecipient: config.royalty_config.recipient || config.initialOwner || ''
          };
        } else {
          // Fallback to individual columns (old format)
          selection.royaltyConfig = {
            defaultRoyaltyBps: Math.round((parseFloat(config.royalty_percentage) || 2.5) * 100),
            royaltyRecipient: config.royalty_receiver || config.initialOwner || ''
          };
        }
      }
      
      // ✅ SUPPLY CAP - Reads from supply_cap_config JSONB or fallback to column
      if (config.supply_cap_enabled || config.supplyCapModuleAddress || config.supply_cap_config) {
        selection.supplyCap = true;
        
        if (config.supply_cap_config) {
          selection.supplyCapConfig = {
            defaultCap: config.supply_cap_config.defaultCap || 0
          };
        } else {
          selection.supplyCapConfig = {
            defaultCap: config.max_supply_per_type || config.default_supply_cap || 0
          };
        }
      }
      
      // ✅ URI MANAGEMENT - Reads from uri_management_config JSONB or fallback to column
      if (config.uri_management || config.uri_management_enabled || config.uriManagementModuleAddress || config.uri_management_config) {
        selection.uriManagement = true;
        
        if (config.uri_management_config) {
          selection.uriManagementConfig = {
            baseURI: config.uri_management_config.baseURI || ''
          };
        } else {
          selection.uriManagementConfig = {
            baseURI: config.base_uri || ''
          };
        }
      }
    }

    // ERC3525-specific modules
    if (tokenStandard === 'erc3525') {
      if (config.slot_approvable || config.slotApprovableModuleAddress) {
        selection.slotApprovable = true;
      }
      if (config.slot_manager || config.slotManagerModuleAddress) {
        selection.slotManager = true;
        selection.slotManagerConfig = config.slot_manager_config || {};
      }
      
      // ✅ VALUE EXCHANGE - Reads from value_exchange_config JSONB or fallback to column
      if (config.value_exchange || config.partial_value_trading || config.valueExchangeModuleAddress || config.value_exchange_config) {
        selection.valueExchange = true;
        
        if (config.value_exchange_config) {
          selection.valueExchangeConfig = {
            exchangeFeeBps: config.value_exchange_config.exchangeFeeBps || 0
          };
        } else {
          // Fallback to trading_fee_percentage column
          selection.valueExchangeConfig = {
            exchangeFeeBps: Math.round((parseFloat(config.trading_fee_percentage) || 0) * 100)
          };
        }
      }
    }

    // ERC4626-specific modules
    if (tokenStandard === 'erc4626') {
      // ✅ FEE STRATEGY - Reads from fee_strategy_config JSONB or fallback to columns
      if (config.fee_strategy || config.fee_strategy_enabled || config.feeStrategyModuleAddress || config.fee_strategy_config) {
        selection.feeStrategy = true;
        
        if (config.fee_strategy_config) {
          selection.feeStrategyConfig = {
            managementFeeBps: config.fee_strategy_config.managementFeeBps || 0,
            performanceFeeBps: config.fee_strategy_config.performanceFeeBps || 0
          };
        } else {
          // Fallback to individual columns
          selection.feeStrategyConfig = {
            managementFeeBps: Math.round((parseFloat(config.management_fee) || 0) * 100),
            performanceFeeBps: Math.round((parseFloat(config.performance_fee) || 0) * 100)
          };
        }
      }
      
      // ✅ WITHDRAWAL QUEUE - Reads from withdrawal_queue_config JSONB
      if (config.withdrawal_queue || config.withdrawal_queue_enabled || config.withdrawalQueueModuleAddress || config.withdrawal_queue_config) {
        selection.withdrawalQueue = true;
        
        if (config.withdrawal_queue_config) {
          selection.withdrawalQueueConfig = {
            maxQueueSize: config.withdrawal_queue_config.maxQueueSize || 1000
          };
        } else {
          selection.withdrawalQueueConfig = {
            maxQueueSize: config.max_queue_size || 1000
          };
        }
      }
      
      // ✅ YIELD STRATEGY - Reads from yield_strategy_config JSONB
      if (config.yield_strategy || config.yield_strategy_enabled || config.yieldStrategyModuleAddress || config.yield_strategy_config) {
        selection.yieldStrategy = true;
        
        if (config.yield_strategy_config) {
          selection.yieldStrategyConfig = {
            harvestFrequency: config.yield_strategy_config.harvestFrequency || 86400,
            rebalanceThreshold: config.yield_strategy_config.rebalanceThreshold || 100
          };
        } else {
          // Fallback defaults if no config
          selection.yieldStrategyConfig = {
            harvestFrequency: 86400,  // 24 hours
            rebalanceThreshold: 100    // 1% in basis points
          };
        }
      }
      
      // ✅ ASYNC VAULT - Reads from async_vault_config JSONB
      if (config.async_vault || config.async_vault_enabled || config.asyncVaultModuleAddress || config.async_vault_config) {
        selection.asyncVault = true;
        
        if (config.async_vault_config) {
          selection.asyncVaultConfig = {
            minimumFulfillmentDelay: config.async_vault_config.minimumFulfillmentDelay || 86400,
            maxPendingRequestsPerUser: config.async_vault_config.maxPendingRequestsPerUser || 10
          };
        } else {
          // Fallback defaults if no config
          selection.asyncVaultConfig = {
            minimumFulfillmentDelay: 86400,  // 24 hours
            maxPendingRequestsPerUser: 10     // Max 10 pending requests
          };
        }
      }
      
      if (config.native_vault || config.nativeVaultModuleAddress) {
        selection.nativeVault = true;
      }
      if (config.router || config.routerModuleAddress) {
        selection.router = true;
      }
      
      // ✅ MULTI-ASSET VAULT - Reads from multi_asset_vault_config JSONB
      if (config.multi_asset_vault || config.multiAssetVaultModuleAddress || config.multi_asset_vault_config) {
        selection.multiAssetVault = true;
        
        if (config.multi_asset_vault_config) {
          selection.multiAssetVaultConfig = {
            priceOracle: config.multi_asset_vault_config.priceOracle || '',
            baseAsset: config.multi_asset_vault_config.baseAsset || ''
          };
        } else {
          // Defaults
          selection.multiAssetVaultConfig = {
            priceOracle: '',
            baseAsset: ''
          };
        }
      }
    }

    // ERC1400-specific modules
    if (tokenStandard === 'erc1400') {
      if (config.transfer_restrictions || config.transferRestrictionsModuleAddress) {
        selection.transferRestrictions = true;
      }
      
      // ✅ CONTROLLER - Reads from controller_config JSONB (controllable boolean)
      if (config.controller_enabled || config.controllerModuleAddress || config.controller_config) {
        selection.controller = true;
        
        if (config.controller_config) {
          selection.controllerConfig = {
            controllable: config.controller_config.controllable !== false  // Default true
          };
        } else {
          // Default to controllable = true
          selection.controllerConfig = {
            controllable: true
          };
        }
      }
      
      if (config.erc1400_document || config.erc1400DocumentModuleAddress) {
        selection.erc1400Document = true;
      }
      
      // ✅ DEFAULT PARTITIONS - Reads from default_partitions JSONB array
      // This is passed to the token initialize() function, not a module
      // Format: string[] of partition names like ['CLASS_A', 'CLASS_B', 'PREFERRED', 'COMMON']
      if (config.default_partitions) {
        // Store for use in token initialization
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
  private hasAnyModulesSelected(selection: ModuleSelection): boolean {
    return Object.keys(selection).some(key => 
      !key.endsWith('Config') && selection[key as keyof ModuleSelection] === true
    );
  }

  /**
   * Get token standard from token type
   */
  private getTokenStandard(tokenType: string): 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400' {
    const normalized = tokenType.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normalized.includes('erc20')) return 'erc20';
    if (normalized.includes('erc721')) return 'erc721';
    if (normalized.includes('erc1155')) return 'erc1155';
    if (normalized.includes('erc3525')) return 'erc3525';
    if (normalized.includes('erc4626')) return 'erc4626';
    if (normalized.includes('erc1400')) return 'erc1400';
    
    // Default fallback
    return 'erc20';
  }

  /**
   * Get factory address from database
   */
  private async getFactoryAddress(
    network: string,
    environment: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', 'token_factory')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Failed to fetch factory address:', error);
      return null;
    }

    return data?.contract_address || null;
  }
}

export const enhancedModuleDeploymentService = new EnhancedModuleDeploymentService();
