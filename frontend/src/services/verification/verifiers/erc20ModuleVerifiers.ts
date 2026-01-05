/**
 * ERC20 Module Verifiers
 * 
 * Complete set of module verifiers for ERC20 tokens:
 * - VestingModule - Token vesting schedules
 * - TimelockModule - Time-locked transfers
 * - VotesModule - Governance voting (ERC20Votes)
 * - PermitModule - Gasless approvals (EIP-2612)
 * - SnapshotModule - Balance snapshots
 * - FlashMintModule - Flash loans (ERC3156)
 * - TemporaryApprovalModule - Time-limited approvals
 * - ComplianceModule - Regulatory compliance
 */

import { ethers } from 'ethers';
import {
  IModuleVerifier,
  VerificationContext,
  VerificationOptions,
  VerificationCheck,
  VerificationStatus,
  VerificationType,
  ModuleDeploymentData
} from '../types';

// Module ABIs
const VESTING_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function vestingSchedule(address) view returns (uint256 totalAmount, uint256 releasedAmount, uint256 startTime, uint256 duration, uint256 cliffDuration)',
  'function getVestingSchedule(address) view returns (tuple(uint256 totalAmount, uint256 releasedAmount, uint256 startTime, uint256 duration, uint256 cliffDuration))'
];

const TIMELOCK_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function lockDuration() view returns (uint256)',
  'function getLockedBalance(address) view returns (uint256)',
  'function getUnlockTime(address) view returns (uint256)'
];

const VOTES_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function getVotes(address) view returns (uint256)',
  'function getPastVotes(address, uint256) view returns (uint256)',
  'function getPastTotalSupply(uint256) view returns (uint256)',
  'function delegates(address) view returns (address)',
  'function checkpoints(address, uint32) view returns (tuple(uint32 fromBlock, uint224 votes))'
];

const PERMIT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function nonces(address) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)'
];

const SNAPSHOT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function getCurrentSnapshotId() view returns (uint256)',
  'function balanceOfAt(address, uint256) view returns (uint256)',
  'function totalSupplyAt(uint256) view returns (uint256)'
];

const FLASH_MINT_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function maxFlashLoan(address) view returns (uint256)',
  'function flashFee(address, uint256) view returns (uint256)'
];

const TEMPORARY_APPROVAL_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function getApprovalExpiry(address, address) view returns (uint256)',
  'function isApprovalActive(address, address) view returns (bool)'
];

const COMPLIANCE_MODULE_ABI = [
  'function tokenContract() view returns (address)',
  'function enabled() view returns (bool)',
  'function isWhitelisted(address) view returns (bool)',
  'function canTransfer(address, address, uint256) view returns (bool)',
  'function getTransferRestrictions(address) view returns (tuple(bool canSend, bool canReceive, uint256 maxAmount))'
];

const ERC20_ABI = [
  'function vestingModule() view returns (address)',
  'function timelockModule() view returns (address)',
  'function votesModule() view returns (address)',
  'function permitModule() view returns (address)',
  'function snapshotModule() view returns (address)',
  'function flashMintModule() view returns (address)',
  'function temporaryApprovalModule() view returns (address)',
  'function complianceModule() view returns (address)'
];

/**
 * Generic module verifier base class
 */
abstract class BaseERC20ModuleVerifier implements IModuleVerifier {
  abstract moduleType: string;
  abstract moduleName: string;
  abstract moduleAbi: any[];
  abstract tokenLinkageMethod: string;

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
        name: `${this.moduleName} Module Deployed`,
        description: `Verify ${this.moduleName.toLowerCase()} module bytecode exists`,
        status: exists ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Module bytecode exists',
        actual: exists ? 'Module deployed' : 'No contract at address',
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_DEPLOYMENT,
        name: `${this.moduleName} Module Deployed`,
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
      this.moduleAbi,
      provider
    );

    // Check Token → Module linkage
    try {
      const linkedModuleAddress = await tokenContract[this.tokenLinkageMethod]();
      const matches = linkedModuleAddress.toLowerCase() === module.moduleAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: `Token → ${this.moduleName} Module Link`,
        description: `Verify token.${this.tokenLinkageMethod} points to ${this.moduleName.toLowerCase()} module`,
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: module.moduleAddress,
        actual: linkedModuleAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: `Token → ${this.moduleName} Module Link`,
        description: 'Failed to check token linkage',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Check Module → Token linkage
    try {
      const tokenAddress = await moduleContract.tokenContract();
      const matches = tokenAddress.toLowerCase() === context.deployment.contractAddress.toLowerCase();

      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: `${this.moduleName} Module → Token Link`,
        description: 'Verify module.tokenContract points to token',
        status: matches ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: context.deployment.contractAddress,
        actual: tokenAddress,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_LINKAGE,
        name: `${this.moduleName} Module → Token Link`,
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
      this.moduleAbi,
      provider
    );

    // Check enabled status
    try {
      const isEnabled = await moduleContract.enabled();

      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: `${this.moduleName} Module Enabled`,
        description: `Verify ${this.moduleName.toLowerCase()} module is enabled`,
        status: isEnabled ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
        expected: true,
        actual: isEnabled,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: `${this.moduleName} Module Enabled`,
        description: 'Failed to check enabled status',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    // Additional configuration checks
    const additionalChecks = await this.verifyAdditionalConfiguration(module, moduleContract, context, options);
    checks.push(...additionalChecks);

    return checks;
  }

  /**
   * Override this for module-specific configuration checks
   */
  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    return [];
  }
}

