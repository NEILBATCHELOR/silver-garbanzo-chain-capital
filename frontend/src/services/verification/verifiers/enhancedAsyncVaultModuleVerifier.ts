/**
 * Enhanced ERC4626 Async Vault Module Verifier
 * 
 * Verifies async vault configuration (partial fulfillment, request amounts, etc.)
 * Database-First: token_erc4626_properties.async_vault_config is authoritative
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

// ERC4626 Async Vault Module ABI
const ASYNC_VAULT_ABI = [
  'function vault() view returns (address)',
  'function isPartialFulfillmentEnabled() view returns (bool)',
  'function minimumRequestAmount() view returns (uint256)'
];

export class EnhancedAsyncVaultModuleVerifier implements IModuleVerifier {
  moduleType = 'async_vault';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    
    if (!provider) throw new Error('Provider not available');

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      return [{
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Async Vault Module Deployed',
        description: 'Verifies that the async vault module contract is deployed on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        timestamp: Date.now()
      }];
    } catch (error: any) {
      return [{
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Async Vault Module Deployed',
        description: 'Contract deployment verification failed',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      }];
    }
  }

  async verifyLinkage(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
    
    if (!provider) throw new Error('Provider not available');

    try {
      const contract = new ethers.Contract(module.moduleAddress, ASYNC_VAULT_ABI, provider);
      const vaultAddress = await contract.vault();
      const isLinked = vaultAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      return [{
        type: VerificationType.MODULE_LINKAGE,
        name: 'Async Vault Linkage',
        description: 'Verifies async vault module is properly linked to the vault contract',
        status: isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress.toLowerCase(),
        actual: vaultAddress.toLowerCase(),
        timestamp: Date.now()
      }];
    } catch (error: any) {
      return [{
        type: VerificationType.MODULE_LINKAGE,
        name: 'Async Vault Linkage',
        description: 'Failed to verify module linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      }];
    }
  }

  async verifyConfiguration(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) throw new Error('Provider not available');

    const contract = new ethers.Contract(module.moduleAddress, ASYNC_VAULT_ABI, provider);

    // Query database for configuration
    try {
      const { data: erc4626Props, error } = await supabase
        .from('token_erc4626_properties')
        .select('async_vault_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Query Failed',
          description: 'Failed to retrieve async vault configuration from database',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
        return checks;
      }

      // Get on-chain configuration
      const partialFulfillmentEnabled = await contract.isPartialFulfillmentEnabled();

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Partial Fulfillment',
        description: 'Current partial fulfillment status',
        status: VerificationStatus.SUCCESS,
        actual: partialFulfillmentEnabled ? 'Enabled' : 'Disabled',
        timestamp: Date.now()
      });

      // Compare with database if available
      const dbConfig = erc4626Props?.async_vault_config;
      if (dbConfig && dbConfig.partialFulfillmentEnabled !== undefined) {
        const matches = partialFulfillmentEnabled === dbConfig.partialFulfillmentEnabled;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Partial Fulfillment (DB vs On-Chain)',
          description: 'Verifies partial fulfillment setting matches database configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.partialFulfillmentEnabled ? 'Enabled' : 'Disabled',
          actual: partialFulfillmentEnabled ? 'Enabled' : 'Disabled',
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Configuration Verification Failed',
        description: 'Failed to verify async vault configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
