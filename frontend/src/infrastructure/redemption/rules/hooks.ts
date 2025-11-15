/**
 * Stage 9: Redemption Rules & Windows - React Hooks
 * Custom hooks for managing redemption rules and windows
 */

import { useState, useEffect, useCallback } from 'react';
import { RedemptionRulesEngine } from './RedemptionRulesEngine';
import { WindowManager } from './WindowManager';
import { RedemptionConstraints } from './RedemptionConstraints';
import type {
  RedemptionWindow,
  RedemptionRule,
  RuleEvaluationResult,
  CreateWindowParams,
  WindowFilter,
  ConstraintResult
} from './types';
import type { RedemptionRequest } from '../types';

// ============================================================================
// Rules Engine Hook
// ============================================================================

export function useRedemptionRules(config?: any) {
  const [rulesEngine] = useState(() => new RedemptionRulesEngine(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const evaluateRequest = useCallback(async (
    request: RedemptionRequest
  ): Promise<RuleEvaluationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await rulesEngine.evaluateRedemptionRequest(request);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [rulesEngine]);

  // Alias for backward compatibility
  const evaluateRules = evaluateRequest;

  return {
    evaluateRequest,
    evaluateRules,
    loading,
    error
  };
}

// ============================================================================
// Window Manager Hook
// ============================================================================

export function useWindowManager(config?: any) {
  const [manager] = useState(() => new WindowManager(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createWindow = useCallback(async (
    params: CreateWindowParams
  ): Promise<RedemptionWindow | null> => {
    setLoading(true);
    setError(null);

    try {
      const window = await manager.createWindow(params);
      return window;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const getCurrentWindow = useCallback(async (
    projectId: string
  ): Promise<RedemptionWindow | null> => {
    setLoading(true);
    setError(null);

    try {
      const window = await manager.getCurrentWindow(projectId);
      return window;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const listWindows = useCallback(async (
    filter?: WindowFilter
  ): Promise<RedemptionWindow[]> => {
    setLoading(true);
    setError(null);

    try {
      const windows = await manager.listWindows(filter);
      return windows;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const openWindow = useCallback(async (
    windowId: string,
    userId: string
  ): Promise<RedemptionWindow | null> => {
    setLoading(true);
    setError(null);

    try {
      const window = await manager.openWindow(windowId, userId);
      return window;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const closeWindow = useCallback(async (
    windowId: string,
    userId: string
  ): Promise<RedemptionWindow | null> => {
    setLoading(true);
    setError(null);

    try {
      const window = await manager.closeWindow(windowId, userId);
      return window;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  return {
    createWindow,
    getCurrentWindow,
    listWindows,
    openWindow,
    closeWindow,
    loading,
    error
  };
}

// ============================================================================
// Constraints Hook
// ============================================================================

export function useRedemptionConstraints(config?: any) {
  const [constraints] = useState(() => new RedemptionConstraints(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const evaluateConstraints = useCallback(async (
    request: RedemptionRequest
  ): Promise<ConstraintResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await constraints.evaluate(request);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [constraints]);

  const getConstraints = useCallback(async (
    tokenId: string
  ): Promise<import('./types').RedemptionConstraints | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await constraints.loadConstraints(tokenId);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [constraints]);

  const updateConstraints = useCallback(async (
    tokenId: string,
    newConstraints: import('./types').RedemptionConstraints
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Save constraints to database
      await constraints.saveConstraints(tokenId, newConstraints);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [constraints]);

  const validateConstraint = useCallback(async (
    request: RedemptionRequest,
    constraintType: string
  ): Promise<import('./types').ConstraintValidation | null> => {
    setLoading(true);
    setError(null);

    try {
      // Evaluate the specific constraint
      const result = await constraints.evaluate(request);
      
      // Find the specific constraint validation
      const validation: import('./types').ConstraintValidation = {
        valid: result.satisfied,
        message: result.violations.length > 0 
          ? result.violations[0].message 
          : 'Constraint satisfied',
        metadata: result.metadata
      };
      
      return validation;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [constraints]);

  return {
    evaluateConstraints,
    getConstraints,
    updateConstraints,
    validateConstraint,
    loading,
    error
  };
}

// ============================================================================
// Windows List Hook (with real-time updates)
// ============================================================================

export function useRedemptionWindows(projectId: string) {
  const [windows, setWindows] = useState<RedemptionWindow[]>([]);
  const [currentWindow, setCurrentWindow] = useState<RedemptionWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { listWindows, getCurrentWindow } = useWindowManager();

  const loadWindows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [allWindows, current] = await Promise.all([
        listWindows({ projectId, isActive: true }),
        getCurrentWindow(projectId)
      ]);

      setWindows(allWindows);
      setCurrentWindow(current);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [projectId, listWindows, getCurrentWindow]);

  useEffect(() => {
    loadWindows();
  }, [loadWindows]);

  return {
    windows,
    currentWindow,
    loading,
    error,
    reload: loadWindows
  };
}

// ============================================================================
// Window Status Hook
// ============================================================================

export function useWindowStatus(window: RedemptionWindow | null) {
  const [status, setStatus] = useState<{
    label: string;
    variant: 'default' | 'success' | 'warning' | 'destructive';
    isOpen: boolean;
  }>({
    label: 'Unknown',
    variant: 'default',
    isOpen: false
  });

  useEffect(() => {
    if (!window) {
      setStatus({
        label: 'No Window',
        variant: 'default',
        isOpen: false
      });
      return;
    }

    const now = new Date();
    const submissionStart = new Date(window.submissionStartDate);
    const submissionEnd = new Date(window.submissionEndDate);

    if (window.status === 'active' && now >= submissionStart && now <= submissionEnd) {
      setStatus({
        label: 'Open',
        variant: 'success',
        isOpen: true
      });
    } else if (window.status === 'upcoming') {
      setStatus({
        label: 'Upcoming',
        variant: 'warning',
        isOpen: false
      });
    } else if (window.status === 'closed') {
      setStatus({
        label: 'Closed',
        variant: 'destructive',
        isOpen: false
      });
    } else if (window.status === 'processing') {
      setStatus({
        label: 'Processing',
        variant: 'warning',
        isOpen: false
      });
    } else {
      setStatus({
        label: window.status,
        variant: 'default',
        isOpen: false
      });
    }
  }, [window]);

  return status;
}
