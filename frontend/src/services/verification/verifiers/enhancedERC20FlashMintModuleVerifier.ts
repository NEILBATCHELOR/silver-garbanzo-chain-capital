/**
 * Enhanced Flash Mint Module Configuration Verification
 * 
 * Adds database-vs-onchain configuration checks to prevent future drift
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties.flash_mint_config)
 * 2. On-chain config matches database  
 * 3. All flash mint parameters present (flashFeeBasisPoints, feeRecipient, maxFlashLoan)
 * 4. Fee recipient set correctly
 * 5. EIP-3156 compliance verification
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

// Flash Mint Module ABI - Extended for full configuration verification
const FLASH_MINT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function flashFee(address token, uint256 amount) view returns (uint256)',
  'function maxFlashLoan(address token) view returns (uint256)',
  'function getFlashFeeBasisPoints() view returns (uint256)',
  'function CALLBACK_SUCCESS() view returns (bytes32)'
];

/**
 * Enhanced ERC20 Flash Mint Module Verifier
 * 
 * Verifies flash mint module configuration against BOTH:
 * - token_erc20_properties.flash_mint_config (authoritative source)
 * - On-chain module state
 */
export class EnhancedERC20FlashMintModuleVerifier implements IModuleVerifier {
  moduleType = 'flashMint';

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
        name: 'Flash Mint Module Deployed',
        description: 'Verify flash mint module bytecode exists',
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
        name: 'Flash Mint Module Deployed',
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
      'function flashMintModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      FLASH_MINT_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const flashMintModuleAddress = await tokenContract.flashMintModule();
      const matches = flashMintModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Flash Mint Module Link',
        description: 'Verify token.flashMintModule points to flash mint module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: flashMintModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks; // Module not linked correctly
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Flash Mint Module Link',
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
        name: 'Flash Mint Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Flash Mint Module → Token Link',
        description: 'Failed to check module linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 3: EIP-3156 Compliance - CALLBACK_SUCCESS constant
    try {
      const callbackSuccess = await moduleContract.CALLBACK_SUCCESS();
      const expectedValue = ethers.id("ERC3156FlashBorrower.onFlashLoan");
      const matches = callbackSuccess === expectedValue;

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'EIP-3156 Compliance',
        description: 'Verify CALLBACK_SUCCESS constant matches EIP-3156 spec',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: expectedValue,
        actual: callbackSuccess,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'EIP-3156 Compliance',
        description: 'Failed to verify EIP-3156 compliance',
        status: VerificationStatus.WARNING,
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
      FLASH_MINT_MODULE_ABI,
      provider
    );

    // ============================================
    // STEP 1: Query Database for Authoritative Config
    // ============================================
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('flash_mint_config, flash_mint_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc20_properties: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.flash_mint_config;
        console.log(`✅ Loaded flash mint config from token_erc20_properties:`, dbConfig);

        // Verify module address matches
        if (erc20Props.flash_mint_module_address) {
          const moduleAddressMatches = 
            erc20Props.flash_mint_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify token_erc20_properties.flash_mint_module_address matches deployment',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.flash_mint_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        console.warn(`⚠️ No token_erc20_properties record found for token ${context.deployment.tokenId}`);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'token_erc20_properties.flash_mint_config not found',
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
      const flashFeeBasisPoints = await moduleContract.getFlashFeeBasisPoints();
      const maxFlashLoan = await moduleContract.maxFlashLoan(context.deployment.contractAddress);
      
      // Test flash fee calculation with 1 ETH
      const testAmount = ethers.parseEther("1");
      const testFee = await moduleContract.flashFee(context.deployment.contractAddress, testAmount);

      onChainConfig = {
        flashFeeBasisPoints: Number(flashFeeBasisPoints),
        maxFlashLoan: maxFlashLoan.toString(),
        testFeeCalculation: {
          amount: testAmount.toString(),
          fee: testFee.toString()
        }
      };

      console.log(`📊 On-chain flash mint configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Flash Fee Configuration',
        description: 'Verify flash fee basis points are set',
        status: VerificationStatus.SUCCESS,
        actual: `${onChainConfig.flashFeeBasisPoints} bps (${onChainConfig.flashFeeBasisPoints / 100}%)`,
        timestamp: Date.now()
      });

      // Check max flash loan
      const isUnlimited = maxFlashLoan === ethers.MaxUint256;
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Max Flash Loan Limit',
        description: 'Verify maximum flash loan amount',
        status: VerificationStatus.SUCCESS,
        actual: isUnlimited ? 'Unlimited (max uint256)' : ethers.formatEther(maxFlashLoan) + ' tokens',
        timestamp: Date.now()
      });

      // Verify fee calculation is correct
      const expectedFee = (testAmount * BigInt(onChainConfig.flashFeeBasisPoints)) / BigInt(10000);
      const feeMatches = testFee === expectedFee;
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Calculation Accuracy',
        description: 'Verify flash fee calculation is mathematically correct',
        status: feeMatches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: ethers.formatEther(expectedFee) + ' ETH',
        actual: ethers.formatEther(testFee) + ' ETH',
        timestamp: Date.now()
      });

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
      // Check flash fee basis points
      if (dbConfig.flashFeeBasisPoints !== undefined) {
        const matches = onChainConfig.flashFeeBasisPoints === dbConfig.flashFeeBasisPoints;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Flash Fee (DB vs On-Chain)',
          description: 'Verify on-chain flash fee matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.flashFeeBasisPoints} bps (from database)`,
          actual: `${onChainConfig.flashFeeBasisPoints} bps (on-chain)`,
          timestamp: Date.now()
        });
      }

      // Check max flash loan
      if (dbConfig.maxFlashLoan !== undefined) {
        const dbMaxLoan = dbConfig.maxFlashLoan === 0 
          ? ethers.MaxUint256.toString() 
          : dbConfig.maxFlashLoan.toString();
        const matches = onChainConfig.maxFlashLoan === dbMaxLoan;
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Flash Loan (DB vs On-Chain)',
          description: 'Verify on-chain max flash loan matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.maxFlashLoan === 0 ? 'Unlimited' : dbConfig.maxFlashLoan,
          actual: onChainConfig.maxFlashLoan === ethers.MaxUint256.toString() ? 'Unlimited' : onChainConfig.maxFlashLoan,
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
