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
      // Extract module selection from JSONB config (with database query)
      // ✅ FIX: Now async to query database for authoritative module configs
      const moduleSelection = await this.extractModuleSelection(params);
      
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
   * ✅ FIX: Now queries database for authoritative module configurations
   * 
   * This 550-line method handles all the complex mapping logic from:
   * - Database JSONB fields (fee_on_transfer, timelock_config, etc.)
   * - To ModuleSelection format expected by InstanceDeploymentService
   * - Includes conversions: percentages → basis points, etc.
   * - Provides fallbacks for old data formats
   * 
   * DATABASE-FIRST PRIORITY:
   * 1. Query database for token-specific module configs
   * 2. Merge with params.config (form data)
   * 3. Database values take precedence
   */
  private static async extractModuleSelection(params: FoundryDeploymentParams): Promise<ModuleSelection> {
    // Check if moduleSelection exists in config (new format)
    const config = params.config as any;
    
    // 🔍 DEBUG: Log received config to understand data structure
    console.log('🔍 [ModuleSelection] Config keys:', Object.keys(config).filter(k => k.includes('enabled') || k.includes('_config') || k.includes('Module')));
    console.log('🔍 [ModuleSelection] Checking modules - fees_enabled:', config.fees_enabled, 'compliance_enabled:', config.compliance_enabled);
    
    // ✅ FIX: Query database for authoritative module configurations
    let dbModuleConfigs: any = {};
    
    if (params.tokenId) {
      try {
        console.log(`🔍 [ModuleSelection] Querying database for token ${params.tokenId} module configurations...`);
        
        // Determine token standard to query correct properties table
        const tokenStandard = this.getTokenStandard(params.tokenType);
        
        // Query token-specific properties table based on standard
        if (tokenStandard === 'erc20') {
          const { data, error } = await supabase
            .from('token_erc20_properties')
            .select('fees_config, timelock_config, temporary_approval_config, compliance_config, vesting_config')
            .eq('token_id', params.tokenId)
            .maybeSingle();
          
          if (!error && data) {
            dbModuleConfigs = data;
            console.log(`✅ [ModuleSelection] Loaded ERC20 module configs from database:`, {
              hasFees: !!data.fees_config,
              hasTimelock: !!data.timelock_config,
              hasTemporaryApproval: !!data.temporary_approval_config,
              hasCompliance: !!data.compliance_config,
              hasVesting: !!data.vesting_config
            });
          }
        } else if (tokenStandard === 'erc721') {
          const { data, error } = await supabase
            .from('token_erc721_properties')
            .select('royalty_config, rental_config, compliance_config, vesting_config')
            .eq('token_id', params.tokenId)
            .maybeSingle();
          
          if (!error && data) {
            dbModuleConfigs = data;
            console.log(`✅ [ModuleSelection] Loaded ERC721 module configs from database`);
          }
        } else if (tokenStandard === 'erc1155') {
          const { data, error } = await supabase
            .from('token_erc1155_properties')
            .select('royalty_config, supply_cap_config, uri_management_config, compliance_config, vesting_config')
            .eq('token_id', params.tokenId)
            .maybeSingle();
          
          if (!error && data) {
            dbModuleConfigs = data;
            console.log(`✅ [ModuleSelection] Loaded ERC1155 module configs from database`);
          }
        } else if (tokenStandard === 'erc3525') {
          const { data, error } = await supabase
            .from('token_erc3525_properties')
            .select('slot_manager_config, value_exchange_config, compliance_config, vesting_config')
            .eq('token_id', params.tokenId)
            .maybeSingle();
          
          if (!error && data) {
            dbModuleConfigs = data;
            console.log(`✅ [ModuleSelection] Loaded ERC3525 module configs from database`);
          }
        } else if (tokenStandard === 'erc4626') {
          const { data, error } = await supabase
            .from('token_erc4626_properties')
            .select('fee_strategy_config, async_vault_config, withdrawal_queue_config, compliance_config, vesting_config')
            .eq('token_id', params.tokenId)
            .maybeSingle();
          
          if (!error && data) {
            dbModuleConfigs = data;
            console.log(`✅ [ModuleSelection] Loaded ERC4626 module configs from database`);
          }
        } else if (tokenStandard === 'erc1400') {
          const { data, error } = await supabase
            .from('token_erc1400_properties')
            .select('enhanced_transfer_restrictions_config, controller_config, enhanced_document_config, compliance_config, vesting_config')
            .eq('token_id', params.tokenId)
            .maybeSingle();
          
          if (!error && data) {
            dbModuleConfigs = data;
            console.log(`✅ [ModuleSelection] Loaded ERC1400 module configs from database`);
          }
        }
      } catch (dbError) {
        console.warn('⚠️ [ModuleSelection] Failed to query database for module configs:', dbError);
        // Continue with form data as fallback
      }
    }
    
    if (config.moduleSelection) {
      return config.moduleSelection;
    }

    // Fallback: Build selection from boolean flags and JSONB config fields
    const selection: ModuleSelection = {};

    // ============ UNIVERSAL MODULES (All Standards) ============
    
    // COMPLIANCE - Reads from DATABASE first, fallback to config
    // ✅ FIX: Database takes precedence over form data
    if (config.compliance_enabled || config.complianceModuleAddress || config.compliance_config || dbModuleConfigs.compliance_config) {
      selection.compliance = true;
      
      // Priority: Database > Config > Fallback
      const complianceConfig = dbModuleConfigs.compliance_config || config.compliance_config;
      
      if (complianceConfig) {
        selection.complianceConfig = {
          // Required fields (with defaults for backward compatibility)
          complianceLevel: complianceConfig.complianceLevel || 1,
          maxHoldersPerJurisdiction: complianceConfig.maxHoldersPerJurisdiction || 0,
          kycRequired: complianceConfig.kycRequired || false,
          // Optional fields
          whitelistRequired: complianceConfig.whitelistRequired || false,
          whitelistAddresses: complianceConfig.whitelistAddresses || ''
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
      
      console.log('🔐 [ModuleSelection] Compliance enabled - Config Source:', dbModuleConfigs.compliance_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
    }

    // VESTING - Reads from DATABASE first, fallback to config
    // ✅ FIX: Database takes precedence over form data
    if (config.vesting_enabled || config.vestingModuleAddress || dbModuleConfigs.vesting_config) {
      selection.vesting = true;
      
      // Priority: Database > Config > Fallback
      const vestingConfig = dbModuleConfigs.vesting_config || config.vesting_config || {};
      
      selection.vestingConfig = {
        cliffPeriod: vestingConfig.cliffPeriod || config.vesting_cliff_period || 0,
        totalPeriod: vestingConfig.totalPeriod || config.vesting_total_period || 0,
        releaseFrequency: vestingConfig.releaseFrequency || config.vesting_release_frequency || 'monthly',
        ...vestingConfig
      };
      
      console.log('📅 [ModuleSelection] Vesting enabled - Config Source:', dbModuleConfigs.vesting_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
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
      
      // FEES - Reads from DATABASE first (authoritative), fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.fees_enabled || config.fees_config?.enabled || config.feesModuleAddress || config.fee_on_transfer || dbModuleConfigs.fees_config) {
        selection.fees = true;
        
        // Priority: Database > Config > Fallback
        const feesConfig = dbModuleConfigs.fees_config || config.fees_config || config.fee_on_transfer || {};
        const transferFeeBps = feesConfig.transferFeeBps || feesConfig.feePercentage || 0;
        const buyFeeBps = feesConfig.buyFeeBps || transferFeeBps; // Fallback to transfer fee
        const sellFeeBps = feesConfig.sellFeeBps || transferFeeBps; // Fallback to transfer fee
        const recipient = feesConfig.feeRecipient || feesConfig.recipient || config.initialOwner || 'DEPLOYER';
        
        selection.feesConfig = {
          transferFeeBps: transferFeeBps,
          buyFeeBps: buyFeeBps,
          sellFeeBps: sellFeeBps,
          feeRecipient: recipient
        };
        
        console.log('💰 [ModuleSelection] Fees enabled - Config Source:', dbModuleConfigs.fees_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
        console.log('💰 [ModuleSelection] Fee Config:', {
          transferFeeBps,
          buyFeeBps,
          sellFeeBps,
          recipient
        });
      }
      
      // TIMELOCK - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.timelock || config.timelockModuleAddress || config.timelock_config || dbModuleConfigs.timelock_config) {
        selection.timelock = true;
        
        // Priority: Database > Config > Fallback
        const timelockConfig = dbModuleConfigs.timelock_config || config.timelock_config;
        
        if (timelockConfig && timelockConfig.defaultLockDuration !== undefined) {
          selection.timelockConfig = {
            defaultLockDuration: timelockConfig.defaultLockDuration || 172800
          };
        } else if (config.governance_features && config.governance_features.voting_delay !== undefined) {
          const delayInSeconds = (config.governance_features.voting_delay || 1) * 12;
          selection.timelockConfig = { defaultLockDuration: delayInSeconds };
        } else {
          selection.timelockConfig = { defaultLockDuration: config.timelock_min_delay || 172800 };
        }
        
        console.log('🔒 [ModuleSelection] Timelock enabled - Config Source:', dbModuleConfigs.timelock_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // TEMPORARY APPROVAL - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.temporary_approval || config.temporaryApprovalModuleAddress || config.temporary_approval_config || dbModuleConfigs.temporary_approval_config) {
        selection.temporaryApproval = true;
        
        // Priority: Database > Config > Fallback
        const tempApprovalConfig = dbModuleConfigs.temporary_approval_config || config.temporary_approval_config;
        
        if (tempApprovalConfig && tempApprovalConfig.defaultDuration !== undefined) {
          selection.temporaryApprovalConfig = {
            defaultDuration: tempApprovalConfig.defaultDuration || 3600
          };
        } else {
          selection.temporaryApprovalConfig = { 
            defaultDuration: config.temporary_approval_duration || 3600 
          };
        }
        
        console.log('⏰ [ModuleSelection] Temporary Approval enabled - Config Source:', dbModuleConfigs.temporary_approval_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // FLASH MINT - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.flash_mint || config.flashMintModuleAddress || config.flash_mint_config || dbModuleConfigs.flash_mint_config) {
        selection.flashMint = true;
        
        // Priority: Database > Config > Fallback
        const flashMintConfig = dbModuleConfigs.flash_mint_config || config.flash_mint_config;
        
        if (flashMintConfig) {
          selection.flashMintConfig = {
            flashFeeBasisPoints: flashMintConfig.flashFeeBasisPoints !== undefined ? flashMintConfig.flashFeeBasisPoints : 0,
            feeRecipient: flashMintConfig.feeRecipient || config.initialOwner || 'DEPLOYER',
            maxFlashLoan: flashMintConfig.maxFlashLoan !== undefined ? flashMintConfig.maxFlashLoan : 0 // 0 = unlimited
          };
        } else {
          selection.flashMintConfig = {
            flashFeeBasisPoints: config.flash_mint_fee_bps || 0,
            feeRecipient: config.flash_mint_fee_recipient || config.initialOwner || 'DEPLOYER',
            maxFlashLoan: config.flash_mint_max_loan || 0
          };
        }
        
        console.log('⚡ [ModuleSelection] Flash Mint enabled - Config Source:', dbModuleConfigs.flash_mint_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // PERMIT - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.permit || config.permitModuleAddress || dbModuleConfigs.permit_config) {
        selection.permit = true;
        
        // Priority: Database > Config > Fallback
        const permitConfig = dbModuleConfigs.permit_config || config.permit_config;
        
        if (permitConfig) {
          selection.permitConfig = {
            name: permitConfig.name || config.tokenName || config.name,
            version: permitConfig.version || '1',
            enabled: permitConfig.enabled !== undefined ? permitConfig.enabled : true
          };
        } else {
          selection.permitConfig = {
            name: config.tokenName || config.name || '',
            version: '1',
            enabled: true
          };
        }
        
        console.log('✍️ [ModuleSelection] Permit enabled - Config Source:', dbModuleConfigs.permit_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // SNAPSHOT - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.snapshot || config.snapshotModuleAddress || dbModuleConfigs.snapshot_config) {
        selection.snapshot = true;
        
        // Priority: Database > Config > Fallback
        const snapshotConfig = dbModuleConfigs.snapshot_config || config.snapshot_config;
        
        if (snapshotConfig) {
          selection.snapshotConfig = {
            autoSnapshotEnabled: snapshotConfig.autoSnapshotEnabled !== undefined ? snapshotConfig.autoSnapshotEnabled : false,
            snapshotInterval: snapshotConfig.snapshotInterval || 86400, // 1 day default
            lastSnapshotTime: snapshotConfig.lastSnapshotTime || null,
            nextSnapshotTime: snapshotConfig.nextSnapshotTime || null
          };
        } else {
          selection.snapshotConfig = {
            autoSnapshotEnabled: config.snapshot_auto_enabled || false,
            snapshotInterval: config.snapshot_interval || 86400,
            lastSnapshotTime: null,
            nextSnapshotTime: null
          };
        }
        
        console.log('📸 [ModuleSelection] Snapshot enabled - Config Source:', dbModuleConfigs.snapshot_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // VOTES - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.votes || config.votesModuleAddress || config.governance_enabled || dbModuleConfigs.votes_config) {
        selection.votes = true;
        
        // Priority: Database > Config > Fallback
        const votesConfig = dbModuleConfigs.votes_config || config.votes_config;
        
        if (votesConfig) {
          selection.votesConfig = {
            votingDelay: votesConfig.votingDelay !== undefined ? votesConfig.votingDelay : 1,
            votingPeriod: votesConfig.votingPeriod !== undefined ? votesConfig.votingPeriod : 50400, // ~1 week in blocks
            proposalThreshold: votesConfig.proposalThreshold !== undefined ? String(votesConfig.proposalThreshold) : '0',
            quorumPercentage: votesConfig.quorumPercentage !== undefined ? votesConfig.quorumPercentage : 4
          };
        } else if (config.governance_features) {
          selection.votesConfig = {
            votingDelay: config.governance_features.voting_delay || 1,
            votingPeriod: config.governance_features.voting_period || 50400,
            proposalThreshold: String(config.governance_features.proposal_threshold || 0),
            quorumPercentage: config.governance_features.quorum_percentage || 4
          };
        } else {
          selection.votesConfig = {
            votingDelay: 1,
            votingPeriod: 50400,
            proposalThreshold: '0',
            quorumPercentage: 4
          };
        }
        
        console.log('🗳️ [ModuleSelection] Votes enabled - Config Source:', dbModuleConfigs.votes_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // PAYABLE TOKEN - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.payable_token || config.payableTokenModuleAddress || dbModuleConfigs.payable_token_config) {
        selection.payableToken = true;
        
        // Priority: Database > Config > Fallback
        const payableTokenConfig = dbModuleConfigs.payable_token_config || config.payable_token_config;
        
        if (payableTokenConfig) {
          selection.payableTokenConfig = {
            callbackGasLimit: payableTokenConfig.callbackGasLimit !== undefined ? payableTokenConfig.callbackGasLimit : 100000,
            acceptsNativeToken: payableTokenConfig.acceptsNativeToken !== undefined ? payableTokenConfig.acceptsNativeToken : true,
            nativeTokenPrice: payableTokenConfig.nativeTokenPrice !== undefined ? payableTokenConfig.nativeTokenPrice : 0,
            autoConversion: payableTokenConfig.autoConversion !== undefined ? payableTokenConfig.autoConversion : false
          };
        } else {
          selection.payableTokenConfig = {
            callbackGasLimit: config.callback_gas_limit || 100000,
            acceptsNativeToken: config.accepts_native_token !== undefined ? config.accepts_native_token : true,
            nativeTokenPrice: config.native_token_price || 0,
            autoConversion: config.auto_conversion || false
          };
        }
        
        console.log('💳 [ModuleSelection] Payable Token enabled - Config Source:', dbModuleConfigs.payable_token_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
    }

    // ERC721-specific modules  
    if (tokenStandard === 'erc721') {
      // ROYALTY - Reads from DATABASE first (authoritative), fallback to config
      // ✅ FIX: Database takes precedence over form data (CRITICAL for revenue!)
      if (config.has_royalty || config.royalty_enabled || config.royaltyModuleAddress || dbModuleConfigs.royalty_config) {
        selection.royalty = true;
        
        // Priority: Database > Config > Fallback
        const royaltyConfig = dbModuleConfigs.royalty_config || config.royalty_config;
        
        if (royaltyConfig && royaltyConfig.defaultRoyaltyBps !== undefined) {
          selection.royaltyConfig = {
            defaultRoyaltyBps: royaltyConfig.defaultRoyaltyBps,
            royaltyRecipient: royaltyConfig.defaultRoyaltyReceiver || royaltyConfig.royaltyRecipient || config.initialOwner || '',
            ...royaltyConfig
          };
        } else if (config.royalty_percentage !== undefined || config.royalty_receiver) {
          selection.royaltyConfig = {
            defaultRoyaltyBps: Math.round((parseFloat(config.royalty_percentage) || 2.5) * 100),
            royaltyRecipient: config.royalty_receiver || config.initialOwner || ''
          };
        } else {
          selection.royaltyConfig = {
            defaultRoyaltyBps: config.default_royalty_bps || 250, // Default: 2.5%
            royaltyRecipient: config.royalty_recipient || config.initialOwner || ''
          };
        }
        
        console.log('👑 [ModuleSelection] Royalty enabled - Config Source:', dbModuleConfigs.royalty_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
        console.log('👑 [ModuleSelection] Royalty Config:', {
          defaultRoyaltyBps: selection.royaltyConfig.defaultRoyaltyBps,
          royaltyRecipient: selection.royaltyConfig.royaltyRecipient
        });
      }
      
      // RENTAL - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.rental_enabled || config.rentalModuleAddress || config.rental_config || dbModuleConfigs.rental_config) {
        selection.rental = true;
        
        // Priority: Database > Config > Fallback
        const rentalConfig = dbModuleConfigs.rental_config || config.rental_config;
        
        if (rentalConfig) {
          selection.rentalConfig = {
            // Platform fee configuration
            feeRecipient: rentalConfig.feeRecipient || config.rental_fee_recipient || config.initialOwner,
            platformFeeBps: rentalConfig.platformFeeBps !== undefined ? rentalConfig.platformFeeBps : 250, // Default 2.5%
            
            // Duration constraints
            minRentalDuration: rentalConfig.minRentalDuration !== undefined ? rentalConfig.minRentalDuration : 86400, // 1 day
            maxRentalDuration: rentalConfig.maxRentalDuration !== undefined ? rentalConfig.maxRentalDuration : 2592000, // 30 days
            
            // Pricing
            minRentalPrice: rentalConfig.minRentalPrice !== undefined ? rentalConfig.minRentalPrice : 0.01, // 0.01 ETH
            
            // Deposit configuration
            depositRequired: rentalConfig.depositRequired !== undefined ? rentalConfig.depositRequired : true,
            minDepositBps: rentalConfig.minDepositBps !== undefined ? rentalConfig.minDepositBps : 1000, // 10%
            
            // Additional features
            autoReturnEnabled: rentalConfig.autoReturnEnabled !== undefined ? rentalConfig.autoReturnEnabled : true,
            subRentalsAllowed: rentalConfig.subRentalsAllowed !== undefined ? rentalConfig.subRentalsAllowed : false,
            
            // Spread any additional config
            ...rentalConfig
          };
        } else {
          // Fallback configuration with sensible defaults
          selection.rentalConfig = {
            feeRecipient: config.rental_fee_recipient || config.initialOwner,
            platformFeeBps: 250, // 2.5%
            minRentalDuration: 86400, // 1 day
            maxRentalDuration: 2592000, // 30 days
            minRentalPrice: '10000000000000000', // 0.01 ETH in wei
            depositRequired: true,
            depositBps: 1000, // 10%
            autoReturnEnabled: true,
            subRentalsAllowed: false
          };
        }
        
        console.log('🏠 [ModuleSelection] Rental enabled - Config Source:', dbModuleConfigs.rental_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // CONSECUTIVE - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.consecutive || config.consecutiveModuleAddress || dbModuleConfigs.consecutive_config) {
        selection.consecutive = true;
        
        // Priority: Database > Config > Fallback
        const consecutiveConfig = dbModuleConfigs.consecutive_config || config.consecutive_config;
        
        if (consecutiveConfig) {
          selection.consecutiveConfig = {
            startTokenId: consecutiveConfig.startTokenId !== undefined ? consecutiveConfig.startTokenId : 0,
            maxBatchSize: consecutiveConfig.maxBatchSize !== undefined ? consecutiveConfig.maxBatchSize : 5000,
            batchSize: consecutiveConfig.batchSize
          };
        } else {
          selection.consecutiveConfig = {
            startTokenId: config.consecutive_start_token_id || 0,
            maxBatchSize: config.consecutive_max_batch || 5000,
            batchSize: config.consecutive_batch_size
          };
        }
        
        console.log('🔢 [ModuleSelection] Consecutive enabled - Config Source:', dbModuleConfigs.consecutive_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // FRACTION - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.enable_fractional_ownership || config.fraction_enabled || config.fractionModuleAddress || dbModuleConfigs.fraction_config) {
        selection.fraction = true;
        
        // Priority: Database > Config > Fallback
        const fractionConfig = dbModuleConfigs.fraction_config || config.fraction_config || config.fractionalization_config;
        
        if (fractionConfig) {
          selection.fractionConfig = {
            minFractions: fractionConfig.minFractions !== undefined ? fractionConfig.minFractions : 100,
            maxFractions: fractionConfig.maxFractions !== undefined ? fractionConfig.maxFractions : 10000,
            buyoutMultiplier: fractionConfig.buyoutMultiplier !== undefined ? fractionConfig.buyoutMultiplier : 1.5, // 1.5x buyout
            fractionPrice: fractionConfig.fractionPrice,
            tradingEnabled: fractionConfig.tradingEnabled !== undefined ? fractionConfig.tradingEnabled : true
          };
        } else {
          selection.fractionConfig = {
            minFractions: config.fraction_min || 100,
            maxFractions: config.fraction_max || 10000,
            buyoutMultiplier: config.fraction_buyout_multiplier ? config.fraction_buyout_multiplier / 10000 : 1.5, // Convert basis points to decimal
            fractionPrice: config.fraction_price,
            tradingEnabled: config.fraction_trading !== undefined ? config.fraction_trading : true
          };
        }
        
        console.log('🧩 [ModuleSelection] Fraction enabled - Config Source:', dbModuleConfigs.fraction_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      // SOULBOUND - Reads from DATABASE first, fallback to config
      // ✅ FIX: Database takes precedence over form data
      if (config.soulbound || config.soulboundModuleAddress || dbModuleConfigs.soulbound_config) {
        selection.soulbound = true;
        
        // Priority: Database > Config > Fallback
        const soulboundConfig = dbModuleConfigs.soulbound_config || config.soulbound_config;
        
        if (soulboundConfig) {
          selection.soulboundConfig = {
            transferable: soulboundConfig.transferable !== undefined ? soulboundConfig.transferable : false,
            burnableByOwner: soulboundConfig.burnableByOwner !== undefined ? soulboundConfig.burnableByOwner : true,
            burnableByIssuer: soulboundConfig.burnableByIssuer !== undefined ? soulboundConfig.burnableByIssuer : true,
            expirationEnabled: soulboundConfig.expirationEnabled !== undefined ? soulboundConfig.expirationEnabled : false,
            expirationPeriod: soulboundConfig.expirationPeriod !== undefined ? soulboundConfig.expirationPeriod : 0
          };
        } else {
          selection.soulboundConfig = {
            transferable: config.soulbound_one_time_transfer || false,
            burnableByOwner: config.soulbound_burnable_owner !== undefined ? config.soulbound_burnable_owner : true,
            burnableByIssuer: config.soulbound_burnable_issuer !== undefined ? config.soulbound_burnable_issuer : true,
            expirationEnabled: config.soulbound_expiration || false,
            expirationPeriod: config.soulbound_expiration_period || 0
          };
        }
        
        console.log('🔗 [ModuleSelection] Soulbound enabled - Config Source:', dbModuleConfigs.soulbound_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
      }
      
      if (config.metadata_events || config.metadataEventsModuleAddress) selection.metadataEvents = true;
    }

    // ERC1155-specific modules
    if (tokenStandard === 'erc1155') {
      // ROYALTY - Reads from DATABASE first (authoritative), fallback to config
      // ✅ FIX: Database takes precedence over form data (CRITICAL for revenue!)
      if (config.has_royalty || config.royalty_enabled || dbModuleConfigs.royalty_config) {
        selection.royalty = true;
        
        // Priority: Database > Config > Fallback
        const royaltyConfig = dbModuleConfigs.royalty_config || config.royalty_config;
        
        if (royaltyConfig && royaltyConfig.defaultRoyaltyBps !== undefined) {
          selection.royaltyConfig = {
            defaultRoyaltyBps: royaltyConfig.defaultRoyaltyBps,
            royaltyRecipient: royaltyConfig.defaultRoyaltyReceiver || royaltyConfig.royaltyRecipient || config.initialOwner || '',
            ...royaltyConfig
          };
        } else {
          selection.royaltyConfig = {
            defaultRoyaltyBps: Math.round((parseFloat(config.royalty_percentage) || 2.5) * 100),
            royaltyRecipient: config.royalty_receiver || config.initialOwner || ''
          };
        }
        
        console.log('👑 [ModuleSelection] ERC1155 Royalty enabled - Config Source:', dbModuleConfigs.royalty_config ? 'DATABASE (authoritative)' : 'FORM (fallback)');
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

  /**
   * Configure Universal Vesting Module - DATABASE-FIRST
   * 
   * CRITICAL: Vesting configuration must match database to ensure:
   * - Correct beneficiary addresses
   * - Proper vesting amounts
   * - Accurate timing (start, cliff, total duration)
   * - Revocability settings
   * - Category labels for reporting
   * 
   * ACTUAL ABI SIGNATURE:
   * createVestingSchedule(
   *   address beneficiary,
   *   uint256 amount,
   *   uint256 startTime,
   *   uint256 cliffDuration,
   *   uint256 vestingDuration,
   *   bool revocable,
   *   string category  // ← IT'S A STRING! Not bytes32!
   * ) → bytes32 scheduleId
   * 
   * ✅ FIX APPLIED: Changed from ethers.encodeBytes32String(schedule.category) to schedule.category
   */
  private static async configureVestingModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('📅 Configuring vesting module (DATABASE-FIRST)');
    console.log(`   Creating ${config.schedules?.length || 0} vesting schedule(s)`);
    
    for (const schedule of config.schedules || []) {
      console.log(`   Schedule for: ${schedule.beneficiary}`);
      console.log(`     - Amount: ${schedule.amount} tokens`);
      console.log(`     - Start: ${new Date(schedule.startTime * 1000).toISOString()}`);
      console.log(`     - Cliff: ${schedule.cliffDuration}s (${Math.floor(schedule.cliffDuration / 86400)}d)`);
      console.log(`     - Duration: ${schedule.vestingDuration}s (${Math.floor(schedule.vestingDuration / 86400)}d)`);
      console.log(`     - Revocable: ${schedule.revocable}`);
      console.log(`     - Category: "${schedule.category}"`);
      
      const tx = await module.createVestingSchedule(
        schedule.beneficiary,
        ethers.parseUnits(schedule.amount.toString(), 18),
        schedule.startTime,
        schedule.cliffDuration,
        schedule.vestingDuration,
        schedule.revocable,
        schedule.category  // ✅ FIXED: Pass string directly, DO NOT encode as bytes32
      );
      
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
      
      console.log(`   ✅ Schedule created: ${receipt.transactionHash}`);
    }
    
    console.log(`✅ Vesting module configured with ${config.schedules?.length || 0} schedule(s)`);
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

  /**
   * Configure ERC3525 Slot Manager Module - DATABASE-FIRST
   * 
   * CRITICAL: Slot configuration defines the structure of semi-fungible tokens.
   * Slots group tokens with similar characteristics.
   * 
   * ACTUAL ABI METHODS:
   * - createSlot(uint256 slotId, string name, string description)
   * - createSlotBatch(uint256[] slotIds, string[] names, string[] descriptions)
   * - setSlotActive(uint256 slotId, bool active)
   * - setSlotMetadata(uint256 slotId, string metadata)
   * - setSlotProperty(uint256 slotId, string key, string value)
   * - setSlotURI(uint256 slotId, string uri)
   * - setAllowMerge(bool allow)
   * - setAllowSlotCreation(bool allow)
   * - setRestrictCrossSlotTransfers(bool restrict)
   * 
   * ✅ FIX APPLIED: 
   * - CRITICAL: Corrected createSlot() from 6 parameters to 3 (slotId, name, description)
   * - Added batch creation for multiple slots
   * - Added slot configuration methods (active, metadata, URI, properties)
   * - Added global slot behavior settings
   */
  private static async configureSlotManagerModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('🎰 Configuring slot manager module (DATABASE-FIRST)');
    
    // Configure global slot behavior
    if (config.allowMerge !== undefined) {
      console.log(`  Setting merge allowed: ${config.allowMerge}`);
      const tx = await module.setAllowMerge(config.allowMerge);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.allowSlotCreation !== undefined) {
      console.log(`  Setting dynamic slot creation: ${config.allowSlotCreation}`);
      const tx = await module.setAllowSlotCreation(config.allowSlotCreation);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.restrictCrossSlotTransfers !== undefined) {
      console.log(`  Setting cross-slot transfer restrictions: ${config.restrictCrossSlotTransfers}`);
      const tx = await module.setRestrictCrossSlotTransfers(config.restrictCrossSlotTransfers);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Create slots
    if (config.slots?.length > 0) {
      console.log(`  Creating ${config.slots.length} slots`);
      
      // Option 1: Batch method (more efficient for multiple slots)
      if (config.slots.length > 1) {
        const slotIds = config.slots.map((slot: any) => slot.slotId);
        const names = config.slots.map((slot: any) => slot.name);
        const descriptions = config.slots.map((slot: any) => slot.description || '');
        
        console.log(`  Using batch method for ${slotIds.length} slots`);
        const tx = await module.createSlotBatch(slotIds, names, descriptions);
        txHashes.push((await tx.wait()).transactionHash);
      }
      // Option 2: Individual method (single slot)
      else {
        for (const slot of config.slots) {
          console.log(`  Creating slot ${slot.slotId}: ${slot.name}`);
          const tx = await module.createSlot(
            slot.slotId,
            slot.name,
            slot.description || ''
          );
          txHashes.push((await tx.wait()).transactionHash);
        }
      }
      
      // Configure individual slot properties
      for (const slot of config.slots) {
        // Set slot metadata if provided
        if (slot.metadata) {
          const tx = await module.setSlotMetadata(slot.slotId, slot.metadata);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Set slot URI if provided
        if (slot.uri) {
          const tx = await module.setSlotURI(slot.slotId, slot.uri);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Set slot properties if provided
        if (slot.properties) {
          for (const [key, value] of Object.entries(slot.properties)) {
            const tx = await module.setSlotProperty(slot.slotId, key, value as string);
            txHashes.push((await tx.wait()).transactionHash);
          }
        }
        
        // Set slot active state if provided
        if (slot.active !== undefined) {
          const tx = await module.setSlotActive(slot.slotId, slot.active);
          txHashes.push((await tx.wait()).transactionHash);
        }
      }
    }
  }

  /**
   * Configure ERC1400 Transfer Restrictions Module - DATABASE-FIRST
   * 
   * CRITICAL: Transfer restrictions are partition-based in ERC1400!
   * Misconfiguration could allow unauthorized transfers or block legitimate ones.
   * 
   * ACTUAL ABI METHODS (ERC1400TransferRestrictionsModule):
   * - setTransferRestriction(bytes32 partition, bytes32 restriction)
   * - setGlobalWhitelistEnabled(bool enabled)
   * - setGlobalBlacklistEnabled(bool enabled)
   * - addToGlobalWhitelist(address investor)
   * - addToGlobalBlacklist(address investor)
   * - addBatchToGlobalWhitelist(address[] investors)
   * - addBatchToGlobalBlacklist(address[] investors)
   * - setPartitionWhitelistEnabled(bytes32 partition, bool enabled)
   * - setPartitionBlacklistEnabled(bytes32 partition, bool enabled)
   * - addToPartitionWhitelist(bytes32 partition, address investor)
   * - addToPartitionBlacklist(bytes32 partition, address investor)
   * - addBatchToPartitionWhitelist(bytes32 partition, address[] investors)
   * - addBatchToPartitionBlacklist(bytes32 partition, address[] investors)
   * - setInvestorLimit(bytes32 partition, uint256 limit)
   * - setLockupPeriod(bytes32 partition, uint256 duration)
   * - setJurisdictionRestriction(bytes32 jurisdiction, bool restricted)
   * - lockPartition(bytes32 partition, uint256 until)
   * - unlockPartition(bytes32 partition)
   * 
   * ❌ WRONG METHODS (DO NOT EXIST):
   * - setDefaultPolicy() - NOT IN ABI
   * - addRestriction() - NOT IN ABI
   */
  private static async configureTransferRestrictionsModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('🔒 Configuring transfer restrictions module (DATABASE-FIRST)');
    
    // Enable/disable global whitelisting
    if (config.globalWhitelistEnabled !== undefined) {
      console.log(`  Setting global whitelist: ${config.globalWhitelistEnabled}`);
      const tx = await module.setGlobalWhitelistEnabled(config.globalWhitelistEnabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable/disable global blacklisting
    if (config.globalBlacklistEnabled !== undefined) {
      console.log(`  Setting global blacklist: ${config.globalBlacklistEnabled}`);
      const tx = await module.setGlobalBlacklistEnabled(config.globalBlacklistEnabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Add global whitelist addresses
    if (config.globalWhitelist?.length > 0) {
      console.log(`  Adding ${config.globalWhitelist.length} addresses to global whitelist`);
      if (config.globalWhitelist.length > 1) {
        // Use batch method for efficiency
        const tx = await module.addBatchToGlobalWhitelist(config.globalWhitelist);
        txHashes.push((await tx.wait()).transactionHash);
      } else {
        const tx = await module.addToGlobalWhitelist(config.globalWhitelist[0]);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Add global blacklist addresses
    if (config.globalBlacklist?.length > 0) {
      console.log(`  Adding ${config.globalBlacklist.length} addresses to global blacklist`);
      if (config.globalBlacklist.length > 1) {
        const tx = await module.addBatchToGlobalBlacklist(config.globalBlacklist);
        txHashes.push((await tx.wait()).transactionHash);
      } else {
        const tx = await module.addToGlobalBlacklist(config.globalBlacklist[0]);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Configure partition-specific restrictions
    if (config.partitionRestrictions?.length > 0) {
      console.log(`  Configuring ${config.partitionRestrictions.length} partition restrictions`);
      
      for (const partConfig of config.partitionRestrictions) {
        const partition = ethers.encodeBytes32String(partConfig.partition);
        
        // Set transfer restriction type for partition
        if (partConfig.restrictionType) {
          console.log(`  Setting restriction for partition ${partConfig.partition}: ${partConfig.restrictionType}`);
          const restriction = ethers.encodeBytes32String(partConfig.restrictionType);
          const tx = await module.setTransferRestriction(partition, restriction);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Enable/disable partition whitelist
        if (partConfig.whitelistEnabled !== undefined) {
          console.log(`  Setting partition ${partConfig.partition} whitelist: ${partConfig.whitelistEnabled}`);
          const tx = await module.setPartitionWhitelistEnabled(partition, partConfig.whitelistEnabled);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Enable/disable partition blacklist
        if (partConfig.blacklistEnabled !== undefined) {
          console.log(`  Setting partition ${partConfig.partition} blacklist: ${partConfig.blacklistEnabled}`);
          const tx = await module.setPartitionBlacklistEnabled(partition, partConfig.blacklistEnabled);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Add partition-specific whitelist
        if (partConfig.whitelist?.length > 0) {
          console.log(`  Adding ${partConfig.whitelist.length} addresses to partition ${partConfig.partition} whitelist`);
          if (partConfig.whitelist.length > 1) {
            const tx = await module.addBatchToPartitionWhitelist(partition, partConfig.whitelist);
            txHashes.push((await tx.wait()).transactionHash);
          } else {
            const tx = await module.addToPartitionWhitelist(partition, partConfig.whitelist[0]);
            txHashes.push((await tx.wait()).transactionHash);
          }
        }
        
        // Add partition-specific blacklist
        if (partConfig.blacklist?.length > 0) {
          console.log(`  Adding ${partConfig.blacklist.length} addresses to partition ${partConfig.partition} blacklist`);
          if (partConfig.blacklist.length > 1) {
            const tx = await module.addBatchToPartitionBlacklist(partition, partConfig.blacklist);
            txHashes.push((await tx.wait()).transactionHash);
          } else {
            const tx = await module.addToPartitionBlacklist(partition, partConfig.blacklist[0]);
            txHashes.push((await tx.wait()).transactionHash);
          }
        }
        
        // Set investor limit for partition
        if (partConfig.investorLimit !== undefined) {
          console.log(`  Setting investor limit for partition ${partConfig.partition}: ${partConfig.investorLimit}`);
          const tx = await module.setInvestorLimit(partition, partConfig.investorLimit);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Set lockup period for partition
        if (partConfig.lockupDuration !== undefined) {
          console.log(`  Setting lockup period for partition ${partConfig.partition}: ${partConfig.lockupDuration}s`);
          const tx = await module.setLockupPeriod(partition, partConfig.lockupDuration);
          txHashes.push((await tx.wait()).transactionHash);
        }
        
        // Lock partition until specific timestamp
        if (partConfig.lockUntil !== undefined) {
          console.log(`  Locking partition ${partConfig.partition} until: ${new Date(partConfig.lockUntil * 1000).toISOString()}`);
          const tx = await module.lockPartition(partition, partConfig.lockUntil);
          txHashes.push((await tx.wait()).transactionHash);
        }
      }
    }
    
    // Configure jurisdiction restrictions
    if (config.jurisdictionRestrictions?.length > 0) {
      console.log(`  Configuring ${config.jurisdictionRestrictions.length} jurisdiction restrictions`);
      
      for (const jConfig of config.jurisdictionRestrictions) {
        const jurisdiction = ethers.encodeBytes32String(jConfig.jurisdiction);
        console.log(`  Setting jurisdiction ${jConfig.jurisdiction} restricted: ${jConfig.restricted}`);
        const tx = await module.setJurisdictionRestriction(jurisdiction, jConfig.restricted);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  /**
   * Configure Policy Engine Module - DATABASE-FIRST
   * 
   * PolicyEngine enforces on-chain operation policies with:
   * - Per-operation amount limits (e.g., max mint amount)
   * - Daily cumulative limits (e.g., max mints per day)
   * - Cooldown periods between operations
   * - Multi-signature approval requirements
   * 
   * CRITICAL: Policy configuration must match database to ensure:
   * - Correct operation type policies (mint, burn, transfer, etc.)
   * - Appropriate amount limits
   * - Proper approval thresholds
   * - Authorized approvers
   * 
   * ACTUAL ABI METHODS (PolicyEngine.sol):
   * - createPolicy(address token, string operationType, uint256 maxAmount, uint256 dailyLimit, uint256 cooldownPeriod)
   * - updatePolicy(address token, string operationType, bool active, uint256 maxAmount, uint256 dailyLimit)
   * - enableApprovalRequirement(address token, string operationType, uint8 threshold)
   * - addApprover(address token, string operationType, address approver)
   * - validateOperation(address token, address operator, string operationType, uint256 amount) → bool, string
   * - validateOperationWithTarget(address token, address operator, address target, string operationType, uint256 amount) → bool, string
   * 
   * ❌ WRONG METHODS (DO NOT EXIST):
   * - setDefaultPolicy() - NOT IN CONTRACT
   * - addRule() - NOT IN CONTRACT (policy-based, not rule-based)
   * - addValidator() - NOT IN CONTRACT (use addApprover instead)
   */
  private static async configurePolicyEngineModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('🔐 Configuring policy engine module (DATABASE-FIRST)');
    
    // Token address is required for all policy operations
    const tokenAddress = config.tokenAddress;
    if (!tokenAddress) {
      throw new Error('Token address required for policy engine configuration');
    }
    
    // Create policies for different operation types
    if (config.policies?.length > 0) {
      console.log(`  Creating ${config.policies.length} operation policies`);
      
      for (const policy of config.policies) {
        console.log(`  Creating policy for ${policy.operationType}:`);
        console.log(`    - Max amount: ${policy.maxAmount || 'unlimited'}`);
        console.log(`    - Daily limit: ${policy.dailyLimit || 'unlimited'}`);
        console.log(`    - Cooldown: ${policy.cooldownPeriod || 0}s`);
        
        // Create base policy
        const tx = await module.createPolicy(
          tokenAddress,
          policy.operationType,  // e.g., "mint", "burn", "transfer", "approve"
          policy.maxAmount || 0,  // 0 = unlimited
          policy.dailyLimit || 0,  // 0 = unlimited
          policy.cooldownPeriod || 0  // seconds
        );
        txHashes.push((await tx.wait()).transactionHash);
        
        // Enable approval requirement if specified
        if (policy.requiresApproval && policy.approvalThreshold) {
          console.log(`    - Enabling ${policy.approvalThreshold}-signature approval`);
          const approvalTx = await module.enableApprovalRequirement(
            tokenAddress,
            policy.operationType,
            policy.approvalThreshold
          );
          txHashes.push((await approvalTx.wait()).transactionHash);
          
          // Add approvers for this operation
          if (policy.approvers?.length > 0) {
            console.log(`    - Adding ${policy.approvers.length} approvers`);
            for (const approver of policy.approvers) {
              const approverTx = await module.addApprover(
                tokenAddress,
                policy.operationType,
                approver
              );
              txHashes.push((await approverTx.wait()).transactionHash);
            }
          }
        }
      }
    }
    
    // Update existing policies if specified
    if (config.policyUpdates?.length > 0) {
      console.log(`  Updating ${config.policyUpdates.length} existing policies`);
      
      for (const update of config.policyUpdates) {
        console.log(`  Updating policy for ${update.operationType}:`);
        console.log(`    - Active: ${update.active}`);
        console.log(`    - Max amount: ${update.maxAmount || 'unlimited'}`);
        console.log(`    - Daily limit: ${update.dailyLimit || 'unlimited'}`);
        
        const tx = await module.updatePolicy(
          tokenAddress,
          update.operationType,
          update.active,
          update.maxAmount || 0,
          update.dailyLimit || 0
        );
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Add global approvers (for all operations)
    if (config.globalApprovers?.length > 0) {
      console.log(`  Adding ${config.globalApprovers.length} global approvers`);
      
      // Get all operation types from config
      const operationTypes = config.policies?.map((p: any) => p.operationType) || [];
      
      for (const approver of config.globalApprovers) {
        for (const operationType of operationTypes) {
          console.log(`    Adding ${approver} as approver for ${operationType}`);
          const tx = await module.addApprover(
            tokenAddress,
            operationType,
            approver
          );
          txHashes.push((await tx.wait()).transactionHash);
        }
      }
    }
    
    console.log('  ✅ Policy engine configuration complete');
  }

  /**
   * Configure ERC20 Fee Module - DATABASE-FIRST
   * 
   * CRITICAL: Fee configuration must match database to ensure:
   * - Correct transfer fee (basis points)
   * - Correct buy fee (basis points) for DEX purchases
   * - Correct sell fee (basis points) for DEX sales
   * - Proper fee recipient address
   * - Maximum fee cap (safety limit)
   * - Fee enabled/disabled state
   * - Address exemptions from fees
   * 
   * Misconfiguration means permanent revenue loss!
   * 
   * @see https://eth-hoodi.blockscout.com/tx/0x015a673a255b500895dbe0b29ea1b8024acf5a2d4145b8351683a266f3f40de1
   * @see https://eth-hoodi.blockscout.com/tx/0x5922a94e731d8969892139219f4f6800e80e1075f14a0882b77a8a6bd0c0ba16
   */
  private static async configureFeeModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('💰 Configuring fee module (DATABASE-FIRST)');
    
    // Set transfer fee (standard transfers)
    if (config.transferFeeBps !== undefined) {
      console.log(`   Setting transfer fee: ${config.transferFeeBps} bps (${(config.transferFeeBps / 100).toFixed(2)}%)`);
      const tx = await module.setTransferFee(config.transferFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set buy fee (DEX purchases)
    if (config.buyFeeBps !== undefined) {
      console.log(`   Setting buy fee: ${config.buyFeeBps} bps (${(config.buyFeeBps / 100).toFixed(2)}%)`);
      const tx = await module.setBuyFee(config.buyFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set sell fee (DEX sales)
    if (config.sellFeeBps !== undefined) {
      console.log(`   Setting sell fee: ${config.sellFeeBps} bps (${(config.sellFeeBps / 100).toFixed(2)}%)`);
      const tx = await module.setSellFee(config.sellFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set maximum fee cap (safety limit)
    if (config.maxFeeBps !== undefined) {
      console.log(`   Setting max fee cap: ${config.maxFeeBps} bps (${(config.maxFeeBps / 100).toFixed(2)}%)`);
      const tx = await module.setMaxFee(config.maxFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set fee recipient address
    if (config.feeRecipient) {
      console.log(`   Setting fee recipient: ${config.feeRecipient}`);
      const tx = await module.setFeeRecipient(config.feeRecipient);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable or disable fee collection
    if (config.enabled !== undefined) {
      console.log(`   Setting fee enabled: ${config.enabled}`);
      const tx = await module.setFeeEnabled(config.enabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Exempt addresses from fees (batch operation for efficiency)
    if (config.exemptAddresses && Array.isArray(config.exemptAddresses) && config.exemptAddresses.length > 0) {
      console.log(`   Exempting ${config.exemptAddresses.length} addresses from fees`);
      
      // Validate all addresses before attempting exemption
      const validAddresses = config.exemptAddresses.filter((addr: string) => {
        try {
          return ethers.isAddress(addr);
        } catch {
          console.warn(`     ⚠️ Invalid address skipped: ${addr}`);
          return false;
        }
      });
      
      if (validAddresses.length > 0) {
        // Use batch exemption if available, otherwise exempt individually
        try {
          // Try batch operation first (if available in contract)
          const tx = await module.exemptFromFeesBatch(validAddresses);
          txHashes.push((await tx.wait()).transactionHash);
          console.log(`     ✅ Batch exempted ${validAddresses.length} addresses`);
        } catch (batchError: any) {
          // Fallback to individual exemptions if batch not supported
          if (batchError.message?.includes('not a function')) {
            console.log(`     ℹ️ Batch exemption not available, exempting individually...`);
            for (const address of validAddresses) {
              try {
                const tx = await module.exemptFromFees(address, 'Platform exemption');
                txHashes.push((await tx.wait()).transactionHash);
                console.log(`     ✅ Exempted: ${address}`);
              } catch (exemptError) {
                console.error(`     ❌ Failed to exempt ${address}:`, exemptError);
                // Continue with remaining addresses
              }
            }
          } else {
            throw batchError; // Re-throw if it's a different error
          }
        }
      }
    }
    
    console.log('✅ Fee module configured');
  }

  /**
   * Configure ERC20 Flash Mint Module - DATABASE-FIRST
   * 
   * CRITICAL: Flash mint configuration must match database to ensure:
   * - Correct flash loan fees (basis points)
   * - Proper fee recipient
   * - Appropriate max flash loan limits
   * 
   * EIP-3156 compliant flash loan implementation.
   */
  private static async configureFlashMintModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('⚡ Configuring flash mint module (DATABASE-FIRST)');
    
    // Set flash loan fee in basis points
    if (config.flashFeeBasisPoints !== undefined) {
      console.log(`   Setting flash fee: ${config.flashFeeBasisPoints} bps (${config.flashFeeBasisPoints / 100}%)`);
      const tx = await module.setFlashFee(config.flashFeeBasisPoints);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set maximum flash loan amount (0 = unlimited)
    if (config.maxFlashLoan !== undefined) {
      const maxLoanValue = config.maxFlashLoan === 0 ? 0 : ethers.parseUnits(config.maxFlashLoan.toString(), 18);
      console.log(`   Setting max flash loan: ${config.maxFlashLoan === 0 ? 'Unlimited' : ethers.formatUnits(maxLoanValue, 18) + ' tokens'}`);
      const tx = await module.setMaxFlashLoan(maxLoanValue);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    console.log('✅ Flash mint module configured');
  }

  /**
   * Configure ERC20 Timelock Module - DATABASE-FIRST
   * 
   * CRITICAL: Timelock configuration must match database to ensure:
   * - Correct lock duration constraints (min/max/default)
   * - Proper extension permissions
   * 
   * ACTUAL ABI METHODS:
   * - setLockDurationConstraints(uint256 minDuration, uint256 maxDuration, uint256 defaultDuration)
   * - setExtensionAllowed(bool allowed)
   * 
   * ✅ FIX APPLIED: Replaced setMinDelay(), grantRole(PROPOSER_ROLE), grantRole(EXECUTOR_ROLE)
   * with correct methods from actual contract ABI
   */
  private static async configureTimelockModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('🔒 Configuring timelock module (DATABASE-FIRST)');
    
    // Set lock duration constraints (min, max, default) - ALL AT ONCE
    if (config.minDuration !== undefined || config.maxDuration !== undefined || config.defaultDuration !== undefined) {
      // Use config values or sensible defaults
      const minDuration = config.minDuration !== undefined ? config.minDuration : 3600; // 1 hour minimum
      const maxDuration = config.maxDuration !== undefined ? config.maxDuration : 31536000; // 1 year maximum
      const defaultDuration = config.defaultDuration !== undefined ? config.defaultDuration : 172800; // 2 days default
      
      console.log(`   Setting duration constraints:`);
      console.log(`     - Min: ${minDuration}s (${Math.floor(minDuration / 3600)}h)`);
      console.log(`     - Max: ${maxDuration}s (${Math.floor(maxDuration / 86400)}d)`);
      console.log(`     - Default: ${defaultDuration}s (${Math.floor(defaultDuration / 3600)}h)`);
      
      const tx = await module.setLockDurationConstraints(minDuration, maxDuration, defaultDuration);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
      
      console.log(`   ✅ Duration constraints set: ${receipt.transactionHash}`);
    }
    
    // Set whether lock extensions are allowed
    if (config.extensionAllowed !== undefined) {
      console.log(`   Setting lock extension allowed: ${config.extensionAllowed}`);
      const tx = await module.setExtensionAllowed(config.extensionAllowed);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
      
      console.log(`   ✅ Extension setting updated: ${receipt.transactionHash}`);
    }
    
    console.log(`✅ Timelock module configured with ${txHashes.length} transaction(s)`);
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

  /**
   * Configure ERC721 Rental Module - DATABASE-FIRST
   * 
   * CRITICAL: Rental configuration must match database to ensure:
   * - Correct platform fees
   * - Proper duration constraints
   * - Appropriate deposit requirements
   * 
   * Misconfiguration means broken rental functionality!
   */
  private static async configureRentalModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('🏠 Configuring rental module (DATABASE-FIRST)');
    
    // Set platform fee recipient (CRITICAL for revenue!)
    if (config.feeRecipient) {
      console.log(`  Setting fee recipient: ${config.feeRecipient}`);
      const tx = await module.setFeeRecipient(config.feeRecipient);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set platform fee percentage
    if (config.platformFeeBps !== undefined) {
      console.log(`  Setting platform fee: ${config.platformFeeBps} bps (${(config.platformFeeBps / 100).toFixed(2)}%)`);
      const tx = await module.setPlatformFee(config.platformFeeBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set minimum rental duration
    if (config.minRentalDuration !== undefined) {
      console.log(`  Setting min rental duration: ${config.minRentalDuration}s`);
      const tx = await module.setMinRentalDuration(config.minRentalDuration);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set maximum rental duration
    if (config.maxRentalDuration !== undefined) {
      console.log(`  Setting max rental duration: ${config.maxRentalDuration}s`);
      const tx = await module.setMaxRentalDuration(config.maxRentalDuration);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set minimum rental price
    if (config.minRentalPrice !== undefined) {
      console.log(`  Setting min rental price: ${config.minRentalPrice} ETH`);
      const priceWei = ethers.parseEther(config.minRentalPrice.toString());
      const tx = await module.setMinRentalPrice(priceWei);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set deposit requirements
    if (config.depositRequired !== undefined) {
      console.log(`  Setting deposit required: ${config.depositRequired}`);
      const tx = await module.setDepositRequired(config.depositRequired);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set minimum deposit percentage
    if (config.minDepositBps !== undefined) {
      console.log(`  Setting min deposit: ${config.minDepositBps} bps (${(config.minDepositBps / 100).toFixed(2)}%)`);
      const tx = await module.setMinDepositBps(config.minDepositBps);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set auto-return feature
    if (config.autoReturnEnabled !== undefined) {
      console.log(`  Setting auto-return: ${config.autoReturnEnabled}`);
      const tx = await module.setAutoReturnEnabled(config.autoReturnEnabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set sub-rental permissions
    if (config.subRentalsAllowed !== undefined) {
      console.log(`  Setting sub-rentals allowed: ${config.subRentalsAllowed}`);
      const tx = await module.setSubRentalsAllowed(config.subRentalsAllowed);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    console.log(`✅ Rental module configured with ${txHashes.length} transactions`);
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
    
    // ✅ FIX: Use scheduleSnapshot() with calculated future timestamp
    // Configure snapshot schedule if provided
    if (config.automaticSnapshots && config.snapshotInterval !== undefined) {
      // Convert interval (in seconds) to future timestamp
      const now = Math.floor(Date.now() / 1000);
      const firstSnapshotTime = now + config.snapshotInterval;
      
      console.log(`  Scheduling first snapshot for ${new Date(firstSnapshotTime * 1000).toISOString()}`);
      const tx = await module.scheduleSnapshot(firstSnapshotTime);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
      
      console.log(`  ⚠️  Note: Only first snapshot scheduled. Additional snapshots must be scheduled manually or via automated system.`);
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
      const tx = await module.setQuorumPercentage(config.quorumPercentage);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  /**
   * Configure ERC20 Temporary Approval Module - DATABASE-FIRST
   * 
   * CRITICAL: Temporary approval configuration must match database to ensure:
   * - Correct default approval duration
   * - Proper duration constraints (min/max)
   * - Feature enabled/disabled state
   * 
   * ACTUAL ABI METHODS:
   * - setDurationConfig(uint256 defaultDuration, uint256 minDuration, uint256 maxDuration)
   * - setEnabled(bool enabled)
   * 
   * ✅ FIX APPLIED: Replaced setDefaultDuration(), setMinDuration(), setMaxDuration()
   * with single batch method setDurationConfig() as per actual contract ABI
   * 
   * All duration settings must be set together in one transaction.
   */
  private static async configureTemporaryApprovalModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('⏰ Configuring temporary approval module (DATABASE-FIRST)');
    
    // Set all duration constraints together - MUST BE ONE TRANSACTION
    if (config.defaultDuration !== undefined || config.minDuration !== undefined || config.maxDuration !== undefined) {
      // Use config values or sensible defaults
      const defaultDuration = config.defaultDuration !== undefined ? config.defaultDuration : 3600; // 1 hour default
      const minDuration = config.minDuration !== undefined ? config.minDuration : 300; // 5 minutes minimum
      const maxDuration = config.maxDuration !== undefined ? config.maxDuration : 86400; // 1 day maximum
      
      console.log(`   Setting duration configuration:`);
      console.log(`     - Default: ${defaultDuration}s (${Math.floor(defaultDuration / 60)}min)`);
      console.log(`     - Min: ${minDuration}s (${Math.floor(minDuration / 60)}min)`);
      console.log(`     - Max: ${maxDuration}s (${Math.floor(maxDuration / 3600)}h)`);
      
      const tx = await module.setDurationConfig(defaultDuration, minDuration, maxDuration);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
      
      console.log(`   ✅ Duration config set: ${receipt.transactionHash}`);
    }
    
    // Set enabled state
    if (config.enabled !== undefined) {
      console.log(`   Setting temporary approval enabled: ${config.enabled}`);
      const tx = await module.setEnabled(config.enabled);
      const receipt = await tx.wait();
      txHashes.push(receipt.transactionHash);
      
      console.log(`   ✅ Enabled state updated: ${receipt.transactionHash}`);
    }
    
    console.log(`✅ Temporary approval module configured with ${txHashes.length} transaction(s)`);
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
    
    // ❌ REMOVED: setEnforceSequential() does not exist in contract
    // Sequential minting is enforced by design in consecutive module
    // No configuration needed - tokens are ALWAYS minted sequentially
    
    // Optional: Set starting token ID if provided
    if (config.startingTokenId !== undefined) {
      console.log(`  Setting starting token ID to ${config.startingTokenId}`);
      const tx = await module.setNextConsecutiveId(config.startingTokenId);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  private static async configureFractionalizationModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring fractionalization module');
    
    // ✅ FIX: Use batch setConfiguration() method
    // All fraction parameters must be set together via setConfiguration()
    
    // Set default values if not provided
    const minFractions = config.minFractions !== undefined ? config.minFractions : 100;
    const maxFractions = config.maxFractions !== undefined ? config.maxFractions : 10000;
    const buyoutMultiplierBps = config.buyoutMultiplierBps !== undefined ? config.buyoutMultiplierBps : 15000; // 150%
    const redemptionEnabled = config.redemptionEnabled !== undefined ? config.redemptionEnabled : true;
    const fractionPrice = config.fractionPrice !== undefined ? 
      ethers.parseUnits(config.fractionPrice.toString(), 18) : 
      ethers.parseUnits('0.01', 18); // Default 0.01 ETH per fraction
    const tradingEnabled = config.tradingEnabled !== undefined ? config.tradingEnabled : true;
    
    console.log(`  Configuring fractionalization parameters:`);
    console.log(`    Min fractions: ${minFractions}`);
    console.log(`    Max fractions: ${maxFractions}`);
    console.log(`    Buyout multiplier: ${buyoutMultiplierBps} bps`);
    console.log(`    Redemption enabled: ${redemptionEnabled}`);
    console.log(`    Fraction price: ${ethers.formatUnits(fractionPrice, 18)} ETH`);
    console.log(`    Trading enabled: ${tradingEnabled}`);
    
    const tx = await module.setConfiguration(
      minFractions,
      maxFractions,
      buyoutMultiplierBps,
      redemptionEnabled,
      fractionPrice,
      tradingEnabled
    );
    txHashes.push((await tx.wait()).transactionHash);
  }

  private static async configureSoulboundModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('Configuring soulbound module');
    
    // ✅ FIX: Use batch setConfiguration() method
    // All soulbound parameters must be set together via setConfiguration()
    
    // Set default values if not provided
    const allowOneTimeTransfer = config.allowOneTimeTransfer !== undefined ? config.allowOneTimeTransfer : false;
    const burnableByOwner = config.burnableByOwner !== undefined ? config.burnableByOwner : false;
    const burnableByIssuer = config.burnableByIssuer !== undefined ? config.burnableByIssuer : true;
    const expirationEnabled = config.expirationEnabled !== undefined ? config.expirationEnabled : false;
    const expirationPeriod = config.expirationPeriod !== undefined ? config.expirationPeriod : 0;
    
    console.log(`  Configuring soulbound parameters:`);
    console.log(`    Allow one-time transfer: ${allowOneTimeTransfer}`);
    console.log(`    Burnable by owner: ${burnableByOwner}`);
    console.log(`    Burnable by issuer: ${burnableByIssuer}`);
    console.log(`    Expiration enabled: ${expirationEnabled}`);
    if (expirationEnabled) {
      console.log(`    Expiration period: ${expirationPeriod} seconds (${Math.floor(expirationPeriod / 86400)} days)`);
    }
    
    const tx = await module.setConfiguration(
      allowOneTimeTransfer,
      burnableByOwner,
      burnableByIssuer,
      expirationEnabled,
      expirationPeriod
    );
    txHashes.push((await tx.wait()).transactionHash);
  }

  /**
   * Configure ERC4906 Metadata Events Module - DATABASE-FIRST
   * 
   * CRITICAL: Metadata events configuration must match database to ensure:
   * - Correct batch update behavior
   * - Proper emit-on-transfer settings
   * - Master updates enabled/disabled state
   * 
   * ACTUAL ABI METHODS (ERC4906MetadataModule):
   * - setConfiguration(bool batchUpdates, bool onTransfer)
   * - setUpdatesEnabled(bool enabled)
   * - emitBatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId)
   * - emitMetadataUpdate(uint256 tokenId)
   * 
   * ✅ FIX APPLIED: Replaced individual setters (setAllowBatchUpdates, setRefreshInterval, setAutoEmitEvents)
   * with actual contract methods as per ERC4906 ABI
   * 
   * Configuration controls:
   * - batchUpdates: Whether to allow batch metadata update events
   * - emitOnTransfer: Whether to automatically emit metadata updates on transfers
   * - updatesEnabled: Master switch for all metadata update events
   */
  private static async configureMetadataEventsModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('📝 Configuring metadata events module (DATABASE-FIRST)');
    
    // Configure batch updates and emit-on-transfer together - MUST BE ONE TRANSACTION
    if (config.batchUpdates !== undefined || config.emitOnTransfer !== undefined) {
      // Use config values or sensible defaults
      const batchUpdates = config.batchUpdates !== undefined ? config.batchUpdates : true;
      const emitOnTransfer = config.emitOnTransfer !== undefined ? config.emitOnTransfer : false;
      
      console.log(`  Setting configuration:`);
      console.log(`    Batch updates enabled: ${batchUpdates}`);
      console.log(`    Emit on transfer: ${emitOnTransfer}`);
      
      const tx = await module.setConfiguration(batchUpdates, emitOnTransfer);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure master updates switch
    if (config.updatesEnabled !== undefined) {
      console.log(`  Setting updates enabled: ${config.updatesEnabled}`);
      const tx = await module.setUpdatesEnabled(config.updatesEnabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Configure metadata update permissions (if updaters specified)
    if (config.metadataUpdaters?.length > 0) {
      console.log(`  Adding ${config.metadataUpdaters.length} metadata updaters`);
      for (const updater of config.metadataUpdaters) {
        const tx = await module.grantRole(ethers.id('METADATA_UPDATER_ROLE'), updater);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  // ============ ERC1155 MODULES ============

  /**
   * Configure ERC1155 Supply Cap Module - DATABASE-FIRST
   * 
   * CRITICAL: Supply cap configuration must match database to ensure:
   * - Correct per-token maximum supplies
   * - Proper global supply limit
   * - Locked caps where needed
   * 
   * ACTUAL ABI METHODS:
   * - setMaxSupply(uint256 tokenId, uint256 maxSupply)
   * - setGlobalCap(uint256 cap)
   * - setBatchMaxSupplies(uint256[] tokenIds, uint256[] maxSupplies)
   * - lockSupplyCap(uint256 tokenId)
   * 
   * ✅ FIX APPLIED: Changed setSupplyCap() to setMaxSupply() and setGlobalSupplyCap() to setGlobalCap()
   * Added batch method optimization for multiple tokens
   */
  private static async configureSupplyCapModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('⛓️ Configuring supply cap module (DATABASE-FIRST)');
    
    // Set per-token supply caps
    if (config.tokenCaps?.length > 0) {
      console.log(`  Setting supply caps for ${config.tokenCaps.length} token IDs`);
      
      // Option 1: Batch method (more efficient for multiple tokens)
      if (config.tokenCaps.length > 1) {
        const tokenIds = config.tokenCaps.map((cap: any) => cap.tokenId);
        const maxSupplies = config.tokenCaps.map((cap: any) => cap.maxSupply);
        
        console.log(`  Using batch method for ${tokenIds.length} tokens`);
        const tx = await module.setBatchMaxSupplies(tokenIds, maxSupplies);
        txHashes.push((await tx.wait()).transactionHash);
      }
      // Option 2: Individual method (single token)
      else {
        for (const cap of config.tokenCaps) {
          console.log(`  Setting max supply for token ${cap.tokenId}: ${cap.maxSupply}`);
          const tx = await module.setMaxSupply(cap.tokenId, cap.maxSupply);
          txHashes.push((await tx.wait()).transactionHash);
        }
      }
    }
    
    // Set global supply cap
    if (config.globalCap !== undefined) {
      console.log(`  Setting global supply cap: ${config.globalCap}`);
      const tx = await module.setGlobalCap(config.globalCap);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Lock supply caps if specified
    if (config.lockedTokens?.length > 0) {
      console.log(`  Locking ${config.lockedTokens.length} token supply caps`);
      for (const tokenId of config.lockedTokens) {
        const tx = await module.lockSupplyCap(tokenId);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  /**
   * Configure ERC1155 URI Management Module - DATABASE-FIRST
   * 
   * CRITICAL: URI configuration must match database to ensure:
   * - Correct base URI for token metadata
   * - Proper per-token custom URIs
   * - IPFS gateway configuration
   * 
   * ACTUAL ABI METHODS (ERC1155URIModule):
   * - setBaseURI(string newBaseURI)
   * - setTokenURI(uint256 tokenId, string tokenURI)
   * - setBatchTokenURIs(uint256[] tokenIds, string[] tokenURIs)
   * - setIPFSGateway(string gateway)
   * - removeTokenURI(uint256 tokenId)
   * - incrementURIVersion(uint256 tokenId)
   * 
   * ✅ FIX APPLIED: 
   * - Changed setURI() to setTokenURI()
   * - Removed non-existent setAllowURIUpdates()
   * - Added batch method optimization
   * - Added IPFS gateway configuration
   */
  private static async configureURIManagementModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('🔗 Configuring URI management module (DATABASE-FIRST)');
    
    // Set base URI
    if (config.baseURI) {
      console.log(`  Setting base URI: ${config.baseURI}`);
      const tx = await module.setBaseURI(config.baseURI);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set IPFS gateway if specified
    if (config.ipfsGateway) {
      console.log(`  Setting IPFS gateway: ${config.ipfsGateway}`);
      const tx = await module.setIPFSGateway(config.ipfsGateway);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set per-token URIs
    if (config.tokenURIs?.length > 0) {
      console.log(`  Setting URIs for ${config.tokenURIs.length} tokens`);
      
      // Option 1: Batch method (more efficient for multiple tokens)
      if (config.tokenURIs.length > 1) {
        const tokenIds = config.tokenURIs.map((uri: any) => uri.tokenId);
        const uris = config.tokenURIs.map((uri: any) => uri.uri);
        
        console.log(`  Using batch method for ${tokenIds.length} tokens`);
        const tx = await module.setBatchTokenURIs(tokenIds, uris);
        txHashes.push((await tx.wait()).transactionHash);
      }
      // Option 2: Individual method (single token)
      else {
        for (const uri of config.tokenURIs) {
          console.log(`  Setting URI for token ${uri.tokenId}`);
          const tx = await module.setTokenURI(uri.tokenId, uri.uri);
          txHashes.push((await tx.wait()).transactionHash);
        }
      }
    }
    
    // Remove token URIs if specified
    if (config.removeTokenURIs?.length > 0) {
      console.log(`  Removing URIs for ${config.removeTokenURIs.length} tokens`);
      for (const tokenId of config.removeTokenURIs) {
        const tx = await module.removeTokenURI(tokenId);
        txHashes.push((await tx.wait()).transactionHash);
      }
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

  /**
   * Configure ERC3525 Slot Approvable Module - DATABASE-FIRST
   * 
   * CRITICAL: This module allows approving operators for entire slots.
   * Approvals are OWNER-SPECIFIC, not global rules.
   * 
   * ACTUAL ABI METHODS:
   * - setApprovalForSlot(uint256 slot, address operator, bool approved)
   * 
   * ✅ FIX APPLIED: 
   * - CRITICAL: Replaced non-existent setSlotApprovalRule()
   * - Corrected to use per-owner slot approvals
   * - Fixed parameter structure
   * 
   * NOTE: This module typically doesn't need deployment-time configuration.
   * Approvals are set by token owners at runtime via the token contract.
   * Configuration here would only be for pre-approving specific operators.
   */
  private static async configureSlotApprovableModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('🔐 Configuring slot approvable module (DATABASE-FIRST)');
    
    // Note: Slot approvals are typically set by token owners, not during deployment
    // However, if pre-approvals are needed for specific operators:
    
    if (config.preApprovals?.length > 0) {
      console.log(`  Setting ${config.preApprovals.length} pre-approvals`);
      
      for (const approval of config.preApprovals) {
        // Note: This would need to be called by the slot owner
        // Typically this configuration wouldn't happen at deployment
        console.log(`  Pre-approving operator ${approval.operator} for slot ${approval.slotId}`);
        
        // This call would fail unless called by the slot owner
        // In most cases, this module doesn't need deployment configuration
        const tx = await module.setApprovalForSlot(
          approval.slotId,
          approval.operator,
          true
        );
        txHashes.push((await tx.wait()).transactionHash);
      }
    } else {
      console.log('  ℹ️  No pre-approvals configured (normal - approvals set by owners at runtime)');
    }
  }

  /**
   * Configure ERC3525 Value Exchange Module - DATABASE-FIRST
   * 
   * CRITICAL: This module enables value exchange between slots.
   * Uses exchange pools and direct rate-based exchanges.
   * 
   * ACTUAL ABI METHODS:
   * - setExchangeRate(uint256 fromSlot, uint256 toSlot, uint256 rate)
   * - enableExchange(uint256 fromSlot, uint256 toSlot, bool enabled)
   * - setGlobalExchangeEnabled(bool enabled)
   * - setMaxExchangeAmount(uint256 amount)
   * - setMinExchangeAmount(uint256 amount)
   * - createExchangePool(uint256 slot1, uint256 slot2, uint256 initialLiquidity)
   * 
   * ✅ FIX APPLIED:
   * - Removed non-existent setExchangeOracle() and setExchangeFee()
   * - Added exchange pool creation
   * - Added exchange limits configuration
   * - Added exchange enablement control
   */
  private static async configureValueExchangeModule(
    module: ethers.Contract, 
    config: any, 
    txHashes: string[]
  ): Promise<void> {
    console.log('💱 Configuring value exchange module (DATABASE-FIRST)');
    
    // Configure global exchange settings
    if (config.globalExchangeEnabled !== undefined) {
      console.log(`  Setting global exchange enabled: ${config.globalExchangeEnabled}`);
      const tx = await module.setGlobalExchangeEnabled(config.globalExchangeEnabled);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set exchange amount limits
    if (config.minExchangeAmount !== undefined) {
      console.log(`  Setting minimum exchange amount: ${config.minExchangeAmount}`);
      const tx = await module.setMinExchangeAmount(config.minExchangeAmount);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.maxExchangeAmount !== undefined) {
      console.log(`  Setting maximum exchange amount: ${config.maxExchangeAmount}`);
      const tx = await module.setMaxExchangeAmount(config.maxExchangeAmount);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Create exchange pools if specified
    if (config.exchangePools?.length > 0) {
      console.log(`  Creating ${config.exchangePools.length} exchange pools`);
      
      for (const pool of config.exchangePools) {
        console.log(`  Creating pool: slot ${pool.slot1} <-> slot ${pool.slot2}`);
        const tx = await module.createExchangePool(
          pool.slot1,
          pool.slot2,
          pool.initialLiquidity || 0
        );
        const receipt = await tx.wait();
        txHashes.push(receipt.transactionHash);
        
        // Note: Pool ID would be returned from transaction, could be stored if needed
      }
    }
    
    // Configure exchange rates for slot pairs
    if (config.exchangeRates?.length > 0) {
      console.log(`  Setting ${config.exchangeRates.length} exchange rates`);
      
      for (const rate of config.exchangeRates) {
        console.log(`  Setting rate: ${rate.fromSlot} -> ${rate.toSlot} = ${rate.rate}`);
        const tx = await module.setExchangeRate(rate.fromSlot, rate.toSlot, rate.rate);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Enable/disable specific exchange pairs
    if (config.exchangeEnablements?.length > 0) {
      console.log(`  Configuring ${config.exchangeEnablements.length} exchange enablements`);
      
      for (const enablement of config.exchangeEnablements) {
        const tx = await module.enableExchange(
          enablement.fromSlot,
          enablement.toSlot,
          enablement.enabled
        );
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
  }

  // ============ ERC4626 MODULES ============

  /**
   * Configure ERC7540 Async Vault Module - DATABASE-FIRST
   * 
   * CRITICAL: Async vault configuration must match database to ensure:
   * - Proper fulfillment delays for deposit/redeem requests
   * - Correct request expiry times
   * - Appropriate user request limits
   * 
   * ACTUAL ABI METHODS (ERC7540AsyncVaultModule):
   * - setMinimumFulfillmentDelay(uint256 newDelay)
   * - setMaxPendingRequestsPerUser(uint256 newMax)
   * - setRequestExpiry(uint256 expiry)
   * - setMinimumRequestAmount(uint256 amount)
   * - setPartialFulfillmentEnabled(bool enabled)
   * 
   * POST-DEPLOYMENT CONFIGURABLE:
   * All configuration attempts are made; gracefully handles methods that may not exist.
   */
  private static async configureAsyncVaultModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('⏳ Configuring async vault module (DATABASE-FIRST)');
    
    // Set minimum fulfillment delay
    if (config.minimumFulfillmentDelay !== undefined) {
      console.log(`  Setting minimum fulfillment delay: ${config.minimumFulfillmentDelay}s`);
      try {
        const tx = await module.setMinimumFulfillmentDelay(config.minimumFulfillmentDelay);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set minimum fulfillment delay:`, error);
      }
    }
    
    // Set max pending requests per user
    if (config.maxPendingRequestsPerUser !== undefined) {
      console.log(`  Setting max pending requests per user: ${config.maxPendingRequestsPerUser}`);
      try {
        const tx = await module.setMaxPendingRequestsPerUser(config.maxPendingRequestsPerUser);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set max pending requests per user:`, error);
      }
    }
    
    // Set request expiry
    if (config.requestExpiry !== undefined) {
      console.log(`  Setting request expiry: ${config.requestExpiry}s`);
      try {
        const tx = await module.setRequestExpiry(config.requestExpiry);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set request expiry:`, error);
      }
    }
    
    // Set minimum request amount
    if (config.minimumRequestAmount !== undefined) {
      console.log(`  Setting minimum request amount: ${config.minimumRequestAmount}`);
      try {
        const tx = await module.setMinimumRequestAmount(config.minimumRequestAmount);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set minimum request amount:`, error);
      }
    }
    
    // Enable/disable partial fulfillment
    if (config.partialFulfillmentEnabled !== undefined) {
      console.log(`  Setting partial fulfillment: ${config.partialFulfillmentEnabled ? 'enabled' : 'disabled'}`);
      try {
        const tx = await module.setPartialFulfillmentEnabled(config.partialFulfillmentEnabled);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set partial fulfillment:`, error);
      }
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

  /**
   * Configure ERC7535 Native Vault Module - DATABASE-FIRST
   * 
   * CRITICAL: Native vault configuration must match database to ensure:
   * - Proper native ETH handling
   * - Correct WETH wrapping/unwrapping behavior
   * 
   * ACTUAL ABI METHODS (ERC7535NativeVaultModule):
   * - setAcceptNativeToken(bool accept)
   * - setUnwrapOnWithdrawal(bool unwrap)
   * 
   * POST-DEPLOYMENT CONFIGURABLE:
   * All configuration attempts are made; gracefully handles methods that may not exist.
   */
  private static async configureNativeVaultModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('💎 Configuring native vault module (DATABASE-FIRST)');
    
    // Set WETH address if supported
    if (config.wethAddress) {
      console.log(`  Setting WETH address: ${config.wethAddress}`);
      try {
        const tx = await module.setWETH(config.wethAddress);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set WETH address:`, error);
      }
    }
    
    // Enable/disable native token acceptance
    if (config.acceptNativeToken !== undefined) {
      console.log(`  Setting accept native token: ${config.acceptNativeToken ? 'enabled' : 'disabled'}`);
      const tx = await module.setAcceptNativeToken(config.acceptNativeToken);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Enable/disable auto-unwrap on withdrawal
    if (config.unwrapOnWithdrawal !== undefined) {
      console.log(`  Setting unwrap on withdrawal: ${config.unwrapOnWithdrawal ? 'enabled' : 'disabled'}`);
      const tx = await module.setUnwrapOnWithdrawal(config.unwrapOnWithdrawal);
      txHashes.push((await tx.wait()).transactionHash);
    }
  }

  /**
   * Configure ERC4626 Router Module - DATABASE-FIRST
   * 
   * CRITICAL: Router configuration must match database to ensure:
   * - Proper vault registration and routing
   * - Correct multi-hop routing settings
   * - Appropriate slippage tolerance
   * 
   * ACTUAL ABI METHODS (ERC4626RouterModule):
   * - setMaxHops(uint256 hops)
   * - setAllowMultiHop(bool allowed)
   * - registerVault(address vault)
   * - deregisterVault(address vault)
   * 
   * POST-DEPLOYMENT CONFIGURABLE:
   * All methods can be called post-deployment to update router settings.
   * Configuration attempts all methods; gracefully handles any that may not exist.
   */
  private static async configureRouterModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('🔀 Configuring router module (DATABASE-FIRST)');
    
    // Set max hops for multi-hop routing
    if (config.maxHops !== undefined) {
      console.log(`  Setting max hops: ${config.maxHops}`);
      try {
        const tx = await module.setMaxHops(config.maxHops);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set max hops:`, error);
      }
    }
    
    // Enable/disable multi-hop routing
    if (config.allowMultiHop !== undefined) {
      console.log(`  Setting allow multi-hop: ${config.allowMultiHop}`);
      try {
        const tx = await module.setAllowMultiHop(config.allowMultiHop);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set allow multi-hop:`, error);
      }
    }
    
    // Set slippage tolerance
    if (config.slippageTolerance !== undefined) {
      console.log(`  Setting slippage tolerance: ${config.slippageTolerance}`);
      try {
        const tx = await module.setSlippageTolerance(config.slippageTolerance);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set slippage tolerance:`, error);
      }
    }
    
    // Register vaults for routing
    if (config.vaultsToRegister?.length > 0) {
      console.log(`  Registering ${config.vaultsToRegister.length} vaults for routing`);
      for (const vault of config.vaultsToRegister) {
        try {
          console.log(`    Registering vault: ${vault}`);
          const tx = await module.registerVault(vault);
          txHashes.push((await tx.wait()).transactionHash);
        } catch (error) {
          console.warn(`    ⚠️ Failed to register vault ${vault}:`, error);
        }
      }
    }
    
    // Deregister vaults if needed
    if (config.vaultsToDeregister?.length > 0) {
      console.log(`  Deregistering ${config.vaultsToDeregister.length} vaults from routing`);
      for (const vault of config.vaultsToDeregister) {
        try {
          console.log(`    Deregistering vault: ${vault}`);
          const tx = await module.deregisterVault(vault);
          txHashes.push((await tx.wait()).transactionHash);
        } catch (error) {
          console.warn(`    ⚠️ Failed to deregister vault ${vault}:`, error);
        }
      }
    }
    
    // Configure routing paths if supported
    if (config.routingPaths?.length > 0) {
      console.log(`  Attempting to configure ${config.routingPaths.length} routing paths`);
      for (const path of config.routingPaths) {
        try {
          const tx = await module.addRoutingPath(path.fromVault, path.toVault, path.intermediateHops || []);
          txHashes.push((await tx.wait()).transactionHash);
        } catch (error) {
          console.warn(`    ⚠️ Routing path configuration not available:`, error);
        }
      }
    }
  }

  /**
   * Configure ERC4626 Withdrawal Queue Module - DATABASE-FIRST
   * 
   * CRITICAL: Queue configuration must match database to ensure:
   * - Proper liquidity buffer management
   * - Correct withdrawal limits (min/max)
   * - Appropriate queue size and delays
   * - Priority fee for express withdrawals
   * 
   * ACTUAL ABI METHODS (ERC4626WithdrawalQueueModule):
   * - setLiquidityBuffer(uint256 buffer)
   * - setPriorityFeeBps(uint256 feeBps)
   * - setWithdrawalLimits(uint256 minAmount, uint256 maxAmount)
   * 
   * POST-DEPLOYMENT CONFIGURABLE:
   * All configuration attempts are made; gracefully handles methods that may not exist.
   */
  private static async configureWithdrawalQueueModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('📥 Configuring withdrawal queue module (DATABASE-FIRST)');
    
    // Set liquidity buffer
    if (config.liquidityBuffer !== undefined) {
      console.log(`  Setting liquidity buffer: ${config.liquidityBuffer}`);
      const tx = await module.setLiquidityBuffer(config.liquidityBuffer);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    // Set max queue size
    if (config.maxQueueSize !== undefined) {
      console.log(`  Setting max queue size: ${config.maxQueueSize}`);
      try {
        const tx = await module.setMaxQueueSize(config.maxQueueSize);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set max queue size:`, error);
      }
    }
    
    // Set minimum withdrawal delay
    if (config.minWithdrawalDelay !== undefined) {
      console.log(`  Setting minimum withdrawal delay: ${config.minWithdrawalDelay}s`);
      try {
        const tx = await module.setMinWithdrawalDelay(config.minWithdrawalDelay);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set min withdrawal delay:`, error);
      }
    }
    
    // Set withdrawal limits (try batch method first, then individual)
    if (config.minWithdrawalAmount !== undefined || config.maxWithdrawalAmount !== undefined) {
      const minAmount = config.minWithdrawalAmount || 0;
      const maxAmount = config.maxWithdrawalAmount || ethers.MaxUint256;
      
      // Try batch method first
      try {
        console.log(`  Setting withdrawal limits (batch): min=${minAmount}, max=${maxAmount}`);
        const tx = await module.setWithdrawalLimits(minAmount, maxAmount);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        // Fallback to individual setters if batch method doesn't exist
        console.warn(`  ⚠️ Batch method failed, trying individual setters:`, error);
        
        if (config.minWithdrawalAmount !== undefined) {
          try {
            const tx = await module.setMinWithdrawalAmount(config.minWithdrawalAmount);
            txHashes.push((await tx.wait()).transactionHash);
          } catch (err) {
            console.warn(`    ⚠️ Failed to set min withdrawal amount:`, err);
          }
        }
        
        if (config.maxWithdrawalAmount !== undefined) {
          try {
            const tx = await module.setMaxWithdrawalAmount(config.maxWithdrawalAmount);
            txHashes.push((await tx.wait()).transactionHash);
          } catch (err) {
            console.warn(`    ⚠️ Failed to set max withdrawal amount:`, err);
          }
        }
      }
    }
    
    // Set priority fee (try with Bps suffix first, then without)
    if (config.priorityFeeBps !== undefined) {
      console.log(`  Setting priority fee: ${config.priorityFeeBps} bps`);
      try {
        const tx = await module.setPriorityFeeBps(config.priorityFeeBps);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        // Try without Bps suffix
        try {
          const tx = await module.setPriorityFee(config.priorityFeeBps);
          txHashes.push((await tx.wait()).transactionHash);
        } catch (err) {
          console.warn(`  ⚠️ Failed to set priority fee:`, err);
        }
      }
    }
  }

  /**
   * Configure ERC4626 Yield Strategy Module - DATABASE-FIRST
   * 
   * CRITICAL: Yield strategy uses ID-BASED MANAGEMENT, not simple setters!
   * Strategies are complex objects identified by IDs, not simple configuration values.
   * 
   * ACTUAL ABI METHODS (ERC4626YieldStrategyModule):
   * - addStrategy(address protocol, uint256 allocation) → uint256  ⚠️ Returns strategy ID!
   * - removeStrategy(uint256 strategyId)
   * - updateAllocation(uint256 strategyId, uint256 newAllocation)
   * - setStrategyActive(uint256 strategyId, bool active)
   * - setHarvestFrequency(uint256 frequency) ✅ NOW CONFIGURABLE (after Solidity update)
   * - setRebalanceThreshold(uint256 threshold) ✅ NOW CONFIGURABLE (after Solidity update)
   * - harvest(uint256 strategyId) → uint256
   * - harvestAll() → uint256
   * - rebalance()
   * - compound(uint256 strategyId)
   * 
   * ✅ ALL PARAMETERS NOW CONFIGURABLE POST-DEPLOYMENT
   * - Uses ID-based strategy management for protocols/allocations
   * - Harvest frequency and rebalance threshold now have setters (after Solidity update)
   */
  private static async configureYieldStrategyModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('💰 Configuring yield strategy module (DATABASE-FIRST)');
    
    // Add new strategies (returns strategy IDs)
    if (config.strategies?.length > 0) {
      console.log(`  Adding ${config.strategies.length} yield strategies`);
      
      for (const strategy of config.strategies) {
        console.log(`  Adding strategy: ${strategy.protocol} with ${strategy.allocation}% allocation`);
        
        // Add strategy and get the assigned ID
        const tx = await module.addStrategy(strategy.protocol, strategy.allocation);
        const receipt = await tx.wait();
        txHashes.push(receipt.transactionHash);
        
        // Extract strategy ID from event logs if needed
        // const strategyId = extractStrategyIdFromReceipt(receipt);
        
        // Set initial active state if specified
        if (strategy.active !== undefined && strategy.id !== undefined) {
          console.log(`  Setting strategy ${strategy.id} active: ${strategy.active}`);
          const activeTx = await module.setStrategyActive(strategy.id, strategy.active);
          txHashes.push((await activeTx.wait()).transactionHash);
        }
      }
    }
    
    // Update allocations for existing strategies
    if (config.strategyAllocations?.length > 0) {
      console.log(`  Updating ${config.strategyAllocations.length} strategy allocations`);
      
      for (const allocation of config.strategyAllocations) {
        console.log(`  Updating strategy ${allocation.strategyId} allocation: ${allocation.newAllocation}%`);
        const tx = await module.updateAllocation(allocation.strategyId, allocation.newAllocation);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Activate/deactivate existing strategies
    if (config.strategyStates?.length > 0) {
      console.log(`  Updating ${config.strategyStates.length} strategy states`);
      
      for (const state of config.strategyStates) {
        console.log(`  Setting strategy ${state.strategyId} active: ${state.active}`);
        const tx = await module.setStrategyActive(state.strategyId, state.active);
        txHashes.push((await tx.wait()).transactionHash);
      }
    }
    
    // Set harvest frequency (now configurable post-deployment)
    if (config.harvestFrequency !== undefined) {
      console.log(`  Setting harvest frequency: ${config.harvestFrequency}s`);
      try {
        const tx = await module.setHarvestFrequency(config.harvestFrequency);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set harvest frequency:`, error);
      }
    }
    
    // Set rebalance threshold (now configurable post-deployment)
    if (config.rebalanceThreshold !== undefined) {
      console.log(`  Setting rebalance threshold: ${config.rebalanceThreshold}`);
      try {
        const tx = await module.setRebalanceThreshold(config.rebalanceThreshold);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set rebalance threshold:`, error);
      }
    }
  }

  /**
   * Configure ERC7575 Multi-Asset Vault Module - DATABASE-FIRST
   * 
   * CRITICAL: Multi-asset configuration must match database to ensure:
   * - Proper asset weight allocations
   * - Correct oracle and base asset configuration
   * - Appropriate rebalancing thresholds
   * - Asset management
   * 
   * ACTUAL ABI METHODS (ERC7575MultiAssetVaultModule):
   * - addAsset(address asset, uint256 targetWeight)
   * - removeAsset(address asset)
   * - updateAssetWeight(address asset, uint256 newWeight)
   * - setRebalanceThreshold(uint256 threshold)
   * - setRebalanceCooldown(uint256 cooldown)
   * - setRebalanceEnabled(bool enabled)
   * - setMaxAssetAllocation(uint256 maxAllocation)
   * - setDepositsEnabled(bool enabled)
   * 
   * POST-DEPLOYMENT CONFIGURABLE:
   * All configuration attempts are made; gracefully handles methods that may not exist.
   */
  private static async configureMultiAssetVaultModule(module: ethers.Contract, config: any, txHashes: string[]): Promise<void> {
    console.log('🏦 Configuring multi-asset vault module (DATABASE-FIRST)');
    
    // Set price oracle
    if (config.priceOracle) {
      console.log(`  Setting price oracle: ${config.priceOracle}`);
      try {
        const tx = await module.setPriceOracle(config.priceOracle);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set price oracle:`, error);
      }
    }
    
    // Set base asset for valuation
    if (config.baseAsset) {
      console.log(`  Setting base asset: ${config.baseAsset}`);
      try {
        const tx = await module.setBaseAsset(config.baseAsset);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set base asset:`, error);
      }
    }
    
    // Add supported assets
    if (config.supportedAssets?.length > 0) {
      console.log(`  Adding ${config.supportedAssets.length} assets with weights`);
      for (const asset of config.supportedAssets) {
        const weight = asset.weight || 100;  // Default weight if not specified
        console.log(`  Adding asset ${asset.address} with weight ${weight}`);
        try {
          const tx = await module.addAsset(asset.address, weight);
          txHashes.push((await tx.wait()).transactionHash);
        } catch (error) {
          console.warn(`    ⚠️ Failed to add asset ${asset.address}:`, error);
        }
      }
    }
    
    // Update weights for existing assets
    if (config.assetWeights?.length > 0) {
      console.log(`  Updating ${config.assetWeights.length} asset weights`);
      for (const weight of config.assetWeights) {
        console.log(`  Updating asset ${weight.address} weight: ${weight.targetWeight}`);
        try {
          const tx = await module.updateAssetWeight(weight.address, weight.targetWeight);
          txHashes.push((await tx.wait()).transactionHash);
        } catch (error) {
          console.warn(`    ⚠️ Failed to update asset weight:`, error);
        }
      }
    }
    
    // Set rebalancing parameters
    if (config.rebalanceThreshold !== undefined) {
      console.log(`  Setting rebalance threshold: ${config.rebalanceThreshold}`);
      const tx = await module.setRebalanceThreshold(config.rebalanceThreshold);
      txHashes.push((await tx.wait()).transactionHash);
    }
    
    if (config.rebalanceCooldown !== undefined) {
      console.log(`  Setting rebalance cooldown: ${config.rebalanceCooldown}s`);
      try {
        const tx = await module.setRebalanceCooldown(config.rebalanceCooldown);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set rebalance cooldown:`, error);
      }
    }
    
    if (config.rebalanceEnabled !== undefined) {
      console.log(`  Setting rebalance enabled: ${config.rebalanceEnabled}`);
      try {
        const tx = await module.setRebalanceEnabled(config.rebalanceEnabled);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set rebalance enabled:`, error);
      }
    }
    
    // Set max asset allocation
    if (config.maxAssetAllocation !== undefined) {
      console.log(`  Setting max asset allocation: ${config.maxAssetAllocation}`);
      try {
        const tx = await module.setMaxAssetAllocation(config.maxAssetAllocation);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set max asset allocation:`, error);
      }
    }
    
    // Enable/disable deposits
    if (config.depositsEnabled !== undefined) {
      console.log(`  Setting deposits enabled: ${config.depositsEnabled}`);
      try {
        const tx = await module.setDepositsEnabled(config.depositsEnabled);
        txHashes.push((await tx.wait()).transactionHash);
      } catch (error) {
        console.warn(`  ⚠️ Failed to set deposits enabled:`, error);
      }
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
