/**
 * Use Operation Routing Hook
 * 
 * React hook for intelligent routing decisions in token operations.
 * Provides routing decision, execution mode selection, and Gateway/Service integration.
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  OperationRouter, 
  type RoutingContext, 
  type RoutingDecision, 
  type ExecutionMode,
  defaultRouter
} from './OperationRouter';
import { createRoutingContext } from './types';

export interface UseOperationRoutingOptions {
  operation: RoutingContext['operation'];
  requiresPolicy?: boolean;
  requiresCompliance?: boolean;
  requiresAudit?: boolean;
  enableFoundry?: boolean;
  isBatch?: boolean;
  isInternal?: boolean;
  router?: OperationRouter; // Custom router instance
}

export interface UseOperationRoutingResult {
  decision: RoutingDecision | null;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  useGateway: boolean;
  features: string[];
  isReady: boolean;
}

/**
 * Hook for intelligent operation routing
 * 
 * @example
 * ```typescript
 * const { decision, executionMode, setExecutionMode, useGateway } = useOperationRouting({
 *   operation: 'mint',
 *   requiresPolicy: true,
 *   requiresCompliance: true
 * });
 * 
 * if (useGateway) {
 *   await gateway.executeOperation(request);
 * } else {
 *   await tokenMintingService.executeMint(params);
 * }
 * ```
 */
export function useOperationRouting(
  options: UseOperationRoutingOptions
): UseOperationRoutingResult {
  const {
    operation,
    requiresPolicy = true,
    requiresCompliance = true,
    requiresAudit = true,
    enableFoundry = false,
    isBatch = false,
    isInternal = false,
    router = defaultRouter
  } = options;

  const [userPreference, setUserPreference] = useState<ExecutionMode | undefined>();
  const [decision, setDecision] = useState<RoutingDecision | null>(null);

  // Create routing context
  const context = useMemo<RoutingContext>(() => 
    createRoutingContext(operation, {
      requiresPolicy,
      requiresCompliance,
      requiresAudit,
      enableFoundry,
      isBatch,
      isInternal,
      userPreference
    }),
    [operation, requiresPolicy, requiresCompliance, requiresAudit, 
     enableFoundry, isBatch, isInternal, userPreference]
  );

  // Decide routing strategy
  useEffect(() => {
    const newDecision = router.decide(context);
    setDecision(newDecision);
    
    console.log('[Routing Decision]', {
      operation,
      mode: newDecision.executionMode,
      useGateway: newDecision.useGateway,
      reason: newDecision.reason,
      features: newDecision.features
    });
  }, [context, router, operation]);

  // Set execution mode (user override)
  const setExecutionMode = (mode: ExecutionMode) => {
    setUserPreference(mode);
  };

  return {
    decision,
    executionMode: decision?.executionMode || 'enhanced',
    setExecutionMode,
    useGateway: decision?.useGateway ?? true,
    features: decision?.features || [],
    isReady: decision !== null
  };
}
