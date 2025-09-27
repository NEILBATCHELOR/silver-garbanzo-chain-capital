/**
 * PreTransactionHooks.tsx
 * React hooks for pre-transaction validation UI integration
 */

import { useState, useCallback, useEffect } from 'react';
import { TransactionValidator } from '../TransactionValidator';
import type { 
  ValidationRequest, 
  ValidationResponse,
  ValidationError,
  PolicyCheck,
  RuleCheck
} from '../TransactionValidator';
import type { Transaction } from '@/types/core/centralModels';

export interface ValidationOptions {
  urgency?: 'immediate' | 'standard' | 'batch';
  simulate?: boolean;
  cacheResults?: boolean;
}

export interface UseTransactionValidationReturn {
  validateTransaction: (transaction: Transaction, options?: ValidationOptions) => Promise<ValidationResponse>;
  clearValidation: () => void;
  validating: boolean;
  validationResult: ValidationResponse | null;
  error: Error | null;
}

/**
 * Hook for transaction validation
 */
export function useTransactionValidation(): UseTransactionValidationReturn {
  const [validator] = useState(() => new TransactionValidator());
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const validateTransaction = useCallback(async (
    transaction: Transaction,
    options?: ValidationOptions
  ): Promise<ValidationResponse> => {
    setValidating(true);
    setError(null);
    
    try {
      const request: ValidationRequest = {
        transaction,
        urgency: options?.urgency || 'standard',
        simulateExecution: options?.simulate !== false
      };
      
      const result = await validator.validateTransaction(request);
      setValidationResult(result);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Validation failed');
      setError(error);
      throw error;
    } finally {
      setValidating(false);
    }
  }, [validator]);
  
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      validator['cache'].destroy();
    };
  }, [validator]);
  
  return {
    validateTransaction,
    clearValidation,
    validating,
    validationResult,
    error
  };
}

/**
 * Hook for validation monitoring
 */
export function useValidationMonitoring(address?: string) {
  const [monitor, setMonitor] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    if (!address) return;
    
    // Import dynamically to avoid circular dependencies
    import('../monitors/RealTimeMonitor').then(({ RealTimeMonitor }) => {
      const monitorInstance = new RealTimeMonitor();
      
      // Monitor address
      monitorInstance.monitorAddress(address, (event) => {
        setAlerts(prev => [...prev, event]);
      });
      
      setMonitor(monitorInstance);
      setConnected(true);
      
      return () => {
        monitorInstance.stopMonitoring(address);
        monitorInstance.destroy();
        setConnected(false);
      };
    });
  }, [address]);
  
  return {
    monitor,
    alerts,
    connected
  };
}

/**
 * Hook for validation cache management
 */
export function useValidationCache() {
  const [cache, setCache] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    import('../ValidationCache').then(({ ValidationCache }) => {
      const cacheInstance = new ValidationCache();
      setCache(cacheInstance);
      
      // Update stats periodically
      const interval = setInterval(() => {
        setStats(cacheInstance.getStats());
      }, 5000);
      
      return () => {
        clearInterval(interval);
        cacheInstance.destroy();
      };
    });
  }, []);
  
  const clearCache = useCallback(async (key?: string) => {
    if (cache) {
      await cache.clear(key);
      setStats(cache.getStats());
    }
  }, [cache]);
  
  return {
    cache,
    stats,
    clearCache
  };
}

/**
 * Hook for policy validation status
 */
export function usePolicyValidation(validationResult: ValidationResponse | null) {
  const [failedPolicies, setFailedPolicies] = useState<PolicyCheck[]>([]);
  const [passedPolicies, setPassedPolicies] = useState<PolicyCheck[]>([]);
  const [warningPolicies, setWarningPolicies] = useState<PolicyCheck[]>([]);
  
  useEffect(() => {
    if (!validationResult) {
      setFailedPolicies([]);
      setPassedPolicies([]);
      setWarningPolicies([]);
      return;
    }
    
    const failed = validationResult.policies.filter(p => p.status === 'failed');
    const passed = validationResult.policies.filter(p => p.status === 'passed');
    const warnings = validationResult.policies.filter(p => p.status === 'warning');
    
    setFailedPolicies(failed);
    setPassedPolicies(passed);
    setWarningPolicies(warnings);
  }, [validationResult]);
  
  return {
    failedPolicies,
    passedPolicies,
    warningPolicies,
    totalPolicies: validationResult?.policies.length || 0,
    allPassed: failedPolicies.length === 0
  };
}

/**
 * Hook for rule validation status
 */
export function useRuleValidation(validationResult: ValidationResponse | null) {
  const [criticalRules, setCriticalRules] = useState<RuleCheck[]>([]);
  const [failedRules, setFailedRules] = useState<RuleCheck[]>([]);
  const [passedRules, setPassedRules] = useState<RuleCheck[]>([]);
  
  useEffect(() => {
    if (!validationResult) {
      setCriticalRules([]);
      setFailedRules([]);
      setPassedRules([]);
      return;
    }
    
    const critical = validationResult.rules.filter(r => r.impact === 'critical' && r.status === 'failed');
    const failed = validationResult.rules.filter(r => r.status === 'failed');
    const passed = validationResult.rules.filter(r => r.status === 'passed');
    
    setCriticalRules(critical);
    setFailedRules(failed);
    setPassedRules(passed);
  }, [validationResult]);
  
  return {
    criticalRules,
    failedRules,
    passedRules,
    totalRules: validationResult?.rules.length || 0,
    hasCriticalFailures: criticalRules.length > 0
  };
}

/**
 * Hook for gas estimation display
 */
export function useGasEstimation(validationResult: ValidationResponse | null) {
  const [gasInEth, setGasInEth] = useState<string>('0');
  const [gasInUsd, setGasInUsd] = useState<string>('0');
  const [isHighGas, setIsHighGas] = useState(false);
  
  useEffect(() => {
    if (!validationResult?.gasEstimate) {
      setGasInEth('0');
      setGasInUsd('0');
      setIsHighGas(false);
      return;
    }
    
    const { limit, price, maxFeePerGas } = validationResult.gasEstimate;
    
    // Calculate max fee: use maxFeePerGas if available, otherwise limit * price
    const maxFeeWei = maxFeePerGas ? maxFeePerGas * limit : limit * price;
    
    // Convert to ETH (assuming wei)
    const ethValue = Number(maxFeeWei) / 1e18;
    setGasInEth(ethValue.toFixed(6));
    
    // Convert to USD (assuming $3000/ETH - should be dynamic in production)
    const usdValue = ethValue * 3000;
    setGasInUsd(usdValue.toFixed(2));
    
    // Check if gas is high (> $50)
    setIsHighGas(usdValue > 50);
  }, [validationResult]);
  
  return {
    gasInEth,
    gasInUsd,
    isHighGas,
    gasEstimate: validationResult?.gasEstimate
  };
}
