/**
 * Enhanced ERC721 Rental Module Verifier
 * 
 * Verifies rental configuration against BOTH database and on-chain
 * 
 * CRITICAL: Rental misconfiguration means broken rental functionality and lost revenue!
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

// ERC721 Rental Module ABI (from ERC721RentalModule.sol)
const ERC721_RENTAL_MODULE_ABI = [
  // View functions
  'function feeRecipient() view returns (address)',
  'function platformFee() view returns (uint256)',
  'function minRentalDuration() view returns (uint256)',
  'function maxRentalDuration() view returns (uint256)',
  'function minRentalPrice() view returns (uint256)',
  'function minDepositBps() view returns (uint256)',
  'function depositRequired() view returns (bool)',
  'function autoReturnEnabled() view returns (bool)',
  'function subRentalsAllowed() view returns (bool)',
  'function getRental(uint256 tokenId) view returns (address renter, address owner, uint256 expiryTime, uint256 pricePerDay, uint256 deposit, bool active)',
  'function getRenter(uint256 tokenId) view returns (address)',
  'function isListedForRent(uint256 tokenId) view returns (bool)',
  'function isRented(uint256 tokenId) view returns (bool)',
  
  // Configuration functions
  'function setFeeRecipient(address recipient) external',
  'function setPlatformFee(uint256 feeBps) external',
  'function setMinRentalDuration(uint256 duration) external',
  'function setMaxRentalDuration(uint256 duration) external',
  'function setMinRentalPrice(uint256 price) external',
  'function setMinDepositBps(uint256 bps) external',
  'function setDepositRequired(bool required) external',
  'function setAutoReturnEnabled(bool enabled) external',
  'function setSubRentalsAllowed(bool allowed) external'
];

/**
 * Enhanced ERC721 Rental Module Verifier
 */
