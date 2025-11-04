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
   * EXTENDED: Now supports all 52 module types across all token standards
   */
  private extractModuleSelection(params: FoundryDeploymentParams): ModuleSelection {
    // Check if moduleSelection exists in config (new format)
    const config = params.config as any;
    if (config.moduleSelection) {
      return config.moduleSelection;
    }

    // Fallback: Build selection from boolean flags in config
    const selection: ModuleSelection = {};

    // ============ UNIVERSAL MODULES (All Standards) ============
    if (config.compliance_enabled || config.complianceModuleAddress) {
      selection.compliance = true;
      selection.complianceConfig = {
        kycRequired: config.kyc_required || false,
        whitelistRequired: config.whitelist_required || false
      };
    }

    if (config.vesting_enabled || config.vestingModuleAddress) {
      selection.vesting = true;
      selection.vestingConfig = config.vesting_config || {};
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
      if (config.fees_enabled || config.feesModuleAddress) {
        selection.fees = true;
        selection.feesConfig = {
          transferFeeBps: config.transfer_fee_bps || 0,
          feeRecipient: config.fee_recipient || config.initialOwner
        };
      }
      if (config.flash_mint || config.flashMintModuleAddress) {
        selection.flashMint = true;
      }
      if (config.permit || config.permitModuleAddress) {
        selection.permit = true;
      }
      if (config.snapshot || config.snapshotModuleAddress) {
        selection.snapshot = true;
      }
      if (config.timelock || config.timelockModuleAddress) {
        selection.timelock = true;
        selection.timelockConfig = { minDelay: config.timelock_min_delay || 0 };
      }
      if (config.votes || config.votesModuleAddress) {
        selection.votes = true;
      }
      if (config.payable_token || config.payableTokenModuleAddress) {
        selection.payableToken = true;
      }
      if (config.temporary_approval || config.temporaryApprovalModuleAddress) {
        selection.temporaryApproval = true;
        selection.temporaryApprovalConfig = { 
          defaultDuration: config.temporary_approval_duration || 3600 
        };
      }
    }

    // ERC721-specific modules
    if (tokenStandard === 'erc721') {
      if (config.royalty_enabled || config.royaltyModuleAddress) {
        selection.royalty = true;
        selection.royaltyConfig = {
          defaultRoyaltyBps: config.default_royalty_bps || 250,
          royaltyRecipient: config.royalty_recipient || config.initialOwner
        };
      }
      if (config.rental_enabled || config.rentalModuleAddress) {
        selection.rental = true;
        selection.rentalConfig = {
          maxRentalDuration: config.max_rental_duration || 86400
        };
      }
      if (config.soulbound || config.soulboundModuleAddress) {
        selection.soulbound = true;
      }
      if (config.fraction_enabled || config.fractionModuleAddress) {
        selection.fraction = true;
        selection.fractionConfig = {
          minFractions: config.min_fractions || 100
        };
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
      if (config.royalty_enabled || config.royaltyModuleAddress) {
        selection.royalty = true;
        selection.royaltyConfig = {
          defaultRoyaltyBps: config.default_royalty_bps || 250,
          royaltyRecipient: config.royalty_recipient || config.initialOwner
        };
      }
      if (config.supply_cap_enabled || config.supplyCapModuleAddress) {
        selection.supplyCap = true;
        selection.supplyCapConfig = {
          defaultCap: config.default_supply_cap || 0
        };
      }
      if (config.uri_management || config.uriManagementModuleAddress) {
        selection.uriManagement = true;
        selection.uriManagementConfig = {
          baseURI: config.base_uri || ''
        };
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
      if (config.value_exchange || config.valueExchangeModuleAddress) {
        selection.valueExchange = true;
        selection.valueExchangeConfig = {
          exchangeFeeBps: config.exchange_fee_bps || 0
        };
      }
    }

    // ERC4626-specific modules
    if (tokenStandard === 'erc4626') {
      if (config.fee_strategy || config.feeStrategyModuleAddress) {
        selection.feeStrategy = true;
        selection.feeStrategyConfig = {
          managementFeeBps: config.management_fee_bps || 0,
          performanceFeeBps: config.performance_fee_bps || 0
        };
      }
      if (config.withdrawal_queue || config.withdrawalQueueModuleAddress) {
        selection.withdrawalQueue = true;
        selection.withdrawalQueueConfig = {
          maxQueueSize: config.max_queue_size || 1000
        };
      }
      if (config.yield_strategy || config.yieldStrategyModuleAddress) {
        selection.yieldStrategy = true;
        selection.yieldStrategyConfig = {
          targetYieldBps: config.target_yield_bps || 500
        };
      }
      if (config.async_vault || config.asyncVaultModuleAddress) {
        selection.asyncVault = true;
        selection.asyncVaultConfig = {
          settlementDelay: config.settlement_delay || 86400
        };
      }
      if (config.native_vault || config.nativeVaultModuleAddress) {
        selection.nativeVault = true;
        selection.nativeVaultConfig = config.native_vault_config || {};
      }
      if (config.router || config.routerModuleAddress) {
        selection.router = true;
        selection.routerConfig = config.router_config || {};
      }
      if (config.multi_asset_vault || config.multiAssetVaultModuleAddress) {
        selection.multiAssetVault = true;
        selection.multiAssetVaultConfig = {
          maxAssets: config.max_assets || 10
        };
      }
    }

    // ERC1400-specific modules
    if (tokenStandard === 'erc1400') {
      if (config.transfer_restrictions || config.transferRestrictionsModuleAddress) {
        selection.transferRestrictions = true;
        selection.transferRestrictionsConfig = config.transfer_restrictions_config || {};
      }
      if (config.controller || config.controllerModuleAddress) {
        selection.controller = true;
        selection.controllerConfig = {
          controllers: config.controllers || []
        };
      }
      if (config.erc1400_document || config.erc1400DocumentModuleAddress) {
        selection.erc1400Document = true;
        selection.erc1400DocumentConfig = config.erc1400_document_config || {};
      }
    }

    return selection;
  }

  /**
   * Check if any modules are selected
   */
  private hasAnyModulesSelected(selection: ModuleSelection): boolean {
    return Object.values(selection).some(value => 
      typeof value === 'boolean' && value === true
    );
  }

  /**
   * Get factory address from database
   */
  private async getFactoryAddress(
    network: string,
    environment: string
  ): Promise<string | null> {
    try {
      // Query for extension module factory
      const { data, error } = await supabase
        .from('contract_masters')
        .select('contract_address')
        .eq('network', network)
        .eq('environment', environment)
        .eq('contract_type', 'extension_module_factory')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn('Extension module factory not found, trying token_factory...');
        
        // Fallback to token factory (may have module deployment methods)
        const { data: factoryData, error: factoryError } = await supabase
          .from('contract_masters')
          .select('contract_address')
          .eq('network', network)
          .eq('environment', environment)
          .like('contract_type', '%factory%')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (factoryError || !factoryData) {
          return null;
        }

        return factoryData.contract_address;
      }

      return data.contract_address;
    } catch (error) {
      console.error('Failed to get factory address:', error);
      return null;
    }
  }

  /**
   * Map token type to token standard
   */
  private getTokenStandard(
    tokenType: string
  ): 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400' {
    const lowerType = tokenType.toLowerCase();
    
    if (lowerType.includes('721')) return 'erc721';
    if (lowerType.includes('1155')) return 'erc1155';
    if (lowerType.includes('3525')) return 'erc3525';
    if (lowerType.includes('4626')) return 'erc4626';
    if (lowerType.includes('1400')) return 'erc1400';
    
    return 'erc20'; // Default to ERC20
  }
}

// Export singleton instance
export const enhancedModuleDeploymentService = new EnhancedModuleDeploymentService();
