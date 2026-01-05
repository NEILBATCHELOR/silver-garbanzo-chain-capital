import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, X, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { useTransactionRescue } from '@/hooks/useTransactionRescue';
import { useToast } from '@/components/ui/use-toast';
import { TransactionRescueService } from '@/services/transactions/transactionRescueService';

interface PersistentTransactionStatusProps {
  /** Wallet address to monitor */
  walletAddress: string | null;
  /** Provider for checking transactions */
  provider: ethers.Provider | null;
  /** Wallet with private key for clearing transactions */
  rescueWallet: ethers.Wallet | null;
  /** Enable automatic monitoring (default: true) */
  autoMonitor?: boolean;
}

/**
 * Persistent Transaction Status Component
 * 
 * Provides stable, persistent UI for stuck transaction management.
 * 
 * Features:
 * - Debounced detection (5 second delay before showing alert)
 * - Persists until user explicitly dismisses or clears
 * - Single, clear UI (no duplicate alerts/dialogs)
 * - Action buttons: "Clear All", "Dismiss"
 * - No flashing or flickering
 * 
 * Usage:
 * ```tsx
 * <PersistentTransactionStatus
 *   walletAddress={deploymentWalletAddress}
 *   provider={currentProvider}
 *   rescueWallet={rescueWallet}
 * />
 * ```
 */
