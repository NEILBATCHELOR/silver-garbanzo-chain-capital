/**
 * ERC1400 Token Verifier
 * 
 * Handles verification of ERC1400 security tokens including:
 * - ERC1400 standard compliance (partitions, transfers)
 * - Token configuration (controllers, documents)
 * - Module verification (controller, document, transfer restrictions)
 * - Compliance and regulation features
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

// ERC1400 ABI (Security Token Standard)
const ERC1400_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function balanceOfByPartition(bytes32 partition, address account) view returns (uint256)',
  'function partitionsOf(address account) view returns (bytes32[])',
  'function totalPartitions() view returns (bytes32[])',
  'function isControllable() view returns (bool)',
  'function isIssuable() view returns (bool)',
  'function getDefaultPartitions() view returns (bytes32[])',
  // Module linkages
  'function controllerModule() view returns (address)',
  'function documentModule() view returns (address)',
  'function transferRestrictionsModule() view returns (address)'
];

// Controller Module ABI
const CONTROLLER_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function controllers() view returns (address[])',
  'function isController(address account) view returns (bool)',
  'function controllerTransfer(address from, address to, uint256 value, bytes data, bytes operatorData)',
  'function controllerRedeem(address account, uint256 value, bytes data, bytes operatorData)'
];

// Document Module ABI (ERC1643)
const DOCUMENT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function getDocument(bytes32 name) view returns (string uri, bytes32 documentHash, uint256 timestamp)',
  'function getAllDocuments() view returns (bytes32[] names)',
  'function setDocument(bytes32 name, string uri, bytes32 documentHash)'
];

// Transfer Restrictions Module ABI
const TRANSFER_RESTRICTIONS_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function canTransfer(address from, address to, uint256 value, bytes data) view returns (bool, bytes32 reasonCode)',
  'function canTransferByPartition(bytes32 partition, address from, address to, uint256 value, bytes data) view returns (bool, bytes32 reasonCode)',
  'function getRestrictions() view returns (tuple(bool whitelistEnabled, bool blacklistEnabled, bool timeLockEnabled, uint256 minHoldingPeriod))',
  'function isWhitelisted(address account) view returns (bool)',
  'function isBlacklisted(address account) view returns (bool)'
];

/**
 * ERC1400 Controller Module Verifier
 */
class ERC1400ControllerModuleVerifier implements IModuleVerifier {
  moduleType = 'controller';

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
        name: 'Controller Module Deployed',
        description: 'Verify controller module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Controller Module Deployed',
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
      ERC1400_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      CONTROLLER_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.controllerModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Controller Module Link',
        description: 'Verify token points to controller module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Controller Module Link',
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
        name: 'Controller Module → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Controller Module → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, CONTROLLER_MODULE_ABI, provider);