export class EnhancedERC721RentalModuleVerifier implements IModuleVerifier {
  moduleType = 'rental';

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
        name: 'Rental Module Deployed',
        description: 'Verify rental module bytecode exists',
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
        name: 'Rental Module Deployed',
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
      'function rentalModule() view returns (address)'
    ];

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const rentalModuleAddress = await tokenContract.rentalModule();
      const matches = rentalModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Rental Module Link',
        description: 'Verify token.rentalModule points to rental module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: rentalModuleAddress,
        timestamp: Date.now()
      });

      if (!matches) {
        return checks;
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Rental Module Link',
        description: 'Failed to check token linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
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
      ERC721_RENTAL_MODULE_ABI,
      provider
    );

    // ============================================
    // STEP 1: Query Database for Authoritative Config
    // ============================================
    let dbConfig: any = null;
    
    try {
      const { data: erc721Props, error } = await supabase
        .from('token_erc721_properties')
        .select('rental_config')
        .eq('token_id', context.deployment.tokenId)
        .maybeSingle();

      if (error) {
        console.warn(`⚠️ Failed to query token_erc721_properties: ${error.message}`);
      } else if (erc721Props) {
        dbConfig = erc721Props.rental_config;
        console.log(`✅ Loaded rental config from token_erc721_properties:`, dbConfig);
      } else {
        console.warn(`⚠️ No token_erc721_properties record found for token ${context.deployment.tokenId}`);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Database Configuration Missing',
          description: 'token_erc721_properties.rental_config not found',
          status: VerificationStatus.WARNING,
          error: 'Database configuration should be populated for deployed rental modules',
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
      const [
        feeRecipient,
        platformFee,
        minDuration,
        maxDuration,
        minPrice,
        minDepositBps,
        depositRequired,
        autoReturnEnabled,
        subRentalsAllowed
      ] = await Promise.all([
        moduleContract.feeRecipient(),
        moduleContract.platformFee(),
        moduleContract.minRentalDuration(),
        moduleContract.maxRentalDuration(),
        moduleContract.minRentalPrice(),
        moduleContract.minDepositBps(),
        moduleContract.depositRequired(),
        moduleContract.autoReturnEnabled(),
        moduleContract.subRentalsAllowed()
      ]);

      onChainConfig = {
        feeRecipient,
        platformFeeBps: Number(platformFee),
        minRentalDuration: Number(minDuration),
        maxRentalDuration: Number(maxDuration),
        minRentalPrice: ethers.formatEther(minPrice),
        minDepositBps: Number(minDepositBps),
        depositRequired,
        autoReturnEnabled,
        subRentalsAllowed
      };

      console.log(`📊 On-chain rental configuration:`, onChainConfig);

      // Basic on-chain checks
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fee Recipient Set',
        description: 'Verify platform fee recipient is configured',
        status: feeRecipient !== ethers.ZeroAddress ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Non-zero fee recipient address',
        actual: feeRecipient,
        timestamp: Date.now()
      });

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Platform Fee Configuration',
        description: 'Verify platform fee percentage is reasonable',
        status: onChainConfig.platformFeeBps > 0 && onChainConfig.platformFeeBps <= 1000 
          ? VerificationStatus.SUCCESS 
          : onChainConfig.platformFeeBps === 0 
            ? VerificationStatus.WARNING
            : VerificationStatus.FAILED,
        expected: '0-1000 bps (0-10%)',
        actual: `${onChainConfig.platformFeeBps} bps (${(onChainConfig.platformFeeBps / 100).toFixed(2)}%)`,
        timestamp: Date.now()
      });

      // Check for zero platform fee (common oversight!)
      if (onChainConfig.platformFeeBps === 0) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Zero Platform Fee Detected',
          description: 'Platform fee is 0% - this means no rental revenue!',
          status: VerificationStatus.WARNING,
          error: 'Module configured but platform fee is 0%. This is likely a configuration error!',
          timestamp: Date.now()
        });
      }

      // Duration constraints check
      if (onChainConfig.minRentalDuration > onChainConfig.maxRentalDuration) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Invalid Duration Constraints',
          description: 'Min duration cannot exceed max duration',
          status: VerificationStatus.FAILED,
          expected: `minDuration <= maxDuration`,
          actual: `min: ${onChainConfig.minRentalDuration}s, max: ${onChainConfig.maxRentalDuration}s`,
          timestamp: Date.now()
        });
      }

      // Deposit check
      if (depositRequired && onChainConfig.minDepositBps === 0) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Deposit Configuration Warning',
          description: 'Deposits required but minimum deposit is 0%',
          status: VerificationStatus.WARNING,
          error: 'Deposit is required but minDepositBps is 0. This may be unintentional.',
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'On-Chain Configuration',
        description: 'Failed to fetch on-chain rental configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // ============================================
    // STEP 3: Compare Database vs On-Chain
    // ============================================
    if (dbConfig && onChainConfig) {
      // Check fee recipient
      if (dbConfig.feeRecipient) {
        const matches = onChainConfig.feeRecipient.toLowerCase() === 
                       dbConfig.feeRecipient.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Fee Recipient (DB vs On-Chain)',
          description: 'Verify on-chain fee recipient matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: dbConfig.feeRecipient,
          actual: onChainConfig.feeRecipient,
          timestamp: Date.now()
        });
      }

      // Check platform fee
      if (dbConfig.platformFeeBps !== undefined) {
        const matches = onChainConfig.platformFeeBps === dbConfig.platformFeeBps;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Platform Fee (DB vs On-Chain)',
          description: 'Verify on-chain platform fee matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.platformFeeBps} bps (${(dbConfig.platformFeeBps / 100).toFixed(2)}%) from database`,
          actual: `${onChainConfig.platformFeeBps} bps (${(onChainConfig.platformFeeBps / 100).toFixed(2)}%) on-chain`,
          timestamp: Date.now()
        });
      }

      // Check min rental duration
      if (dbConfig.minRentalDuration !== undefined) {
        const matches = onChainConfig.minRentalDuration === dbConfig.minRentalDuration;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Min Rental Duration (DB vs On-Chain)',
          description: 'Verify on-chain min duration matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.minRentalDuration}s from database`,
          actual: `${onChainConfig.minRentalDuration}s on-chain`,
          timestamp: Date.now()
        });
      }

      // Check max rental duration
      if (dbConfig.maxRentalDuration !== undefined) {
        const matches = onChainConfig.maxRentalDuration === dbConfig.maxRentalDuration;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Max Rental Duration (DB vs On-Chain)',
          description: 'Verify on-chain max duration matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.maxRentalDuration}s from database`,
          actual: `${onChainConfig.maxRentalDuration}s on-chain`,
          timestamp: Date.now()
        });
      }

      // Check min rental price
      if (dbConfig.minRentalPrice !== undefined) {
        // Convert database value to string for comparison
        const dbPrice = parseFloat(dbConfig.minRentalPrice).toFixed(4);
        const chainPrice = parseFloat(onChainConfig.minRentalPrice).toFixed(4);
        const matches = dbPrice === chainPrice;
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Min Rental Price (DB vs On-Chain)',
          description: 'Verify on-chain min price matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbPrice} ETH from database`,
          actual: `${chainPrice} ETH on-chain`,
          timestamp: Date.now()
        });
      }

      // Check deposit required
      if (dbConfig.depositRequired !== undefined) {
        const matches = onChainConfig.depositRequired === dbConfig.depositRequired;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Deposit Required (DB vs On-Chain)',
          description: 'Verify on-chain deposit requirement matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.depositRequired} from database`,
          actual: `${onChainConfig.depositRequired} on-chain`,
          timestamp: Date.now()
        });
      }

      // Check min deposit basis points
      if (dbConfig.minDepositBps !== undefined) {
        const matches = onChainConfig.minDepositBps === dbConfig.minDepositBps;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Min Deposit % (DB vs On-Chain)',
          description: 'Verify on-chain min deposit percentage matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.minDepositBps} bps (${(dbConfig.minDepositBps / 100).toFixed(2)}%) from database`,
          actual: `${onChainConfig.minDepositBps} bps (${(onChainConfig.minDepositBps / 100).toFixed(2)}%) on-chain`,
          timestamp: Date.now()
        });
      }

      // Check auto-return enabled
      if (dbConfig.autoReturnEnabled !== undefined) {
        const matches = onChainConfig.autoReturnEnabled === dbConfig.autoReturnEnabled;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Auto-Return Feature (DB vs On-Chain)',
          description: 'Verify on-chain auto-return setting matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.autoReturnEnabled} from database`,
          actual: `${onChainConfig.autoReturnEnabled} on-chain`,
          timestamp: Date.now()
        });
      }

      // Check sub-rentals allowed
      if (dbConfig.subRentalsAllowed !== undefined) {
        const matches = onChainConfig.subRentalsAllowed === dbConfig.subRentalsAllowed;
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Sub-Rentals Allowed (DB vs On-Chain)',
          description: 'Verify on-chain sub-rental setting matches database',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: `${dbConfig.subRentalsAllowed} from database`,
          actual: `${onChainConfig.subRentalsAllowed} on-chain`,
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
          description: 'On-chain rental configuration differs from database',
          status: VerificationStatus.FAILED,
          error: 'Database and on-chain rental configurations are out of sync. This means broken rental functionality!',
          timestamp: Date.now()
        });
      } else {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Rental Configuration Consistency',
          description: 'Database and on-chain rental configurations match',
          status: VerificationStatus.SUCCESS,
          actual: 'No drift detected - rental configurations are synchronized',
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
