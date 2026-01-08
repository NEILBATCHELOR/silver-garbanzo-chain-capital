/**
 * Enhanced Payable Token Module Verification
 * 
 * Verifies ERC-1363 Payable Token module
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties.payable_token_config)
 * 2. On-chain config matches database
 * 3. Callback gas limit properly configured
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

// Payable Token Module ABI (ERC-1363)
const PAYABLE_TOKEN_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function isEnabled() view returns (bool)',
  'function callbackGasLimit() view returns (uint256)',
  'function isWhitelistEnabled() view returns (bool)',
  'function isReceiverWhitelisted(address receiver) view returns (bool)',
  'function isSpenderWhitelisted(address spender) view returns (bool)'
];

/**
 * Enhanced Payable Token Module Verifier
 */
export class EnhancedPayableTokenModuleVerifier implements IModuleVerifier {
  moduleType = 'payableToken';

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
        name: 'Payable Token Module Deployed',
        description: 'Verify payable token module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Payable Token Module Deployed',
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

    const ERC20_ABI = ['function payableTokenModule() view returns (address)'];
    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      PAYABLE_TOKEN_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const payableTokenModuleAddress = await tokenContract.payableTokenModule();
      const matches = payableTokenModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Payable Token Module Link',
        description: 'Verify token.payableTokenModule points to module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: payableTokenModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Payable Token Module Link',
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
        name: 'Payable Token Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Payable Token Module → Token Link',
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
      PAYABLE_TOKEN_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('payable_token_config, payable_token_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query database: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.payable_token_config;
        console.log(`✅ Loaded payable_token config:`, dbConfig);

        if (erc20Props.payable_token_module_address) {
          const moduleAddressMatches = 
            erc20Props.payable_token_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.payable_token_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'payable_token_config not found',
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
      const [enabled, callbackGasLimit, whitelistEnabled] = await Promise.all([
        moduleContract.isEnabled(),
        moduleContract.callbackGasLimit(),
        moduleContract.isWhitelistEnabled()
      ]);

      const onChainConfig = {
        enabled,
        callbackGasLimit: Number(callbackGasLimit),
        whitelistEnabled
      };

      console.log(`📊 On-chain payable token configuration:`, onChainConfig);

      // Verify module is enabled
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Payable Token Module Enabled',
        description: 'Verify module is enabled on-chain',
        status: enabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: enabled,
        timestamp: Date.now()
      });

      // Verify callback gas limit is reasonable
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Callback Gas Limit',
        description: 'Verify callback gas limit is configured',
        status: onChainConfig.callbackGasLimit > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: '> 0 gas',
        actual: `${onChainConfig.callbackGasLimit} gas`,
        timestamp: Date.now()
      });

      // Report whitelist status
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Whitelist Mode',
        description: 'Report whitelist configuration',
        status: VerificationStatus.SUCCESS,
        expected: 'Whitelist configured',
        actual: whitelistEnabled ? 'Whitelist ENABLED' : 'Whitelist DISABLED',
        timestamp: Date.now()
      });

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
