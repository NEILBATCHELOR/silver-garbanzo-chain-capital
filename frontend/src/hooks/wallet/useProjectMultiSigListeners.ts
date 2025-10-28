/**
 * useProjectMultiSigListeners Hook
 * 
 * PURPOSE:
 * - Context-aware listener management for specific projects
 * - Start/stop listeners only for wallets in active project
 * - Auto-cleanup on component unmount
 * - Prevent wasteful global listener initialization
 * 
 * USAGE PATTERNS:
 * ```typescript
 * // Pattern 1: Project Dashboard
 * function ProjectDashboard({ projectId }) {
 *   useProjectMultiSigListeners(projectId, selectedTab === 'multisig');
 *   // Listeners only active when viewing multi-sig tab
 * }
 * 
 * // Pattern 2: Wallet-Specific
 * function PendingProposalsCard({ walletId }) {
 *   useWalletMultiSigListener(walletId);
 *   // Listener only for this specific wallet
 * }
 * ```
 */

import { useEffect } from 'react';
import { multiSigListenerManager } from '@/services/wallet/multiSig';

// ============================================================================
// PROJECT-SCOPED LISTENER HOOK
// ============================================================================

/**
 * Auto-manage listeners for all multi-sig wallets in a project
 * Only active when enabled parameter is true
 * 
 * @param projectId - Project ID to monitor
 * @param enabled - Whether to activate listeners (default: true)
 */
export function useProjectMultiSigListeners(
  projectId: string | null | undefined,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!projectId || !enabled) return;

    // Start listeners for all project wallets
    const startListeners = async () => {
      try {
        await multiSigListenerManager.startListenersForProject(projectId);
        console.log(`✅ Started multi-sig listeners for project ${projectId}`);
      } catch (error) {
        console.error(`Failed to start project listeners:`, error);
      }
    };

    startListeners();

    // Cleanup: Stop listeners when component unmounts or project changes
    return () => {
      // Note: We don't auto-stop because other components might be using them
      // Listeners will be cleaned up by stale cleanup mechanism
      console.log(`🧹 Component unmounted, listeners for project ${projectId} marked for cleanup`);
    };
  }, [projectId, enabled]);
}

// ============================================================================
// WALLET-SPECIFIC LISTENER HOOK
// ============================================================================

/**
 * Auto-manage listener for a specific wallet
 * Perfect for proposal cards, approval interfaces, etc.
 * 
 * @param walletId - Wallet ID to monitor
 * @param enabled - Whether to activate listener (default: true)
 */
export function useWalletMultiSigListener(
  walletId: string | null | undefined,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!walletId || !enabled) return;

    // Start listener for this wallet
    const startListener = async () => {
      try {
        await multiSigListenerManager.startListenerForWallet(walletId);
        console.log(`✅ Started listener for wallet ${walletId}`);
      } catch (error) {
        console.error(`Failed to start wallet listener:`, error);
      }
    };

    startListener();

    // Cleanup: Stop listener when component unmounts or wallet changes
    return () => {
      multiSigListenerManager.stopListenerForWallet(walletId);
      console.log(`❌ Stopped listener for wallet ${walletId}`);
    };
  }, [walletId, enabled]);
}

// ============================================================================
// OPTIONAL: LEGACY HOOK FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use useProjectMultiSigListeners or useWalletMultiSigListener instead
 * 
 * This hook is kept for backward compatibility but should not be used
 * in new code as it starts listeners for ALL projects on app load.
 */
export function useMultiSigEventListeners(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    console.warn(
      '⚠️  useMultiSigEventListeners is deprecated. ' +
      'Use useProjectMultiSigListeners or useWalletMultiSigListener for better performance.'
    );

    // For backward compatibility, start all listeners
    // But this is NOT recommended for production
    const startAll = async () => {
      try {
        await multiSigListenerManager.startListenersForUser(userId);
      } catch (error) {
        console.error('Failed to start all listeners:', error);
      }
    };

    startAll();

    return () => {
      multiSigListenerManager.stopAllListeners();
    };
  }, [userId]);

  return {
    getHealth: () => multiSigListenerManager.getHealthReport(),
    restartAll: () => multiSigListenerManager.restartAllListeners()
  };
}
