/**
 * Enhanced ERC4626 Router Module Verifier
 * 
 * Verifies vault router configuration (registered vaults, multi-hop, max hops)
 * Database-First: token_erc4626_properties.router_config is authoritative
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

// ERC4626 Router Module ABI (extracted from Router contract)
const ERC4626_ROUTER_ABI = [
  'function getRegisteredVaults() view returns (address[])',
  'function isVaultRegistered(address vault) view returns (bool)',
  'function getMaxHops() view returns (uint256)',
  'function isMultiHopAllowed() view returns (bool)',
  'function VAULT_MANAGER_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)'
];

export class EnhancedRouterModuleVerifier implements IModuleVerifier {
  moduleType = 'router';

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
        name: 'Router Module Deployed',
        description: 'Verifies that the router module contract is deployed on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Router Module Deployed',
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
    
    // Router module is a utility contract that doesn't link back to a specific vault
    // It registers vaults instead, which we verify in configuration
    checks.push({
      type: VerificationType.MODULE_LINKAGE,
      name: 'Router Linkage',
      description: 'Router is a utility contract that registers vaults rather than linking to a single vault',
      status: VerificationStatus.SUCCESS,
      actual: 'Router is a utility contract - vault registration verified in configuration',
      timestamp: Date.now()
    });

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
      ERC4626_ROUTER_ABI,
      provider
    );

    // STEP 1: Query Database
    let dbConfig: any = null;
    
    try {
      const { data: erc4626Props, error } = await supabase
        .from('token_erc4626_properties')
        .select('router_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query: ${error.message}`);
      } else if (erc4626Props?.router_config) {
        dbConfig = erc4626Props.router_config;
        console.log(`✅ Loaded router config:`, dbConfig);
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'Router configuration not found in database',
          status: VerificationStatus.WARNING,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to retrieve router configuration from database',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 2: Get On-Chain Configuration
    let onChainConfig: any = null;

    try {
      const registeredVaults = await moduleContract.getRegisteredVaults();
      const maxHops = await moduleContract.getMaxHops();
      const multiHopAllowed = await moduleContract.isMultiHopAllowed();

      onChainConfig = {
        registeredVaults: registeredVaults.map((v: string) => v.toLowerCase()),
        maxHops: Number(maxHops),
        multiHopAllowed
      };

      console.log(`📊 On-chain router config:`, onChainConfig);

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Multi-Hop Setting',
        description: 'Current multi-hop routing status',
        status: VerificationStatus.SUCCESS,
        actual: multiHopAllowed ? 'Enabled' : 'Disabled',
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Max Hops',
        description: 'Maximum number of hops allowed in routing',
        status: VerificationStatus.SUCCESS,
        actual: maxHops === BigInt(0) ? 'Unlimited' : `${maxHops} hops`,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Registered Vaults',
        description: 'Number of vaults registered with the router',
        status: registeredVaults.length > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        actual: `${registeredVaults.length} vault(s) registered`,
        timestamp: Date.now()
      });

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to retrieve on-chain router configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 3: Compare
    if (dbConfig && onChainConfig) {
      // Verify multi-hop setting
      if (dbConfig.allowMultiHop !== undefined) {
        const matches = onChainConfig.multiHopAllowed === dbConfig.allowMultiHop;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Multi-Hop Setting (DB vs On-Chain)',
          description: 'Verifies multi-hop setting matches database configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.allowMultiHop ? 'Enabled' : 'Disabled',
          actual: onChainConfig.multiHopAllowed ? 'Enabled' : 'Disabled',
          timestamp: Date.now()
        });
      }

      // Verify max hops
      if (dbConfig.maxHops !== undefined) {
        const matches = onChainConfig.maxHops === dbConfig.maxHops;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Hops (DB vs On-Chain)',
          description: 'Verifies max hops setting matches database configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.maxHops === 0 ? 'Unlimited' : `${dbConfig.maxHops} hops`,
          actual: onChainConfig.maxHops === 0 ? 'Unlimited' : `${onChainConfig.maxHops} hops`,
          timestamp: Date.now()
        });
      }

      // Verify registered vaults
      if (dbConfig.registeredVaults && Array.isArray(dbConfig.registeredVaults)) {
        const dbVaults = dbConfig.registeredVaults.map((v: string) => v.toLowerCase());
        const onChainVaults = onChainConfig.registeredVaults;
        
        // Check if all DB vaults are registered on-chain
        const missingVaults = dbVaults.filter((v: string) => !onChainVaults.includes(v));
        const extraVaults = onChainVaults.filter((v: string) => !dbVaults.includes(v));
        
        if (missingVaults.length === 0 && extraVaults.length === 0) {
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Registered Vaults (DB vs On-Chain)',
            description: 'Verifies all vaults match between database and on-chain registry',
            status: VerificationStatus.SUCCESS,
            expected: `${dbVaults.length} vaults`,
            actual: `${onChainVaults.length} vaults - all match`,
            timestamp: Date.now()
          });
        } else {
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Registered Vaults (DB vs On-Chain)',
            description: 'Vault registration mismatch detected between database and on-chain',
            status: VerificationStatus.FAILED,
            expected: `${dbVaults.length} vaults`,
            actual: `${onChainVaults.length} vaults - ${missingVaults.length} missing, ${extraVaults.length} extra`,
            timestamp: Date.now()
          });

          if (missingVaults.length > 0) {
            checks.push({
              type: VerificationType.MODULE_CONFIGURATION,
              name: 'Missing Vaults On-Chain',
              description: 'Vaults defined in database but not registered on-chain',
              status: VerificationStatus.FAILED,
              error: `Vaults in DB but not registered: ${missingVaults.join(', ')}`,
              timestamp: Date.now()
            });
          }

          if (extraVaults.length > 0) {
            checks.push({
              type: VerificationType.MODULE_CONFIGURATION,
              name: 'Extra Vaults On-Chain',
              description: 'Vaults registered on-chain but not in database',
              status: VerificationStatus.WARNING,
              actual: `Vaults registered but not in DB: ${extraVaults.join(', ')}`,
              timestamp: Date.now()
            });
          }
        }
      }

      const hasAnyDrift = checks.some(c => 
        c.name.includes('(DB vs On-Chain)') && c.status === VerificationStatus.FAILED
      );

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: hasAnyDrift ? 'Configuration Drift Detected' : 'Configuration Consistency',
        description: hasAnyDrift ? 'Router configuration is out of sync with database' : 'Router configuration matches database',
        status: hasAnyDrift ? VerificationStatus.FAILED : VerificationStatus.SUCCESS,
        error: hasAnyDrift ? 'Router configuration is out of sync' : undefined,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
