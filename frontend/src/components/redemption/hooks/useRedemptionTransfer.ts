/**
 * useRedemptionTransfer Hook
 * Manages redemption transfer operations
 */

import { useState, useEffect } from 'react';
import {
  TransferOrchestrator,
  type ApprovedRedemption,
  type OrchestrationResult,
  type SettlementConfig
} from '@/infrastructure/redemption/transfer';

interface UseRedemptionTransferOptions {
  redemptionId?: string;
  settlementConfig?: Partial<SettlementConfig>;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRedemptionTransferReturn {
  transfer: any | null;
  settlement: any | null;
  loading: boolean;
  error: string | null;
  executeTransfer: (redemption: ApprovedRedemption) => Promise<OrchestrationResult>;
  refreshStatus: () => Promise<void>;
}

export function useRedemptionTransfer({
  redemptionId,
  settlementConfig,
  autoRefresh = true,
  refreshInterval = 10000
}: UseRedemptionTransferOptions = {}): UseRedemptionTransferReturn {
  const [transfer, setTransfer] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orchestrator = new TransferOrchestrator(settlementConfig);

  // Fetch transfer status
  const refreshStatus = async () => {
    if (!redemptionId) return;

    try {
      setLoading(true);
      setError(null);

      const status = await orchestrator.getOrchestrationStatus(redemptionId);
      setTransfer(status.tokenTransfer);
      setSettlement(status.settlement);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  // Execute transfer
  const executeTransfer = async (
    redemption: ApprovedRedemption
  ): Promise<OrchestrationResult> => {
    try {
      setLoading(true);
      setError(null);

      const result = await orchestrator.orchestrateRedemption(redemption);

      if (!result.success) {
        throw new Error(result.error?.message || 'Transfer failed');
      }

      // Refresh status after execution
      await refreshStatus();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !redemptionId) return;

    refreshStatus();

    const interval = setInterval(refreshStatus, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [redemptionId, autoRefresh, refreshInterval]);

  return {
    transfer,
    settlement,
    loading,
    error,
    executeTransfer,
    refreshStatus
  };
}
