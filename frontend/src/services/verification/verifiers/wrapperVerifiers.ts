/**
 * Token Wrapper Verifiers
 * 
 * Handles verification of token wrapper contracts:
 * - ERC20WrapperMaster - Wraps ERC20 tokens
 * - ERC721WrapperMaster - Wraps ERC721 tokens (NFTs)
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
  VerificationType
} from '../types';

// ============================================================================
// ERC20 WRAPPER VERIFIER
// ============================================================================

const ERC20_WRAPPER_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function underlying() view returns (address)',
  'function depositFor(address account, uint256 amount) external returns (bool)',
  'function withdrawTo(address account, uint256 amount) external returns (bool)'
];

/**
 * ERC20 Wrapper Token Verifier
 * Verifies wrapped ERC20 tokens
 */
export class ERC20WrapperVerifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC20_WRAPPER;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    // Universal modules can be added here if needed
  }

  private createCheck(
    type: VerificationType,
    name: string,
    status: VerificationStatus,
    description: string,
    expected?: any,
    actual?: any,
    details?: Record<string, any>
  ): VerificationCheck {
    return {
      type,
      name,
      status,
      description,
      expected,
      actual,
      details,
      timestamp: Date.now()
    };
  }

  async verifyToken(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      // Check contract exists
      const code = await context.provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push(this.createCheck(
        VerificationType.TOKEN_DEPLOYMENT,
        'Wrapper Contract Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Wrapper contract deployed at ${context.deployment.contractAddress}`
          : `Wrapper contract not found at ${context.deployment.contractAddress}`,
        'Contract deployed',
        exists ? 'Deployed' : 'Not deployed'
      ));

      if (!exists) return checks;

      const contract = new ethers.Contract(
        context.deployment.contractAddress,
        ERC20_WRAPPER_ABI,
        context.provider
      );

      // Verify name
      try {
        const name = await contract.name();
        const expectedName = context.expectedConfiguration?.name;
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Name',
          expectedName && name !== expectedName 
            ? VerificationStatus.WARNING 
            : VerificationStatus.SUCCESS,
          expectedName && name !== expectedName
            ? 'Token name does not match expected value'
            : `Token name: ${name}`,
          expectedName,
          name
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Name',
          VerificationStatus.FAILED,
          `Error reading token name: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify symbol
      try {
        const symbol = await contract.symbol();
        const expectedSymbol = context.expectedConfiguration?.symbol;
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Symbol',
          expectedSymbol && symbol !== expectedSymbol 
            ? VerificationStatus.WARNING 
            : VerificationStatus.SUCCESS,
          expectedSymbol && symbol !== expectedSymbol
            ? 'Token symbol does not match expected value'
            : `Token symbol: ${symbol}`,
          expectedSymbol,
          symbol
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Symbol',
          VerificationStatus.FAILED,
          `Error reading token symbol: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify decimals
      try {
        const decimals = await contract.decimals();
        const expectedDecimals = context.expectedConfiguration?.decimals;
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Decimals',
          expectedDecimals && decimals !== expectedDecimals 
            ? VerificationStatus.WARNING 
            : VerificationStatus.SUCCESS,
          expectedDecimals && decimals !== expectedDecimals
            ? 'Token decimals do not match expected value'
            : `Token decimals: ${decimals}`,
          expectedDecimals,
          decimals
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Decimals',
          VerificationStatus.FAILED,
          `Error reading token decimals: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify underlying token
      try {
        const underlying = await contract.underlying();
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Underlying Token',
          VerificationStatus.SUCCESS,
          `Wraps underlying token: ${underlying}`,
          undefined,
          underlying
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Underlying Token',
          VerificationStatus.FAILED,
          `Error reading underlying token: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify total supply
      try {
        const totalSupply = await contract.totalSupply();
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Total Supply',
          VerificationStatus.SUCCESS,
          `Total wrapped supply: ${ethers.formatUnits(totalSupply, 18)}`,
          undefined,
          totalSupply.toString()
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Total Supply',
          VerificationStatus.WARNING,
          `Could not read total supply: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.TOKEN_DEPLOYMENT,
        'Wrapper Token Verification',
        VerificationStatus.FAILED,
        `Error verifying wrapper token: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

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
          checks: [
            this.createCheck(
              VerificationType.MODULE_DEPLOYMENT,
              'Module Verifier',
              VerificationStatus.SKIPPED,
              `No verifier found for module type: ${module.moduleType}`
            )
          ],
          issues: [],
          warnings: []
        });
        continue;
      }

      const deploymentChecks = await verifier.verifyDeployment(module, context, options);
      const linkageChecks = await verifier.verifyLinkage(module, context, options);
      const configChecks = await verifier.verifyConfiguration(module, context, options);

      const allChecks = [...deploymentChecks, ...linkageChecks, ...configChecks];
      const hasFailure = allChecks.some(c => c.status === VerificationStatus.FAILED);
      const hasWarning = allChecks.some(c => c.status === VerificationStatus.WARNING);

      results.push({
        moduleType: module.moduleType,
        moduleAddress: module.moduleAddress,
        deploymentVerified: !deploymentChecks.some(c => c.status === VerificationStatus.FAILED),
        linkageVerified: !linkageChecks.some(c => c.status === VerificationStatus.FAILED),
        configurationVerified: !configChecks.some(c => c.status === VerificationStatus.FAILED),
        checks: allChecks,
        issues: allChecks.filter(c => c.status === VerificationStatus.FAILED).map(c => c.description),
        warnings: allChecks.filter(c => c.status === VerificationStatus.WARNING).map(c => c.description)
      });
    }

    return results;
  }

  registerModule(moduleType: string, verifier: IModuleVerifier): void {
    this.moduleVerifiers.set(moduleType, verifier);
  }
}