/**
 * Vesting Module Verifier
 */
export class ERC20VestingModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'vesting';
  moduleName = 'Vesting';
  moduleAbi = VESTING_MODULE_ABI;
  tokenLinkageMethod = 'vestingModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check vesting schedule if beneficiary address is provided
    if (module.configuration?.beneficiary) {
      try {
        const schedule = await moduleContract.getVestingSchedule(module.configuration.beneficiary);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Vesting Schedule Exists',
          description: 'Verify vesting schedule configured for beneficiary',
          status: schedule.totalAmount > 0 ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: 'Schedule configured',
          actual: schedule.totalAmount > 0 ? 'Configured' : 'Not configured',
          timestamp: Date.now(),
          details: {
            totalAmount: schedule.totalAmount.toString(),
            releasedAmount: schedule.releasedAmount.toString(),
            startTime: schedule.startTime.toString(),
            duration: schedule.duration.toString()
          }
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Vesting Schedule',
          description: 'Failed to fetch vesting schedule',
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
 * Timelock Module Verifier
 */
export class ERC20TimelockModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'timelock';
  moduleName = 'Timelock';
  moduleAbi = TIMELOCK_MODULE_ABI;
  tokenLinkageMethod = 'timelockModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check lock duration
    try {
      const lockDuration = await moduleContract.lockDuration();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Lock Duration',
        description: 'Verify timelock duration configuration',
        status: VerificationStatus.SUCCESS,
        actual: `${lockDuration.toString()} seconds`,
        timestamp: Date.now()
      });

      if (module.configuration?.expectedLockDuration) {
        const matches = lockDuration === BigInt(module.configuration.expectedLockDuration);
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Lock Duration Match',
          description: 'Verify lock duration matches expected',
          status: matches ? VerificationStatus.SUCCESS : VerificationStatus.WARNING,
          expected: `${module.configuration.expectedLockDuration} seconds`,
          actual: `${lockDuration.toString()} seconds`,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Lock Duration',
        description: 'Failed to fetch lock duration',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Votes Module Verifier (ERC20Votes)
 */
export class ERC20VotesModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'votes';
  moduleName = 'Votes';
  moduleAbi = VOTES_MODULE_ABI;
  tokenLinkageMethod = 'votesModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check if voting power tracking works
    if (module.configuration?.testAddress) {
      try {
        const votes = await moduleContract.getVotes(module.configuration.testAddress);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Voting Power Query',
          description: 'Verify voting power can be queried',
          status: VerificationStatus.SUCCESS,
          actual: `${votes.toString()} votes`,
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Voting Power Query',
          description: 'Failed to query voting power',
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
 * Permit Module Verifier (EIP-2612)
 */
export class ERC20PermitModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'permit';
  moduleName = 'Permit';
  moduleAbi = PERMIT_MODULE_ABI;
  tokenLinkageMethod = 'permitModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check DOMAIN_SEPARATOR
    try {
      const domainSeparator = await moduleContract.DOMAIN_SEPARATOR();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'EIP-712 Domain Separator',
        description: 'Verify EIP-712 domain separator is configured',
        status: domainSeparator !== ethers.ZeroHash ? VerificationStatus.SUCCESS : VerificationStatus.FAILED,
        expected: 'Valid domain separator',
        actual: domainSeparator !== ethers.ZeroHash ? 'Configured' : 'Not configured',
        timestamp: Date.now(),
        details: {
          domainSeparator
        }
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'EIP-712 Domain Separator',
        description: 'Failed to fetch domain separator',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Snapshot Module Verifier
 */
export class ERC20SnapshotModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'snapshot';
  moduleName = 'Snapshot';
  moduleAbi = SNAPSHOT_MODULE_ABI;
  tokenLinkageMethod = 'snapshotModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check current snapshot ID
    try {
      const currentSnapshotId = await moduleContract.getCurrentSnapshotId();
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Current Snapshot ID',
        description: 'Verify snapshot ID tracking',
        status: VerificationStatus.SUCCESS,
        actual: `Snapshot ID: ${currentSnapshotId.toString()}`,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Current Snapshot ID',
        description: 'Failed to fetch snapshot ID',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Flash Mint Module Verifier (ERC3156)
 */
export class ERC20FlashMintModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'flashMint';
  moduleName = 'Flash Mint';
  moduleAbi = FLASH_MINT_MODULE_ABI;
  tokenLinkageMethod = 'flashMintModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check max flash loan
    try {
      const tokenAddress = context.deployment.contractAddress;
      const maxLoan = await moduleContract.maxFlashLoan(tokenAddress);
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Max Flash Loan',
        description: 'Verify maximum flash loan amount',
        status: VerificationStatus.SUCCESS,
        actual: maxLoan.toString(),
        timestamp: Date.now()
      });

      // Check flash fee
      const testAmount = ethers.parseUnits('1000', 18);
      const flashFee = await moduleContract.flashFee(tokenAddress, testAmount);
      
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Flash Loan Fee',
        description: 'Verify flash loan fee calculation',
        status: VerificationStatus.SUCCESS,
        actual: `${flashFee.toString()} for 1000 tokens`,
        timestamp: Date.now()
      });
    } catch (error: any) {
      checks.push({
        type: VerificationType.MODULE_CONFIGURATION,
        name: 'Flash Loan Configuration',
        description: 'Failed to fetch flash loan parameters',
        status: VerificationStatus.FAILED,
        error: error.message,
        timestamp: Date.now()
      });
    }

    return checks;
  }
}

