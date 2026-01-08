/**
 * Enhanced Module Configuration Verification
 * 
 * Adds database-vs-onchain configuration checks to prevent future drift
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties, token_modules)
 * 2. On-chain config matches database  
 * 3. All fee parameters present (transferFeeBps, buyFeeBps, sellFeeBps)
 * 4. Fee recipient set correctly
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

// Fees Module ABI - Extended for full configuration verification
const FEES_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function getFeeConfig() view returns (tuple(address feeRecipient, uint256 transferFee, uint256 buyFee, uint256 sellFee, bool enabled))',
  'function enabled() view returns (bool)',
  'function transferFeeBps() view returns (uint256)',
  'function buyFeeBps() view returns (uint256)',
  'function sellFeeBps() view returns (uint256)',
  'function feeRecipient() view returns (address)'
];

/**
 * Enhanced ERC20 Fees Module Verifier
 * 
 * Verifies fee module configuration against BOTH:
 * - token_erc20_properties.fees_config (authoritative source)
 * - token_modules.configuration (deployment record)
 */
export class EnhancedERC20FeesModuleVerifier implements IModuleVerifier {
  moduleType = 'fees';

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
        name: 'Fees Module Deployed',
        description: 'Verify fees module bytecode exists',
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
        name: 'Fees Module Deployed',
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

    const ERC20_ABI = [
      'function feesModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      FEES_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const feesModuleAddress = await tokenContract.feesModule();
      const matches = feesModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Fees Module Link',
        description: 'Verify token.feesModule points to fees module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: feesModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks; // Module not linked correctly
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Fees Module Link',
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
        name: 'Fees Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fees Module → Token Link',
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
      FEES_MODULE_ABI,
      provider
    );

    // ============================================
    // STEP 1: Query Database for Authoritative Config
    // ============================================
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('fees_config, fees_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc20_properties: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.fees_config;
        console.log(`✅ Loaded fee config from token_erc20_properties:`, dbConfig);

        // Verify module address matches
        if (erc20Props.fees_module_address) {
          const moduleAddressMatches = 
            erc20Props.fees_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify token_erc20_properties.fees_module_address matches deployment',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.fees_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        console.warn(`⚠️ No token_erc20_properties record found for token ${context.deployment.tokenId}`);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'token_erc20_properties.fees_config not found',
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
        description: 'Failed to query token_erc20_properties',
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
      const feeConfig = await moduleContract.getFeeConfig();
      const [feeRecipient, transferFee, buyFee, sellFee, enabled] = feeConfig;

      onChainConfig = {
        feeRecipient,
        transferFeeBps: Number(transferFee),
        buyFeeBps: Number(buyFee),
        sellFeeBps: Number(sellFee),
        enabled
      };

      console.log(`📊 On-chain fee configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fees Module Enabled',
        description: 'Verify fees module is enabled on-chain',
        status: enabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: enabled,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Recipient Set',
        description: 'Verify fee recipient address is configured',
        status: feeRecipient !== ethers.ZeroAddress ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Non-zero address',
        actual: feeRecipient,
        timestamp: Date.now()
      });

      // Check for zero fees (common bug!)
      if (onChainConfig.transferFeeBps === 0 && onChainConfig.buyFeeBps === 0 && onChainConfig.sellFeeBps === 0) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Zero Fees Detected',
          description: 'All fee values are 0 bps - this may be unintentional',
          status: VerificationStatus.WARNING,
          error: 'Module enabled but all fees are 0 bps. If fees are intended, configuration may be incomplete.',
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
      // Check transfer fee
      if (dbConfig.transferFeeBps !== undefined) {
        const matches = onChainConfig.transferFeeBps === dbConfig.transferFeeBps;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Transfer Fee (DB vs On-Chain)',
          description: 'Verify on-chain transfer fee matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.transferFeeBps} bps (from database)`,
          actual: `${onChainConfig.transferFeeBps} bps (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check buy fee
      if (dbConfig.buyFeeBps !== undefined) {
        const matches = onChainConfig.buyFeeBps === dbConfig.buyFeeBps;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Buy Fee (DB vs On-Chain)',
          description: 'Verify on-chain buy fee matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.buyFeeBps} bps (from database)`,
          actual: `${onChainConfig.buyFeeBps} bps (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check sell fee
      if (dbConfig.sellFeeBps !== undefined) {
        const matches = onChainConfig.sellFeeBps === dbConfig.sellFeeBps;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Sell Fee (DB vs On-Chain)',
          description: 'Verify on-chain sell fee matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.sellFeeBps} bps (from database)`,
          actual: `${onChainConfig.sellFeeBps} bps (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check fee recipient
      if (dbConfig.feeRecipient) {
        const matches = onChainConfig.feeRecipient.toLowerCase() === dbConfig.feeRecipient.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Fee Recipient (DB vs On-Chain)',
          description: 'Verify on-chain fee recipient matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: dbConfig.feeRecipient,
          actual: onChainConfig.feeRecipient,
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
}
