/**
 * React Hook for Crypto Operation Gateway
 * Provides UI integration for gateway operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CryptoOperationGateway } from '../CryptoOperationGateway';
import type { OperationRequest, OperationResult } from '../types';
import type { SupportedChain } from '../../web3/adapters/IBlockchainAdapter';

export interface UseCryptoOperationGatewayOptions {
  autoInitialize?: boolean;
  onSuccess?: (result: OperationResult) => void;
  onError?: (error: Error) => void;
  confirmations?: number;
}

export interface OperationHelpers {
  mint: (tokenAddress: string, to: string, amount: string | bigint, chain: SupportedChain) => Promise<OperationResult>;
  burn: (tokenAddress: string, amount: string | bigint, chain: SupportedChain, from?: string) => Promise<OperationResult>;
  transfer: (tokenAddress: string, to: string, amount: string | bigint, chain: SupportedChain, from?: string) => Promise<OperationResult>;
  lock: (tokenAddress: string, amount: string | bigint, duration: number, reason: string, chain: SupportedChain) => Promise<OperationResult>;
  unlock: (tokenAddress: string, lockId: string, amount: string | bigint, chain: SupportedChain) => Promise<OperationResult>;
  block: (tokenAddress: string, address: string, reason: string, chain: SupportedChain) => Promise<OperationResult>;
  unblock: (tokenAddress: string, address: string, blockId: string, chain: SupportedChain) => Promise<OperationResult>;
  pause: (tokenAddress: string, chain: SupportedChain, reason?: string) => Promise<OperationResult>;
  unpause: (tokenAddress: string, chain: SupportedChain, reason?: string) => Promise<OperationResult>;
}

export function useCryptoOperationGateway(options: UseCryptoOperationGatewayOptions = {}) {
  const [gateway, setGateway] = useState<CryptoOperationGateway | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastOperation, setLastOperation] = useState<OperationResult | null>(null);
  
  const initializingRef = useRef(false);
    
  // Initialize gateway
  useEffect(() => {
    if (options.autoInitialize !== false && !gateway && !initializingRef.current) {
      initializingRef.current = true;
      const newGateway = new CryptoOperationGateway({
        // Add configuration if needed
      });
      setGateway(newGateway);
      initializingRef.current = false;
    }
  }, [gateway, options.autoInitialize]);
  
  /**
   * Execute an operation through the gateway
   */
  const executeOperation = useCallback(async (
    request: OperationRequest
  ): Promise<OperationResult> => {
    if (!gateway) {
      throw new Error('Gateway not initialized');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Add confirmations from options
      const enhancedRequest = {
        ...request,
        metadata: {
          ...request.metadata,
          confirmations: options.confirmations || 1
        }
      };
      
      const result = await gateway.executeOperation(enhancedRequest);
      
      setLastOperation(result);
      
      if (!result.success && result.error) {
        const err = new Error(result.error.message);
        setError(err);
        options.onError?.(err);
      } else {
        options.onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [gateway, options]);
  
  /**
   * Helper function for mint operation
   */
  const mint = useCallback(async (
    tokenAddress: string,
    to: string,
    amount: string | bigint,
    chain: SupportedChain
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'mint',
      chain,
      tokenAddress,
      parameters: { to, amount: amount.toString() }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for burn operation
   */
  const burn = useCallback(async (
    tokenAddress: string,
    amount: string | bigint,
    chain: SupportedChain,
    from?: string
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'burn',
      chain,
      tokenAddress,
      parameters: { amount: amount.toString(), from }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for transfer operation
   */
  const transfer = useCallback(async (
    tokenAddress: string,
    to: string,
    amount: string | bigint,
    chain: SupportedChain,
    from?: string
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'transfer',
      chain,
      tokenAddress,
      parameters: { to, amount: amount.toString(), from }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for lock operation
   */
  const lock = useCallback(async (
    tokenAddress: string,
    amount: string | bigint,
    duration: number,
    reason: string,
    chain: SupportedChain
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'lock',
      chain,
      tokenAddress,
      parameters: { 
        amount: amount.toString(), 
        duration,
        reason
      }
    });
  }, [executeOperation]);  
  /**
   * Helper function for unlock operation
   */
  const unlock = useCallback(async (
    tokenAddress: string,
    lockId: string,
    amount: string | bigint,
    chain: SupportedChain
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'unlock',
      chain,
      tokenAddress,
      parameters: { 
        lockId,
        amount: amount.toString()
      }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for block operation
   */
  const block = useCallback(async (
    tokenAddress: string,
    address: string,
    reason: string,
    chain: SupportedChain
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'block',
      chain,
      tokenAddress,
      parameters: { 
        address,
        reason
      }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for unblock operation
   */
  const unblock = useCallback(async (
    tokenAddress: string,
    address: string,
    blockId: string,
    chain: SupportedChain
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'unblock',
      chain,
      tokenAddress,
      parameters: { 
        address,
        blockId
      }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for pause operation
   */
  const pause = useCallback(async (
    tokenAddress: string,
    chain: SupportedChain,
    reason?: string
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'pause',
      chain,
      tokenAddress,
      parameters: {
        reason: reason || 'Manual pause operation'
      }
    });
  }, [executeOperation]);
  
  /**
   * Helper function for unpause operation
   */
  const unpause = useCallback(async (
    tokenAddress: string,
    chain: SupportedChain,
    reason?: string
  ): Promise<OperationResult> => {
    return executeOperation({
      type: 'unpause',
      chain,
      tokenAddress,
      parameters: {
        reason: reason || 'Manual unpause operation'
      }
    });
  }, [executeOperation]);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Clear last operation
   */
  const clearLastOperation = useCallback(() => {
    setLastOperation(null);
  }, []);
  
  return {
    // Core function
    executeOperation,
    
    // Helper functions
    operations: {
      mint,
      burn,
      transfer,
      lock,
      unlock,
      block,
      unblock,
      pause,
      unpause
    } as OperationHelpers,
    
    // State
    loading,
    error,
    lastOperation,
    
    // Utilities
    clearError,
    clearLastOperation,
    
    // Gateway instance (for advanced usage)
    gateway
  };
}