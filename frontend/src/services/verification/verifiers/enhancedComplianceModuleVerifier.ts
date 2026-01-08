/**
 * Enhanced Compliance Module Verification
 * 
 * Adds database-vs-onchain configuration checks to prevent future drift
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token properties compliance_config)
 * 2. On-chain config matches database  
 * 3. Compliance level and KYC requirements set correctly
 * 4. Whitelist configuration matches if enabled
 * 5. Module properly linked to token
 * 
 * NOTE: This is a UNIVERSAL module that works across ALL token standards
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

// Compliance Module ABI
const COMPLIANCE_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function complianceLevel() view returns (uint8)',
  'function kycRequired() view returns (bool)',
  'function maxHoldersPerJurisdiction() view returns (uint256)',
  'function whitelistRequired() view returns (bool)',
  'function enabled() view returns (bool)',
  'function isWhitelisted(address account) view returns (bool)'
];

/**
 * Enhanced Compliance Module Verifier
 * 
 * Verifies compliance module configuration against database
 * Works across: ERC20, ERC721, ERC1155, ERC3525, ERC4626, ERC1400
 * 
 * Database locations:
 * - token_erc20_properties.compliance_config
 * - token_erc721_properties.compliance_config
 * - token_erc1155_properties.compliance_config
 * - token_erc3525_properties.compliance_config
 * - token_erc4626_properties.compliance_config
 * - token_erc1400_properties.compliance_config
 */
export class EnhancedComplianceModuleVerifier implements IModuleVerifier {
  moduleType = 'compliance';

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
        name: 'Compliance Module Deployed',
        description: 'Verify compliance module bytecode exists',
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
        name: 'Compliance Module Deployed',
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

    const TOKEN_ABI = [
      'function complianceModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      TOKEN_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      COMPLIANCE_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const complianceModuleAddress = await tokenContract.complianceModule();
      const matches = complianceModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Compliance Module Link',
        description: 'Verify token.complianceModule points to compliance module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: complianceModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks; // Module not linked correctly
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Compliance Module Link',
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
        name: 'Compliance Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Compliance Module → Token Link',
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
      COMPLIANCE_MODULE_ABI,
      provider
    );

    // ============================================
    // STEP 1: Query Database for Authoritative Config
    // ============================================
    let dbConfig: any = null;
    const tokenStandard = this.determineTokenStandard(context);
    
