/**
 * @deprecated This service is DEPRECATED in favor of enhancedModuleDeploymentService
 * 
 * Foundry Module Attachment Service (LEGACY)
 * 
 * ⚠️ WARNING: This service attaches PRE-EXISTING module addresses.
 * This is the OLD approach and should ONLY be used for:
 * - Backwards compatibility with existing deployments
 * - Advanced users who manually deploy their own modules
 * - Testing/debugging scenarios
 * 
 * 🚨 DO NOT USE for normal deployments!
 * Use enhancedModuleDeploymentService instead, which:
 * - Deploys NEW module instances per token
 * - Ensures proper isolation between tokens
 * - Follows correct architecture (instances not shared masters)
 * 
 * @see enhancedModuleDeploymentService.ts for correct implementation
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import type { FoundryDeploymentParams, FoundryERC20Config } from '../interfaces/TokenInterfaces';

/**
 * Module attachment configuration from user forms
 */
export interface ModuleAddresses {
  complianceModuleAddress?: string;
  vestingModuleAddress?: string;
  feesModuleAddress?: string;
  policyEngineAddress?: string;
}

/**
 * Result of module attachment operations
 */
export interface ModuleAttachmentResult {
  attached: string[]; // Successfully attached modules
  failed: string[];   // Failed module attachments
  errors: Record<string, string>; // Error messages per module type
}

/**
 * @deprecated Use enhancedModuleDeploymentService instead
 * 
 * Service for attaching PRE-EXISTING extension modules to deployed tokens
 * 
 * ⚠️ LEGACY SERVICE - Only for backwards compatibility
 */
export class FoundryModuleAttachmentService {
  
  /**
   * @deprecated Use enhancedModuleDeploymentService.deployAndAttachModules() instead
   * 
   * Attach PRE-EXISTING extension modules to a deployed token
   * 
   * ⚠️ WARNING: This does NOT deploy new instances!
   * This attaches addresses provided in params, which could be:
   * - Shared master contracts (WRONG - security risk)
   * - Pre-deployed module instances (OK for advanced users)
   * 
   * For normal deployments, use enhancedModuleDeploymentService which
   * deploys NEW instances per token.
   * 
   * @param tokenAddress - Address of the deployed token
   * @param tokenId - Database ID of the token
   * @param wallet - Signer wallet for transactions
   * @param params - Deployment parameters containing module addresses
   * @param userId - User ID for audit logging
   * @returns Result indicating which modules were attached successfully
   */
  async attachModules(
    tokenAddress: string,
    tokenId: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams,
    userId: string
  ): Promise<ModuleAttachmentResult> {
    console.warn('⚠️ DEPRECATED: Using foundryModuleAttachmentService (legacy). Consider using enhancedModuleDeploymentService instead.');
    
    const result: ModuleAttachmentResult = {
      attached: [],
      failed: [],
      errors: {}
    };

    // Extract module addresses from ERC20 config (other standards will need similar logic)
    const config = params.config as FoundryERC20Config;
    const moduleAddresses = this.extractModuleAddresses(config);

    // Check if any modules need to be attached
    if (!this.hasAnyModules(moduleAddresses)) {
      console.log('ℹ️ No extension modules configured for this token');
      return result;
    }

    console.log('🔧 [LEGACY] Attaching PRE-EXISTING modules to token:', tokenAddress);
    console.log('📦 Module addresses:', moduleAddresses);
    console.warn('⚠️ These may be shared masters! Use enhancedModuleDeploymentService to deploy NEW instances.');

    // Create contract instance with module setter ABIs
    const moduleSetterABI = [
      'function setComplianceModule(address module) external',
      'function setVestingModule(address module) external',
      'function setFeesModule(address module) external',
      'function setPolicyEngine(address engine) external'
    ];
    const tokenContract = new ethers.Contract(tokenAddress, moduleSetterABI, wallet);

    // Attach each module
    if (moduleAddresses.complianceModuleAddress) {
      await this.attachSingleModule(
        'compliance',
        moduleAddresses.complianceModuleAddress,
        tokenContract,
        tokenId,
        userId,
        result
      );
    }

    if (moduleAddresses.vestingModuleAddress) {
      await this.attachSingleModule(
        'vesting',
        moduleAddresses.vestingModuleAddress,
        tokenContract,
        tokenId,
        userId,
        result
      );
    }

    if (moduleAddresses.feesModuleAddress) {
      await this.attachSingleModule(
        'fees',
        moduleAddresses.feesModuleAddress,
        tokenContract,
        tokenId,
        userId,
        result
      );
    }

    if (moduleAddresses.policyEngineAddress) {
      await this.attachSingleModule(
        'policy_engine',
        moduleAddresses.policyEngineAddress,
        tokenContract,
        tokenId,
        userId,
        result
      );
    }

    // Log summary
    console.log('✅ [LEGACY] Module attachment complete:', {
      attached: result.attached,
      failed: result.failed,
      errors: result.errors
    });

    await logActivity({
      action: 'modules_attached_legacy',
      entity_type: 'token',
      entity_id: tokenAddress,
      details: {
        tokenId,
        attached: result.attached,
        failed: result.failed,
        errors: result.errors,
        warning: 'Used legacy attachment service - may be shared masters'
      },
      status: result.failed.length > 0 ? 'warning' : 'success'
    });

    return result;
  }

