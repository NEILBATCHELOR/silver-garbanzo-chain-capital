/**
 * ERC1155 Token Verifier
 * 
 * Handles verification of ERC1155 multi-token standard including:
 * - ERC1155 standard compliance
 * - Token configuration and URI management
 * - Module verification (royalty, supply cap, URI)
 * - Balance and supply checks
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

// ERC1155 ABI
const ERC1155_ABI = [
  'function uri(uint256 id) view returns (string)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function totalSupply(uint256 id) view returns (uint256)',
  'function exists(uint256 id) view returns (bool)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  // Module linkages
  'function royaltyModule() view returns (address)',
  'function supplyCapModule() view returns (address)',
  'function uriModule() view returns (address)'
];

// Royalty Module ABI (ERC2981)
const ROYALTY_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)',
  'function getRoyaltyConfig(uint256 tokenId) view returns (address recipient, uint256 percentage)',
  'function defaultRoyalty() view returns (address recipient, uint256 percentage)'
];

// Supply Cap Module ABI
const SUPPLY_CAP_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function getSupplyCap(uint256 tokenId) view returns (uint256)',
  'function totalMinted(uint256 tokenId) view returns (uint256)',
  'function remainingSupply(uint256 tokenId) view returns (uint256)'
];

// URI Management Module ABI
const URI_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function uri(uint256 tokenId) view returns (string)',
  'function setURI(uint256 tokenId, string uri)',
  'function baseURI() view returns (string)'
];

/**
 * ERC1155 Royalty Module Verifier
 */
class ERC1155RoyaltyModuleVerifier implements IModuleVerifier {
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
      ERC1155_ABI,
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
        description: 'Verify token points to royalty module',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, ROYALTY_MODULE_ABI, provider);

    // Check default royalty configuration
    try {
      const defaultRoyalty = await moduleContract.defaultRoyalty();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Default Royalty Configuration',
        description: 'Verify default royalty settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          recipient: defaultRoyalty.recipient,
          percentage: defaultRoyalty.percentage.toString()
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Default Royalty Configuration',
        description: 'Failed to check royalty configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check enabled status
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

    return checks;
  }
}

/**
 * ERC1155 Supply Cap Module Verifier
 */
class ERC1155SupplyCapModuleVerifier implements IModuleVerifier {
  moduleType = 'supplyCap';

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
        name: 'Supply Cap Module Deployed',
        description: 'Verify supply cap module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Supply Cap Module Deployed',
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
      ERC1155_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      SUPPLY_CAP_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.supplyCapModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Supply Cap Module Link',
        description: 'Verify token points to supply cap module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Supply Cap Module Link',
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
        name: 'Supply Cap Module → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Supply Cap Module → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, SUPPLY_CAP_MODULE_ABI, provider);

    // Check enabled status
    try {
      const isEnabled = await moduleContract.enabled();
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Supply Cap Module Enabled',
        description: 'Verify supply cap module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Supply Cap Module Enabled',
        description: 'Failed to check enabled status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * ERC1155 URI Management Module Verifier
 */
class ERC1155URIModuleVerifier implements IModuleVerifier {
  moduleType = 'uri';

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
        name: 'URI Module Deployed',
        description: 'Verify URI module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'URI Module Deployed',
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
      ERC1155_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      URI_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.uriModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → URI Module Link',
        description: 'Verify token points to URI module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → URI Module Link',
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
        name: 'URI Module → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'URI Module → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, URI_MODULE_ABI, provider);

    // Check base URI
    try {
      const baseURI = await moduleContract.baseURI();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Base URI Configuration',
        description: 'Verify base URI settings',
        status: VerificationStatus.SUCCESS,
        actual: baseURI,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Base URI Configuration',
        description: 'Failed to check base URI',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check enabled status
    try {
      const isEnabled = await moduleContract.enabled();
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'URI Module Enabled',
        description: 'Verify URI module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'URI Module Enabled',
        description: 'Failed to check enabled status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Main ERC1155 Token Verifier
 */
export class ERC1155Verifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC1155;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    
    // Register all ERC1155 module verifiers
    this.moduleVerifiers.set('royalty', new ERC1155RoyaltyModuleVerifier());
    this.moduleVerifiers.set('supplyCap', new ERC1155SupplyCapModuleVerifier());
    this.moduleVerifiers.set('uri', new ERC1155URIModuleVerifier());
  }

  /**
   * Verify ERC1155 token deployment and configuration
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
      ERC1155_ABI,
      provider
    );

    // Check 1: Contract exists
    try {
      const code = await provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'ERC1155 Contract Deployed',
        description: 'Verify contract bytecode exists on-chain',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract bytecode exists',
        actual: exists ? 'Contract deployed' : 'No contract at address',
        timestamp: Date.now()
      });

      if (!exists) {
        return checks;
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'ERC1155 Contract Deployed',
        description: 'Failed to check deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    // Check 2: URI template (for token ID 0)
    try {
      const uri = await tokenContract.uri(0);

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'URI Template',
        description: 'Verify URI template is configured',
        status: VerificationStatus.SUCCESS,
        actual: uri,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'URI Template',
        description: 'Failed to read URI template',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  /**
   * Verify ERC1155 modules
   */
  async verifyModules(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<ModuleVerificationResult[]> {
    const results: ModuleVerificationResult[] = [];

    for (const module of context.modules) {
      const verifier = this.moduleVerifiers.get(module.moduleType);

      if (!verifier) {
        results.push({
          moduleType: module.moduleType,
          moduleAddress: module.moduleAddress,
          deploymentVerified: false,
          linkageVerified: false,
          configurationVerified: false,
          checks: [{
            type: VerificationType.MODULE_DEPLOYMENT,
            name: 'Module Verifier',
            description: `No verifier available for module type: ${module.moduleType}`,
            status: VerificationStatus.SKIPPED,
            timestamp: Date.now()
          }],
          issues: [`No verifier for ${module.moduleType}`],
          warnings: []
        });
        continue;
      }

      const deploymentChecks = await verifier.verifyDeployment(module, context, options);
      const linkageChecks = await verifier.verifyLinkage(module, context, options);
      const configChecks = await verifier.verifyConfiguration(module, context, options);

      const allChecks = [...deploymentChecks, ...linkageChecks, ...configChecks];
      const deploymentVerified = deploymentChecks.every(c => c.status === VerificationStatus.SUCCESS);
      const linkageVerified = linkageChecks.every(c => c.status === VerificationStatus.SUCCESS);
      const configurationVerified = configChecks.every(c => 
        c.status === VerificationStatus.SUCCESS || c.status === VerificationStatus.WARNING
      );

      const issues = allChecks
        .filter(c => c.status === VerificationStatus.FAILED)
        .map(c => c.error || c.description);

      const warnings = allChecks
        .filter(c => c.status === VerificationStatus.WARNING)
        .map(c => c.description);

      results.push({
        moduleType: module.moduleType,
        moduleAddress: module.moduleAddress,
        deploymentVerified,
        linkageVerified,
        configurationVerified,
        checks: allChecks,
        issues,
        warnings
      });
    }

    return results;
  }
}
