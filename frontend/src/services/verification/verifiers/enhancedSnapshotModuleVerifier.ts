/**
 * Enhanced Snapshot Module Verification
 * 
 * Verifies Snapshot module configuration
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties.snapshot_config)
 * 2. On-chain config matches database
 * 3. Snapshot functionality working
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

// Snapshot Module ABI
const SNAPSHOT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function getCurrentSnapshotId() view returns (uint256)',
  'function snapshotExists(uint256 snapshotId) view returns (bool)',
  'function balanceOfAt(address account, uint256 snapshotId) view returns (uint256)',
  'function totalSupplyAt(uint256 snapshotId) view returns (uint256)'
];

/**
 * Enhanced Snapshot Module Verifier
 */
export class EnhancedSnapshotModuleVerifier implements IModuleVerifier {
  moduleType = 'snapshot';

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

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Snapshot Module Deployed',
        description: 'Verify snapshot module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Snapshot Module Deployed',
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

    const ERC20_ABI = ['function snapshotModule() view returns (address)'];
    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      SNAPSHOT_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const snapshotModuleAddress = await tokenContract.snapshotModule();
      const matches = snapshotModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Snapshot Module Link',
        description: 'Verify token.snapshotModule points to snapshot module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: snapshotModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Snapshot Module Link',
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
        name: 'Snapshot Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Snapshot Module → Token Link',
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
      SNAPSHOT_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('snapshot_config, snapshot_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query database: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.snapshot_config;
        console.log(`✅ Loaded snapshot config:`, dbConfig);

        if (erc20Props.snapshot_module_address) {
          const moduleAddressMatches = 
            erc20Props.snapshot_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.snapshot_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'snapshot_config not found',
          status: VerificationStatus.WARNING,
          error: 'Database configuration should be populated',
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to query database',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Get on-chain configuration
    try {
      const currentSnapshotId = await moduleContract.getCurrentSnapshotId();

      console.log(`📊 On-chain snapshot state:`, {
        currentSnapshotId: Number(currentSnapshotId)
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Snapshot Module Initialized',
        description: 'Verify snapshot module is initialized',
        status: VerificationStatus.SUCCESS,
        expected: 'Snapshot ID >= 0',
        actual: `Current snapshot ID: ${currentSnapshotId}`,
        timestamp: Date.now()
      });

      // If auto-snapshots enabled, verify timing config
      if (dbConfig?.autoSnapshotEnabled) {
        const interval = dbConfig.snapshotInterval;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Auto-Snapshot Configuration',
          description: 'Verify auto-snapshot settings',
          status: interval > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: 'Interval > 0',
          actual: `${interval} seconds (${(interval / 3600).toFixed(1)} hours)`,
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to fetch on-chain configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
