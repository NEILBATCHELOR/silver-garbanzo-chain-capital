/**
 * Enhanced Permit Module Verification
 * 
 * Verifies ERC-2612 Permit module configuration
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties.permit_config)
 * 2. On-chain config matches database
 * 3. EIP-712 domain properly configured
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

// Permit Module ABI (ERC-2612)
const PERMIT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)',
  'function version() view returns (string)',
  'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)'
];

/**
 * Enhanced Permit Module Verifier
 * 
 * Verifies permit module configuration against:
 * - token_erc20_properties.permit_config (authoritative source)
 * - token_modules.configuration (deployment record)
 */
export class EnhancedPermitModuleVerifier implements IModuleVerifier {
  moduleType = 'permit';

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
        name: 'Permit Module Deployed',
        description: 'Verify permit module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) {
        return checks;
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Permit Module Deployed',
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

    const ERC20_ABI = ['function permitModule() view returns (address)'];
    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      PERMIT_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const permitModuleAddress = await tokenContract.permitModule();
      const matches = permitModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Permit Module Link',
        description: 'Verify token.permitModule points to permit module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: permitModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Permit Module Link',
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
        name: 'Permit Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Permit Module → Token Link',
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
      PERMIT_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('permit_config, permit_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc20_properties: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.permit_config;
        console.log(`✅ Loaded permit config from database:`, dbConfig);

        if (erc20Props.permit_module_address) {
          const moduleAddressMatches = 
            erc20Props.permit_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches deployment',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.permit_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'permit_config not found in database',
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
      const [domainSeparator, name, version, eip712Data] = await Promise.all([
        moduleContract.DOMAIN_SEPARATOR(),
        moduleContract.name(),
        moduleContract.version(),
        moduleContract.eip712Domain()
      ]);

      console.log(`📊 On-chain permit configuration:`, {
        name,
        version,
        domainSeparator,
        chainId: eip712Data[3]
      });

      // Verify EIP-712 domain configured
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'EIP-712 Domain Configured',
        description: 'Verify EIP-712 domain separator exists',
        status: domainSeparator !== ethers.ZeroHash ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Valid domain separator',
        actual: domainSeparator,
        timestamp: Date.now()
      });

      // Verify name matches database if available
      if (dbConfig?.name) {
        const nameMatches = name === dbConfig.name;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Permit Name Match',
          description: 'Verify on-chain name matches database',
          status: nameMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: dbConfig.name,
          actual: name,
          timestamp: Date.now()
        });
      }

      // Verify version matches database if available
      if (dbConfig?.version) {
        const versionMatches = version === dbConfig.version;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Permit Version Match',
          description: 'Verify on-chain version matches database',
          status: versionMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: dbConfig.version,
          actual: version,
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
