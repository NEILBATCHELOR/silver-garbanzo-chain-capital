/**
 * useBlackoutPeriods Hook
 * React hook for managing blackout periods
 */

import { useState, useEffect, useCallback } from 'react';
import { BlackoutPeriodManager } from '@/infrastructure/redemption/services/BlackoutPeriodManager';
import type {
  BlackoutPeriod,
  CreateBlackoutParams,
  UpdateBlackoutParams,
  BlackoutCheckResult,
  OperationType
} from '@/infrastructure/redemption/types/blackout';

const manager = new BlackoutPeriodManager();

export function useBlackoutPeriods(projectId: string) {
  const [blackoutPeriods, setBlackoutPeriods] = useState<BlackoutPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBlackoutPeriods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const periods = await manager.getBlackoutPeriods(projectId);
      setBlackoutPeriods(periods);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load blackout periods'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadBlackoutPeriods();
    }
  }, [projectId, loadBlackoutPeriods]);

  const createBlackoutPeriod = useCallback(
    async (params: CreateBlackoutParams, createdBy?: string) => {
      try {
        const newPeriod = await manager.createBlackoutPeriod(params, createdBy);
        await loadBlackoutPeriods();
        return newPeriod;
      } catch (err) {
        throw err;
      }
    },
    [loadBlackoutPeriods]
  );

  const updateBlackoutPeriod = useCallback(
    async (params: UpdateBlackoutParams) => {
      try {
        const updated = await manager.updateBlackoutPeriod(params);
        await loadBlackoutPeriods();
        return updated;
      } catch (err) {
        throw err;
      }
    },
    [loadBlackoutPeriods]
  );

  const deleteBlackoutPeriod = useCallback(
    async (id: string) => {
      try {
        await manager.deleteBlackoutPeriod(id);
        await loadBlackoutPeriods();
      } catch (err) {
        throw err;
      }
    },
    [loadBlackoutPeriods]
  );

  const toggleBlackoutPeriod = useCallback(
    async (id: string, currentlyActive: boolean) => {
      try {
        if (currentlyActive) {
          await manager.deactivateBlackoutPeriod(id);
        } else {
          await manager.activateBlackoutPeriod(id);
        }
        await loadBlackoutPeriods();
      } catch (err) {
        throw err;
      }
    },
    [loadBlackoutPeriods]
  );

  const checkBlackoutPeriod = useCallback(
    async (operation: OperationType): Promise<BlackoutCheckResult> => {
      return await manager.isInBlackoutPeriod(projectId, operation);
    },
    [projectId]
  );

  const getActiveBlackoutPeriods = useCallback(async () => {
    return await manager.getActiveBlackoutPeriods(projectId);
  }, [projectId]);

  const getUpcomingBlackoutPeriods = useCallback(
    async (daysAhead: number = 30) => {
      return await manager.getUpcomingBlackoutPeriods(projectId, daysAhead);
    },
    [projectId]
  );

  return {
    blackoutPeriods,
    loading,
    error,
    createBlackoutPeriod,
    updateBlackoutPeriod,
    deleteBlackoutPeriod,
    toggleBlackoutPeriod,
    checkBlackoutPeriod,
    getActiveBlackoutPeriods,
    getUpcomingBlackoutPeriods,
    refresh: loadBlackoutPeriods
  };
}
