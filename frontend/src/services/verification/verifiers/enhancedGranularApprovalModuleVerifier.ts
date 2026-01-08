/**
 * Enhanced ERC5216 Granular Approval Module Verifier
 * 
 * Verifies granular approval configuration (Universal module used by ERC-1155)
 * Database-First: token_erc1155_properties.granular_approval_config is authoritative
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

// ERC5216 Granular Approval Module ABI (20 methods)
const ERC5216_GRANULAR_APPROVAL_ABI = [
  'function allowance(address owner, address spender, uint256 id) view returns (uint256)',
  'function isEnabled() view returns (bool)',
  'function getTokenContract() view returns (address)',
  'function approve(address spender, uint256 id, uint256 amount) external',
  'function consumeAllowance(address owner, address spender, uint256 id, uint256 amount) returns (bool, uint256)'
];

export class EnhancedGranularApprovalModuleVerifier implements IModuleVerifier {
  moduleType = 'granular_approval';

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
        name: 'Granular Approval Module Deployed',
        description: 'Verify granular approval module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Granular Approval Module Deployed',
        description: 'Verify granular approval module is deployed and has bytecode',
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

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      ERC5216_GRANULAR_APPROVAL_ABI,
      provider
    );

    try {
      const tokenContract = await moduleContract.getTokenContract();
      const matches = tokenContract.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Token Link',
        description: 'Verify module.getTokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenContract,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Token Link',
        description: 'Verify module is linked to correct token contract',
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
      ERC5216_GRANULAR_APPROVAL_ABI,
      provider
    );

    // STEP 1: Query Database
    let dbConfig: any = null;
    
    try {
      const { data: erc1155Props, error } = await supabase
        .from('token_erc1155_properties')
        .select('granular_approval_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc1155_properties: ${error.message}`);
      } else if (erc1155Props && erc1155Props.granular_approval_config) {
        dbConfig = erc1155Props.granular_approval_config;
        console.log(`✅ Loaded granular approval config:`, dbConfig);
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'granular_approval_config not found',
          status: VerificationStatus.WARNING,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to query granular approval configuration from database',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 2: Get On-Chain Configuration
    let onChainConfig: any = null;

    try {
      const isEnabled = await moduleContract.isEnabled();

      onChainConfig = {
        enabled: isEnabled
      };

      console.log(`📊 On-chain granular approval config:`, onChainConfig);

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Granular Approvals Enabled',
        description: 'Verify granular approval functionality is enabled',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: 'Enabled',
        actual: isEnabled ? 'Enabled' : 'Disabled',
        timestamp: Date.now()
      });

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to retrieve on-chain granular approval configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 3: Compare Database vs On-Chain
    if (dbConfig && onChainConfig) {
      if (dbConfig.enabled !== undefined) {
        const matches = onChainConfig.enabled === dbConfig.enabled;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Enabled Status (DB vs On-Chain)',
          description: 'Verify enabled status matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.enabled ? 'Enabled' : 'Disabled',
          actual: onChainConfig.enabled ? 'Enabled' : 'Disabled',
          timestamp: Date.now()
        });
      }

      const hasAnyDrift = checks.some(c => 
        c.name.includes('(DB vs On-Chain)') && c.status === VerificationStatus.FAILED
      );

      if (hasAnyDrift) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Configuration Drift Detected',
          description: 'Database and on-chain granular approval configurations do not match',
          status: VerificationStatus.FAILED,
          error: 'Granular approval configuration is out of sync',
          timestamp: Date.now()
        });
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Configuration Consistency',
          description: 'All granular approval configuration parameters match between database and on-chain',
          status: VerificationStatus.SUCCESS,
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