    // Check controllers
    try {
      const controllers = await moduleContract.controllers();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Controllers Configuration',
        description: 'Verify controller addresses',
        status: VerificationStatus.SUCCESS,
        actual: {
          controllers,
          count: controllers.length
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Controllers Configuration',
        description: 'Failed to check controllers',
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
        name: 'Controller Module Enabled',
        description: 'Verify controller module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Controller Module Enabled',
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
 * ERC1400 Document Module Verifier
 */
class ERC1400DocumentModuleVerifier implements IModuleVerifier {
  moduleType = 'document';

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
        name: 'Document Module Deployed',
        description: 'Verify document module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Document Module Deployed',
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
      ERC1400_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      DOCUMENT_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.documentModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Document Module Link',
        description: 'Verify token points to document module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Document Module Link',
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
        name: 'Document Module → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Document Module → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, DOCUMENT_MODULE_ABI, provider);

    // Check documents
    try {
      const documents = await moduleContract.getAllDocuments();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Documents Configuration',
        description: 'Verify registered documents',
        status: VerificationStatus.SUCCESS,
        actual: {
          documents,
          count: documents.length
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Documents Configuration',
        description: 'Failed to check documents',
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
        name: 'Document Module Enabled',
        description: 'Verify document module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Document Module Enabled',
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
 * ERC1400 Transfer Restrictions Module Verifier
 */
class ERC1400TransferRestrictionsModuleVerifier implements IModuleVerifier {
  moduleType = 'transferRestrictions';

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
        name: 'Transfer Restrictions Module Deployed',
        description: 'Verify transfer restrictions module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Transfer Restrictions Module Deployed',
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
      ERC1400_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      TRANSFER_RESTRICTIONS_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.transferRestrictionsModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Transfer Restrictions Link',
        description: 'Verify token points to transfer restrictions module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Transfer Restrictions Link',
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
        name: 'Transfer Restrictions → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Transfer Restrictions → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, TRANSFER_RESTRICTIONS_MODULE_ABI, provider);

    // Check restrictions configuration
    try {
      const restrictions = await moduleContract.getRestrictions();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Transfer Restrictions Configuration',
        description: 'Verify restriction settings',
        status: VerificationStatus.SUCCESS,
        actual: {
          whitelistEnabled: restrictions.whitelistEnabled,
          blacklistEnabled: restrictions.blacklistEnabled,
          timeLockEnabled: restrictions.timeLockEnabled,
          minHoldingPeriod: restrictions.minHoldingPeriod.toString()
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Transfer Restrictions Configuration',
        description: 'Failed to check restrictions',
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
        name: 'Transfer Restrictions Enabled',
        description: 'Verify transfer restrictions module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Transfer Restrictions Enabled',
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
 * Main ERC1400 Security Token Verifier
 */
export class ERC1400Verifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC1400;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    
    // Register all ERC1400 module verifiers
    this.moduleVerifiers.set('controller', new ERC1400ControllerModuleVerifier());
    this.moduleVerifiers.set('document', new ERC1400DocumentModuleVerifier());
    this.moduleVerifiers.set('transferRestrictions', new ERC1400TransferRestrictionsModuleVerifier());
  }

  /**
   * Verify ERC1400 token deployment and configuration
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
      ERC1400_ABI,
      provider
    );

    // Check 1: Contract exists
    try {
      const code = await provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'ERC1400 Security Token Deployed',
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
        name: 'ERC1400 Security Token Deployed',
        description: 'Failed to check deployment',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
      return checks;
    }

    // Check 2: Token name
    try {
      const name = await tokenContract.name();
      const expected = context.expectedConfiguration?.name;

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Token Name',
        description: 'Verify token name matches configuration',
        status: !expected || name === expected ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected,
        actual: name,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Token Name',
        description: 'Failed to read token name',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 3: Token symbol
    try {
      const symbol = await tokenContract.symbol();
      const expected = context.expectedConfiguration?.symbol;

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Token Symbol',
        description: 'Verify token symbol matches configuration',
        status: !expected || symbol === expected ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected,
        actual: symbol,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Token Symbol',
        description: 'Failed to read token symbol',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 4: Total supply
    try {
      const totalSupply = await tokenContract.totalSupply();

      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Supply',
        description: 'Verify token total supply',
        status: VerificationStatus.SUCCESS,
        actual: ethers.formatUnits(totalSupply, 18),
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Supply',
        description: 'Failed to read total supply',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 5: Controllable status
    try {
      const isControllable = await tokenContract.isControllable();

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Controllable Status',
        description: 'Verify token controllable status',
        status: VerificationStatus.SUCCESS,
        actual: isControllable,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Controllable Status',
        description: 'Failed to read controllable status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 6: Issuable status
    try {
      const isIssuable = await tokenContract.isIssuable();

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Issuable Status',
        description: 'Verify token issuable status',
        status: VerificationStatus.SUCCESS,
        actual: isIssuable,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Issuable Status',
        description: 'Failed to read issuable status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 7: Default partitions
    try {
      const partitions = await tokenContract.getDefaultPartitions();

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Default Partitions',
        description: 'Verify default partitions',
        status: VerificationStatus.SUCCESS,
        actual: {
          partitions,
          count: partitions.length
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Default Partitions',
        description: 'Failed to read default partitions',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  /**
   * Verify ERC1400 modules
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
