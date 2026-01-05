/**
 * ERC20 Rebasing Token Verifier
 * 
 * Handles verification of ERC20 rebasing tokens with elastic supply:
 * - Automatic balance adjustments
 * - Supply expansion/contraction
 * - Rebase events and tracking
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

// ERC20 Rebasing ABI
const ERC20_REBASING_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  // Rebasing-specific functions
  'function rebase() external returns (uint256)',
  'function rebaseIndex() view returns (uint256)',
  'function lastRebaseTime() view returns (uint256)',
  'function rebaseFrequency() view returns (uint256)',
  'function scaledTotalSupply() view returns (uint256)',
  'function scaledBalanceOf(address) view returns (uint256)',
  'event Rebase(uint256 indexed epoch, uint256 prevRebaseIndex, uint256 newRebaseIndex, uint256 totalSupply)'
];

/**
 * ERC20 Rebasing Token Verifier
 * Verifies tokens with elastic supply that automatically adjust balances
 */
export class ERC20RebasingVerifier implements ITokenStandardVerifier {
  standard = TokenStandard.ERC20_REBASING;
  private moduleVerifiers: Map<string, IModuleVerifier>;

  constructor() {
    this.moduleVerifiers = new Map();
    // Universal modules can be added here if needed
  }

  private createCheck(
    type: VerificationType,
    name: string,
    status: VerificationStatus,
    message: string,
    expected?: any,
    actual?: any,
    description?: string
  ): VerificationCheck {
    return {
      type,
      name,
      description: description || message,
      status,
      expected,
      actual,
      timestamp: Date.now()
    };
  }

  async verifyToken(
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];
    const provider = (globalThis as any).__verificationProvider as ethers.JsonRpcProvider;

    try {
      if (!provider) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_DEPLOYMENT,
          'Provider Initialization',
          VerificationStatus.FAILED,
          'Provider not initialized'
        ));
        return checks;
      }

      // Check contract exists
      const code = await provider.getCode(context.deployment.contractAddress);
      const exists = code !== '0x';

      checks.push(this.createCheck(
        VerificationType.TOKEN_DEPLOYMENT,
        'Rebasing Token Contract Deployed',
        exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        exists
          ? `Rebasing token contract deployed at ${context.deployment.contractAddress}`
          : `Rebasing token contract not found at ${context.deployment.contractAddress}`,
        'Contract deployed',
        exists ? 'Deployed' : 'Not deployed'
      ));

      if (!exists) return checks;

      const contract = new ethers.Contract(
        context.deployment.contractAddress,
        ERC20_REBASING_ABI,
        provider
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

      // Verify total supply (current elastic supply)
      try {
        const totalSupply = await contract.totalSupply();
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Total Supply (Elastic)',
          VerificationStatus.SUCCESS,
          `Current total supply: ${ethers.formatUnits(totalSupply, 18)}`,
          undefined,
          totalSupply.toString(),
          'This is the current elastic supply after rebases'
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Total Supply',
          VerificationStatus.WARNING,
          `Could not read total supply: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify scaled total supply (underlying fixed supply)
      try {
        const scaledSupply = await contract.scaledTotalSupply();
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Scaled Total Supply',
          VerificationStatus.SUCCESS,
          `Scaled (underlying) supply: ${ethers.formatUnits(scaledSupply, 18)}`,
          undefined,
          scaledSupply.toString(),
          'This is the underlying fixed supply before rebase multiplier'
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Scaled Total Supply',
          VerificationStatus.WARNING,
          `Could not read scaled supply: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify rebase index
      try {
        const rebaseIndex = await contract.rebaseIndex();
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Rebase Index',
          VerificationStatus.SUCCESS,
          `Current rebase index: ${ethers.formatUnits(rebaseIndex, 18)}`,
          undefined,
          rebaseIndex.toString(),
          'Multiplier applied to scaled balances to get current balances'
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Rebase Index',
          VerificationStatus.WARNING,
          `Could not read rebase index: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify last rebase time
      try {
        const lastRebaseTime = await contract.lastRebaseTime();
        const date = new Date(Number(lastRebaseTime) * 1000);
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Last Rebase Time',
          VerificationStatus.SUCCESS,
          `Last rebase: ${date.toISOString()}`,
          undefined,
          lastRebaseTime.toString(),
          'Timestamp of the most recent rebase event'
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_STATE,
          'Last Rebase Time',
          VerificationStatus.WARNING,
          `Could not read last rebase time: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Verify rebase frequency
      try {
        const frequency = await contract.rebaseFrequency();
        const hours = Number(frequency) / 3600;
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Rebase Frequency',
          VerificationStatus.SUCCESS,
          `Rebase frequency: ${hours} hours`,
          undefined,
          frequency.toString(),
          'Time between automatic rebases'
        ));
      } catch (error) {
        checks.push(this.createCheck(
          VerificationType.TOKEN_CONFIGURATION,
          'Rebase Frequency',
          VerificationStatus.WARNING,
          `Could not read rebase frequency: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

    } catch (error) {
      checks.push(this.createCheck(
        VerificationType.TOKEN_DEPLOYMENT,
        'Rebasing Token Verification',
        VerificationStatus.FAILED,
        `Error verifying rebasing token: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          issues: [`No verifier available for module type: ${module.moduleType}`],
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
        issues: allChecks
          .filter(c => c.status === VerificationStatus.FAILED)
          .map(c => c.description || c.name),
        warnings: allChecks
          .filter(c => c.status === VerificationStatus.WARNING)
          .map(c => c.description || c.name)
      });
    }

    return results;
  }

  registerModule(moduleType: string, verifier: IModuleVerifier): void {
    this.moduleVerifiers.set(moduleType, verifier);
  }
}
