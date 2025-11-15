/**
 * useRedemptionRequest Hook
 * React hook for interacting with Redemption Request Manager
 */

import { useState, useCallback, useEffect } from 'react';
import { RedemptionRequestManager } from '../RedemptionRequestManager';
import type { RedemptionRequest, CreateRequestParams, ValidationResult } from '../types';

let managerInstance: RedemptionRequestManager | null = null;

function getManager(): RedemptionRequestManager {
  if (!managerInstance) {
    managerInstance = new RedemptionRequestManager();
  }
  return managerInstance;
}

interface QueueStats {
  total: number;
  processing: number;
  waiting: number;
  priorityBreakdown: { urgent: number; priority: number; standard: number };
}

export function useRedemptionRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>();

  const manager = getManager();

  const createRedemptionRequest = useCallback(async (
    params: CreateRequestParams
  ): Promise<RedemptionRequest | null> => {
    setLoading(true);
    setError(null);

    try {
      const request = await manager.createRequest(params);
      return request;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const validateRequest = useCallback(async (
    request: RedemptionRequest
  ): Promise<ValidationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await manager.validateRequest(request);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const getRequest = useCallback(async (
    requestId: string
  ): Promise<RedemptionRequest | null> => {
    setLoading(true);
    setError(null);

    try {
      const request = await manager.getRequest(requestId);
      return request;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const updateRequestStatus = useCallback(async (
    requestId: string,
    status: RedemptionRequest['status'],
    validationResult?: ValidationResult
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await manager.updateRequestStatus(requestId, status, validationResult);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const refreshQueueStats = useCallback(() => {
    const stats = manager.getQueueStats();
    setQueueStats(stats);
  }, [manager]);

  useEffect(() => {
    refreshQueueStats();
    const interval = setInterval(refreshQueueStats, 5000);
    return () => clearInterval(interval);
  }, [refreshQueueStats]);

  return {
    createRedemptionRequest,
    validateRequest,
    getRequest,
    updateRequestStatus,
    queueStats,
    refreshQueueStats,
    loading,
    error
  };
}
