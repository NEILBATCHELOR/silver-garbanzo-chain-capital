/**
 * Cryptographic Operation Gateway
 * Central point for policy-validated token operations
 */

import { v4 as uuidv4 } from 'uuid';
import { PolicyEngine } from '../policy/PolicyEngine';
import { EnhancedTokenManager } from '../web3/tokens/EnhancedTokenManager';
import { supabase } from '../supabaseClient';
import type { 
  OperationRequest, 
  OperationResult, 
  GasEstimate, 
  TransactionResult,
  OperationValidator,
  OperationExecutor,
  GatewayConfig,
  OperationContext,
  OperationError,
  PolicyValidationSummary
} from './types';
import type { PolicyEvaluationResult, CryptoOperation, PolicyContext } from '../policy/types';

export class CryptoOperationGateway {
  private policyEngine: PolicyEngine;
  private tokenManager: EnhancedTokenManager;
  private validators: Map<string, OperationValidator>;
  private executors: Map<string, OperationExecutor>;
  
  constructor(config: GatewayConfig = {}) {
    this.policyEngine = new PolicyEngine(config.policyConfig || {});
    this.tokenManager = new EnhancedTokenManager();
    this.validators = new Map();
    this.executors = new Map();
    
    // Initialize validators and executors
    this.initializeValidators();
    this.initializeExecutors();
  }
  
  /**
   * Execute a cryptographic operation with policy validation
   */
  async executeOperation(request: OperationRequest): Promise<OperationResult> {
    const operationId = this.generateOperationId();
    
    try {
      // 1. Pre-validation
      await this.validateRequest(request);
      
      // 2. Policy evaluation
      const policyResult = await this.evaluatePolicies(request);
      if (!policyResult.allowed) {
        return this.buildRejectionResult(operationId, policyResult);
      }
      
      // 3. Gas estimation
      const gasEstimate = await this.estimateGas(request);
      
      // 4. Execute operation
      const executor = this.getExecutor(request.type);
      const txResult = await executor.execute(request, gasEstimate);
      
      // 5. Log operation to database
      await this.logOperation(operationId, request, txResult, policyResult);
      
      return {
        success: true,
        transactionHash: txResult.hash,
        operationId,
        policyValidation: this.summarizePolicyValidation(policyResult),
        gasUsed: txResult.gasUsed?.toString(),
        timestamp: new Date().toISOString(),
        blockNumber: txResult.blockNumber,
        confirmations: txResult.confirmations
      };
      
    } catch (error: any) {
      return this.handleOperationError(operationId, request, error);
    }
  }
  