/**
 * Temporary Approval Module Verifier
 */
export class ERC20TemporaryApprovalModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'temporaryApproval';
  moduleName = 'Temporary Approval';
  moduleAbi = TEMPORARY_APPROVAL_MODULE_ABI;
  tokenLinkageMethod = 'temporaryApprovalModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Verify time-limited approval functionality
    if (module.configuration?.owner && module.configuration?.spender) {
      try {
        const expiry = await moduleContract.getApprovalExpiry(
          module.configuration.owner,
          module.configuration.spender
        );
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Approval Expiry',
          description: 'Verify approval expiry tracking',
          status: VerificationStatus.SUCCESS,
          actual: expiry > 0 ? `Expires at ${new Date(Number(expiry) * 1000).toISOString()}` : 'No active approval',
          timestamp: Date.now()
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Approval Expiry',
          description: 'Failed to check approval expiry',
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
 * Compliance Module Verifier
 */
export class ERC20ComplianceModuleVerifier extends BaseERC20ModuleVerifier {
  moduleType = 'compliance';
  moduleName = 'Compliance';
  moduleAbi = COMPLIANCE_MODULE_ABI;
  tokenLinkageMethod = 'complianceModule';

  protected async verifyAdditionalConfiguration(
    module: ModuleDeploymentData,
    moduleContract: ethers.Contract,
    context: VerificationContext,
    options: VerificationOptions
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    // Check whitelist functionality if test address provided
    if (module.configuration?.testAddress) {
      try {
        const isWhitelisted = await moduleContract.isWhitelisted(module.configuration.testAddress);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Whitelist Check',
          description: 'Verify whitelist functionality',
          status: VerificationStatus.SUCCESS,
          actual: isWhitelisted ? 'Whitelisted' : 'Not whitelisted',
          timestamp: Date.now()
        });

        // Check transfer restrictions
        const restrictions = await moduleContract.getTransferRestrictions(module.configuration.testAddress);
        
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Transfer Restrictions',
          description: 'Verify transfer restrictions configured',
          status: VerificationStatus.SUCCESS,
          timestamp: Date.now(),
          details: {
            canSend: restrictions.canSend,
            canReceive: restrictions.canReceive,
            maxAmount: restrictions.maxAmount.toString()
          }
        });
      } catch (error: any) {
        checks.push({
          type: VerificationType.MODULE_CONFIGURATION,
          name: 'Compliance Configuration',
          description: 'Failed to check compliance settings',
          status: VerificationStatus.FAILED,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }

    return checks;
  }
}
