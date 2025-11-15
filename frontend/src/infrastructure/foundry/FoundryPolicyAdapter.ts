/**
 * Foundry Policy Adapter
 * Connects frontend PolicyEngine to on-chain PolicyEngine.sol contract
 * Provides dual-layer policy enforcement: off-chain (DB) + on-chain (smart contract)
 */

import { ethers } from 'ethers';
import type { SupportedChain } from '../web3/adapters/IBlockchainAdapter';
import type { CryptoOperation } from '../policy/types';

// PolicyEngine.sol ABI (minimal interface needed)
const POLICY_ENGINE_ABI = [
  'function validateOperation(address token, address operator, string operationType, uint256 amount) external returns (bool approved, string reason)',
  'function validateOperationWithTarget(address token, address operator, address target, string operationType, uint256 amount) external returns (bool approved, string reason)',
  'function canOperate(address token, address operator, string operationType, uint256 amount) external view returns (bool, string)',
  'function getPolicy(address token, string operationType) external view returns (tuple(bool active, uint256 maxAmount, uint256 dailyLimit, uint256 cooldownPeriod, bool requiresApproval, uint8 approvalThreshold))',
  'function getRemainingDailyLimit(address token, address operator, string operationType) external view returns (uint256)',
  'function requestApproval(address token, string operationType, uint256 amount, address target) external returns (uint256 requestId)',
  'function approveRequest(address token, uint256 requestId) external',
  'function isOperationApproved(address token, uint256 requestId) external view returns (bool)',
  'event OperationValidated(address indexed token, address indexed operator, string operationType, uint256 amount, bool approved)',
  'event PolicyViolation(address indexed token, address indexed operator, string operationType, string reason)'
] as const;

export interface OnChainPolicy {
  active: boolean;
  maxAmount: bigint;
  dailyLimit: bigint;
  cooldownPeriod: bigint;
  requiresApproval: boolean;
  approvalThreshold: number;
}

export interface ValidationResult {
  approved: boolean;
  reason: string;
  onChainValidated: boolean;
}

export interface FoundryPolicyConfig {
  policyEngineAddress: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

export class FoundryPolicyAdapter {
  private policyEngineContract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(config: FoundryPolicyConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    
    this.policyEngineContract = new ethers.Contract(
      config.policyEngineAddress,
      POLICY_ENGINE_ABI,
      this.signer || this.provider
    );
  }

  /**
   * Validate operation against on-chain policy (view function - no gas)
   */
  async canOperate(
    tokenAddress: string,
    operator: string,
    operation: CryptoOperation
  ): Promise<ValidationResult> {
    try {
      const amount = this.formatAmount(operation.amount);
      const operationType = this.mapOperationType(operation.type);

      const [approved, reason] = await this.policyEngineContract.canOperate(
        tokenAddress,
        operator,
        operationType,
        amount
      );

      return {
        approved,
        reason: reason || '',
        onChainValidated: true
      };
    } catch (error: any) {
      console.error('On-chain validation failed:', error);
      return {
        approved: false,
        reason: `On-chain validation error: ${error.message}`,
        onChainValidated: false
      };
    }
  }

