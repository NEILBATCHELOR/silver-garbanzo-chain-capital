/**
 * Redemption Request Manager
 * Core system for managing on-demand redemption requests
 * Integrates with Policy Engine (Stages 1-6) and manages the complete request lifecycle
 */

import { supabase } from '@/infrastructure/database/client';
import type {
  RedemptionRequest,
  CreateRequestParams,
  ValidationResult,
  RedemptionStatus,
  LockStatus,
  RequestManagerConfig
} from './types';
import { RequestValidator } from './RequestValidator';
import { RequestQueue } from './RequestQueue';

export class RedemptionRequestManager {
  private validator: RequestValidator;
  private queue: RequestQueue;

  constructor(config?: Partial<RequestManagerConfig>) {
    this.validator = new RequestValidator();
    this.queue = new RequestQueue(config?.queueConfig);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get token balance for investor
   */
  private async getBalance(
    investorWallet: string,
    tokenAddress: string
  ): Promise<bigint> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('to_address', investorWallet)
        .eq('token_address', tokenAddress)
        .eq('status', 'confirmed');

      if (error) {
        throw new Error(`Failed to fetch balance: ${error.message}`);
      }

      // Calculate total balance from transactions
      let totalBalance = BigInt(0);
      if (data) {
        for (const tx of data) {
          if (tx.amount) {
            totalBalance += BigInt(tx.amount);
          }
        }
      }

      return totalBalance;
    } catch (error) {
      throw new Error(`Balance check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if tokens are locked
   */
  private async checkLockStatus(
    investorWallet: string,
    tokenAddress: string
  ): Promise<LockStatus> {
    // Check for any active locks on tokens
    // This is a placeholder - implement based on your lock mechanism
    return {
      isLocked: false,
      lockedAmount: BigInt(0)
    };
  }

  /**
   * Get project wallet address for token
   */
  private async getProjectWallet(tokenId: string): Promise<string> {
    const { data, error } = await supabase
      .from('tokens')
      .select('initial_owner, project_id')
      .eq('id', tokenId)
      .single();

    if (error || !data) {
      throw new Error('Failed to get project wallet');
    }

    return data.initial_owner || '';
  }

  /**
   * Calculate available balance after locks
   */
  private calculateAvailableBalance(balance: bigint, lockStatus: LockStatus): string {
    if (lockStatus.isLocked && lockStatus.lockedAmount) {
      return (balance - lockStatus.lockedAmount).toString();
    }
    return balance.toString();
  }

  /**
   * Determine priority level based on request parameters
   */
  private determinePriority(params: CreateRequestParams): 'standard' | 'priority' | 'urgent' {
    // Large redemptions get higher priority
    const amount = Number(params.amount);
    if (amount > 1000000) return 'urgent';
    if (amount > 100000) return 'priority';
    return 'standard';
  }
/**
 * Redemption Request Manager - Part 2: Create Request
 */

  /**
   * Create a new redemption request
   */
  async createRequest(params: CreateRequestParams): Promise<RedemptionRequest> {
    const requestId = this.generateRequestId();

    try {
      // 1. Check token balance
      const balance = await this.getBalance(
        params.investorWallet,
        params.tokenAddress
      );

      if (balance < params.amount) {
        throw new Error(`Insufficient balance. Available: ${balance.toString()}, Requested: ${params.amount.toString()}`);
      }

      // 2. Check for locks
      const lockStatus = await this.checkLockStatus(
        params.investorWallet,
        params.tokenAddress
      );

      if (lockStatus.isLocked) {
        throw new Error(`Tokens are locked: ${lockStatus.lockReason || 'Unknown reason'}`);
      }

      // 3. Get project wallet
      const projectWallet = await this.getProjectWallet(params.tokenId);

      // 4. Create request object
      const request: RedemptionRequest = {
        id: requestId,
        investorId: params.investorId,
        tokenId: params.tokenId,
        tokenAddress: params.tokenAddress,
        amount: params.amount,
        targetCurrency: params.targetCurrency,
        requestedAt: new Date().toISOString(),
        status: 'pending_validation',
        metadata: {
          investorWallet: params.investorWallet,
          projectWallet,
          currentBalance: balance.toString(),
          availableBalance: this.calculateAvailableBalance(balance, lockStatus),
          lockStatus,
          complianceChecks: [],
          priorityLevel: this.determinePriority(params)
        }
      };

      // 5. Validate request
      const validationResult = await this.validator.validate(request);
      request.validationResult = validationResult;

      if (!validationResult.valid) {
        request.status = 'failed';
        await this.storeRequest(request);
        throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      request.status = 'validated';

      // 6. Queue request for processing
      await this.queue.enqueue(request);

      // 7. Store in database
      await this.storeRequest(request);

      // 8. Emit event (placeholder for future event system)
      await this.emitRequestCreatedEvent(request);

      return request;

    } catch (error) {
      await this.handleRequestCreationError(requestId, error);
      throw error;
    }
  }

  /**
   * Validate an existing request
   */
  async validateRequest(request: RedemptionRequest): Promise<ValidationResult> {
    return await this.validator.validate(request);
  }
/**
 * Redemption Request Manager - Part 3: Database & Events
 */

  /**
   * Store request in database
   */
  private async storeRequest(request: RedemptionRequest): Promise<void> {
    const { error } = await supabase
      .from('redemption_requests')
      .upsert({
        id: request.id,
        investor_id: request.investorId,
        project_id: request.tokenId,
        token_symbol: request.tokenAddress,
        token_amount: request.amount.toString(),
        target_currency: request.targetCurrency,
        status: request.status,
        source_wallet_address: request.metadata.investorWallet,
        destination_wallet_address: request.metadata.projectWallet,
        validation_results: request.validationResult,
        priority_level: request.metadata.priorityLevel === 'urgent' ? 3 
                       : request.metadata.priorityLevel === 'priority' ? 2 : 1,
        created_at: request.requestedAt,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store request: ${error.message}`);
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: RedemptionStatus,
    validationResult?: ValidationResult
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (validationResult) {
      updateData.validation_results = validationResult;
    }

    const { error } = await supabase
      .from('redemption_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  }

  /**
   * Get request by ID
   */
  async getRequest(requestId: string): Promise<RedemptionRequest | null> {
    const { data, error } = await supabase
      .from('redemption_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      return null;
    }

    // Map database record to RedemptionRequest
    return this.mapDbToRequest(data);
  }

  /**
   * Map database record to RedemptionRequest
   */
  private mapDbToRequest(data: any): RedemptionRequest {
    return {
      id: data.id,
      investorId: data.investor_id,
      tokenId: data.project_id,
      tokenAddress: data.token_symbol,
      amount: BigInt(data.token_amount),
      targetCurrency: data.target_currency || 'USDC',
      requestedAt: data.created_at,
      status: data.status,
      windowId: data.window_id,
      validationResult: data.validation_results,
      metadata: {
        investorWallet: data.source_wallet_address,
        projectWallet: data.destination_wallet_address,
        currentBalance: data.token_amount,
        availableBalance: data.token_amount,
        lockStatus: { isLocked: false },
        complianceChecks: [],
        priorityLevel: data.priority_level === 3 ? 'urgent' 
                      : data.priority_level === 2 ? 'priority' : 'standard'
      }
    };
  }

  /**
   * Emit request created event (placeholder)
   */
  private async emitRequestCreatedEvent(request: RedemptionRequest): Promise<void> {
    // Placeholder for event emission
    // In a full implementation, this would publish to an event bus
    console.log('Redemption request created:', request.id);
  }

  /**
   * Handle request creation error
   */
  private async handleRequestCreationError(
    requestId: string,
    error: unknown
  ): Promise<void> {
    console.error(`Error creating redemption request ${requestId}:`, error);
    
    // Log to audit system
    try {
      await supabase
        .from('redemption_requests')
        .upsert({
          id: requestId,
          status: 'failed',
          rejection_reason: error instanceof Error ? error.message : String(error),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.queue.getStats();
  }
}
