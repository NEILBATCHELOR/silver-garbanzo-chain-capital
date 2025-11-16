/**
 * Approval to Transfer Bridge
 * Bridges the gap between approval completion and transfer execution
 * Implements hybrid auto/manual execution strategy
 */

import { supabase } from '@/infrastructure/supabaseClient';
import { TransferOrchestrator, type ApprovedRedemption } from '@/infrastructure/redemption/transfer';
import { logActivity } from '@/infrastructure/audit';

export interface TransferExecutionConfig {
  mode: 'auto' | 'manual' | 'batch';
  triggeredBy?: string;
  batchId?: string;
}

export interface TransferTriggerResult {
  success: boolean;
  message: string;
  transferId?: string;
  orchestrationId?: string;
  error?: string;
}

export class ApprovalToTransferBridge {
  private orchestrator: TransferOrchestrator;

  constructor() {
    this.orchestrator = new TransferOrchestrator();
  }

  /**
   * Trigger transfer execution for an approved redemption
   * Called either automatically after approval or manually by operations
   */
  async triggerTransferExecution(
    requestId: string,
    config: TransferExecutionConfig
  ): Promise<TransferTriggerResult> {
    try {
      console.log(`🔄 Triggering transfer execution for request: ${requestId} (${config.mode})`);

      // 1. Get redemption details
      const { data: redemption, error: fetchError } = await supabase
        .from('redemption_requests')
        .select(`
          *,
          distributions:distribution_id (
            token_address,
            blockchain,
            chain_id
          )
        `)
        .eq('id', requestId)
        .single();

      if (fetchError || !redemption) {
        return {
          success: false,
          message: 'Redemption request not found',
          error: fetchError?.message || 'Request not found'
        };
      }

      // 2. Validate redemption is approved
      if (redemption.status !== 'approved') {
        return {
          success: false,
          message: `Redemption status is ${redemption.status}, expected approved`,
          error: 'Invalid status'
        };
      }

      // 3. Check if already executed
      const { data: existingTransfer } = await supabase
        .from('transfer_operations')
        .select('id, status')
        .eq('redemption_id', requestId)
        .eq('type', 'token_collection')
        .single();

      if (existingTransfer && existingTransfer.status === 'completed') {
        return {
          success: false,
          message: 'Transfer already executed',
          error: 'Already executed'
        };
      }

      // 4. Get chain ID
      const chainId = this.getChainId(redemption.distributions?.blockchain);

      // 5. Build ApprovedRedemption object
      const approvedRedemption: ApprovedRedemption = {
        id: redemption.id,
        investorWallet: redemption.source_wallet_address,
        projectWallet: redemption.destination_wallet_address,
        tokenAddress: redemption.distributions?.token_address || '',
        amount: redemption.token_amount.toString(),
        exchangeRate: redemption.conversion_rate?.toString() || '1.0',
        targetCurrency: 'USDC',
        chain: redemption.distributions?.blockchain || 'ethereum',
        chainId,
        settlementConfig: {
          mode: config.mode === 'auto' ? 'automatic' : 'manual',
          delay: 0,
          batchingEnabled: config.mode === 'batch',
          maxBatchSize: 10,
          priorityFee: '2',
          slippageTolerance: 0.001
        },
        approvedAt: new Date(redemption.updated_at),
        approvedBy: redemption.approved_by || ''
      };

      // 6. Record execution trigger in database
      await supabase
        .from('redemption_requests')
        .update({
          transfer_execution_triggered_at: new Date().toISOString(),
          transfer_execution_triggered_by: config.triggeredBy,
          transfer_execution_method: config.mode
        })
        .eq('id', requestId);

      // 7. Execute transfer orchestration
      const result = await this.orchestrator.orchestrateRedemption(approvedRedemption);

      if (!result.success) {
        // Log failure
        await logActivity({
          action: 'transfer_execution_failed',
          entity_id: requestId,
          entity_type: 'redemption_request',
          status: 'failure',
          details: {
            mode: config.mode,
            error: result.error?.message,
            triggeredBy: config.triggeredBy
          }
        });

        return {
          success: false,
          message: result.error?.message || 'Transfer execution failed',
          error: result.error?.message
        };
      }

      // 8. Log success
      await logActivity({
        action: 'transfer_execution_triggered',
        entity_id: requestId,
        entity_type: 'redemption_request',
        status: 'success',
        details: {
          mode: config.mode,
          orchestrationId: result.orchestrationId,
          tokenTransferHash: result.tokenTransferHash,
          settlementHash: result.settlementHash,
          triggeredBy: config.triggeredBy
        }
      });

      console.log(`✅ Transfer execution triggered successfully: ${result.orchestrationId}`);

      return {
        success: true,
        message: 'Transfer execution initiated successfully',
        orchestrationId: result.orchestrationId,
        transferId: result.tokenTransferHash
      };
    } catch (error) {
      console.error('❌ Error triggering transfer execution:', error);
      return {
        success: false,
        message: 'Failed to trigger transfer execution',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Auto-trigger transfer for approved redemption
   * Called by ApprovalOrchestrator when approval completes
   */
  async autoTriggerTransfer(requestId: string): Promise<TransferTriggerResult> {
    try {
      // Check if auto-execution is enabled
      const { data: redemption } = await supabase
        .from('redemption_requests')
        .select('auto_execute_transfer, execution_mode')
        .eq('id', requestId)
        .single();

      if (!redemption?.auto_execute_transfer) {
        return {
          success: false,
          message: 'Auto-execution is disabled for this redemption',
          error: 'Auto-execution disabled'
        };
      }

      return await this.triggerTransferExecution(requestId, {
        mode: 'auto',
        triggeredBy: 'system'
      });
    } catch (error) {
      console.error('❌ Error in auto-trigger:', error);
      return {
        success: false,
        message: 'Auto-trigger failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Manually trigger transfer for approved redemption
   * Called by operations team via UI
   */
  async manualTriggerTransfer(
    requestId: string,
    userId: string
  ): Promise<TransferTriggerResult> {
    return await this.triggerTransferExecution(requestId, {
      mode: 'manual',
      triggeredBy: userId
    });
  }

  /**
   * Batch trigger multiple redemptions
   */
  async batchTriggerTransfers(
    requestIds: string[],
    userId: string
  ): Promise<{
    success: boolean;
    results: TransferTriggerResult[];
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
  }> {
    const results: TransferTriggerResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const requestId of requestIds) {
      try {
        const result = await this.triggerTransferExecution(requestId, {
          mode: 'batch',
          triggeredBy: userId
        });

        results.push(result);

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          success: false,
          message: 'Batch execution failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }

    return {
      success: succeeded > 0,
      results,
      summary: {
        total: requestIds.length,
        succeeded,
        failed
      }
    };
  }

  /**
   * Get pending transfer executions
   * Returns approved redemptions that haven't been executed yet
   */
  async getPendingTransferExecutions(): Promise<any[]> {
    const { data } = await supabase
      .from('redemption_requests')
      .select(`
        *,
        distributions:distribution_id (
          token_address,
          blockchain,
          token_symbol
        )
      `)
      .eq('status', 'approved')
      .is('transfer_execution_triggered_at', null)
      .order('updated_at', { ascending: true });

    return data || [];
  }

  /**
   * Helper to get chain ID from blockchain name
   */
  private getChainId(blockchain?: string): number {
    const chainMap: Record<string, number> = {
      'ethereum': 1,
      'sepolia': 11155111,
      'polygon': 137,
      'arbitrum': 42161,
      'optimism': 10,
      'base': 8453
    };

    return chainMap[blockchain?.toLowerCase() || 'ethereum'] || 1;
  }
}

// Export singleton instance
export const approvalToTransferBridge = new ApprovalToTransferBridge();
