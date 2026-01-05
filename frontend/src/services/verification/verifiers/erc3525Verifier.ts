/**
 * ERC3525 Token Verifier
 * 
 * Handles verification of ERC3525 semi-fungible tokens including:
 * - ERC3525 standard compliance (slots, values)
 * - Token configuration (slot management)
 * - Module verification (slot manager, slot approvable, value exchange)
 * - Slot and value transfer features
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

// ERC3525 ABI (Semi-Fungible Token Standard)
const ERC3525_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function valueDecimals() view returns (uint8)',
  'function balanceOf(uint256 tokenId) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function slotOf(uint256 tokenId) view returns (uint256)',
  'function totalValue(uint256 slot) view returns (uint256)',
  'function tokenSupplyInSlot(uint256 slot) view returns (uint256)',
  'function tokensInSlot(uint256 slot) view returns (uint256[])',
  'function slotURI(uint256 slot) view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  // Module linkages
  'function slotManagerModule() view returns (address)',
  'function slotApprovableModule() view returns (address)',
  'function valueExchangeModule() view returns (address)'
];

// Slot Manager Module ABI
const SLOT_MANAGER_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function createSlot(string uri) returns (uint256 slot)',
  'function getSlotInfo(uint256 slot) view returns (tuple(uint256 slot, string uri, uint256 totalValue, uint256 tokenCount, bool isActive))',
  'function getAllSlots() view returns (uint256[])',
  'function isSlotActive(uint256 slot) view returns (bool)'
];

// Slot Approvable Module ABI
const SLOT_APPROVABLE_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function approveSlot(address to, uint256 slot)',
  'function getApprovedSlot(uint256 slot, address owner) view returns (address)',
  'function isApprovedForSlot(address owner, address operator, uint256 slot) view returns (bool)',
  'function setApprovalForSlot(address operator, uint256 slot, bool approved)'
];

// Value Exchange Module ABI
const VALUE_EXCHANGE_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function transferValue(uint256 fromTokenId, uint256 toTokenId, uint256 value)',
  'function transferValueFrom(uint256 fromTokenId, address to, uint256 slot, uint256 value) returns (uint256 toTokenId)',
  'function getExchangeRate(uint256 fromSlot, uint256 toSlot) view returns (uint256)',
  'function supportedSlots() view returns (uint256[])'
];

/**
 * ERC3525 Slot Manager Module Verifier
 */
class ERC3525SlotManagerModuleVerifier implements IModuleVerifier {
  moduleType = 'slotManager';

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
        name: 'Slot Manager Module Deployed',
        description: 'Verify slot manager module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Slot Manager Module Deployed',
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
      ERC3525_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      SLOT_MANAGER_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.slotManagerModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Slot Manager Link',
        description: 'Verify token points to slot manager module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Slot Manager Link',
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
        name: 'Slot Manager → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Slot Manager → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, SLOT_MANAGER_MODULE_ABI, provider);

    // Check slots
    try {
      const slots = await moduleContract.getAllSlots();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Slots Configuration',
        description: 'Verify configured slots',
        status: VerificationStatus.SUCCESS,
        actual: {
          slots,
          count: slots.length
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Slots Configuration',
        description: 'Failed to check slots',
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
        name: 'Slot Manager Enabled',
        description: 'Verify slot manager module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Slot Manager Enabled',
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
 * ERC3525 Slot Approvable Module Verifier
 */
class ERC3525SlotApprovableModuleVerifier implements IModuleVerifier {
  moduleType = 'slotApprovable';

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
        name: 'Slot Approvable Module Deployed',
        description: 'Verify slot approvable module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Slot Approvable Module Deployed',
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
      ERC3525_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      SLOT_APPROVABLE_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.slotApprovableModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Slot Approvable Link',
        description: 'Verify token points to slot approvable module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Slot Approvable Link',
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
        name: 'Slot Approvable → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Slot Approvable → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, SLOT_APPROVABLE_MODULE_ABI, provider);

    // Check enabled status
    try {
      const isEnabled = await moduleContract.enabled();
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Slot Approvable Enabled',
        description: 'Verify slot approvable module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Slot Approvable Enabled',
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
 * ERC3525 Value Exchange Module Verifier
 */
class ERC3525ValueExchangeModuleVerifier implements IModuleVerifier {
  moduleType = 'valueExchange';

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
        name: 'Value Exchange Module Deployed',
        description: 'Verify value exchange module contract exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Contract exists',
        actual: exists ? 'Deployed' : 'Not found',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Value Exchange Module Deployed',
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
      ERC3525_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      VALUE_EXCHANGE_MODULE_ABI,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract.valueExchangeModule();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Value Exchange Link',
        description: 'Verify token points to value exchange module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Value Exchange Link',
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
        name: 'Value Exchange → Token Link',
        description: 'Verify module points back to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: linkedTokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Value Exchange → Token Link',
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
    const moduleContract = new ethers.Contract(module.moduleAddress, VALUE_EXCHANGE_MODULE_ABI, provider);

    // Check supported slots
    try {
      const supportedSlots = await moduleContract.supportedSlots();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Supported Slots',
        description: 'Verify supported slots for value exchange',
        status: VerificationStatus.SUCCESS,
        actual: {
          slots: supportedSlots,
          count: supportedSlots.length
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Supported Slots',
        description: 'Failed to check supported slots',
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
        name: 'Value Exchange Enabled',
        description: 'Verify value exchange module is active',
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Value Exchange Enabled',
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
 * Main ERC3525 Semi-Fungible Token Verifier
 */
export class ERC3525Verifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC3525;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    
    // Register all ERC3525 module verifiers
    this.moduleVerifiers.set('slotManager', new ERC3525SlotManagerModuleVerifier());
    this.moduleVerifiers.set('slotApprovable', new ERC3525SlotApprovableModuleVerifier());
    this.moduleVerifiers.set('valueExchange', new ERC3525ValueExchangeModuleVerifier());
  }

  /**
   * Verify ERC3525 token deployment and configuration
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
      ERC3525_ABI,
      provider
    );

    // Check 1: Contract exists
    try {
      const code = await provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push({
        type: VerificationType.TOKEN_DEPLOYMENT,
        name: 'ERC3525 Semi-Fungible Token Deployed',
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
        name: 'ERC3525 Semi-Fungible Token Deployed',
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

    // Check 4: Value decimals
    try {
      const valueDecimals = await tokenContract.valueDecimals();

      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Value Decimals',
        description: 'Verify value decimals configuration',
        status: VerificationStatus.SUCCESS,
        actual: valueDecimals,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_CONFIGURATION,
        name: 'Value Decimals',
        description: 'Failed to read value decimals',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  /**
   * Verify ERC3525 modules
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
