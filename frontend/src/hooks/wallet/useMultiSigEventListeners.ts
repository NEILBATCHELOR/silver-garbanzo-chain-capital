/**
 * useMultiSigEventListeners Hook
 * 
 * PURPOSE:
 * - React hook to manage multi-sig event listeners lifecycle
 * - Auto-start listeners when user logs in
 * - Auto-stop listeners on component unmount
 * - Provide listener status and health monitoring
 * 
 * USAGE:
 * ```typescript
 * // In App.tsx or main layout component:
 * function App() {
 *   const { user } = useAuth();
 *   const { health, isInitialized, restart } = useMultiSigEventListeners(user?.id);
 *   
 *   return (
 *     <div>
 *       <ListenerHealthBadge health={health} />
 *       {children}
 *     </div>
 *   );
 * }
 * 
 * // In wallet dashboard:
 * function WalletDashboard({ walletId }) {
 *   const { startListener, stopListener, getStatus } = useMultiSigEventListeners();
 *   const status = getStatus(walletId);
 *   
 *   return <div>Listener status: {status?.isListening ? 'Active' : 'Inactive'}</div>;
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { multiSigListenerManager } from '@/services/wallet/multiSig';
import type { HealthReport, ListenerStatus } from '@/services/wallet/multiSig';

// ============================================================================
// HOOK
// ============================================================================

export interface UseMultiSigEventListenersReturn {
  /** Overall health report of all listeners */
  health: HealthReport | null;
  /** Whether listeners have been initialized */
  isInitialized: boolean;
  /** Start listener for a specific wallet */
  startListener: (walletId: string) => Promise<void>;
  /** Stop listener for a specific wallet */
  stopListener: (walletId: string) => Promise<void>;
  /** Start listeners for a project */
  startProjectListeners: (projectId: string) => Promise<void>;
  /** Restart all listeners (for error recovery) */
  restart: () => Promise<void>;
  /** Get status of a specific listener */
  getStatus: (walletId: string) => ListenerStatus | null;
  /** Check if a wallet is being listened to */
  isListening: (walletId: string) => boolean;
}

/**
 * Hook to manage multi-sig event listeners
 * 
 * @param userId - Current user ID (auto-starts listeners when provided)
 * @param options - Configuration options
 */
export function useMultiSigEventListeners(
  userId?: string,
  options?: {
    /** Auto-start listeners on mount (default: true) */
    autoStart?: boolean;
    /** Auto-stop listeners on unmount (default: true) */
    autoStop?: boolean;
    /** Health check interval in ms (default: 30000 = 30s) */
    healthCheckInterval?: number;
  }
): UseMultiSigEventListenersReturn {
  const {
    autoStart = true,
    autoStop = true,
    healthCheckInterval = 30000
  } = options || {};

  const [health, setHealth] = useState<HealthReport | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    const initialize = async () => {
      if (!userId || !autoStart) {
        setIsInitialized(false);
        return;
      }

      try {
        console.log('[useMultiSigEventListeners] Initializing for user:', userId);
        await multiSigListenerManager.autoStartOnInit(userId);
        
        if (mounted) {
          setIsInitialized(true);
          updateHealth();

          // Start health check interval
          interval = setInterval(() => {
            if (mounted) {
              updateHealth();
            }
          }, healthCheckInterval);
        }
      } catch (error) {
        console.error('[useMultiSigEventListeners] Initialization failed:', error);
        if (mounted) {
          setIsInitialized(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
      if (autoStop) {
        multiSigListenerManager.autoStopOnCleanup();
      }
    };
  }, [userId, autoStart, autoStop, healthCheckInterval]);

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  const updateHealth = useCallback(() => {
    const report = multiSigListenerManager.getHealthReport();
    setHealth(report);
  }, []);

  // ============================================================================
  // LISTENER CONTROLS
  // ============================================================================

  const startListener = useCallback(async (walletId: string) => {
    try {
      await multiSigListenerManager.startListenerForWallet(walletId);
      updateHealth();
    } catch (error) {
      console.error(`Failed to start listener for wallet ${walletId}:`, error);
      throw error;
    }
  }, [updateHealth]);

  const stopListener = useCallback(async (walletId: string) => {
    try {
      await multiSigListenerManager.stopListenerForWallet(walletId);
      updateHealth();
    } catch (error) {
      console.error(`Failed to stop listener for wallet ${walletId}:`, error);
      throw error;
    }
  }, [updateHealth]);

  const startProjectListeners = useCallback(async (projectId: string) => {
    try {
      await multiSigListenerManager.startListenersForProject(projectId);
      updateHealth();
    } catch (error) {
      console.error(`Failed to start project listeners for ${projectId}:`, error);
      throw error;
    }
  }, [updateHealth]);

  const restart = useCallback(async () => {
    try {
      await multiSigListenerManager.restartAllListeners();
      updateHealth();
    } catch (error) {
      console.error('Failed to restart listeners:', error);
      throw error;
    }
  }, [updateHealth]);

  const getStatus = useCallback((walletId: string): ListenerStatus | null => {
    return multiSigListenerManager.getListenerStatus(walletId);
  }, []);

  const isListening = useCallback((walletId: string): boolean => {
    return multiSigListenerManager.isListening(walletId);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    health,
    isInitialized,
    startListener,
    stopListener,
    startProjectListeners,
    restart,
    getStatus,
    isListening
  };
}
