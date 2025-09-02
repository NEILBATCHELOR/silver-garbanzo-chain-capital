/**
 * useDuplicatePrevention Hook
 * 
 * Provides comprehensive duplicate prevention for any create/add operation
 * Simplified version to avoid TypeScript compilation issues
 * 
 * Usage:
 * const duplicatePrevention = useDuplicatePrevention('createToken', { projectId, tokenName });
 * 
 * Created: August 21, 2025
 */

import React, { useRef, useCallback, useState } from 'react';

// Global tracking map for cross-component duplicate prevention
const globalOperationTracking = new Map<string, {
  inProgress: boolean;
  timestamp: number;
  attempts: number;
}>();

interface DuplicatePreventionOptions {
  maxAttempts?: number;
  cooldownMs?: number;
  enableLogging?: boolean;
}

interface DuplicatePreventionReturn {
  isOperationInProgress: boolean;
  executeOperation: (operation: () => Promise<any>) => Promise<any>;
  resetOperation: () => void;
  attemptCount: number;
  canRetry: boolean;
  timeUntilRetry: number;
}

/**
 * Hook for preventing duplicate operations
 */
export function useDuplicatePrevention(
  operationType: string,
  context: Record<string, any>,
  options: DuplicatePreventionOptions = {}
): DuplicatePreventionReturn {
  const {
    maxAttempts = 3,
    cooldownMs = 2000,
    enableLogging = true
  } = options;

  // Create unique operation key
  const operationKey = `${operationType}_${JSON.stringify(context)}`;
  
  // Local state
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [timeUntilRetry, setTimeUntilRetry] = useState(0);
  
  // Refs to prevent stale closures
  const operationInProgressRef = useRef(false);
  const lastAttemptTimeRef = useRef(0);

  /**
   * Execute operation with comprehensive duplicate prevention
   */
  const executeOperation = useCallback(async (operation: () => Promise<any>): Promise<any> => {
    // Pre-flight checks
    if (operationInProgressRef.current) {
      throw new Error(`Operation ${operationType} already in progress`);
    }

    const globalEntry = globalOperationTracking.get(operationKey);
    if (globalEntry?.inProgress) {
      throw new Error(`Operation ${operationType} already in progress globally`);
    }

    // Check cooldown period
    const now = Date.now();
    if (lastAttemptTimeRef.current && (now - lastAttemptTimeRef.current) < cooldownMs) {
      throw new Error(`Operation ${operationType} in cooldown period`);
    }

    // Check max attempts
    if (attemptCount >= maxAttempts) {
      throw new Error(`Maximum attempts (${maxAttempts}) exceeded for ${operationType}`);
    }

    try {
      // Set operation in progress
      operationInProgressRef.current = true;
      setIsOperationInProgress(true);
      
      // Update global tracking
      globalOperationTracking.set(operationKey, {
        inProgress: true,
        timestamp: now,
        attempts: attemptCount + 1
      });

      // Update attempt tracking
      setAttemptCount(prev => prev + 1);
      lastAttemptTimeRef.current = now;

      if (enableLogging) {
        console.log(`🔒 Starting operation: ${operationType} (attempt ${attemptCount + 1})`);
      }

      // Execute the operation
      const result = await operation();

      if (enableLogging) {
        console.log(`✅ Operation completed: ${operationType}`);
      }

      // Success - reset attempt count
      setAttemptCount(0);
      
      return result;

    } catch (error) {
      if (enableLogging) {
        console.error(`❌ Operation failed: ${operationType}`, error);
      }
      throw error;
    } finally {
      // Always cleanup
      operationInProgressRef.current = false;
      setIsOperationInProgress(false);
      
      // Cleanup global tracking after delay
      setTimeout(() => {
        globalOperationTracking.delete(operationKey);
      }, 1000);
    }
  }, [operationKey, operationType, cooldownMs, maxAttempts, attemptCount, enableLogging]);

  /**
   * Reset operation state
   */
  const resetOperation = useCallback(() => {
    setAttemptCount(0);
    setTimeUntilRetry(0);
    lastAttemptTimeRef.current = 0;
    operationInProgressRef.current = false;
    setIsOperationInProgress(false);
    globalOperationTracking.delete(operationKey);
    
    if (enableLogging) {
      console.log(`🔄 Reset operation: ${operationType}`);
    }
  }, [operationKey, operationType, enableLogging]);

  // Calculate retry info
  const canRetry = attemptCount < maxAttempts && !isOperationInProgress;
  const timeRemaining = Math.max(0, cooldownMs - (Date.now() - lastAttemptTimeRef.current));

  return {
    isOperationInProgress,
    executeOperation,
    resetOperation,
    attemptCount,
    canRetry,
    timeUntilRetry: timeRemaining
  };
}

/**
 * React component wrapper for preventing duplicate form submissions
 */
export function withDuplicatePrevention<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  operationType: string,
  getContext: (props: T) => Record<string, any>
) {
  return function DuplicatePreventionWrapper(props: T) {
    const context = getContext(props);
    const duplicatePrevention = useDuplicatePrevention(operationType, context);
    
    return <Component {...props} duplicatePrevention={duplicatePrevention} />;
  };
}

/**
 * Utility function to create operation-specific hooks
 */
export function createOperationHook(operationType: string) {
  return function useOperation(context: Record<string, any>, options?: DuplicatePreventionOptions) {
    return useDuplicatePrevention(operationType, context, options);
  };
}

// Export common operation hooks
export const useTokenCreation = createOperationHook('createToken');
export const useDocumentUpload = createOperationHook('uploadDocument');
export const useInvestorCreation = createOperationHook('createInvestor');

export default useDuplicatePrevention;
