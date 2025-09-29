/**
 * FoundryPolicyAdapter.ts
 * Bridge between off-chain policy engine and on-chain PolicyEngine contract
 */

import { ethers } from 'ethers';
import type { PolicyContext } from '../policy/types';
import type { PolicyRule } from '@/services/rule/enhancedRuleService';
import type { FoundryConfig } from './FoundryOperationExecutor';
import { supabase } from '../supabaseClient';

export interface OnChainPolicy {
  token: string;
  operation: string;
  maxAmount: bigint;
  dailyLimit: bigint;
  monthlyLimit: bigint;
  cooldownPeriod: number;
  requiresApproval: boolean;
  approvalThreshold: number;
  approvers: string[];
  active: boolean;
}

export interface PolicySyncResult {
  success: boolean;
  policiesSynced: number;
  errors: string[];
  transactionHashes: string[];
}

// PolicyEngine contract ABI
const POLICY_ENGINE_ABI = [
  "function registerTokenPolicy(address token, string operation, uint256 maxAmount, uint256 dailyLimit, uint256 monthlyLimit, uint256 cooldownPeriod) public",
  "function updateTokenPolicy(address token, string operation, uint256 maxAmount, uint256 dailyLimit, uint256 monthlyLimit, uint256 cooldownPeriod) public",
  "function deactivatePolicy(address token, string operation) public",
  "function activatePolicy(address token, string operation) public",
  "function setApprovalRequirement(address token, string operation, bool required, uint256 threshold, address[] approvers) public",
  "function validateOperation(address operator, address token, string operation, uint256 amount) public view returns (bool)",
  "function getPolicyDetails(address token, string operation) public view returns (bool active, uint256 maxAmount, uint256 dailyLimit, uint256 monthlyLimit, uint256 cooldownPeriod)",
  "function whitelistAddress(address account) public",
  "function blacklistAddress(address account) public",
  "function removeFromWhitelist(address account) public",
  "function removeFromBlacklist(address account) public",
  "function isWhitelisted(address account) public view returns (bool)",
  "function isBlacklisted(address account) public view returns (bool)",
  "event PolicyRegistered(address indexed token, string operation, uint256 maxAmount, uint256 dailyLimit)",
  "event PolicyUpdated(address indexed token, string operation)",
  "event OperationValidated(address indexed token, address indexed operator, string operation, uint256 amount)",
  "event OperationRejected(address indexed token, address indexed operator, string operation, string reason)"
];

export class FoundryPolicyAdapter {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private policyEngineAddress: string;
  private policyEngine: ethers.Contract;

  constructor(config: FoundryConfig & { policyEngineAddress: string }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.policyEngineAddress = config.policyEngineAddress;
    this.policyEngine = new ethers.Contract(
      this.policyEngineAddress,
      POLICY_ENGINE_ABI,
      this.signer
    );
  }