  /**
   * Validate operation request
   */
  private async validateRequest(request: OperationRequest): Promise<void> {
    const validator = this.validators.get(request.type);
    if (!validator) {
      throw new Error(`No validator found for operation type: ${request.type}`);
    }
    
    const result = await validator.validate(request);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.map(e => e.message).join(', ')}`);
    }
  }
  
  /**
   * Evaluate policies for the operation
   */
  private async evaluatePolicies(request: OperationRequest): Promise<PolicyEvaluationResult> {
    const context = this.buildPolicyContext(request);
    const operation = this.mapToCryptoOperation(request);
    
    return await this.policyEngine.evaluateOperation(operation, context);
  }
  
  /**
   * Build policy context from request
   */
  private buildPolicyContext(request: OperationRequest): PolicyContext {
    return {
      operation: this.mapToCryptoOperation(request),
      user: {
        id: this.getCurrentUserId() || 'unknown',
        address: request.parameters.from || '',
        role: 'operator'
      },
      token: {
        id: request.tokenAddress,
        address: request.tokenAddress,
        name: 'Token', // Would be fetched from token details
        symbol: 'TKN',
        standard: this.detectTokenStandard(request.tokenAddress),
        chainId: request.chain
      },
      environment: {
        chainId: request.chain,
        network: 'mainnet' as const,
        timestamp: Date.now(),
        blockNumber: 0 // Will be updated during execution
      }
    };
  }
  
  /**
   * Map request to crypto operation
   */
  private mapToCryptoOperation(request: OperationRequest): CryptoOperation {
    return {
      type: request.type,
      amount: request.parameters.amount ? BigInt(request.parameters.amount) : undefined,
      from: request.parameters.from,
      to: request.parameters.to,
      tokenId: request.parameters.tokenId,
      metadata: {
        ...request.metadata,
        duration: request.parameters.duration,
        reason: request.parameters.reason,
        partition: request.parameters.partition
      }
    };
  }
  
  /**
   * Estimate gas for operation
   */
  private async estimateGas(request: OperationRequest): Promise<GasEstimate> {
    // For now, use default gas estimates
    // In production, this would query the blockchain adapter
    const gasLimit = BigInt(100000);
    const gasPrice = BigInt(20000000000); // 20 gwei
    
    // Calculate cost in ETH (gasLimit * gasPrice / 10^18)
    const costInWei = gasLimit * gasPrice;
    const costInEth = Number(costInWei) / 1e18;
    
    return {
      limit: gasLimit,
      price: gasPrice,
      estimatedCost: `${costInEth.toFixed(6)} ETH`
    };
  }
  
  /**
   * Get executor for operation type
   */
  private getExecutor(type: string): OperationExecutor {
    const executor = this.executors.get(type);
    if (!executor) {
      throw new Error(`No executor found for operation type: ${type}`);
    }
    return executor;
  }
  
  /**
   * Log operation to database
   */
  private async logOperation(
    operationId: string,
    request: OperationRequest,
    result: TransactionResult,
    policyValidation: PolicyEvaluationResult
  ): Promise<void> {
    // Log to token_operations table
    const { error: opError } = await supabase
      .from('token_operations')
      .insert({
        id: operationId,
        token_id: request.tokenAddress,
        operation_type: request.type,
        operator: request.parameters.from || this.getCurrentUser(),
        amount: request.parameters.amount?.toString(),
        recipient: request.parameters.to,
        sender: request.parameters.from,
        lock_duration: request.parameters.duration,
        lock_reason: request.parameters.reason,
        transaction_hash: result.hash,
        status: result.status,
        timestamp: new Date().toISOString(),
        blocks: {
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed?.toString()
        }
      });
      
    // Log to operation_validations table
    const { error: valError } = await supabase
      .from('operation_validations')
      .insert({
        operation_id: operationId,
        policy_id: policyValidation.policies?.[0]?.policyId || null,
        rule_evaluations: policyValidation.policies || [],
        validation_status: policyValidation.allowed ? 'approved' : 'rejected',
        rejection_reasons: policyValidation.violations?.map(v => v.description) || [],
        validated_by: this.getCurrentUserId(),
        validated_at: new Date().toISOString()
      });
      
    if (opError || valError) {
      console.error('Failed to log operation:', opError || valError);
    }
  }
  
  /**
   * Build rejection result
   */
  private buildRejectionResult(
    operationId: string, 
    policyResult: PolicyEvaluationResult
  ): OperationResult {
    return {
      success: false,
      operationId,
      policyValidation: this.summarizePolicyValidation(policyResult),
      timestamp: new Date().toISOString(),
      error: {
        code: 'POLICY_VIOLATION',
        message: 'Operation rejected by policy',
        details: policyResult.violations,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Handle operation error
   */
  private handleOperationError(
    operationId: string,
    request: OperationRequest,
    error: any
  ): OperationResult {
    const errorObj: OperationError = {
      code: error.code || 'OPERATION_FAILED',
      message: error.message || 'Operation failed',
      details: error,
      timestamp: new Date().toISOString()
    };
    
    return {
      success: false,
      operationId,
      policyValidation: {
        allowed: false,
        policiesEvaluated: 0,
        violations: [],
        warnings: []
      },
      timestamp: new Date().toISOString(),
      error: errorObj
    };
  }
  
  /**
   * Summarize policy validation
   */
  private summarizePolicyValidation(result: PolicyEvaluationResult): PolicyValidationSummary {
    return {
      allowed: result.allowed,
      policiesEvaluated: result.policies?.length || 0,
      violations: result.violations?.map(v => v.description) || [],
      warnings: result.warnings || [],
      score: result.metadata?.score as number | undefined
    };
  }
  
  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return uuidv4();
  }
  
  /**
   * Get current user from session
   */
  private getCurrentUser(): string {
    // Get from session/context
    return 'system';
  }
  
  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | null {
    // Get from session/context
    return null;
  }
  
  /**
   * Detect token standard from address
   */
  private detectTokenStandard(tokenAddress: string): string {
    // This would be determined by querying the token contract
    // For now, default to ERC20
    return 'ERC20';
  }
  
  /**
   * Initialize validators
   */
  private async initializeValidators(): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { MintValidator } = await import('./validators/MintValidator');
    const { BurnValidator } = await import('./validators/BurnValidator');
    const { TransferValidator } = await import('./validators/TransferValidator');
    const { LockValidator } = await import('./validators/LockValidator');
    const { UnlockValidator } = await import('./validators/UnlockValidator');
    const { BlockValidator } = await import('./validators/BlockValidator');
    const { UnblockValidator } = await import('./validators/UnblockValidator');
    
    this.validators.set('mint', new MintValidator());
    this.validators.set('burn', new BurnValidator());
    this.validators.set('transfer', new TransferValidator());
    this.validators.set('lock', new LockValidator());
    this.validators.set('unlock', new UnlockValidator());
    this.validators.set('block', new BlockValidator());
    this.validators.set('unblock', new UnblockValidator());
  }
  
  /**
   * Initialize executors
   */
  private async initializeExecutors(): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { MintExecutor } = await import('./executors/MintExecutor');
    const { BurnExecutor } = await import('./executors/BurnExecutor');
    const { TransferExecutor } = await import('./executors/TransferExecutor');
    const { LockExecutor } = await import('./executors/LockExecutor');
    const { UnlockExecutor } = await import('./executors/UnlockExecutor');
    const { BlockExecutor } = await import('./executors/BlockExecutor');
    const { UnblockExecutor } = await import('./executors/UnblockExecutor');
    
    this.executors.set('mint', new MintExecutor(this.tokenManager));
    this.executors.set('burn', new BurnExecutor(this.tokenManager));
    this.executors.set('transfer', new TransferExecutor(this.tokenManager));
    this.executors.set('lock', new LockExecutor(this.tokenManager));
    this.executors.set('unlock', new UnlockExecutor(this.tokenManager));
    this.executors.set('block', new BlockExecutor(this.tokenManager));
    this.executors.set('unblock', new UnblockExecutor(this.tokenManager));
  }
}