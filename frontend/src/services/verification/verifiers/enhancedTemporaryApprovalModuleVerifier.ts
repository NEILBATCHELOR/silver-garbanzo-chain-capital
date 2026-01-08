/**
 * Enhanced Temporary Approval Module Verification
 * 
 * Adds database-vs-onchain configuration checks to prevent future drift
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties.temporary_approval_config)
 * 2. On-chain config matches database  
 * 3. Default approval duration configured correctly
 * 4. Module properly linked to token
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import type {
  IModuleVerifier,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  ModuleDeploymentData
} from '../types';
import {
  VerificationStatus,
  VerificationType
} from '../types';

// Temporary Approval Module ABI
const TEMP_APPROVAL_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function defaultDuration() view returns (uint256)',
  'function enabled() view returns (bool)',
  'function getApprovalExpiry(address owner, address spender) view returns (uint256)'
];

/**
 * Enhanced Temporary Approval Module Verifier
 * 
 * Verifies temporary approval module configuration against BOTH:
 * - token_erc20_properties.temporary_approval_config (authoritative source)
 * - token_modules.configuration (deployment record)
 */
export class EnhancedTemporaryApprovalModuleVerifier implements IModuleVerifier {
  moduleType = 'temporaryApproval';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) {
      throw new Error('Provider not available');
    }

    // Check module contract exists
    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Temporary Approval Module Deployed',
        description: 'Verify temporary approval module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) {
        return checks; // Can't continue if module not deployed
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Temporary Approval Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    return checks;
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) {
      throw new Error('Provider not available');
    }

    const ERC20_ABI = [
      'function temporaryApprovalModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      TEMP_APPROVAL_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const tempApprovalModuleAddress = await tokenContract.temporaryApprovalModule();
      const matches = tempApprovalModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Temporary Approval Module Link',
        description: 'Verify token.temporaryApprovalModule points to temporary approval module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: tempApprovalModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks; // Module not linked correctly
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Temporary Approval Module Link',
        description: 'Failed to check token linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    // Check 2: Module → Token linkage
    try {
      const tokenAddress = await moduleContract.tokenContract();
      const matches = tokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Temporary Approval Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Temporary Approval Module → Token Link',
        description: 'Failed to check module linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) {
      throw new Error('Provider not available');
    }

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      TEMP_APPROVAL_MODULE_ABI,
      provider
    );

    // ============================================
    // STEP 1: Query Database for Authoritative Config
    // ============================================
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('temporary_approval_config, temporary_approval_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc20_properties: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.temporary_approval_config;
        console.log(`✅ Loaded temporary approval config from token_erc20_properties:`, dbConfig);

        // Verify module address matches
        if (erc20Props.temporary_approval_module_address) {
          const moduleAddressMatches = 
            erc20Props.temporary_approval_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify token_erc20_properties.temporary_approval_module_address matches deployment',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.temporary_approval_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        console.warn(`⚠️ No token_erc20_properties record found for token ${context.deployment.tokenId}`);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'token_erc20_properties.temporary_approval_config not found',
          status: VerificationStatus.WARNING,
          error: 'Database configuration should be populated for deployed modules',
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      console.error(`❌ Database query failed:`, error);
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to query token_erc20_properties',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // ============================================
    // STEP 2: Get On-Chain Configuration
    // ============================================
    let onChainConfig: any = null;

    try {
      const [defaultDuration, enabled] = await Promise.all([
        moduleContract.defaultDuration(),
        moduleContract.enabled()
      ]);

      onChainConfig = {
        defaultDuration: Number(defaultDuration),
        enabled
      };

      console.log(`📊 On-chain temporary approval configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Temporary Approval Module Enabled',
        description: 'Verify temporary approval module is enabled on-chain',
        status: enabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: enabled,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Approval Duration Configured',
        description: 'Verify default approval duration is set',
        status: onChainConfig.defaultDuration > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: '> 0 seconds',
        actual: `${onChainConfig.defaultDuration} seconds (${(onChainConfig.defaultDuration / 3600).toFixed(1)} hours)`,
        timestamp: Date.now()
      });

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to fetch on-chain module configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // ============================================
    // STEP 3: Compare Database vs On-Chain
    // ============================================
    if (dbConfig && onChainConfig) {
      // Check approval duration
      if (dbConfig.defaultDuration !== undefined) {
        const matches = onChainConfig.defaultDuration === dbConfig.defaultDuration;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Approval Duration (DB vs On-Chain)',
          description: 'Verify on-chain approval duration matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.defaultDuration} seconds (from database)`,
          actual: `${onChainConfig.defaultDuration} seconds (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Overall drift check
      const hasAnyDrift = checks.some(c => 
        c.name.includes('(DB vs On-Chain)') && c.status === VerificationStatus.FAILED
      );

      if (hasAnyDrift) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Configuration Drift Detected',
          description: 'On-chain configuration differs from database',
          status: VerificationStatus.FAILED,
          error: 'Database and on-chain configurations are out of sync. This should not happen with database-first deployment.',
          timestamp: Date.now()
        });
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Configuration Consistency',
          description: 'Database and on-chain configurations match',
          status: VerificationStatus.SUCCESS,
          actual: 'No drift detected - database and on-chain are synchronized',
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
