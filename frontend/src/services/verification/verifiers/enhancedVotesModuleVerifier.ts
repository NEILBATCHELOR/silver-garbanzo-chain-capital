/**
 * Enhanced Votes Module Verification
 * 
 * Verifies ERC-5805 Votes module for governance
 * 
 * CRITICAL CHECKS:
 * 1. Database config exists (token_erc20_properties.votes_config)
 * 2. On-chain config matches database
 * 3. Governance parameters properly set
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

// Votes Module ABI (ERC-5805)
const VOTES_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
  'function quorumPercentage() view returns (uint256)',
  'function getVotes(address account) view returns (uint256)',
  'function delegates(address account) view returns (address)'
];

/**
 * Enhanced Votes Module Verifier
 */
export class EnhancedVotesModuleVerifier implements IModuleVerifier {
  moduleType = 'votes';

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
        name: 'Votes Module Deployed',
        description: 'Verify votes module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Votes Module Deployed',
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

    const ERC20_ABI = ['function votesModule() view returns (address)'];
    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      VOTES_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const votesModuleAddress = await tokenContract.votesModule();
      const matches = votesModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Votes Module Link',
        description: 'Verify token.votesModule points to votes module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: votesModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) return checks;
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Votes Module Link',
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
        name: 'Votes Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Votes Module → Token Link',
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
      VOTES_MODULE_ABI,
      provider
    );

    // Query database for authoritative config
    let dbConfig: any = null;
    
    try {
      const { data: erc20Props, error } = await supabase
        .from('token_erc20_properties')
        .select('votes_config, votes_module_address')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query database: ${error.message}`);
      } else if (erc20Props) {
        dbConfig = erc20Props.votes_config;
        console.log(`✅ Loaded votes config:`, dbConfig);

        if (erc20Props.votes_module_address) {
          const moduleAddressMatches = 
            erc20Props.votes_module_address.toLowerCase() === module.moduleAddress.toLowerCase();
          
          checks.push({
            type: VerificationType.MODULE_CONFIGURATION,
            name: 'Database Module Address',
            description: 'Verify database module address matches',
            status: moduleAddressMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
            expected: module.moduleAddress,
            actual: erc20Props.votes_module_address,
            timestamp: Date.now()
          });
        }
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'votes_config not found',
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
      const [votingDelay, votingPeriod, proposalThreshold, quorumPercentage] = await Promise.all([
        moduleContract.votingDelay(),
        moduleContract.votingPeriod(),
        moduleContract.proposalThreshold(),
        moduleContract.quorumPercentage()
      ]);

      const onChainConfig = {
        votingDelay: Number(votingDelay),
        votingPeriod: Number(votingPeriod),
        proposalThreshold: Number(proposalThreshold),
        quorumPercentage: Number(quorumPercentage)
      };

      console.log(`📊 On-chain votes configuration:`, onChainConfig);

      // Verify each parameter matches database if available
      if (dbConfig) {
        const delayMatches = onChainConfig.votingDelay === (dbConfig.votingDelay || 1);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Voting Delay Match',
          description: 'Verify voting delay matches database',
          status: delayMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.votingDelay || 1} blocks`,
          actual: `${onChainConfig.votingDelay} blocks`,
          timestamp: Date.now()
        });

        const periodMatches = onChainConfig.votingPeriod === (dbConfig.votingPeriod || 50400);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Voting Period Match',
          description: 'Verify voting period matches database',
          status: periodMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.votingPeriod || 50400} blocks`,
          actual: `${onChainConfig.votingPeriod} blocks`,
          timestamp: Date.now()
        });

        const thresholdMatches = onChainConfig.proposalThreshold === (dbConfig.proposalThreshold || 0);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Proposal Threshold Match',
          description: 'Verify proposal threshold matches database',
          status: thresholdMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.proposalThreshold || 0} tokens`,
          actual: `${onChainConfig.proposalThreshold} tokens`,
          timestamp: Date.now()
        });

        const quorumMatches = onChainConfig.quorumPercentage === (dbConfig.quorumPercentage || 4);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Quorum Percentage Match',
          description: 'Verify quorum percentage matches database',
          status: quorumMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${dbConfig.quorumPercentage || 4}%`,
          actual: `${onChainConfig.quorumPercentage}%`,
          timestamp: Date.now()
        });
      } else {
        // Just verify reasonable values if no database config
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Governance Parameters Set',
          description: 'Verify governance parameters are configured',
          status: onChainConfig.votingPeriod > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: 'Valid governance parameters',
          actual: `Delay: ${onChainConfig.votingDelay}, Period: ${onChainConfig.votingPeriod}, Quorum: ${onChainConfig.quorumPercentage}%`,
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