  /**
   * Sync database policies to on-chain PolicyEngine contract
   */
  async syncPoliciesToChain(tokenAddress: string): Promise<PolicySyncResult> {
    const result: PolicySyncResult = {
      success: false,
      policiesSynced: 0,
      errors: [],
      transactionHashes: []
    };

    try {
      // Fetch policies from database
      const { data: policies, error } = await supabase
        .from('policies')
        .select(`
          *,
          policy_operation_mappings!inner(operation_type)
        `)
        .eq('status', 'active')
        .eq('enforcement_level', 'strict');

      if (error) {
        result.errors.push(`Database error: ${error.message}`);
        return result;
      }

      if (!policies || policies.length === 0) {
        result.errors.push('No active policies found');
        return result;
      }

      // Sync each policy to chain
      for (const policy of policies) {
        try {
          const operation = policy.policy_operation_mappings[0]?.operation_type || 'transfer';
          
          // Extract limits from policy conditions
          const maxAmount = this.extractMaxAmount(policy.conditions);
          const dailyLimit = this.extractDailyLimit(policy.conditions);
          const monthlyLimit = this.extractMonthlyLimit(policy.conditions);
          const cooldownPeriod = this.extractCooldownPeriod(policy.conditions);

          // Register policy on-chain
          const tx = await this.policyEngine.registerTokenPolicy(
            tokenAddress,
            operation,
            maxAmount,
            dailyLimit,
            monthlyLimit,
            cooldownPeriod
          );

          const receipt = await tx.wait();
          result.transactionHashes.push(receipt.hash);
          result.policiesSynced++;

          console.log(`✅ Synced policy ${policy.name} for operation ${operation}`);
        } catch (policyError: any) {
          result.errors.push(`Failed to sync policy ${policy.name}: ${policyError.message}`);
        }
      }

      result.success = result.policiesSynced > 0;
      return result;

    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate operation against on-chain policies
   */
  async validateOnChain(
    operator: string,
    tokenAddress: string,
    operation: string,
    amount: string | bigint
  ): Promise<boolean> {
    try {
      const amountBigInt = typeof amount === 'string' ? 
        ethers.parseUnits(amount, 18) : amount;

      const isValid = await this.policyEngine.validateOperation(
        operator,
        tokenAddress,
        operation,
        amountBigInt
      );

      return isValid;
    } catch (error: any) {
      console.error('On-chain validation failed:', error);
      return false;
    }
  }

  /**
   * Get policy details from chain
   */
  async getPolicyDetails(tokenAddress: string, operation: string) {
    try {
      const details = await this.policyEngine.getPolicyDetails(tokenAddress, operation);
      
      return {
        active: details.active,
        maxAmount: details.maxAmount.toString(),
        dailyLimit: details.dailyLimit.toString(),
        monthlyLimit: details.monthlyLimit.toString(),
        cooldownPeriod: Number(details.cooldownPeriod)
      };
    } catch (error: any) {
      console.error('Failed to get policy details:', error);
      return null;
    }
  }

  /**
   * Update policy on-chain
   */
  async updatePolicy(
    tokenAddress: string,
    operation: string,
    maxAmount: bigint,
    dailyLimit: bigint,
    monthlyLimit: bigint,
    cooldownPeriod: number
  ): Promise<string | null> {
    try {
      const tx = await this.policyEngine.updateTokenPolicy(
        tokenAddress,
        operation,
        maxAmount,
        dailyLimit,
        monthlyLimit,
        cooldownPeriod
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error: any) {
      console.error('Failed to update policy:', error);
      return null;
    }
  }

  /**
   * Deactivate policy
   */
  async deactivatePolicy(tokenAddress: string, operation: string): Promise<boolean> {
    try {
      const tx = await this.policyEngine.deactivatePolicy(tokenAddress, operation);
      await tx.wait();
      return true;
    } catch (error: any) {
      console.error('Failed to deactivate policy:', error);
      return false;
    }
  }

  /**
   * Whitelist address
   */
  async whitelistAddress(address: string): Promise<boolean> {
    try {
      const tx = await this.policyEngine.whitelistAddress(address);
      await tx.wait();
      return true;
    } catch (error: any) {
      console.error('Failed to whitelist address:', error);
      return false;
    }
  }

  /**
   * Blacklist address
   */
  async blacklistAddress(address: string): Promise<boolean> {
    try {
      const tx = await this.policyEngine.blacklistAddress(address);
      await tx.wait();
      return true;
    } catch (error: any) {
      console.error('Failed to blacklist address:', error);
      return false;
    }
  }

  /**
   * Check if address is whitelisted
   */
  async isWhitelisted(address: string): Promise<boolean> {
    try {
      return await this.policyEngine.isWhitelisted(address);
    } catch (error: any) {
      console.error('Failed to check whitelist status:', error);
      return false;
    }
  }

  /**
   * Check if address is blacklisted
   */
  async isBlacklisted(address: string): Promise<boolean> {
    try {
      return await this.policyEngine.isBlacklisted(address);
    } catch (error: any) {
      console.error('Failed to check blacklist status:', error);
      return false;
    }
  }

  /**
   * Listen to PolicyEngine events
   */
  async subscribeToEvents(handlers: {
    onPolicyRegistered?: (token: string, operation: string, maxAmount: bigint, dailyLimit: bigint) => void;
    onPolicyUpdated?: (token: string, operation: string) => void;
    onOperationValidated?: (token: string, operator: string, operation: string, amount: bigint) => void;
    onOperationRejected?: (token: string, operator: string, operation: string, reason: string) => void;
  }) {
    if (handlers.onPolicyRegistered) {
      this.policyEngine.on('PolicyRegistered', handlers.onPolicyRegistered);
    }
    
    if (handlers.onPolicyUpdated) {
      this.policyEngine.on('PolicyUpdated', handlers.onPolicyUpdated);
    }
    
    if (handlers.onOperationValidated) {
      this.policyEngine.on('OperationValidated', handlers.onOperationValidated);
    }
    
    if (handlers.onOperationRejected) {
      this.policyEngine.on('OperationRejected', handlers.onOperationRejected);
    }
  }

  /**
   * Cleanup event listeners
   */
  async unsubscribeFromEvents() {
    await this.policyEngine.removeAllListeners();
  }

  /**
   * Helper: Extract max amount from policy conditions
   */
  private extractMaxAmount(conditions: any): bigint {
    if (conditions?.maxAmount) {
      return ethers.parseUnits(conditions.maxAmount.toString(), 18);
    }
    return ethers.parseUnits('1000000', 18); // Default: 1M tokens
  }

  /**
   * Helper: Extract daily limit from policy conditions
   */
  private extractDailyLimit(conditions: any): bigint {
    if (conditions?.dailyLimit) {
      return ethers.parseUnits(conditions.dailyLimit.toString(), 18);
    }
    return ethers.parseUnits('10000000', 18); // Default: 10M tokens
  }

  /**
   * Helper: Extract monthly limit from policy conditions
   */
  private extractMonthlyLimit(conditions: any): bigint {
    if (conditions?.monthlyLimit) {
      return ethers.parseUnits(conditions.monthlyLimit.toString(), 18);
    }
    return ethers.parseUnits('100000000', 18); // Default: 100M tokens
  }

  /**
   * Helper: Extract cooldown period from policy conditions
   */
  private extractCooldownPeriod(conditions: any): number {
    if (conditions?.cooldownPeriod) {
      return Number(conditions.cooldownPeriod);
    }
    return 60; // Default: 60 seconds
  }
}

/**
 * Factory function to create FoundryPolicyAdapter instance
 */
export function createFoundryPolicyAdapter(config: FoundryConfig & { policyEngineAddress: string }) {
  return new FoundryPolicyAdapter(config);
}
