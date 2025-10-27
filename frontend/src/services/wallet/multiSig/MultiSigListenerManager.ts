/**
 * Multi-Sig Event Listener Manager
 * 
 * PURPOSE:
 * - Manage lifecycle of event listeners for multi-sig wallets
 * - Auto-start listeners when wallets are accessed
 * - Provide unified interface for starting/stopping listeners
 * - Track listener health and status across all wallets
 * 
 * USAGE:
 * ```typescript
 * // Start listening to a specific wallet
 * await multiSigListenerManager.startListenerForWallet(walletId);
 * 
 * // Start listeners for all wallets in a project
 * await multiSigListenerManager.startListenersForProject(projectId);
 * 
 * // Stop all listeners (on logout/cleanup)
 * await multiSigListenerManager.stopAllListeners();
 * 
 * // Get health status
 * const health = multiSigListenerManager.getHealthReport();
 * ```
 */

import { supabase } from '@/infrastructure/database/client';
import { multiSigEventListener } from './MultiSigEventListener';
import type { ListenerStatus } from './MultiSigEventListener';

// ============================================================================
// INTERFACES
// ============================================================================

export interface HealthReport {
  totalListeners: number;
  activeListeners: number;
  inactiveListeners: number;
  totalEventsProcessed: number;
  listenersWithErrors: number;
  details: ListenerStatus[];
}

// ============================================================================
// MANAGER SERVICE
// ============================================================================

