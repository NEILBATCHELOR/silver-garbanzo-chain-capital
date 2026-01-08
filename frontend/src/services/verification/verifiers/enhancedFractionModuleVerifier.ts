/**
 * Enhanced Fraction Module Verification
 * 
 * Verifies NFT fractionalization module
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc721_properties.fraction_config)
 * 2. On-chain config matches database
 * 3. Fraction parameters properly configured
 * 4. Module properly linked to NFT contract
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

// Fraction Module ABI
const FRACTION_MODULE_ABI = [
  'function nftContract() view returns (address)',
  'function getConfiguration() view returns (uint256 minFractions, uint256 maxFractions, uint256 buyoutMultiplierBps, bool redemptionEnabled, uint256 fractionPrice, bool tradingEnabled)',
  'function isFractionalized(uint256 tokenId) view returns (bool)',
  'function getShareToken(uint256 tokenId) view returns (address)',
  'function getTotalShares(uint256 tokenId) view returns (uint256)'
];

/**
 * Enhanced Fraction Module Verifier
 */
export class EnhancedFractionModuleVerifier implements IModuleVerifier {
  moduleType = 'fraction';

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
        name: 'Fraction Module Deployed',
        description: 'Verify fraction module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Fraction Module Deployed',
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

    const ERC721_ABI = ['function fractionModule() view returns (address)'];
    const nftContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      FRACTION_MODULE_ABI,
      provider
    );

    // Check 1: NFT → Module linkage
    try {
      const fractionModuleAddress = await nftContract.fractionModule();
      const matches = fractionModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'NFT → Fraction Module Link',
        description: 'Verify nft.fractionModule points to module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: fractionModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'NFT → Fraction Module Link',
        description: 'Failed to check NFT linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    // Check 2: Module → NFT linkage
    try {
      const nftAddress = await moduleContract.nftContract();
      const matches = nftAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fraction Module → NFT Link',
        description: 'Verify module.nftContract points to NFT',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: nftAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fraction Module → NFT Link',
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
      FRACTION_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc721Props, error } = await supabase
        .from('token_erc721_properties')
        .select('fraction_config, fraction_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query database: ${error.message}`);
      } else if (erc721Props) {
        dbConfig = erc721Props.fraction_config;
        console.log(`✅ Loaded fraction config:`, dbConfig);

        if (erc721Props.fraction_module_address) {
          const moduleAddressMatches = 
            erc721Props.fraction_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc721Props.fraction_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'fraction_config not found',
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
      const configResult = await moduleContract.getConfiguration();
      
      const onChainConfig = {
        minFractions: Number(configResult[0]),
        maxFractions: Number(configResult[1]),
        buyoutMultiplierBps: Number(configResult[2]),
        redemptionEnabled: configResult[3],
        fractionPrice: Number(configResult[4]),
        tradingEnabled: configResult[5]
      };

      console.log(`📊 On-chain fraction configuration:`, onChainConfig);

      // Verify each parameter matches database if available
      if (dbConfig) {
        const minFractionsMatches = onChainConfig.minFractions === (dbConfig.minFractions || 100);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Min Fractions Match',
          description: 'Verify min fractions matches database',
          status: minFractionsMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.minFractions || 100} shares`,
          actual: `${onChainConfig.minFractions} shares`,
          timestamp: Date.now()
        });

        const maxFractionsMatches = onChainConfig.maxFractions === (dbConfig.maxFractions || 10000);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Fractions Match',
          description: 'Verify max fractions matches database',
          status: maxFractionsMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.maxFractions || 10000} shares`,
          actual: `${onChainConfig.maxFractions} shares`,
          timestamp: Date.now()
        });

        const buyoutMultiplierMatches = onChainConfig.buyoutMultiplierBps === (dbConfig.buyoutMultiplierBps || 15000);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Buyout Multiplier Match',
          description: 'Verify buyout multiplier matches database',
          status: buyoutMultiplierMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.buyoutMultiplierBps || 15000} BPS (${((dbConfig.buyoutMultiplierBps || 15000) / 100)}%)`,
          actual: `${onChainConfig.buyoutMultiplierBps} BPS (${(onChainConfig.buyoutMultiplierBps / 100)}%)`,
          timestamp: Date.now()
        });

        const redemptionMatches = onChainConfig.redemptionEnabled === (dbConfig.redemptionEnabled !== undefined ? dbConfig.redemptionEnabled : true);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Redemption Enabled Match',
          description: 'Verify redemption setting matches database',
          status: redemptionMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: dbConfig.redemptionEnabled !== undefined ? String(dbConfig.redemptionEnabled) : 'true',
          actual: String(onChainConfig.redemptionEnabled),
          timestamp: Date.now()
        });

        const tradingMatches = onChainConfig.tradingEnabled === (dbConfig.tradingEnabled !== undefined ? dbConfig.tradingEnabled : true);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Trading Enabled Match',
          description: 'Verify trading setting matches database',
          status: tradingMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: dbConfig.tradingEnabled !== undefined ? String(dbConfig.tradingEnabled) : 'true',
          actual: String(onChainConfig.tradingEnabled),
          timestamp: Date.now()
        });
      } else {
        // Just verify reasonable values
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Fraction Parameters Set',
          description: 'Verify fraction parameters are configured',
          status: onChainConfig.minFractions > 0 && onChainConfig.maxFractions >= onChainConfig.minFractions 
            ? VerificationStatus.SUCCESS 
            : VerificationStatus.WARNING,
          expected: 'Valid fraction parameters',
          actual: `Min: ${onChainConfig.minFractions}, Max: ${onChainConfig.maxFractions}, Buyout: ${onChainConfig.buyoutMultiplierBps} BPS`,
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
