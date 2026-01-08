/**
 * Enhanced ERC4906 Metadata Events Module Verifier
 * 
 * Verifies metadata update event configuration (batch updates, emit on transfer)
 * Database-First: token_erc721_properties.metadata_events_config is authoritative
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

// ERC4906 Metadata Events Module ABI
const METADATA_EVENTS_ABI = [
  'function tokenContract() view returns (address)',
  'function batchUpdatesEnabled() view returns (bool)',
  'function emitOnTransfer() view returns (bool)',
  'function updatesEnabled() view returns (bool)',
  'function getConfiguration() view returns (bool batchUpdates, bool onTransfer)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function METADATA_UPDATER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)'
];

export class EnhancedMetadataEventsModuleVerifier implements IModuleVerifier {
  moduleType = 'metadata_events';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) throw new Error('Provider not available');

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Metadata Events Module Deployed',
        description: 'Verifies that the ERC4906 metadata events module contract is deployed on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Metadata Events Module Deployed',
        description: 'Contract deployment verification failed',
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

    if (!provider) throw new Error('Provider not available');

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      METADATA_EVENTS_ABI,
      provider
    );

    // Check module → token linkage
    try {
      const linkedToken = await moduleContract.tokenContract();
      const expectedToken = context.deployment.contractAddress.toLowerCase();
      const actualToken = linkedToken.toLowerCase();
      const isLinked = actualToken === expectedToken;

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Token Link',
        description: 'Verifies metadata events module points to correct token contract',
        status: isLinked ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: expectedToken,
        actual: actualToken,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Token Link',
        description: 'Failed to verify module linkage',
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

    if (!provider) throw new Error('Provider not available');

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      METADATA_EVENTS_ABI,
      provider
    );

    // STEP 1: Query Database (Authoritative Source)
    let dbConfig: any = null;
    
    try {
      const { data: erc721Props, error } = await supabase
        .from('token_erc721_properties')
        .select('metadata_events_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query metadata_events_config: ${error.message}`);
      } else if (erc721Props?.metadata_events_config) {
        dbConfig = erc721Props.metadata_events_config;
        console.log(`✅ Loaded metadata events config from DB:`, dbConfig);
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'Metadata events configuration not found in database',
          status: VerificationStatus.WARNING,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to retrieve metadata events configuration from database',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 2: Query On-Chain Configuration
    let onChainConfig: any = null;

    try {
      const batchUpdatesEnabled = await moduleContract.batchUpdatesEnabled();
      const emitOnTransfer = await moduleContract.emitOnTransfer();
      const updatesEnabled = await moduleContract.updatesEnabled();

      onChainConfig = {
        batchUpdatesEnabled,
        emitOnTransfer,
        updatesEnabled
      };

      console.log(`📊 On-chain metadata events config:`, onChainConfig);

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Batch Updates Status',
        description: 'Current batch metadata update setting',
        status: VerificationStatus.SUCCESS,
        actual: batchUpdatesEnabled ? 'Enabled' : 'Disabled',
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Emit on Transfer',
        description: 'Metadata events emitted on token transfers',
        status: VerificationStatus.SUCCESS,
        actual: emitOnTransfer ? 'Enabled' : 'Disabled',
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Updates Enabled',
        description: 'Global metadata updates setting',
        status: VerificationStatus.SUCCESS,
        actual: updatesEnabled ? 'Enabled' : 'Disabled',
        timestamp: Date.now()
      });

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to retrieve on-chain metadata events configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 3: Compare Database vs On-Chain (Database is authoritative)
    if (dbConfig && onChainConfig) {
      // Verify batch updates setting
      if (dbConfig.batchUpdatesEnabled !== undefined) {
        const matches = onChainConfig.batchUpdatesEnabled === dbConfig.batchUpdatesEnabled;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Batch Updates (DB vs On-Chain)',
          description: 'Verifies batch updates setting matches database configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.batchUpdatesEnabled ? 'Enabled' : 'Disabled',
          actual: onChainConfig.batchUpdatesEnabled ? 'Enabled' : 'Disabled',
          timestamp: Date.now()
        });
      }

      // Verify emit on transfer setting
      if (dbConfig.emitOnTransfer !== undefined) {
        const matches = onChainConfig.emitOnTransfer === dbConfig.emitOnTransfer;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Emit on Transfer (DB vs On-Chain)',
          description: 'Verifies emit-on-transfer setting matches database configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.emitOnTransfer ? 'Enabled' : 'Disabled',
          actual: onChainConfig.emitOnTransfer ? 'Enabled' : 'Disabled',
          timestamp: Date.now()
        });
      }

      // Verify updates enabled setting
      if (dbConfig.updatesEnabled !== undefined) {
        const matches = onChainConfig.updatesEnabled === dbConfig.updatesEnabled;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Updates Enabled (DB vs On-Chain)',
          description: 'Verifies global updates setting matches database configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.updatesEnabled ? 'Enabled' : 'Disabled',
          actual: onChainConfig.updatesEnabled ? 'Enabled' : 'Disabled',
          timestamp: Date.now()
        });
      }

      // Final drift detection summary
      const hasAnyDrift = checks.some(c => 
        c.name.includes('(DB vs On-Chain)') && c.status === VerificationStatus.FAILED
      );

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: hasAnyDrift ? '⚠️ Configuration Drift Detected' : '✅ Configuration Consistency',
        description: hasAnyDrift 
          ? 'Metadata events configuration is out of sync with database - deployment may have used form data instead of database values'
          : 'Metadata events configuration perfectly matches database - database-first deployment succeeded',
        status: hasAnyDrift ? VerificationStatus.FAILED : VerificationStatus.SUCCESS,
        error: hasAnyDrift ? 'Configuration drift indicates database-first pattern was not followed' : undefined,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
