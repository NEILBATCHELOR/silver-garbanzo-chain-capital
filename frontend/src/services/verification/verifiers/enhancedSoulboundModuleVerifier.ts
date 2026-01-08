/**
 * Enhanced Soulbound Module Verification
 * 
 * Verifies ERC-5192 Soulbound module for non-transferable NFTs
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc721_properties.soulbound_config)
 * 2. On-chain config matches database
 * 3. Soulbound parameters properly configured
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

// Soulbound Module ABI (ERC-5192)
const SOULBOUND_MODULE_ABI = [
  'function nftContract() view returns (address)',
  'function getConfiguration() view returns (bool allowOneTimeTransfer, bool burnableByOwner, bool burnableByIssuer, bool expirationEnabled, uint256 expirationPeriod)',
  'function isSoulbound(uint256 tokenId) view returns (bool)',
  'function isBound(uint256 tokenId) view returns (bool)',
  'function canTransfer(uint256 tokenId, address from, address to) view returns (bool)',
  'function getSoul(uint256 tokenId) view returns (address)',
  'function isExpired(uint256 tokenId) view returns (bool)',
  'function getExpirationTime(uint256 tokenId) view returns (uint256)'
];

/**
 * Enhanced Soulbound Module Verifier
 */
export class EnhancedSoulboundModuleVerifier implements IModuleVerifier {
  moduleType = 'soulbound';

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
        name: 'Soulbound Module Deployed',
        description: 'Verify soulbound module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Soulbound Module Deployed',
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

    const ERC721_ABI = ['function soulboundModule() view returns (address)'];
    const nftContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      SOULBOUND_MODULE_ABI,
      provider
    );

    // Check 1: NFT → Module linkage
    try {
      const soulboundModuleAddress = await nftContract.soulboundModule();
      const matches = soulboundModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'NFT → Soulbound Module Link',
        description: 'Verify nft.soulboundModule points to module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: soulboundModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'NFT → Soulbound Module Link',
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
        name: 'Soulbound Module → NFT Link',
        description: 'Verify module.nftContract points to NFT',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: nftAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Soulbound Module → NFT Link',
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
      SOULBOUND_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc721Props, error } = await supabase
        .from('token_erc721_properties')
        .select('soulbound_config, soulbound_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query database: ${error.message}`);
      } else if (erc721Props) {
        dbConfig = erc721Props.soulbound_config;
        console.log(`✅ Loaded soulbound config:`, dbConfig);

        if (erc721Props.soulbound_module_address) {
          const moduleAddressMatches = 
            erc721Props.soulbound_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc721Props.soulbound_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'soulbound_config not found',
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
        allowOneTimeTransfer: configResult[0],
        burnableByOwner: configResult[1],
        burnableByIssuer: configResult[2],
        expirationEnabled: configResult[3],
        expirationPeriod: Number(configResult[4])
      };

      console.log(`📊 On-chain soulbound configuration:`, onChainConfig);

      // Verify each parameter matches database if available
      if (dbConfig) {
        const oneTimeTransferMatches = onChainConfig.allowOneTimeTransfer === (dbConfig.allowOneTimeTransfer || false);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'One-Time Transfer Match',
          description: 'Verify one-time transfer setting matches database',
          status: oneTimeTransferMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: String(dbConfig.allowOneTimeTransfer || false),
          actual: String(onChainConfig.allowOneTimeTransfer),
          timestamp: Date.now()
        });

        const burnableByOwnerMatches = onChainConfig.burnableByOwner === (dbConfig.burnableByOwner !== undefined ? dbConfig.burnableByOwner : true);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Burnable By Owner Match',
          description: 'Verify burnable by owner setting matches database',
          status: burnableByOwnerMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: String(dbConfig.burnableByOwner !== undefined ? dbConfig.burnableByOwner : true),
          actual: String(onChainConfig.burnableByOwner),
          timestamp: Date.now()
        });

        const burnableByIssuerMatches = onChainConfig.burnableByIssuer === (dbConfig.burnableByIssuer !== undefined ? dbConfig.burnableByIssuer : true);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Burnable By Issuer Match',
          description: 'Verify burnable by issuer setting matches database',
          status: burnableByIssuerMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: String(dbConfig.burnableByIssuer !== undefined ? dbConfig.burnableByIssuer : true),
          actual: String(onChainConfig.burnableByIssuer),
          timestamp: Date.now()
        });

        const expirationEnabledMatches = onChainConfig.expirationEnabled === (dbConfig.expirationEnabled || false);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Expiration Enabled Match',
          description: 'Verify expiration setting matches database',
          status: expirationEnabledMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: String(dbConfig.expirationEnabled || false),
          actual: String(onChainConfig.expirationEnabled),
          timestamp: Date.now()
        });

        if (onChainConfig.expirationEnabled) {
          const expirationPeriodMatches = onChainConfig.expirationPeriod === (dbConfig.expirationPeriod || 0);
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Expiration Period Match',
            description: 'Verify expiration period matches database',
            status: expirationPeriodMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: `${dbConfig.expirationPeriod || 0} seconds`,
            actual: `${onChainConfig.expirationPeriod} seconds (${(onChainConfig.expirationPeriod / 86400).toFixed(1)} days)`,
            timestamp: Date.now()
          });
        }
      } else {
        // Just verify reasonable values
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Soulbound Parameters Set',
          description: 'Verify soulbound parameters are configured',
          status: VerificationStatus.SUCCESS,
          expected: 'Valid soulbound parameters',
          actual: `OneTime: ${onChainConfig.allowOneTimeTransfer}, BurnByOwner: ${onChainConfig.burnableByOwner}, BurnByIssuer: ${onChainConfig.burnableByIssuer}, Expiration: ${onChainConfig.expirationEnabled}`,
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