export class MultiSigListenerManager {
  private static instance: MultiSigListenerManager;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): MultiSigListenerManager {
    if (!MultiSigListenerManager.instance) {
      MultiSigListenerManager.instance = new MultiSigListenerManager();
    }
    return MultiSigListenerManager.instance;
  }

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Start event listener for a specific wallet
   * 
   * @param walletId - UUID of the multi-sig wallet
   */
  async startListenerForWallet(walletId: string): Promise<void> {
    try {
      // Fetch wallet details
      const { data: wallet, error } = await supabase
        .from('multi_sig_wallets')
        .select(`
          id,
          address,
          blockchain,
          abi,
          project_id
        `)
        .eq('id', walletId)
        .single();

      if (error || !wallet) {
        throw new Error(`Failed to fetch wallet: ${error?.message}`);
      }

      // Start listening
      await multiSigEventListener.startListening({
        walletId: wallet.id,
        walletAddress: wallet.address,
        blockchain: wallet.blockchain,
        abi: wallet.abi,
        projectId: wallet.project_id
      });

      console.log(`✅ Started listener for wallet ${walletId}`);
    } catch (error: any) {
      console.error(`Failed to start listener for wallet ${walletId}:`, error);
      throw error;
    }
  }

  /**
   * Start event listeners for all multi-sig wallets in a project
   * 
   * @param projectId - UUID of the project
   */
  async startListenersForProject(projectId: string): Promise<void> {
    try {
      // Fetch all multi-sig wallets in project
      const { data: wallets, error } = await supabase
        .from('multi_sig_wallets')
        .select(`
          id,
          address,
          blockchain,
          abi,
          project_id
        `)
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch wallets: ${error.message}`);
      }

      if (!wallets || wallets.length === 0) {
        console.log(`No active multi-sig wallets found for project ${projectId}`);
        return;
      }

      // Start listeners for all wallets
      await Promise.allSettled(
        wallets.map(wallet =>
          multiSigEventListener.startListening({
            walletId: wallet.id,
            walletAddress: wallet.address,
            blockchain: wallet.blockchain,
            abi: wallet.abi,
            projectId: wallet.project_id
          })
        )
      );

      console.log(`✅ Started ${wallets.length} listeners for project ${projectId}`);
    } catch (error: any) {
      console.error(`Failed to start listeners for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Start event listeners for all wallets a user has access to
   * 
   * @param userId - UUID of the user
   */
  async startListenersForUser(userId: string): Promise<void> {
    try {
      // Fetch all projects user has access to
      const { data: projectUsers, error: projectError } = await supabase
        .from('project_users')
        .select('project_id')
        .eq('user_id', userId);

      if (projectError) {
        throw new Error(`Failed to fetch user projects: ${projectError.message}`);
      }

      if (!projectUsers || projectUsers.length === 0) {
        console.log(`User ${userId} has no projects with multi-sig wallets`);
        return;
      }

      // Start listeners for all projects
      await Promise.allSettled(
        projectUsers.map(pu => this.startListenersForProject(pu.project_id))
      );

      console.log(`✅ Started listeners for user ${userId} across ${projectUsers.length} projects`);
    } catch (error: any) {
      console.error(`Failed to start listeners for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stop event listener for a specific wallet
   * 
   * @param walletId - UUID of the multi-sig wallet
   */
  async stopListenerForWallet(walletId: string): Promise<void> {
    await multiSigEventListener.stopListening(walletId);
    console.log(`❌ Stopped listener for wallet ${walletId}`);
  }

  /**
   * Stop all active event listeners
   */
  async stopAllListeners(): Promise<void> {
    await multiSigEventListener.stopAll();
    console.log(`❌ Stopped all listeners`);
  }

  // ============================================================================
  // STATUS & MONITORING
  // ============================================================================

  /**
   * Get status of a specific wallet's listener
   * 
   * @param walletId - UUID of the multi-sig wallet
   */
  getListenerStatus(walletId: string): ListenerStatus | null {
    return multiSigEventListener.getStatus(walletId);
  }

  /**
   * Get comprehensive health report for all listeners
   */
  getHealthReport(): HealthReport {
    const allStatuses = multiSigEventListener.getAllStatuses();

    return {
      totalListeners: allStatuses.length,
      activeListeners: allStatuses.filter(s => s.isListening).length,
      inactiveListeners: allStatuses.filter(s => !s.isListening).length,
      totalEventsProcessed: allStatuses.reduce((sum, s) => sum + s.eventsProcessed, 0),
      listenersWithErrors: allStatuses.filter(s => s.errors.length > 0).length,
      details: allStatuses
    };
  }

  /**
   * Check if a wallet is currently being listened to
   * 
   * @param walletId - UUID of the multi-sig wallet
   */
  isListening(walletId: string): boolean {
    const status = this.getListenerStatus(walletId);
    return status?.isListening || false;
  }

  /**
   * Get all active listener wallet IDs
   */
  getActiveListeners(): string[] {
    return multiSigEventListener
      .getAllStatuses()
      .filter(s => s.isListening)
      .map(s => s.walletId);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Restart listener for a wallet (stop then start)
   * 
   * @param walletId - UUID of the multi-sig wallet
   */
  async restartListenerForWallet(walletId: string): Promise<void> {
    await this.stopListenerForWallet(walletId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    await this.startListenerForWallet(walletId);
  }

  /**
   * Restart all listeners (useful for error recovery)
   */
  async restartAllListeners(): Promise<void> {
    const activeWallets = this.getActiveListeners();
    await this.stopAllListeners();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    
    await Promise.allSettled(
      activeWallets.map(walletId => this.startListenerForWallet(walletId))
    );

    console.log(`✅ Restarted ${activeWallets.length} listeners`);
  }

  /**
   * Auto-start listeners on application initialization
   * Should be called when user logs in or app starts
   * 
   * @param userId - UUID of the current user
   */
  async autoStartOnInit(userId: string): Promise<void> {
    try {
      console.log(`🚀 Auto-starting multi-sig event listeners for user ${userId}...`);
      await this.startListenersForUser(userId);
      
      const report = this.getHealthReport();
      console.log(`✅ Listeners started: ${report.activeListeners} active, ${report.inactiveListeners} inactive`);
    } catch (error: any) {
      console.error('Failed to auto-start listeners:', error);
      // Don't throw - listeners are non-critical for app startup
    }
  }

  /**
   * Auto-stop listeners on application cleanup
   * Should be called when user logs out or app unmounts
   */
  async autoStopOnCleanup(): Promise<void> {
    try {
      console.log(`🛑 Auto-stopping all multi-sig event listeners...`);
      await this.stopAllListeners();
      console.log(`✅ All listeners stopped`);
    } catch (error: any) {
      console.error('Failed to auto-stop listeners:', error);
    }
  }
}

// Export singleton instance
export const multiSigListenerManager = MultiSigListenerManager.getInstance();
