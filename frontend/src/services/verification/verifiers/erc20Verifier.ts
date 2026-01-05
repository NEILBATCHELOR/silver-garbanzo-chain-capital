/**
 * ERC20 Token Verifier
 * 
 * Handles verification of ERC20 tokens including:
 * - Basic ERC20 standard compliance
 * - Token configuration (name, symbol, decimals, supply)
 * - Module verification (fees, vesting, etc.)
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
import {
  ERC20VestingModuleVerifier,
  ERC20TimelockModuleVerifier,
  ERC20VotesModuleVerifier,
  ERC20PermitModuleVerifier,
  ERC20SnapshotModuleVerifier,
  ERC20FlashMintModuleVerifier,
  ERC20TemporaryApprovalModuleVerifier,
  ERC20ComplianceModuleVerifier
} from './erc20ModuleVerifiers';

// ERC20 ABI (minimal for verification)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  // Module linkage
  'function feesModule() view returns (address)',
  'function vestingModule() view returns (address)'
];

// Fees Module ABI
const FEES_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function getFeeConfig() view returns (tuple(address feeRecipient, uint256 transferFee, uint256 buyFee, uint256 sellFee, bool enabled))',
  'function enabled() view returns (bool)'
];

/**
 * ERC20 Token Verifier
 */
export class ERC20Verifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC20;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    
    // Register all ERC20 module verifiers
    this.moduleVerifiers.set('fees', new ERC20FeesModuleVerifier());
    this.moduleVerifiers.set('vesting', new ERC20VestingModuleVerifier());
    this.moduleVerifiers.set('timelock', new ERC20TimelockModuleVerifier());
    this.moduleVerifiers.set('votes', new ERC20VotesModuleVerifier());
    this.moduleVerifiers.set('permit', new ERC20PermitModuleVerifier());
    this.moduleVerifiers.set('snapshot', new ERC20SnapshotModuleVerifier());
    this.moduleVerifiers.set('flashMint', new ERC20FlashMintModuleVerifier());
    this.moduleVerifiers.set('temporaryApproval', new ERC20TemporaryApprovalModuleVerifier());
    this.moduleVerifiers.set('compliance', new ERC20ComplianceModuleVerifier());
  }

  /**
   * Verify ERC20 token deployment and configuration
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
      ERC20_ABI,
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

    // Check 4: Token decimals
    if (context.expectedConfiguration?.decimals !== undefined) {
      try {
        const actualDecimals = await tokenContract.decimals();
        const matches = Number(actualDecimals) === context.expectedConfiguration.decimals;

        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Token Decimals',
          description: 'Verify token decimals matches configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: context.expectedConfiguration.decimals,
          actual: Number(actualDecimals),
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.TOKEN_CONFIGURATION,
          name: 'Token Decimals',
          description: 'Failed to fetch token decimals',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    // Check 5: Total supply
    try {
      const totalSupply = await tokenContract.totalSupply();
      const supplyStr = ethers.formatUnits(totalSupply, context.expectedConfiguration?.decimals || 18);

      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Supply',
        description: 'Fetch current total supply',
        status: VerificationStatus.SUCCESS,
        actual: supplyStr,
        timestamp: Date.now(),
        details: {
          wei: totalSupply.toString(),
          formatted: supplyStr
        }
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.TOKEN_STATE,
        name: 'Total Supply',
        description: 'Failed to fetch total supply',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }

  /**
   * Verify all modules for this token
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
            name: `${module.moduleType} Module`,
            description: `No verifier available for ${module.moduleType}`,
            status: VerificationStatus.SKIPPED,
            timestamp: Date.now()
          }],
          issues: [`No verifier for module type: ${module.moduleType}`],
          warnings: []
        });
        continue;
      }

      try {
        const deploymentChecks = await verifier.verifyDeployment(module, context, options);
        const linkageChecks = await verifier.verifyLinkage(module, context, options);
        const configChecks = await verifier.verifyConfiguration(module, context, options);

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
      } catch (error: any) {
        results.push({
          moduleType: module.moduleType,
          moduleAddress: module.moduleAddress,
          deploymentVerified: false,
          linkageVerified: false,
          configurationVerified: false,
          checks: [{
            type: VerificationType.MODULE_DEPLOYMENT,
            name: `${module.moduleType} Module Verification`,
            description: `Failed to verify module`,
            status: VerificationStatus.FAILED,
            error: error.message,
            timestamp: Date.now()
          }],
          issues: [`Module verification failed: ${error.message}`],
          warnings: []
        });
      }
    }

    return results;
  }
}

/**
 * ERC20 Fees Module Verifier
 */
class ERC20FeesModuleVerifier implements IModuleVerifier {
  moduleType = 'fees';

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
        name: 'Fees Module Deployed',
        description: 'Verify fees module bytecode exists',
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: 'Fees Module Deployed',
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

    if (!provider) {
      throw new Error('Provider not available');
    }

    const tokenContract = new ethers.Contract(
      context.deployment.contractAddress,
      ERC20_ABI,
      provider
    );

    const moduleContract = new ethers.Contract(
      module.moduleAddress,
      FEES_MODULE_ABI,
      provider
    );

    // Check 1: Token → Module linkage
    try {
      const feesModuleAddress = await tokenContract.feesModule();
      const matches = feesModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Fees Module Link',
        description: 'Verify token.feesModule points to fees module',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: feesModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Token → Fees Module Link',
        description: 'Failed to check token linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check 2: Module → Token linkage
    try {
      const tokenAddress = await moduleContract.tokenContract();
      const matches = tokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fees Module → Token Link',
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: 'Fees Module → Token Link',
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
      FEES_MODULE_ABI,
      provider
    );

    try {
      const feeConfig = await moduleContract.getFeeConfig();
      const [feeRecipient, transferFee, buyFee, sellFee, enabled] = feeConfig;

      // Check enabled status
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fees Module Enabled',
        description: 'Verify fees module is enabled',
        status: enabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: enabled,
        timestamp: Date.now()
      });

      // Check fee recipient
      if (module.configuration?.feeRecipient) {
        const matches = feeRecipient.toLowerCase() === module.configuration.feeRecipient.toLowerCase();
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Fee Recipient',
          description: 'Verify fee recipient matches configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: module.configuration.feeRecipient,
          actual: feeRecipient,
          timestamp: Date.now()
        });
      }

      // Check transfer fee
      if (module.configuration?.transferFee !== undefined) {
        const actualBps = Number(transferFee);
        const expectedBps = module.configuration.transferFee;
        const matches = actualBps === expectedBps;

        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Transfer Fee',
          description: 'Verify transfer fee matches configuration',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${expectedBps} basis points`,
          actual: `${actualBps} basis points`,
          timestamp: Date.now()
        });
      }

    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Fees Module Configuration',
        description: 'Failed to fetch module configuration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}
