import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TransactionRescueService } from '@/services/transactions/transactionRescueService';

interface StuckTransactionInfo {
  latestNonce: number;
  pendingNonce: number;
  stuckCount: number;
  stuckNonces: number[];
  pendingTxs: Array<{ hash: string | null; nonce: number; }>;
}

interface UseTransactionRescueOptions {
  /** Provider to use for checking transactions */
  provider: ethers.Provider | null;
  /** Wallet address to check */
  walletAddress: string | null;
  /** Enable automatic checking (default: true) */
  autoCheck?: boolean;
  /** Check interval in milliseconds (default: 30000 = 30 seconds) */
  checkInterval?: number;
  /** Callback when stuck transactions are detected */
  onStuckDetected?: (info: StuckTransactionInfo) => void;
}

interface UseTransactionRescueResult {
  /** Current stuck transaction info */
  stuckInfo: StuckTransactionInfo | null;
  /** Whether currently checking for stuck transactions */
  isChecking: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Manually trigger a check */
  checkStuckTransactions: () => Promise<void>;
  /** Whether there are any stuck transactions */
  hasStuckTransactions: boolean;
}

/**
 * Hook to monitor and detect stuck transactions
 * 
 * Automatically checks for stuck transactions at regular intervals
 * and provides functions to manually check and clear them.
 * 
 * @example
 * ```tsx
 * const { stuckInfo, hasStuckTransactions, checkStuckTransactions } = useTransactionRescue({
 *   provider,
 *   walletAddress,
 *   onStuckDetected: (info) => {
 *     toast({
 *       title: "Warning",
 *       description: `${info.stuckCount} stuck transaction(s) detected`
 *     });
 *   }
 * });
 * ```
 */
export const useTransactionRescue = ({
  provider,
  walletAddress,
  autoCheck = true,
  checkInterval = 30000, // 30 seconds
  onStuckDetected
}: UseTransactionRescueOptions): UseTransactionRescueResult => {
  const [stuckInfo, setStuckInfo] = useState<StuckTransactionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStuckTransactions = useCallback(async () => {
    if (!provider || !walletAddress) {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const info = await TransactionRescueService.getStuckTransactionInfo(
        provider,
        walletAddress
      );

      setStuckInfo(info);

      // Trigger callback if stuck transactions detected
      if (info.stuckCount > 0 && onStuckDetected) {
        onStuckDetected(info);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check transactions';
      setError(errorMessage);
      console.error('[useTransactionRescue] Error checking stuck transactions:', err);
    } finally {
      setIsChecking(false);
    }
  }, [provider, walletAddress, onStuckDetected]);

  // Automatic checking on interval
  useEffect(() => {
    if (!autoCheck || !provider || !walletAddress) {
      return;
    }

    // Initial check
    checkStuckTransactions();

    // Set up interval
    const intervalId = setInterval(checkStuckTransactions, checkInterval);

    return () => clearInterval(intervalId);
  }, [autoCheck, provider, walletAddress, checkInterval, checkStuckTransactions]);

  return {
    stuckInfo,
    isChecking,
    error,
    checkStuckTransactions,
    hasStuckTransactions: (stuckInfo?.stuckCount ?? 0) > 0
  };
};