    try {
      let tableName = '';
      let moduleAddressColumn = '';
      
      // Determine which properties table to query based on token standard
      switch (tokenStandard) {
        case 'erc20':
          tableName = 'token_erc20_properties';
          moduleAddressColumn = 'compliance_module_address';
          break;
        case 'erc721':
          tableName = 'token_erc721_properties';
          moduleAddressColumn = 'compliance_module_address';
          break;
        case 'erc1155':
          tableName = 'token_erc1155_properties';
          moduleAddressColumn = 'compliance_module_address';
          break;
        case 'erc3525':
          tableName = 'token_erc3525_properties';
          moduleAddressColumn = 'compliance_module_address';
          break;
        case 'erc4626':
          tableName = 'token_erc4626_properties';
          moduleAddressColumn = 'compliance_module_address';
          break;
        case 'erc1400':
          tableName = 'token_erc1400_properties';
          moduleAddressColumn = 'compliance_module_address';
          break;
        default:
          throw new Error(`Unknown token standard: ${tokenStandard}`);
      }

      const { data: tokenProps, error } = await supabase
        .from(tableName)
        .select(`compliance_config, ${moduleAddressColumn}`)
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query ${tableName}: ${error.message}`);
      } else if (tokenProps) {
        dbConfig = tokenProps.compliance_config;
        console.log(`✅ Loaded compliance config from ${tableName}:`, dbConfig);

        // Verify module address matches
        const moduleAddress = (tokenProps as any)[moduleAddressColumn];
        if (moduleAddress) {
          const moduleAddressMatches = 
            moduleAddress.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: `Verify ${tableName}.${moduleAddressColumn} matches deployment`,
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: moduleAddress,
            timestamp: Date.now()
          });
        }
      } else {
        console.warn(`⚠️ No ${tableName} record found for token ${context.deployment.tokenId}`);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: `${tableName}.compliance_config not found`,
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
        description: 'Failed to query token properties table',
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
      const [complianceLevel, kycRequired, maxHoldersPerJurisdiction, whitelistRequired, enabled] = await Promise.all([
        moduleContract.complianceLevel(),
        moduleContract.kycRequired(),
        moduleContract.maxHoldersPerJurisdiction(),
        moduleContract.whitelistRequired(),
        moduleContract.enabled()
      ]);

      onChainConfig = {
        complianceLevel: Number(complianceLevel),
        kycRequired,
        maxHoldersPerJurisdiction: Number(maxHoldersPerJurisdiction),
        whitelistRequired,
        enabled
      };

      console.log(`📊 On-chain compliance configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Compliance Module Enabled',
        description: 'Verify compliance module is enabled on-chain',
        status: enabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: enabled,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Compliance Level Set',
        description: 'Verify compliance level is configured (1-4)',
        status: onChainConfig.complianceLevel > 0 && onChainConfig.complianceLevel <= 4 
          ? VerificationStatus.SUCCESS 
          : VerificationStatus.WARNING,
        expected: 'Level 1-4',
        actual: `Level ${onChainConfig.complianceLevel}`,
        timestamp: Date.now()
      });

      if (onChainConfig.kycRequired) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'KYC Requirement',
          description: 'KYC is required for token transfers',
          status: VerificationStatus.SUCCESS,
          actual: 'KYC required - transfers will be validated',
          timestamp: Date.now()
        });
      }

      if (onChainConfig.whitelistRequired) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Whitelist Requirement',
          description: 'Whitelist is required for token transfers',
          status: VerificationStatus.SUCCESS,
          actual: 'Whitelist required - only whitelisted addresses can hold tokens',
          timestamp: Date.now()
        });
      }

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
      // Check compliance level
      if (dbConfig.complianceLevel !== undefined) {
        const matches = onChainConfig.complianceLevel === dbConfig.complianceLevel;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Compliance Level (DB vs On-Chain)',
          description: 'Verify on-chain compliance level matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `Level ${dbConfig.complianceLevel} (from database)`,
          actual: `Level ${onChainConfig.complianceLevel} (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check KYC requirement
      if (dbConfig.kycRequired !== undefined) {
        const matches = onChainConfig.kycRequired === dbConfig.kycRequired;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'KYC Requirement (DB vs On-Chain)',
          description: 'Verify on-chain KYC requirement matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.kycRequired} (from database)`,
          actual: `${onChainConfig.kycRequired} (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check max holders per jurisdiction
      if (dbConfig.maxHoldersPerJurisdiction !== undefined) {
        const matches = onChainConfig.maxHoldersPerJurisdiction === dbConfig.maxHoldersPerJurisdiction;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Holders Per Jurisdiction (DB vs On-Chain)',
          description: 'Verify on-chain max holders matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.maxHoldersPerJurisdiction} (from database)`,
          actual: `${onChainConfig.maxHoldersPerJurisdiction} (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check whitelist requirement
      if (dbConfig.whitelistRequired !== undefined) {
        const matches = onChainConfig.whitelistRequired === dbConfig.whitelistRequired;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Whitelist Requirement (DB vs On-Chain)',
          description: 'Verify on-chain whitelist requirement matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.whitelistRequired} (from database)`,
          actual: `${onChainConfig.whitelistRequired} (on-chain)`,
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

  /**
   * Determine token standard from context
   * Helper method to identify which properties table to query
   */
  private determineTokenStandard(context: VerificationContext): string {
    // Use standard from deployment data
    if (context.deployment?.standard) {
      const standard = context.deployment.standard.toLowerCase();
      // TokenStandard enum values are uppercase (ERC20, ERC721, etc.)
      if (standard.includes('erc20')) return 'erc20';
      if (standard.includes('erc721')) return 'erc721';
      if (standard.includes('erc1155')) return 'erc1155';
      if (standard.includes('erc3525')) return 'erc3525';
      if (standard.includes('erc4626')) return 'erc4626';
      if (standard.includes('erc1400')) return 'erc1400';
    }

    // Fallback to erc20 as default
    return 'erc20';
  }
}
