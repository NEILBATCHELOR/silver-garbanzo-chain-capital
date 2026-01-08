/**
 * ERC721 Token Verifier
 * 
 * Handles verification of ERC721 (NFT) tokens including:
 * - Basic ERC721 standard compliance
 * - Token configuration (name, symbol, baseURI)
 * - NFT-specific features (enumerable, URIStorage)
 * - Module verification (royalty, rental, soulbound, etc.)
 * - Module linkage validation
 */

import { ethers } from 'ethers';
import { TokenStandard } from '@/types/core/centralModels';
import {
  ITokenStandardVerifier,
  IModuleVerifier,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  ModuleVerificationResult,
  VerificationStatus,
  VerificationType,
  ModuleDeploymentData
} from '../types';
import { EnhancedERC721RoyaltyModuleVerifier } from './enhancedERC721RoyaltyModuleVerifier';

// ERC721 ABI (minimal for verification)
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
  'function maxSupply() view returns (uint256)',
  'function mintingEnabled() view returns (bool)',
  'function burningEnabled() view returns (bool)',
  'function transfersPaused() view returns (bool)',
  'function baseTokenURI() view returns (string)',
  // Module linkage
  'function royaltyModule() view returns (address)',
  'function rentalModule() view returns (address)',
  'function soulboundModule() view returns (address)',
  'function fractionModule() view returns (address)',
  'function consecutiveModule() view returns (address)',
  'function complianceModule() view returns (address)',
  'function documentModule() view returns (address)',
  'function metadataEventsModule() view returns (address)',
  'function vestingModule() view returns (address)'
];

// Royalty Module ABI (ERC2981)
const ROYALTY_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)',
  'function getDefaultRoyalty() view returns (address receiver, uint96 royaltyFraction)',
  'function enabled() view returns (bool)'
];

// Rental Module ABI
const RENTAL_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)'
];

// Soulbound Module ABI (ERC5192)
const SOULBOUND_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function locked(uint256 tokenId) view returns (bool)',
  'function enabled() view returns (bool)'
];

// Fractionalization Module ABI
const FRACTION_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)'
];

// Consecutive Module ABI (ERC2309)
const CONSECUTIVE_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)'
];

/**
 * ERC721 Royalty Module Verifier
 */
class ERC721RoyaltyModuleVerifier implements IModuleVerifier {
  moduleType = 'royalty';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Royalty Module Deployed',
        description: 'Verify royalty module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Royalty Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
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

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      ROYALTY_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.royaltyModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Royalty Module Link',
        description: 'Verify token points to correct royalty module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Royalty Module Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Token linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Royalty Module → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Royalty Module → Token Link',
        description: 'Failed to check linkage',
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

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      ROYALTY_MODULE_ABI,
      provider
    );

    // Check if module is enabled
    try {
      const isEnabled = await moduleContract.enabled();

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Royalty Module Enabled',
        description: 'Verify royalty module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Royalty Module Enabled',
        description: 'Failed to check enabled status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check default royalty configuration if expected
    if (module.configuration?.defaultRoyalty) {
      try {
        const royaltyInfo = await moduleContract.getDefaultRoyalty();
        const expectedReceiver = module.configuration.defaultRoyalty.receiver;
        const expectedFraction = module.configuration.defaultRoyalty.fraction;

        const receiverMatches = royaltyInfo[0].toLowerCase() === expectedReceiver.toLowerCase();
        const fractionMatches = royaltyInfo[1] === BigInt(expectedFraction);

        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Default Royalty Receiver',
          description: 'Verify default royalty receiver',
          status: receiverMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: expectedReceiver,
          actual: royaltyInfo[0],
          timestamp: Date.now()
        });

        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Default Royalty Fraction',
          description: 'Verify default royalty percentage',
          status: fractionMatches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: expectedFraction,
          actual: royaltyInfo[1].toString(),
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Default Royalty Configuration',
          description: 'Failed to fetch royalty configuration',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}

/**
 * ERC721 Rental Module Verifier
 */
class ERC721RentalModuleVerifier implements IModuleVerifier {
  moduleType = 'rental';

