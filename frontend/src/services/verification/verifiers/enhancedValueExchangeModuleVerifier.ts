/**
 * Enhanced ERC3525 Value Exchange Module Verifier
 * 
 * Verifies value exchange configuration
 * Database-First: token_erc3525_properties.value_exchange_config is authoritative
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

// ERC3525 Value Exchange Module ABI (33 methods)
const ERC3525_VALUE_EXCHANGE_ABI = [
  'function tokenContract() view returns (address)',
  'function getExchangeRate(uint256 fromSlot, uint256 toSlot) view returns (uint256)',
  'function isExchangeEnabled(uint256 fromSlot, uint256 toSlot) view returns (bool)',
  'function calculateExchangeAmount(uint256 fromSlot, uint256 toSlot, uint256 value) view returns (uint256)',
  'function getExchangeLimits() view returns (uint256, uint256)',
  'function getPoolInfo(uint256 poolId) view returns (uint256, uint256, uint256, bool)',
  'function getPoolLiquidity(uint256 poolId) view returns (uint256)'
];

export class EnhancedValueExchangeModuleVerifier implements IModuleVerifier {
  moduleType = 'value_exchange';

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
        name: 'Value Exchange Module Deployed',
        description: 'Verify value exchange module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Value Exchange Module Deployed',
        description: 'Failed to verify module deployment',
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
      ERC3525_VALUE_EXCHANGE_ABI,
      provider
    );

    try {
      const tokenContract = await moduleContract.tokenContract();
      const matches = tokenContract.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenContract,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Token Link',
        description: 'Failed to verify module-token linkage',
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
      ERC3525_VALUE_EXCHANGE_ABI,
      provider
    );

    // STEP 1: Query Database
    let dbConfig: any = null;
    
    try {
      const { data: erc3525Props, error } = await supabase
        .from('token_erc3525_properties')
        .select('value_exchange_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc3525_properties: ${error.message}`);
      } else if (erc3525Props && erc3525Props.value_exchange_config) {
        dbConfig = erc3525Props.value_exchange_config;
        console.log(`✅ Loaded value exchange config:`, dbConfig);
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'value_exchange_config not found',
          status: VerificationStatus.WARNING,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to retrieve configuration from database',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 2: Get On-Chain Configuration
    let onChainConfig: any = null;

    try {
      const [minExchange, maxExchange] = await moduleContract.getExchangeLimits();

      onChainConfig = {
        minExchangeAmount: minExchange.toString(),
        maxExchangeAmount: maxExchange.toString()
      };

      console.log(`📊 On-chain value exchange config:`, onChainConfig);

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Exchange Limits Set',
        description: 'Verify exchange limits are configured',
        status: VerificationStatus.SUCCESS,
        actual: `Min: ${minExchange.toString()}, Max: ${maxExchange.toString()}`,
        timestamp: Date.now()
      });

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to read on-chain exchange limits',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 3: Compare Database vs On-Chain
    if (dbConfig && onChainConfig) {
      if (dbConfig.minExchangeAmount) {
        const matches = onChainConfig.minExchangeAmount === dbConfig.minExchangeAmount.toString();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Min Exchange Amount (DB vs On-Chain)',
          description: 'Verify minimum exchange amount matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.minExchangeAmount,
          actual: onChainConfig.minExchangeAmount,
          timestamp: Date.now()
        });
      }

      if (dbConfig.maxExchangeAmount) {
        const matches = onChainConfig.maxExchangeAmount === dbConfig.maxExchangeAmount.toString();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Exchange Amount (DB vs On-Chain)',
          description: 'Verify maximum exchange amount matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.maxExchangeAmount,
          actual: onChainConfig.maxExchangeAmount,
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
          description: 'Database and on-chain exchange limits mismatch',
          status: VerificationStatus.FAILED,
          error: 'Value exchange configuration is out of sync',
          timestamp: Date.now()
        });
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Configuration Consistency',
          description: 'All exchange limits match database',
          status: VerificationStatus.SUCCESS,
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
