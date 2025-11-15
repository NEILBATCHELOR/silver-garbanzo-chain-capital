/**
 * Foundry Operations Hook
 * React hook for PolicyAware components to interact with Foundry contracts
 */

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { FoundryPolicyAdapter, FoundryOperationExecutor } from '../index';
import type { OperationRequest, TransactionResult, GasEstimate } from '../../gateway/types';
import type { CryptoOperation } from '../../policy/types';
import type { SupportedChain } from '../../web3/adapters/IBlockchainAdapter';

// Helper to create a default GasEstimate
const createDefaultGasEstimate = (): GasEstimate => ({
  limit: BigInt(500000),
  price: BigInt(20000000000), // 20 gwei
  estimatedCost: '0.01' // Estimated cost in native token
});

// Policy Engine contract addresses per chain
const POLICY_ENGINE_ADDRESSES: Record<string, string> = {
  // Add your deployed PolicyEngine addresses here
  'ethereum': '0x0000000000000000000000000000000000000000', // Replace with actual address
  'polygon': '0x0000000000000000000000000000000000000000',
  'avalanche': '0x0000000000000000000000000000000000000000',
  'bsc': '0x0000000000000000000000000000000000000000',
  'base': '0x0000000000000000000000000000000000000000'
};

export interface UseFoundryOperationsResult {
  // Execution methods
  executeMint: (tokenAddress: string, to: string, amount: string) => Promise<TransactionResult>;
  executeBurn: (tokenAddress: string, amount: string) => Promise<TransactionResult>;
  executeTransfer: (tokenAddress: string, to: string, amount: string) => Promise<TransactionResult>;
  executeLock: (tokenAddress: string, amount: string, duration: number) => Promise<TransactionResult>;
  executeUnlock: (tokenAddress: string) => Promise<TransactionResult>;
  executeBlock: (tokenAddress: string, address: string, reason: string) => Promise<TransactionResult>;
  executeUnblock: (tokenAddress: string, address: string) => Promise<TransactionResult>;
  
  // Policy validation
  validateOperation: (tokenAddress: string, operation: CryptoOperation) => Promise<boolean>;
  getRemainingDailyLimit: (tokenAddress: string, operationType: string) => Promise<bigint>;
  
  // Query methods
  getBalance: (tokenAddress: string, account?: string) => Promise<string>;
  getLockedBalance: (tokenAddress: string, account?: string) => Promise<string>;
  getUnlockTime: (tokenAddress: string, account?: string) => Promise<number>;
  isBlocked: (tokenAddress: string, account?: string) => Promise<boolean>;
  
  // State
  loading: boolean;
  error: Error | null;
  executor: FoundryOperationExecutor | null;
}