  /**
   * Attach a single module to the token
   */
  private async attachSingleModule(
    moduleType: string,
    moduleAddress: string,
    tokenContract: ethers.Contract,
    tokenId: string,
    userId: string,
    result: ModuleAttachmentResult
  ): Promise<void> {
    try {
      console.log(`🔗 [LEGACY] Attaching ${moduleType} module at ${moduleAddress}...`);

      // Validate address format
      if (!ethers.isAddress(moduleAddress)) {
        throw new Error(`Invalid ${moduleType} module address: ${moduleAddress}`);
      }

      // ⚠️ WARNING: Check if this is a master contract (shared)
      const isMaster = await this.checkIfMasterContract(moduleAddress, moduleType);
      if (isMaster) {
        console.warn(`⚠️ WARNING: ${moduleAddress} appears to be a MASTER contract!`);
        console.warn(`⚠️ This will be SHARED across all tokens - use enhancedModuleDeploymentService instead!`);
      }

      // Call appropriate setter method
      let tx: ethers.ContractTransactionResponse;
      switch (moduleType) {
        case 'compliance':
          tx = await tokenContract.setComplianceModule(moduleAddress);
          break;
        case 'vesting':
          tx = await tokenContract.setVestingModule(moduleAddress);
          break;
        case 'fees':
          tx = await tokenContract.setFeesModule(moduleAddress);
          break;
        case 'policy_engine':
          tx = await tokenContract.setPolicyEngine(moduleAddress);
          break;
        default:
          throw new Error(`Unknown module type: ${moduleType}`);
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error(`Transaction failed for ${moduleType} module`);
      }

      console.log(`✅ [LEGACY] ${moduleType} module attached successfully (tx: ${receipt.hash})`);

      // Save to token_modules table (mark as legacy)
      await this.saveModuleAttachment(
        tokenId,
        moduleType,
        moduleAddress,
        receipt.hash,
        userId,
        isMaster
      );

      result.attached.push(moduleType);

    } catch (error) {
      console.error(`❌ Failed to attach ${moduleType} module:`, error);
      result.failed.push(moduleType);
      result.errors[moduleType] = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Check if address is a master contract from contract_masters table
   */
  private async checkIfMasterContract(
    address: string,
    moduleType: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('id')
        .eq('contract_address', address)
        .like('contract_type', '%module%')
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Save module attachment to database
   */
  private async saveModuleAttachment(
    tokenId: string,
    moduleType: string,
    moduleAddress: string,
    transactionHash: string,
    userId: string,
    isMaster: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase.from('token_modules').insert({
        token_id: tokenId,
        module_type: moduleType,
        module_address: moduleAddress,
        master_address: isMaster ? moduleAddress : null, // If master, both are same (BAD!)
        deployment_tx_hash: transactionHash,
        is_active: true,
        attached_at: new Date().toISOString(),
        deployed_by: userId,
        configuration: {
          attachmentMethod: 'legacy',
          isSharedMaster: isMaster,
          warning: isMaster ? 'This module is shared across all tokens' : undefined
        }
      });

      if (error) {
        console.error('Failed to save module attachment to database:', error);
        throw error;
      }

      console.log(`💾 [LEGACY] ${moduleType} module attachment saved to database`);
      
      if (isMaster) {
        console.warn(`⚠️ DATABASE WARNING: Saved shared master reference - this is NOT recommended!`);
      }
    } catch (error) {
      console.error('Database save error for module attachment:', error);
      // Don't throw - module is attached on-chain, database is just for tracking
    }
  }

  /**
   * Extract module addresses from token configuration
   */
  private extractModuleAddresses(config: FoundryERC20Config): ModuleAddresses {
    // For ERC20, module addresses may be in properties or passed separately
    // This will vary by token standard
    return {
      complianceModuleAddress: (config as any).compliance_module_address,
      vestingModuleAddress: (config as any).vesting_module_address,
      feesModuleAddress: (config as any).fees_module_address,
      policyEngineAddress: (config as any).policy_engine_address
    };
  }

  /**
   * Check if any modules are configured
   */
  private hasAnyModules(addresses: ModuleAddresses): boolean {
    return !!(
      addresses.complianceModuleAddress ||
      addresses.vestingModuleAddress ||
      addresses.feesModuleAddress ||
      addresses.policyEngineAddress
    );
  }
}

/**
 * @deprecated Use enhancedModuleDeploymentService instead
 * Export singleton instance for backwards compatibility only
 */
export const foundryModuleAttachmentService = new FoundryModuleAttachmentService();