// ============================================================================
// ERC721 WRAPPER VERIFIER
// ============================================================================

const ERC721_WRAPPER_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function underlying() view returns (address)',
  'function depositFor(address account, uint256[] tokenIds) external',
  'function withdrawTo(address account, uint256[] tokenIds) external',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

/**
 * ERC721 Wrapper Token Verifier
 * Verifies wrapped ERC721 tokens (NFTs)
 */
export class ERC721WrapperVerifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC721_WRAPPER;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    // Universal modules can be added here if needed
  }

  private createCheck(
    type: VerificationType,
    name: string,
    status: VerificationStatus,
    description: string,
    expected?: any,
    actual?: any,
    details?: Record<string, any>
  ): VerificationCheck {
    return {
      type,
      name,
      status,
      description,
      expected,
      actual,
      details,
      timestamp: Date.now()
    };
  }

  async verifyToken(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    try {
      if (!context.provider) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      // Check contract exists
      const code = await context.provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push(this.createCheck(
        VerificationType.TOKEN_DEPLOYMENT,
        'Wrapper Contract Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Wrapper contract deployed at ${context.deployment.contractAddress}`
          : `Wrapper contract not found at ${context.deployment.contractAddress}`,
        'Contract deployed',
        exists ? 'Deployed' : 'Not deployed'
      ));

      if (!exists) return checks;

      const contract = new ethers.Contract(
        context.deployment.contractAddress,
        ERC721_WRAPPER_ABI,
        context.provider
      );

      // Verify name
      try {
        const name = await contract.name();
        const expectedName = context.expectedConfiguration?.name;
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Name',
          expectedName && name !== expectedName 
            ? VerificationStatus.WARNING 
            : VerificationStatus.SUCCESS,
          expectedName && name !== expectedName
            ? 'Token name does not match expected value'
            : `Token name: ${name}`,
          expectedName,
          name
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Name',
          VerificationStatus.FAILED,
          `Error reading token name: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify symbol
      try {
        const symbol = await contract.symbol();
        const expectedSymbol = context.expectedConfiguration?.symbol;
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Symbol',
          expectedSymbol && symbol !== expectedSymbol 
            ? VerificationStatus.WARNING 
            : VerificationStatus.SUCCESS,
          expectedSymbol && symbol !== expectedSymbol
            ? 'Token symbol does not match expected value'
            : `Token symbol: ${symbol}`,
          expectedSymbol,
          symbol
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Token Symbol',
          VerificationStatus.FAILED,
          `Error reading token symbol: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify underlying token
      try {
        const underlying = await contract.underlying();
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Underlying NFT',
          VerificationStatus.SUCCESS,
          `Wraps underlying NFT: ${underlying}`,
          undefined,
          underlying
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Underlying NFT',
          VerificationStatus.FAILED,
          `Error reading underlying NFT: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify total supply (wrapped NFTs count)
      try {
        const totalSupply = await contract.totalSupply();
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Total Wrapped',
          VerificationStatus.SUCCESS,
          `Total wrapped NFTs: ${totalSupply.toString()}`,
          undefined,
          totalSupply.toString()
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Total Wrapped',
          VerificationStatus.WARNING,
          `Could not read wrapped count: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.TOKEN_DEPLOYMENT,
        'Wrapper NFT Verification',
        VerificationStatus.FAILED,
        `Error verifying wrapper NFT: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }

    return checks;
  }

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
          checks: [
            this.createCheck(
              VerificationType.MODULE_DEPLOYMENT,
              'Module Verifier',
              VerificationStatus.SKIPPED,
              `No verifier found for module type: ${module.moduleType}`
            )
          ],
          issues: [],
          warnings: []
        });
        continue;
      }

      const deploymentChecks = await verifier.verifyDeployment(module, context, options);
      const linkageChecks = await verifier.verifyLinkage(module, context, options);
      const configChecks = await verifier.verifyConfiguration(module, context, options);

      const allChecks = [...deploymentChecks, ...linkageChecks, ...configChecks];
      const hasFailure = allChecks.some(c => c.status === VerificationStatus.FAILED);
      const hasWarning = allChecks.some(c => c.status === VerificationStatus.WARNING);

      results.push({
        moduleType: module.moduleType,
        moduleAddress: module.moduleAddress,
        deploymentVerified: !deploymentChecks.some(c => c.status === VerificationStatus.FAILED),
        linkageVerified: !linkageChecks.some(c => c.status === VerificationStatus.FAILED),
        configurationVerified: !configChecks.some(c => c.status === VerificationStatus.FAILED),
        checks: allChecks,
        issues: allChecks.filter(c => c.status === VerificationStatus.FAILED).map(c => c.description),
        warnings: allChecks.filter(c => c.status === VerificationStatus.WARNING).map(c => c.description)
      });
    }

    return results;
  }

  registerModule(moduleType: string, verifier: IModuleVerifier): void {
    this.moduleVerifiers.set(moduleType, verifier);
  }
}