  async verifyDeployment(
    module: ModuleDeploymentData,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      const code = await provider.getCode(module.moduleAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Rental Module Deployed',
        description: 'Verify rental module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Rental Module Deployed',
        description: 'Failed to check module deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
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

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      RENTAL_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.rentalModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Rental Module Link',
        description: 'Verify token points to rental module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Rental Module Link',
        description: 'Failed to check linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Token linkage
    try {
      const linkedTokenAddress = await moduleContract.tokenContract();
      const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Rental Module → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Rental Module → Token Link',
        description: 'Failed to check linkage',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, RENTAL_MODULE_ABI, provider);

    try {
      const isEnabled = await moduleContract.enabled();
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Rental Module Enabled',
        description: 'Verify rental module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Rental Module Enabled',
        description: 'Failed to check enabled status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

// Create a generic module verifier for simpler modules
function createGenericModuleVerifier(
  moduleType: string,
  moduleName: string,
  abi: any[],
  tokenLinkageMethod: string
): IModuleVerifier {
  return {
    moduleType,
    
    async verifyDeployment(module, context, options) {
      const checks: VerificationCheck[] = [];
      const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

      try {
        const code = await provider.getCode(module.moduleAddress);
        const exists = code !== '0x';
        checks.push({
          type: VerificationType.MODULE_DEPLOYMENT,
          name: `${moduleName} Module Deployed`,
          description: `Verify ${moduleName.toLowerCase()} module contract exists`,
          status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: 'Contract exists',
          actual: exists ? 'Deployed' : 'Not found',
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_DEPLOYMENT,
          name: `${moduleName} Module Deployed`,
          description: 'Failed to check module deployment',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
      return checks;
    },

    async verifyLinkage(module, context, options) {
      const checks: VerificationCheck[] = [];
      const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
      const tokenContract = new ethers.Contract(context.deployment.contractAddress, ERC721_ABI, provider);
      const moduleContract = new ethers.Contract(module.moduleAddress, abi, provider);

      try {
        const linkedModuleAddress = await tokenContract[tokenLinkageMethod]();
        const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_LINKAGE,
          name: `Token → ${moduleName} Module Link`,
          description: `Verify token points to ${moduleName.toLowerCase()} module`,
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: module.moduleAddress,
          actual: linkedModuleAddress,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_LINKAGE,
          name: `Token → ${moduleName} Module Link`,
          description: 'Failed to check linkage',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }

      try {
        const linkedTokenAddress = await moduleContract.tokenContract();
        const matches = linkedTokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_LINKAGE,
          name: `${moduleName} Module → Token Link`,
          description: `Verify module points back to token`,
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
          expected: context.deployment.contractAddress,
          actual: linkedTokenAddress,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_LINKAGE,
          name: `${moduleName} Module → Token Link`,
          description: 'Failed to check linkage',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
      return checks;
    },

    async verifyConfiguration(module, context, options) {
      const checks: VerificationCheck[] = [];
      const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;
      const moduleContract = new ethers.Contract(module.moduleAddress, abi, provider);

      try {
        const isEnabled = await moduleContract.enabled();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: `${moduleName} Module Enabled`,
          description: `Verify ${moduleName.toLowerCase()} module is active`,
          status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: true,
          actual: isEnabled,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: `${moduleName} Module Enabled`,
          description: 'Failed to check enabled status',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
      return checks;
    }
  };
}

// Now create the main ERC721 Token Verifier
export class ERC721Verifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC721;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    
    // Register module verifiers
    // ✅ ENHANCED: Uses database-first verification for royalty module
    this.moduleVerifiers.set('royalty', new EnhancedERC721RoyaltyModuleVerifier());
    this.moduleVerifiers.set('rental', new ERC721RentalModuleVerifier());
    this.moduleVerifiers.set('soulbound', createGenericModuleVerifier('soulbound', 'Soulbound', SOULBOUND_MODULE_ABI, 'soulboundModule'));
    this.moduleVerifiers.set('fraction', createGenericModuleVerifier('fraction', 'Fractionalization', FRACTION_MODULE_ABI, 'fractionModule'));
    this.moduleVerifiers.set('consecutive', createGenericModuleVerifier('consecutive', 'Consecutive', CONSECUTIVE_MODULE_ABI, 'consecutiveModule'));
  }

  /**
   * Verify ERC721 token deployment and configuration
   */
  async verifyToken(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    if (!provider) {
      throw new Error('Provider not available');
    }

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC721_ABI,
      provider
    );

    // Check 1: Contract exists
    try {
      const code = await provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'Contract Deployed',
        description: 'Verify contract bytecode exists on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract bytecode exists',
        actual: exists ? 'Contract deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) {
        return checks; // Can't continue if contract doesn't exist
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'Contract Deployed',
        description: 'Failed to check contract deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    // Check 2: Token name
    if (context.expectedConfiguration?.name) {
      try {
        const actualName = await tokenContract.name();
        const matches = actualName === context.expectedConfiguration.name;

        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Token Name',
          description: 'Verify token name matches configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: context.expectedConfiguration.name,
          actual: actualName,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Token Name',
          description: 'Failed to fetch token name',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    // Check 3: Token symbol
    if (context.expectedConfiguration?.symbol) {
      try {
        const actualSymbol = await tokenContract.symbol();
        const matches = actualSymbol === context.expectedConfiguration.symbol;

        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Token Symbol',
          description: 'Verify token symbol matches configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: context.expectedConfiguration.symbol,
          actual: actualSymbol,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Token Symbol',
          description: 'Failed to fetch token symbol',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    // Check 4: Total supply
    try {
      const totalSupply = await tokenContract.totalSupply();
      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Supply',
        description: 'Fetch current total supply of NFTs',
        status: VerificationStatus.SUCCESS,
        actual: totalSupply.toString(),
        timestamp: Date.now()
      });
    } catch (error: any) {
      // Not all ERC721 implementations have totalSupply
      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Supply',
        description: 'Total supply not available',
        status: VerificationStatus.SKIPPED,
        error: 'ERC721Enumerable not implemented',
        timestamp: Date.now()
      });
    }

    // Check 5: Max supply (if configured)
    if (context.expectedConfiguration?.maxSupply) {
      try {
        const maxSupply = await tokenContract.maxSupply();
        const matches = maxSupply === BigInt(context.expectedConfiguration.maxSupply);

        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Max Supply',
          description: 'Verify maximum NFT supply matches configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: context.expectedConfiguration.maxSupply,
          actual: maxSupply.toString(),
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Max Supply',
          description: 'Failed to fetch max supply',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    // Check 6: Base URI (if configured)
    if (context.expectedConfiguration?.baseURI) {
      try {
        const baseURI = await tokenContract.baseTokenURI();
        const matches = baseURI === context.expectedConfiguration.baseURI;

        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Base Token URI',
          description: 'Verify base URI for metadata',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: context.expectedConfiguration.baseURI,
          actual: baseURI,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Base Token URI',
          description: 'Failed to fetch base URI',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }

  /**
   * Verify all modules attached to this token
   */
  async verifyModules(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<ModuleVerificationResult[]> {
    const results: ModuleVerificationResult[] = [];

    if (!context.modules || context.modules.length === 0) {
      return results;
    }

    for (const module of context.modules) {
      const verifier = this.moduleVerifiers.get(module.moduleType);

      if (!verifier) {
        // No verifier registered for this module type
        results.push({
          moduleType: module.moduleType,
          moduleAddress: module.moduleAddress,
          deploymentVerified: false,
          linkageVerified: false,
          configurationVerified: false,
          checks: [{
            type: VerificationType.MODULE_DEPLOYMENT,
            name: 'Module Verifier Not Found',
            description: `No verifier registered for module type: ${module.moduleType}`,
            status: VerificationStatus.SKIPPED,
            timestamp: Date.now()
          }],
          issues: [`No verifier available for ${module.moduleType}`],
          warnings: []
        });
        continue;
      }

      // Verify deployment
      const deploymentChecks = options.verifyModules
        ? await verifier.verifyDeployment(module, context, options)
        : [];

      // Verify linkage
      const linkageChecks = options.checkModuleLinkage
        ? await verifier.verifyLinkage(module, context, options)
        : [];

      // Verify configuration
      const configChecks = options.verifyModules
        ? await verifier.verifyConfiguration(module, context, options)
        : [];

      const allChecks = [...deploymentChecks, ...linkageChecks, ...configChecks];

      results.push({
        moduleType: module.moduleType,
        moduleAddress: module.moduleAddress,
        deploymentVerified: deploymentChecks.every(c => c.status === VerificationStatus.SUCCESS),
        linkageVerified: linkageChecks.every(c => c.status === VerificationStatus.SUCCESS),
        configurationVerified: configChecks.every(c => c.status === VerificationStatus.SUCCESS),
        checks: allChecks,
        issues: allChecks.filter(c => c.status === VerificationStatus.FAILED).map(c => c.error || c.name),
        warnings: allChecks.filter(c => c.status === VerificationStatus.WARNING).map(c => c.error || c.name)
      });
    }

    return results;
  }
}
