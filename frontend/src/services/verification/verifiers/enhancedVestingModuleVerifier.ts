/**
 * Enhanced Vesting Module Verification
 * 
 * Adds database-vs-onchain configuration checks to prevent future drift
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token properties vesting_config)
 * 2. On-chain config matches database  
 * 3. Vesting parameters configured correctly (cliff, duration, frequency)
 * 4. Module properly linked to token
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

// Vesting Module ABI
const VESTING_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function cliffPeriod() view returns (uint256)',
  'function totalPeriod() view returns (uint256)',
  'function releaseFrequency() view returns (uint256)',
  'function enabled() view returns (bool)',
  'function getVestingSchedule(address beneficiary) view returns (uint256 startTime, uint256 cliffTime, uint256 endTime, uint256 totalAmount, uint256 releasedAmount)'
];

/**
 * Enhanced Vesting Module Verifier
 * 
 * Verifies vesting module configuration against database
 * Works across: ERC20, ERC721, ERC1155, ERC3525, ERC4626, ERC1400
 * 
 * Database locations:
 * - token_erc20_properties.vesting_config
 * - token_erc721_properties.vesting_config
 * - token_erc1155_properties.vesting_config
 * - token_erc3525_properties.vesting_config
 * - token_erc4626_properties.vesting_config
 * - token_erc1400_properties.vesting_config
 */
export class EnhancedVestingModuleVerifier implements IModuleVerifier {
  moduleType = 'vesting';

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
        name: 'Vesting Module Deployed',
        description: 'Verify vesting module bytecode exists',
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
        name: 'Vesting Module Deployed',
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
      'function vestingModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      TOKEN_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      VESTING_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const vestingModuleAddress = await tokenContract.vestingModule();
      const matches = vestingModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Vesting Module Link',
        description: 'Verify token.vestingModule points to vesting module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: vestingModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks; // Module not linked correctly
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Vesting Module Link',
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
        name: 'Vesting Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Vesting Module → Token Link',
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
      VESTING_MODULE_ABI,
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
          moduleAddressColumn = 'vesting_module_address';
          break;
        case 'erc721':
          tableName = 'token_erc721_properties';
          moduleAddressColumn = 'vesting_module_address';
          break;
        case 'erc1155':
          tableName = 'token_erc1155_properties';
          moduleAddressColumn = 'vesting_module_address';
          break;
        case 'erc3525':
          tableName = 'token_erc3525_properties';
          moduleAddressColumn = 'vesting_module_address';
          break;
        case 'erc4626':
          tableName = 'token_erc4626_properties';
          moduleAddressColumn = 'vesting_module_address';
          break;
        case 'erc1400':
          tableName = 'token_erc1400_properties';
          moduleAddressColumn = 'vesting_module_address';
          break;
        default:
          throw new Error(`Unknown token standard: ${tokenStandard}`);
      }

      const { data: tokenProps, error } = await supabase
        .from(tableName)
        .select(`vesting_config, ${moduleAddressColumn}`)
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query ${tableName}: ${error.message}`);
      } else if (tokenProps) {
        dbConfig = tokenProps.vesting_config;
        console.log(`✅ Loaded vesting config from ${tableName}:`, dbConfig);

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
          description: `${tableName}.vesting_config not found`,
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
      const [cliffPeriod, totalPeriod, releaseFrequency, enabled] = await Promise.all([
        moduleContract.cliffPeriod(),
        moduleContract.totalPeriod(),
        moduleContract.releaseFrequency(),
        moduleContract.enabled()
      ]);

      onChainConfig = {
        cliffPeriod: Number(cliffPeriod),
        totalPeriod: Number(totalPeriod),
        releaseFrequency: Number(releaseFrequency),
        enabled
      };

      console.log(`📊 On-chain vesting configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Vesting Module Enabled',
        description: 'Verify vesting module is enabled on-chain',
        status: enabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: enabled,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Vesting Periods Configured',
        description: 'Verify vesting periods are set correctly',
        status: onChainConfig.totalPeriod > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: '> 0 seconds',
        actual: `Cliff: ${(onChainConfig.cliffPeriod / 86400).toFixed(1)} days, Total: ${(onChainConfig.totalPeriod / 86400).toFixed(1)} days, Release: ${(onChainConfig.releaseFrequency / 86400).toFixed(1)} days`,
        timestamp: Date.now()
      });

      // Validate logical consistency
      if (onChainConfig.cliffPeriod > onChainConfig.totalPeriod) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Vesting Logic Error',
          description: 'Cliff period exceeds total vesting period',
          status: VerificationStatus.FAILED,
          error: 'Cliff period must be less than or equal to total period',
          timestamp: Date.now()
        });
      }

      if (onChainConfig.releaseFrequency > onChainConfig.totalPeriod) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Vesting Logic Warning',
          description: 'Release frequency exceeds total period',
          status: VerificationStatus.WARNING,
          error: 'Release frequency should be smaller than total period for gradual vesting',
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
      // Check cliff period
      if (dbConfig.cliffPeriod !== undefined) {
        const matches = onChainConfig.cliffPeriod === dbConfig.cliffPeriod;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Cliff Period (DB vs On-Chain)',
          description: 'Verify on-chain cliff period matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.cliffPeriod} seconds (from database)`,
          actual: `${onChainConfig.cliffPeriod} seconds (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check total period
      if (dbConfig.totalPeriod !== undefined) {
        const matches = onChainConfig.totalPeriod === dbConfig.totalPeriod;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Total Period (DB vs On-Chain)',
          description: 'Verify on-chain total period matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.totalPeriod} seconds (from database)`,
          actual: `${onChainConfig.totalPeriod} seconds (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check release frequency
      if (dbConfig.releaseFrequency !== undefined) {
        // Convert string frequency to seconds for comparison (if needed)
        let expectedFrequency = dbConfig.releaseFrequency;
        if (typeof expectedFrequency === 'string') {
          // Convert 'monthly', 'weekly', etc. to seconds
          const frequencyMap: Record<string, number> = {
            'daily': 86400,
            'weekly': 604800,
            'monthly': 2592000,
            'quarterly': 7776000,
            'yearly': 31536000
          };
          expectedFrequency = frequencyMap[expectedFrequency.toLowerCase()] || Number(expectedFrequency);
        }
        
        const matches = onChainConfig.releaseFrequency === expectedFrequency;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Release Frequency (DB vs On-Chain)',
          description: 'Verify on-chain release frequency matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${expectedFrequency} seconds (from database)`,
          actual: `${onChainConfig.releaseFrequency} seconds (on-chain)`,
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
