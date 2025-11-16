/**
 * Stage 11: Transfer Orchestrator
 * Orchestrates the complete redemption transfer workflow
 * Coordinates token collection → settlement payment
 */

import { AutomatedTransferService } from './AutomatedTransferService';
import { SettlementProcessor } from './SettlementProcessor';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/audit';
import type {
  ApprovedRedemption,
  OrchestrationResult,
  OrchestrationStep,
  SettlementConfig
} from './types';

const CONFIRMATION_WAIT_MS = 5000; // 5 seconds between confirmation checks

export class TransferOrchestrator {
  private transferService: AutomatedTransferService;
  private settlementProcessor: SettlementProcessor;

  constructor(settlementConfig?: Partial<SettlementConfig>) {
    this.transferService = new AutomatedTransferService();
    this.settlementProcessor = new SettlementProcessor(settlementConfig);
  }

  /**
   * Orchestrate complete redemption flow
   * Step 1: Collect tokens from investor
   * Step 2: Wait for confirmations
   * Step 3: Send USDC/USDT settlement
   * Step 4: Final notifications
   */
  async orchestrateRedemption(
    approvedRedemption: ApprovedRedemption
  ): Promise<OrchestrationResult> {
    const orchestrationId = crypto.randomUUID();
    const steps: OrchestrationStep[] = [];

    try {
      // Step 1: Token Collection
      const tokenCollectionStep = await this.executeTokenCollection(approvedRedemption);
      steps.push(tokenCollectionStep);

      if (tokenCollectionStep.status !== 'completed') {
        throw new Error('Token collection failed');
      }

      // Step 2: Confirmation Wait
      const confirmationStep = await this.waitForConfirmations(
        tokenCollectionStep.result.transferId
      );
      steps.push(confirmationStep);

      if (confirmationStep.status !== 'completed') {
        throw new Error('Confirmation wait failed');
      }

      // Step 3: Settlement (if automatic mode)
      if (approvedRedemption.settlementConfig.mode === 'automatic') {
        const settlementStep = await this.executeSettlement(
          approvedRedemption,
          tokenCollectionStep.result
        );
        steps.push(settlementStep);

        if (settlementStep.status !== 'completed') {
          throw new Error('Settlement failed');
        }
      }

      // Step 4: Update redemption request status
      await this.updateRedemptionStatus(approvedRedemption.id, 'completed');

      // Log successful orchestration
      await logActivity({
        action: 'redemption_orchestration_completed',
        entity_id: orchestrationId,
        entity_type: 'redemption_orchestration',
        status: 'success',
        details: {
          redemptionId: approvedRedemption.id,
          tokenTransferHash: tokenCollectionStep.result?.transactionHash,
          settlementHash: steps.find(s => s.name === 'settlement')?.result?.transactionHash,
          steps: steps.map(s => ({ name: s.name, status: s.status })),
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        orchestrationId,
        steps,
        tokenTransferHash: tokenCollectionStep.result?.transactionHash,
        settlementHash: steps.find(s => s.name === 'settlement')?.result?.transactionHash,
        completedAt: new Date()
      };
    } catch (error) {
      await this.handleOrchestrationError(orchestrationId, steps, error as Error);

      return {
        success: false,
        orchestrationId,
        steps,
        error: {
          code: 'ORCHESTRATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Execute token collection step
   */
  private async executeTokenCollection(
    redemption: ApprovedRedemption
  ): Promise<OrchestrationStep> {
    const step: OrchestrationStep = {
      name: 'token_collection',
      status: 'in_progress',
      startedAt: new Date()
    };

    try {
      const result = await this.transferService.executeRedemptionTransfer(redemption);

      if (!result.success) {
        step.status = 'failed';
        step.error = result.error;
      } else {
        step.status = 'completed';
        step.result = result;
      }
    } catch (error) {
      step.status = 'failed';
      step.error = {
        code: 'TOKEN_COLLECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      step.completedAt = new Date();
    }

    return step;
  }

  /**
   * Wait for transaction confirmations
   */
  private async waitForConfirmations(transferId: string): Promise<OrchestrationStep> {
    const step: OrchestrationStep = {
      name: 'confirmation_wait',
      status: 'in_progress',
      startedAt: new Date()
    };

    try {
      const maxWaitTime = 600000; // 10 minutes
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const transfer = await this.transferService.getTransferOperation(transferId);

        if (!transfer) {
          throw new Error('Transfer operation not found');
        }

        if (transfer.status === 'confirmed') {
          step.status = 'completed';
          step.result = { confirmed: true, confirmations: transfer.confirmations };
          break;
        }

        if (transfer.status === 'failed') {
          throw new Error('Transfer failed during confirmation');
        }

        await this.sleep(CONFIRMATION_WAIT_MS);
      }

      if (step.status !== 'completed') {
        throw new Error('Confirmation timeout');
      }
    } catch (error) {
      step.status = 'failed';
      step.error = {
        code: 'CONFIRMATION_TIMEOUT',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      step.completedAt = new Date();
    }

    return step;
  }

  /**
   * Execute settlement step
   */
  private async executeSettlement(
    redemption: ApprovedRedemption,
    tokenTransferResult: any
  ): Promise<OrchestrationStep> {
    const step: OrchestrationStep = {
      name: 'settlement',
      status: 'in_progress',
      startedAt: new Date()
    };

    try {
      const tokenTransfer = await this.transferService.getTransferOperation(
        tokenTransferResult.transferId
      );

      if (!tokenTransfer) {
        throw new Error('Token transfer not found');
      }

      const result = await this.settlementProcessor.processSettlement(
        redemption,
        tokenTransfer
      );

      if (!result.success) {
        step.status = 'failed';
        step.error = result.error;
      } else {
        step.status = 'completed';
        step.result = result;
      }
    } catch (error) {
      step.status = 'failed';
      step.error = {
        code: 'SETTLEMENT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      step.completedAt = new Date();
    }

    return step;
  }

  /**
   * Update redemption request status
   */
  private async updateRedemptionStatus(
    redemptionId: string,
    status: string
  ): Promise<void> {
    await supabase
      .from('redemption_requests')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', redemptionId);
  }

  /**
   * Handle orchestration error
   */
  private async handleOrchestrationError(
    orchestrationId: string,
    steps: OrchestrationStep[],
    error: Error
  ): Promise<void> {
    console.error('Orchestration error:', {
      orchestrationId,
      steps: steps.map(s => ({ name: s.name, status: s.status })),
      error: error.message
    });

    // Determine what to do based on which step failed
    const failedStep = steps.find(s => s.status === 'failed' || s.status === 'in_progress');

    if (failedStep) {
      // Log to database for manual intervention
      await this.logOrchestrationError({
        orchestrationId,
        failedStep: failedStep.name,
        error: error.message,
        steps
      });
    }
  }

  /**
   * Log orchestration error
   */
  private async logOrchestrationError(errorData: {
    orchestrationId: string;
    failedStep: string;
    error: string;
    steps: OrchestrationStep[];
  }): Promise<void> {
    // Log to audit trail
    await logActivity({
      action: 'redemption_orchestration_error',
      entity_id: errorData.orchestrationId,
      entity_type: 'redemption_orchestration',
      status: 'error',
      details: {
        failedStep: errorData.failedStep,
        error: errorData.error,
        steps: errorData.steps.map(step => ({
          name: step.name,
          status: step.status,
          error: step.error
        })),
        timestamp: new Date().toISOString()
      }
    });

    // Also log to console for debugging
    console.error('Orchestration error logged:', errorData);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get orchestration status
   */
  async getOrchestrationStatus(
    redemptionId: string
  ): Promise<{
    tokenTransfer: any | null;
    settlement: any | null;
  }> {
    // Get token transfer
    const { data: transfers } = await supabase
      .from('transfer_operations')
      .select('*')
      .eq('redemption_id', redemptionId)
      .eq('type', 'token_collection')
      .order('created_at', { ascending: false })
      .limit(1);

    // Get settlement
    const { data: settlements } = await supabase
      .from('settlement_operations')
      .select('*')
      .eq('redemption_id', redemptionId)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      tokenTransfer: transfers && transfers.length > 0 ? transfers[0] : null,
      settlement: settlements && settlements.length > 0 ? settlements[0] : null
    };
  }
}