export const PersistentTransactionStatus: React.FC<PersistentTransactionStatusProps> = ({
  walletAddress,
  provider,
  rescueWallet,
  autoMonitor = true
}) => {
  const { toast } = useToast();
  
  // Persistent state - locks in when stuck transactions detected
  const [lockedStuckInfo, setLockedStuckInfo] = useState<{
    latestNonce: number;
    pendingNonce: number;
    stuckCount: number;
    stuckNonces: number[];
    pendingTxs: Array<{ hash: string | null; nonce: number; }>;
  } | null>(null);
  
  // Dismissal state
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Clearing state
  const [isClearing, setIsClearing] = useState(false);
  
  // Refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use transaction rescue hook with NO callback (we handle display logic here)
  const { stuckInfo } = useTransactionRescue({
    provider,
    walletAddress,
    autoCheck: autoMonitor,
    checkInterval: 30000, // Check every 30 seconds
    // onStuckDetected: undefined, // Don't trigger toasts from hook
  });
  
  // Debounce stuck transaction detection (5 second delay)
  useEffect(() => {
    if (!stuckInfo || stuckInfo.stuckCount === 0) {
      return; // Don't clear locked state automatically
    }
    
    // If we already have locked info, don't update (prevents flickering)
    if (lockedStuckInfo && lockedStuckInfo.stuckCount > 0) {
      return;
    }
    
    // Debounce: Wait 5 seconds before locking in stuck info
    const timer = setTimeout(() => {
      console.log('🔒 [Persistent Status] Locking in stuck transaction info:', stuckInfo);
      setLockedStuckInfo(stuckInfo);
      setIsDismissed(false); // Show alert
    }, 5000); // 5 second debounce
    
    return () => clearTimeout(timer);
  }, [stuckInfo?.stuckCount, lockedStuckInfo]);
  
  // Refresh status - check if stuck transactions resolved
  const handleRefreshStatus = useCallback(async () => {
    if (!provider || !walletAddress) {
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      console.log('🔄 [Persistent Status] Refreshing stuck transaction status...');
      
      const freshInfo = await TransactionRescueService.getStuckTransactionInfo(
        provider,
        walletAddress
      );
      
      console.log('📊 [Persistent Status] Fresh status:', freshInfo);
      
      if (freshInfo.stuckCount === 0) {
        // Transactions resolved!
        toast({
          title: "Status Updated",
          description: "All stuck transactions have been resolved!",
          variant: "default"
        });
        
        setLockedStuckInfo(null);
        setIsDismissed(true);
      } else if (freshInfo.stuckCount !== lockedStuckInfo?.stuckCount) {
        // Different number of stuck transactions
        toast({
          title: "Status Updated",
          description: `Now showing ${freshInfo.stuckCount} stuck transaction(s)`,
          variant: "default"
        });
        
        setLockedStuckInfo(freshInfo);
      } else {
        // Same stuck transactions
        toast({
          title: "Status Unchanged",
          description: `Still ${freshInfo.stuckCount} stuck transaction(s)`,
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('❌ [Persistent Status] Error refreshing status:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh transaction status",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [provider, walletAddress, lockedStuckInfo, toast]);
  
  // Clear all stuck transactions
  const handleClearAll = useCallback(async () => {
    if (!rescueWallet || !lockedStuckInfo) {
      toast({
        title: "Cannot Clear Transactions",
        description: "Wallet not available for clearing transactions",
        variant: "destructive"
      });
      return;
    }
    
    setIsClearing(true);
    
    try {
      console.log('🚨 [Persistent Status] Clearing stuck transactions from locked state:', lockedStuckInfo);
      
      // Pass the locked nonces to force clearing even if blockchain shows no gap
      const cancelTxs = await TransactionRescueService.clearAllStuckTransactions(
        rescueWallet,
        {
          gasPriceMultiplier: 1.5, // 50% increase for aggressive clearing
          forceNonces: lockedStuckInfo.stuckNonces // Use LOCKED nonces, not fresh query
        }
      );
      
      console.log(`✅ [Persistent Status] Sent ${cancelTxs.length} cancellation transactions`);
      
      if (cancelTxs.length === 0) {
        // No transactions were sent - likely auto-resolved
        toast({
          title: "Transactions Already Resolved",
          description: "The stuck transactions appear to have resolved themselves. Refreshing status...",
          variant: "default"
        });
        
        // Clear locked state and dismiss
        setLockedStuckInfo(null);
        setIsDismissed(true);
        return;
      }
      
      toast({
        title: "Clearing Transactions",
        description: `Sent ${cancelTxs.length} cancellation transaction(s). They will be processed shortly.`,
        variant: "default"
      });
      
      // Wait for transactions to be mined (with timeout)
      const waitPromises = cancelTxs.map(tx => 
        tx.wait().catch(err => {
          console.error('Transaction failed:', err);
          return null;
        })
      );
      
      await Promise.race([
        Promise.all(waitPromises),
        new Promise(resolve => setTimeout(resolve, 60000)) // 60 second timeout
      ]);
      
      // Clear locked state after successful clearing
      setLockedStuckInfo(null);
      setIsDismissed(false);
      
      toast({
        title: "Transactions Cleared",
        description: "All stuck transactions have been cleared successfully",
        variant: "default"
      });
      
    } catch (error) {
      console.error('❌ [Persistent Status] Error clearing transactions:', error);
      
      toast({
        title: "Failed to Clear Transactions",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  }, [rescueWallet, lockedStuckInfo, toast]);
  
  // Handle dismiss
  const handleDismiss = useCallback(() => {
    console.log('🔕 [Persistent Status] User dismissed alert');
    setIsDismissed(true);
  }, []);
  
  // Only show if:
  // 1. Have locked stuck info (debounced)
  // 2. Stuck count > 0
  // 3. Not dismissed by user
  if (!lockedStuckInfo || lockedStuckInfo.stuckCount === 0 || isDismissed) {
    return null;
  }
  
  return (
    <Alert 
      variant="destructive" 
      className="border-red-600 bg-red-50 dark:bg-red-900/20"
    >
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800 dark:text-red-300">
        Stuck Transactions Detected
      </AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-400">
        <p className="mb-3">
          <strong>{lockedStuckInfo.stuckCount} transaction(s)</strong> are stuck in the mempool 
          with nonces <strong>{lockedStuckInfo.stuckNonces.join(', ')}</strong>.
          This may prevent new transactions from being processed.
        </p>
        
        {lockedStuckInfo.pendingTxs && lockedStuckInfo.pendingTxs.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-semibold mb-1">Pending Transaction Hashes:</p>
            <ul className="text-xs space-y-1">
              {lockedStuckInfo.pendingTxs.map(tx => (
                <li key={tx.hash} className="font-mono truncate">
                  Nonce {tx.nonce}: {tx.hash}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <p className="mb-3 text-sm">
          Latest confirmed nonce: <strong>{lockedStuckInfo.latestNonce}</strong> | 
          Pending nonce: <strong>{lockedStuckInfo.pendingNonce}</strong>
        </p>
        
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleClearAll}
            disabled={isClearing || isRefreshing || !rescueWallet}
            className="gap-2"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                Clear All Stuck Transactions
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isClearing || isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Refresh Status
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDismiss}
            disabled={isClearing || isRefreshing}
            className="gap-2"
          >
            <X className="h-3 w-3" />
            Dismiss
          </Button>
        </div>
        
        {!rescueWallet && (
          <p className="mt-2 text-xs text-red-600">
            ⚠️ Wallet not available. Cannot clear transactions automatically.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};
