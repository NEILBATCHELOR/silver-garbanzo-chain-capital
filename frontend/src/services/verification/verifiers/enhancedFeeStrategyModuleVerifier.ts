/**
 * Enhanced ERC4626 Fee Strategy Module Verifier
 * 
 * Verifies vault fee configuration (management, performance, withdrawal fees)
 * Database-First: token_erc4626_properties.fee_strategy_config is authoritative
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

// ERC4626 Fee Strategy Module ABI (25 methods)
const ERC4626_FEE_STRATEGY_ABI = [
  'function vault() view returns (address)',
  'function getFeeConfig() view returns (uint256, uint256, uint256, address)',
  'function calculateManagementFee() view returns (uint256)',
  'function calculatePerformanceFee() view returns (uint256)',
  'function calculateWithdrawalFee(uint256 withdrawAmount) view returns (uint256)',
  'function getHighWaterMark() view returns (uint256)',
  'function getPendingFees() view returns (uint256)'
];

export class EnhancedFeeStrategyModuleVerifier implements IModuleVerifier {
  moduleType = 'fee_strategy';

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
        name: 'Fee Strategy Module Deployed',
        description: 'Verify fee strategy module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Fee Strategy Module Deployed',
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

    if (!provider) throw new Error('Provider not available');

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      ERC4626_FEE_STRATEGY_ABI,
      provider
    );

    try {
      const vaultAddress = await moduleContract.vault();
      const matches = vaultAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Vault Link',
        description: 'Verify module.vault() points to vault contract',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: vaultAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Module → Vault Link',
        description: 'Failed to verify vault linkage',
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
      ERC4626_FEE_STRATEGY_ABI,
      provider
    );

    // STEP 1: Query Database
    let dbConfig: any = null;
    
    try {
      const { data: erc4626Props, error } = await supabase
        .from('token_erc4626_properties')
        .select('fee_strategy_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query: ${error.message}`);
      } else if (erc4626Props?.fee_strategy_config) {
        dbConfig = erc4626Props.fee_strategy_config;
        console.log(`✅ Loaded fee strategy config:`, dbConfig);
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'Database query found no fee strategy configuration',
          status: VerificationStatus.WARNING,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to query database for fee strategy config',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 2: Get On-Chain Configuration
    let onChainConfig: any = null;

    try {
      const [managementFeeBps, performanceFeeBps, withdrawalFeeBps, feeRecipient] = 
        await moduleContract.getFeeConfig();

      onChainConfig = {
        managementFeeBps: Number(managementFeeBps),
        performanceFeeBps: Number(performanceFeeBps),
        withdrawalFeeBps: Number(withdrawalFeeBps),
        feeRecipient
      };

      console.log(`📊 On-chain fee strategy:`, onChainConfig);

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Recipient Set',
        description: 'Verify fee recipient is configured',
        status: feeRecipient !== ethers.ZeroAddress ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Non-zero address',
        actual: feeRecipient,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Configuration',
        description: 'Verify all fee parameters are configured on-chain',
        status: VerificationStatus.SUCCESS,
        actual: `Management: ${onChainConfig.managementFeeBps} bps, Performance: ${onChainConfig.performanceFeeBps} bps, Withdrawal: ${onChainConfig.withdrawalFeeBps} bps`,
        timestamp: Date.now()
      });

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to retrieve on-chain fee configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // STEP 3: Compare
    if (dbConfig && onChainConfig) {
      const feeTypes = ['managementFeeBps', 'performanceFeeBps', 'withdrawalFeeBps'];
      
      for (const feeType of feeTypes) {
        if (dbConfig[feeType] !== undefined) {
          const matches = onChainConfig[feeType] === dbConfig[feeType];
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: `${feeType} (DB vs On-Chain)`,
            description: `Compare database and on-chain ${feeType}`,
            status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
            expected: `${dbConfig[feeType]} bps`,
            actual: `${onChainConfig[feeType]} bps`,
            timestamp: Date.now()
          });
        }
      }

      if (dbConfig.feeRecipient) {
        const matches = onChainConfig.feeRecipient.toLowerCase() === dbConfig.feeRecipient.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Fee Recipient (DB vs On-Chain)',
          description: 'Compare database and on-chain fee recipient',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.feeRecipient,
          actual: onChainConfig.feeRecipient,
          timestamp: Date.now()
        });
      }

      const hasAnyDrift = checks.some(c => 
        c.name.includes('(DB vs On-Chain)') && c.status === VerificationStatus.FAILED
      );

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: hasAnyDrift ? 'Configuration Drift Detected' : 'Configuration Consistency',
        description: 'Verify database and on-chain configurations match',
        status: hasAnyDrift ? VerificationStatus.FAILED : VerificationStatus.SUCCESS,
        error: hasAnyDrift ? 'Fee configuration is out of sync' : undefined,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