export function useFoundryOperations(chain: string = 'ethereum'): UseFoundryOperationsResult {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [executor, setExecutor] = useState<FoundryOperationExecutor | null>(null);
  const [policyAdapter, setPolicyAdapter] = useState<FoundryPolicyAdapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize executor when wallet connects
  useEffect(() => {
    if (walletClient && address) {
      initializeExecutor();
    }
  }, [walletClient, address, chain]);

  const initializeExecutor = useCallback(async () => {
    if (!walletClient) return;

    try {
      // Get provider and signer from wallet client
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      const policyEngineAddress = POLICY_ENGINE_ADDRESSES[chain];
      if (!policyEngineAddress || policyEngineAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`PolicyEngine not deployed on ${chain}`);
      }

      const executor = new FoundryOperationExecutor({
        provider,
        signer,
        policyEngineAddress,
        defaultGasLimit: BigInt(500000)
      });

      const adapter = executor.getPolicyAdapter();

      setExecutor(executor);
      setPolicyAdapter(adapter);
    } catch (err) {
      console.error('Failed to initialize Foundry executor:', err);
      setError(err as Error);
    }
  }, [walletClient, chain]);

  // Execution methods with proper error handling
  const executeMint = useCallback(async (
    tokenAddress: string,
    to: string,
    amount: string
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'mint',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: { to, amount }
      };
      const result = await executor.executeMint(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const executeBurn = useCallback(async (
    tokenAddress: string,
    amount: string
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'burn',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: { amount }
      };
      const result = await executor.executeBurn(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const executeTransfer = useCallback(async (
    tokenAddress: string,
    to: string,
    amount: string
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'transfer',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: { to, amount }
      };
      const result = await executor.executeTransfer(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const executeLock = useCallback(async (
    tokenAddress: string,
    amount: string,
    duration: number
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'lock',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: { amount, duration }
      };
      const result = await executor.executeLock(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const executeUnlock = useCallback(async (
    tokenAddress: string
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'unlock',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: {}
      };
      const result = await executor.executeUnlock(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const executeBlock = useCallback(async (
    tokenAddress: string,
    addressToBlock: string,
    reason: string
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'block',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: { to: addressToBlock, reason }
      };
      const result = await executor.executeBlock(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const executeUnblock = useCallback(async (
    tokenAddress: string,
    addressToUnblock: string
  ): Promise<TransactionResult> => {
    if (!executor) throw new Error('Executor not initialized');
    setLoading(true);
    setError(null);
    try {
      const request: OperationRequest = {
        type: 'unblock',
        chain: chain as SupportedChain,
        tokenAddress,
        parameters: { to: addressToUnblock }
      };
      const result = await executor.executeUnblock(request, createDefaultGasEstimate());
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [executor, chain]);

  const validateOperation = useCallback(async (
    tokenAddress: string,
    operation: CryptoOperation
  ): Promise<boolean> => {
    if (!policyAdapter || !address) return false;
    try {
      const result = await policyAdapter.canOperate(tokenAddress, address, operation);
      return result.approved;
    } catch (err) {
      console.error('Policy validation failed:', err);
      return false;
    }
  }, [policyAdapter, address]);

  const getRemainingDailyLimit = useCallback(async (
    tokenAddress: string,
    operationType: string
  ): Promise<bigint> => {
    if (!policyAdapter || !address) return BigInt(0);
    try {
      return await policyAdapter.getRemainingDailyLimit(tokenAddress, address, operationType);
    } catch (err) {
      console.error('Failed to get remaining daily limit:', err);
      return BigInt(0);
    }
  }, [policyAdapter, address]);

  const getBalance = useCallback(async (
    tokenAddress: string,
    account?: string
  ): Promise<string> => {
    if (!executor) return '0';
    try {
      return await executor.getBalance(tokenAddress, account || address || '');
    } catch (err) {
      console.error('Failed to get balance:', err);
      return '0';
    }
  }, [executor, address]);

  const getLockedBalance = useCallback(async (
    tokenAddress: string,
    account?: string
  ): Promise<string> => {
    if (!executor) return '0';
    try {
      return await executor.getLockedBalance(tokenAddress, account || address || '');
    } catch (err) {
      console.error('Failed to get locked balance:', err);
      return '0';
    }
  }, [executor, address]);

  const getUnlockTime = useCallback(async (
    tokenAddress: string,
    account?: string
  ): Promise<number> => {
    if (!executor) return 0;
    try {
      return await executor.getUnlockTime(tokenAddress, account || address || '');
    } catch (err) {
      console.error('Failed to get unlock time:', err);
      return 0;
    }
  }, [executor, address]);

  const isBlocked = useCallback(async (
    tokenAddress: string,
    account?: string
  ): Promise<boolean> => {
    if (!executor) return false;
    try {
      return await executor.isBlocked(tokenAddress, account || address || '');
    } catch (err) {
      console.error('Failed to check if blocked:', err);
      return false;
    }
  }, [executor, address]);

  return {
    executeMint,
    executeBurn,
    executeTransfer,
    executeLock,
    executeUnlock,
    executeBlock,
    executeUnblock,
    validateOperation,
    getRemainingDailyLimit,
    getBalance,
    getLockedBalance,
    getUnlockTime,
    isBlocked,
    loading,
    error,
    executor
  };
}
