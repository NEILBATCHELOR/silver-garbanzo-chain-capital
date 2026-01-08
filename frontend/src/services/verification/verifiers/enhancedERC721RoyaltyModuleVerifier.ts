/**
 * Enhanced ERC721 Royalty Module Verifier
 * 
 * Verifies royalty configuration against BOTH database and on-chain
 * 
 * CRITICAL: Royalty misconfiguration means lost revenue!
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

// ERC721 Royalty Module ABI
// ✅ FIX: Corrected function name from defaultRoyaltyInfo() to getDefaultRoyalty()
// Matches actual contract: ERC721RoyaltyModule.sol
const ERC721_ROYALTY_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function getDefaultRoyalty() view returns (address receiver, uint96 feeNumerator)',
  'function getTokenRoyalty(uint256 tokenId) view returns (address receiver, uint96 feeNumerator, bool isSet)',
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address, uint256)',
  'function getMaxRoyaltyCap() view returns (uint96)',
  'function setDefaultRoyalty(address receiver, uint96 feeNumerator) external',
  'function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external'
];

/**
 * Enhanced ERC721 Royalty Module Verifier
 */
export class EnhancedERC721RoyaltyModuleVerifier implements IModuleVerifier {
  moduleType = 'royalty';

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
        name: 'Royalty Module Deployed',
        description: 'Verify royalty module bytecode exists',
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
        name: 'Royalty Module Deployed',
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

    const ERC721_ABI = [
      'function royaltyModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      ERC721_ROYALTY_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const royaltyModuleAddress = await tokenContract.royaltyModule();
      const matches = royaltyModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Royalty Module Link',
        description: 'Verify token.royaltyModule points to royalty module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: royaltyModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks;
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Royalty Module Link',
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
        name: 'Royalty Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Royalty Module → Token Link',
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
      ERC721_ROYALTY_MODULE_ABI,
      provider
    );

    // ============================================
    // STEP 1: Query Database for Authoritative Config
    // ============================================
    let dbConfig: any = null;
    
    try {
      const { data: erc721Props, error } = await supabase
        .from('token_erc721_properties')
        .select('royalty_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc721_properties: ${error.message}`);
      } else if (erc721Props) {
        dbConfig = erc721Props.royalty_config;
        console.log(`✅ Loaded royalty config from token_erc721_properties:`, dbConfig);
      } else {
        console.warn(`⚠️ No token_erc721_properties record found for token ${context.deployment.tokenId}`);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'token_erc721_properties.royalty_config not found',
          status: VerificationStatus.WARNING,
          error: 'Database configuration should be populated for deployed royalty modules',
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      console.error(`❌ Database query failed:`, error);
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Database Query Failed',
        description: 'Failed to query token_erc721_properties',
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
      // ✅ FIX: Use correct function name getDefaultRoyalty()
      const [receiver, feeNumerator] = await moduleContract.getDefaultRoyalty();

      // feeNumerator is in basis points (e.g., 250 = 2.5%)
      const royaltyBps = Number(feeNumerator);

      onChainConfig = {
        defaultRoyaltyReceiver: receiver,
        defaultRoyaltyBps: royaltyBps
      };

      console.log(`📊 On-chain royalty configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Default Royalty Set',
        description: 'Verify default royalty is configured',
        status: receiver !== ethers.ZeroAddress ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: 'Non-zero receiver address',
        actual: receiver,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Royalty Percentage',
        description: 'Verify royalty percentage is reasonable',
        status: royaltyBps > 0 && royaltyBps <= 1000 
          ? VerificationStatus.SUCCESS 
          : royaltyBps === 0 
            ? VerificationStatus.WARNING
            : VerificationStatus.FAILED,
        expected: '0-1000 bps (0-10%)',
        actual: `${royaltyBps} bps (${(royaltyBps / 100).toFixed(2)}%)`,
        timestamp: Date.now()
      });

      // Check for zero royalty (common oversight!)
      if (royaltyBps === 0) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Zero Royalty Detected',
          description: 'Royalty percentage is 0% - this may be unintentional',
          status: VerificationStatus.WARNING,
          error: 'Module configured but royalty is 0%. If royalties are intended, configuration may be incomplete.',
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to fetch on-chain royalty configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // ============================================
    // STEP 3: Compare Database vs On-Chain
    // ============================================
    if (dbConfig && onChainConfig) {
      // Check default royalty receiver
      if (dbConfig.defaultRoyaltyReceiver) {
        const matches = onChainConfig.defaultRoyaltyReceiver.toLowerCase() === 
                       dbConfig.defaultRoyaltyReceiver.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Royalty Receiver (DB vs On-Chain)',
          description: 'Verify on-chain receiver matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.defaultRoyaltyReceiver,
          actual: onChainConfig.defaultRoyaltyReceiver,
          timestamp: Date.now()
        });
      }

      // Check default royalty percentage
      if (dbConfig.defaultRoyaltyBps !== undefined) {
        const matches = onChainConfig.defaultRoyaltyBps === dbConfig.defaultRoyaltyBps;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Royalty Percentage (DB vs On-Chain)',
          description: 'Verify on-chain royalty percentage matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.defaultRoyaltyBps} bps (${(dbConfig.defaultRoyaltyBps / 100).toFixed(2)}%) from database`,
          actual: `${onChainConfig.defaultRoyaltyBps} bps (${(onChainConfig.defaultRoyaltyBps / 100).toFixed(2)}%) on-chain`,
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
          description: 'On-chain royalty configuration differs from database',
          status: VerificationStatus.FAILED,
          error: 'Database and on-chain royalty configurations are out of sync. This means lost revenue!',
          timestamp: Date.now()
        });
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Royalty Configuration Consistency',
          description: 'Database and on-chain royalty configurations match',
          status: VerificationStatus.SUCCESS,
          actual: 'No drift detected - royalty configurations are synchronized',
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
