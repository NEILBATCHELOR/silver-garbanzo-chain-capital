/**
 * Enhanced Consecutive Module Verification
 * 
 * Verifies ERC-2309 Consecutive module for batch minting
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc721_properties.consecutive_config)
 * 2. On-chain config matches database
 * 3. Batch size limits properly configured
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

// Consecutive Module ABI (ERC-2309)
const CONSECUTIVE_MODULE_ABI = [
  'function nftContract() view returns (address)',
  'function getMaxBatchSize() view returns (uint256)',
  'function getNextConsecutiveId() view returns (uint256)',
  'function isConsecutiveBatch(uint256 tokenId) view returns (bool)'
];

/**
 * Enhanced Consecutive Module Verifier
 */
export class EnhancedConsecutiveModuleVerifier implements IModuleVerifier {
  moduleType = 'consecutive';

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
        name: 'Consecutive Module Deployed',
        description: 'Verify consecutive module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Consecutive Module Deployed',
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

    const ERC721_ABI = ['function consecutiveModule() view returns (address)'];
    const nftContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      CONSECUTIVE_MODULE_ABI,
      provider
    );

    // Check 1: NFT → Module linkage
    try {
      const consecutiveModuleAddress = await nftContract.consecutiveModule();
      const matches = consecutiveModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'NFT → Consecutive Module Link',
        description: 'Verify nft.consecutiveModule points to module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: consecutiveModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'NFT → Consecutive Module Link',
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
        name: 'Consecutive Module → NFT Link',
        description: 'Verify module.nftContract points to NFT',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: nftAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Consecutive Module → NFT Link',
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
      CONSECUTIVE_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc721Props, error } = await supabase
        .from('token_erc721_properties')
        .select('consecutive_config, consecutive_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query database: ${error.message}`);
      } else if (erc721Props) {
        dbConfig = erc721Props.consecutive_config;
        console.log(`✅ Loaded consecutive config:`, dbConfig);

        if (erc721Props.consecutive_module_address) {
          const moduleAddressMatches = 
            erc721Props.consecutive_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc721Props.consecutive_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'consecutive_config not found',
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
      const [maxBatchSize, nextConsecutiveId] = await Promise.all([
        moduleContract.getMaxBatchSize(),
        moduleContract.getNextConsecutiveId()
      ]);

      const onChainConfig = {
        maxBatchSize: Number(maxBatchSize),
        nextConsecutiveId: Number(nextConsecutiveId)
      };

      console.log(`📊 On-chain consecutive configuration:`, onChainConfig);

      // Verify max batch size matches database if available
      if (dbConfig?.maxBatchSize) {
        const batchSizeMatches = onChainConfig.maxBatchSize === dbConfig.maxBatchSize;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Batch Size Match',
          description: 'Verify max batch size matches database',
          status: batchSizeMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.maxBatchSize} NFTs`,
          actual: `${onChainConfig.maxBatchSize} NFTs`,
          timestamp: Date.now()
        });
      } else {
        // Just verify reasonable value
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Batch Size Set',
          description: 'Verify max batch size is configured',
          status: onChainConfig.maxBatchSize > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: '> 0 NFTs',
          actual: `${onChainConfig.maxBatchSize} NFTs`,
          timestamp: Date.now()
        });
      }

      // Report next consecutive ID
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Next Consecutive ID',
        description: 'Report next consecutive token ID',
        status: VerificationStatus.SUCCESS,
        expected: 'Valid token ID',
        actual: `Next ID: ${onChainConfig.nextConsecutiveId}`,
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