  /**
   * Execute on-chain validation (creates transaction)
   * Only call this when actually executing the operation
   */
  async validateOperation(
    tokenAddress: string,
    operator: string,
    operation: CryptoOperation,
    target?: string
  ): Promise<ValidationResult> {
    if (!this.signer) {
      throw new Error('Signer required for transaction validation');
    }

    try {
      const amount = this.formatAmount(operation.amount);
      const operationType = this.mapOperationType(operation.type);

      let tx;
      if (target) {
        tx = await this.policyEngineContract.validateOperationWithTarget(
          tokenAddress,
          operator,
          target,
          operationType,
          amount
        );
      } else {
        tx = await this.policyEngineContract.validateOperation(
          tokenAddress,
          operator,
          operationType,
          amount
        );
      }

      const receipt = await tx.wait();

      // Parse validation event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.policyEngineContract.interface.parseLog(log);
          return parsed?.name === 'OperationValidated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.policyEngineContract.interface.parseLog(event);
        return {
          approved: parsed?.args.approved || false,
          reason: '',
          onChainValidated: true
        };
      }

      // Check for violation event
      const violation = receipt.logs.find((log: any) => {
        try {
          const parsed = this.policyEngineContract.interface.parseLog(log);
          return parsed?.name === 'PolicyViolation';
        } catch {
          return false;
        }
      });

      if (violation) {
        const parsed = this.policyEngineContract.interface.parseLog(violation);
        return {
          approved: false,
          reason: parsed?.args.reason || 'Policy violation',
          onChainValidated: true
        };
      }

      return {
        approved: true,
        reason: '',
        onChainValidated: true
      };
    } catch (error: any) {
      return {
        approved: false,
        reason: `Transaction failed: ${error.message}`,
        onChainValidated: false
      };
    }
  }

  /**
   * Get on-chain policy for token and operation
   */
  async getPolicy(
    tokenAddress: string,
    operationType: string
  ): Promise<OnChainPolicy | null> {
    try {
      const policy = await this.policyEngineContract.getPolicy(
        tokenAddress,
        operationType
      );

      return {
        active: policy.active,
        maxAmount: policy.maxAmount,
        dailyLimit: policy.dailyLimit,
        cooldownPeriod: policy.cooldownPeriod,
        requiresApproval: policy.requiresApproval,
        approvalThreshold: policy.approvalThreshold
      };
    } catch (error) {
      console.error('Failed to get on-chain policy:', error);
      return null;
    }
  }

  /**
   * Get remaining daily limit for operator
   */
  async getRemainingDailyLimit(
    tokenAddress: string,
    operator: string,
    operationType: string
  ): Promise<bigint> {
    try {
      return await this.policyEngineContract.getRemainingDailyLimit(
        tokenAddress,
        operator,
        operationType
      );
    } catch (error) {
      console.error('Failed to get remaining daily limit:', error);
      return BigInt(0);
    }
  }

  /**
   * Request approval for operation requiring multi-sig
   */
  async requestApproval(
    tokenAddress: string,
    operation: CryptoOperation,
    target?: string
  ): Promise<number> {
    if (!this.signer) {
      throw new Error('Signer required for approval requests');
    }

    const amount = this.formatAmount(operation.amount);
    const operationType = this.mapOperationType(operation.type);

    const tx = await this.policyEngineContract.requestApproval(
      tokenAddress,
      operationType,
      amount,
      target || ethers.ZeroAddress
    );

    const receipt = await tx.wait();

    // Parse ApprovalRequested event to get requestId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.policyEngineContract.interface.parseLog(log);
        return parsed?.name === 'ApprovalRequested';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = this.policyEngineContract.interface.parseLog(event);
      return Number(parsed?.args.requestId || 0);
    }

    throw new Error('Failed to parse request ID from event');
  }

  /**
   * Check if approval request has been approved
   */
  async isOperationApproved(
    tokenAddress: string,
    requestId: number
  ): Promise<boolean> {
    try {
      return await this.policyEngineContract.isOperationApproved(
        tokenAddress,
        requestId
      );
    } catch (error) {
      console.error('Failed to check approval status:', error);
      return false;
    }
  }

  /**
   * Helper: Format amount for smart contract
   */
  private formatAmount(amount?: string | bigint): bigint {
    if (!amount) return BigInt(0);
    if (typeof amount === 'bigint') return amount;
    return ethers.parseUnits(amount, 18); // Assuming 18 decimals
  }

  /**
   * Helper: Map frontend operation type to contract operation type
   */
  private mapOperationType(type: string): string {
    const typeMap: Record<string, string> = {
      'mint': 'mint',
      'burn': 'burn',
      'transfer': 'transfer',
      'lock': 'lock',
      'unlock': 'unlock',
      'block': 'block',
      'unblock': 'unblock',
      'pause': 'pause',
      'unpause': 'unpause'
    };
    return typeMap[type] || type;
  }
}
