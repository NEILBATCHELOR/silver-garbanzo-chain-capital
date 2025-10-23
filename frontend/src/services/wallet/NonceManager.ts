/**
 * Enhanced Nonce Management System
 * 
 * Prevents nonce gaps and handles concurrent transaction scenarios
 * Critical for avoiding stuck transactions in mempool
 */

import { ethers } from 'ethers';

export interface NonceStatus {
  confirmed: number; // Last confirmed on-chain nonce
  pending: number; // Expected next nonce (includes pending txs)
  hasGap: boolean; // Whether there's a gap between confirmed and pending
  gapSize: number; // Number of transactions in the gap
  tracked: number | undefined; // Our locally tracked nonce
  recommended: number; // The nonce we recommend using
}

export interface NonceValidation {
  valid: boolean;
  status: NonceStatus;
  errors: string[];
  warnings: string[];
}

export class NonceManager {
  private static instance: NonceManager;
  
  // Track nonces per address
  private nonceQueues: Map<string, number> = new Map();
  private nonceQueueLocks: Map<string, Promise<void>> = new Map();
  
  // Track pending transactions per address
  private pendingTransactions: Map<string, Set<number>> = new Map();

  private constructor() {}

  static getInstance(): NonceManager {
    if (!NonceManager.instance) {
      NonceManager.instance = new NonceManager();
    }
    return NonceManager.instance;
  }

  /**
   * Get comprehensive nonce status for an address
   * Detects gaps between confirmed and pending nonces
   */
  async getNonceStatus(
    address: string,
    provider: ethers.JsonRpcProvider
  ): Promise<NonceStatus> {
    const key = address.toLowerCase();
    
    // Get nonces from network
    const [confirmed, pending] = await Promise.all([
      provider.getTransactionCount(address, 'latest'),
      provider.getTransactionCount(address, 'pending')
    ]);
    
    // Get tracked nonce
    const tracked = this.nonceQueues.get(key);
    
    // Detect gap
    const hasGap = pending > confirmed;
    const gapSize = hasGap ? pending - confirmed : 0;
    
    // Calculate recommended nonce
    let recommended: number;
    if (tracked !== undefined) {
      // Use highest of network pending or our tracked nonce
      recommended = Math.max(pending, tracked);
    } else {
      // Use network pending nonce
      recommended = pending;
    }
    
    return {
      confirmed,
      pending,
      hasGap,
      gapSize,
      tracked,
      recommended
    };
  }

  /**
   * Validate nonce status before assignment
   * Ensures no gaps exist that would block transaction
   */
  async validateNonce(
    address: string,
    provider: ethers.JsonRpcProvider
  ): Promise<NonceValidation> {
    const status = await this.getNonceStatus(address, provider);
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for nonce gap
    if (status.hasGap) {
      errors.push(
        `Nonce gap detected: ${status.gapSize} transaction(s) pending between ` +
        `nonce ${status.confirmed} (confirmed) and ${status.pending} (pending). ` +
        `Transaction will be blocked until gap is filled.`
      );
    }
    
    // Check if tracked nonce is too high
    if (status.tracked !== undefined && status.tracked > status.pending) {
      warnings.push(
        `Local tracked nonce (${status.tracked}) is higher than network pending nonce (${status.pending}). ` +
        `This may indicate dropped transactions.`
      );
    }
    
    // Check for large gaps
    if (status.gapSize > 5) {
      warnings.push(
        `Large nonce gap (${status.gapSize} transactions). Consider cancelling stuck transactions.`
      );
    }
    
    return {
      valid: errors.length === 0,
      status,
      errors,
      warnings
    };
  }

  /**
   * Get next available nonce with gap detection and prevention
   * Will throw error if gap exists to prevent creating more stuck transactions
   */
  async getNextNonce(
    address: string,
    provider: ethers.JsonRpcProvider,
    options: {
      allowGaps?: boolean; // If true, will assign nonce even with gap (use with caution)
      forceNonce?: number; // Force specific nonce (for replacing/cancelling transactions)
    } = {}
  ): Promise<number> {
    const key = address.toLowerCase();
    
    // Wait for any pending nonce operations on this address
    while (this.nonceQueueLocks.has(key)) {
      await this.nonceQueueLocks.get(key);
    }
    
    // Lock this address for nonce assignment
    let resolveLock: () => void;
    const lockPromise = new Promise<void>(resolve => { resolveLock = resolve; });
    this.nonceQueueLocks.set(key, lockPromise);
    
    try {
      // If forcing specific nonce (for replacement/cancellation)
      if (options.forceNonce !== undefined) {
        console.log(`🔒 Forcing nonce ${options.forceNonce} for ${address}`);
        return options.forceNonce;
      }
      
      // Validate nonce status
      const validation = await this.validateNonce(address, provider);
      
      // Log status
      console.log(
        `📊 Nonce status for ${address}:\n` +
        `   Confirmed: ${validation.status.confirmed}\n` +
        `   Pending: ${validation.status.pending}\n` +
        `   Tracked: ${validation.status.tracked || 'none'}\n` +
        `   Recommended: ${validation.status.recommended}\n` +
        `   Has Gap: ${validation.status.hasGap} (${validation.status.gapSize} txs)`
      );
      
      // Show warnings
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
      }
      
      // Check for gaps unless explicitly allowed
      if (!options.allowGaps && !validation.valid) {
        throw new Error(
          `Cannot assign nonce due to existing gap:\n${validation.errors.join('\n')}\n\n` +
          `Options to resolve:\n` +
          `1. Wait for pending transactions to confirm\n` +
          `2. Cancel stuck transactions by sending 0 ETH with same nonce but higher gas\n` +
          `3. Use the nonce gap fixer script`
        );
      }
      
      // Get next nonce
      const nextNonce = validation.status.recommended;
      
      // Reserve this nonce
      this.nonceQueues.set(key, nextNonce + 1);
      
      // Track as pending
      if (!this.pendingTransactions.has(key)) {
        this.pendingTransactions.set(key, new Set());
      }
      this.pendingTransactions.get(key)!.add(nextNonce);
      
      console.log(`✅ Nonce ${nextNonce} assigned and reserved`);
      
      return nextNonce;
      
    } finally {
      // Release the lock
      this.nonceQueueLocks.delete(key);
      resolveLock!();
    }
  }

  /**
   * Mark a nonce as confirmed
   * Call this after transaction is mined
   */
  confirmNonce(address: string, nonce: number): void {
    const key = address.toLowerCase();
    
    // Remove from pending
    const pending = this.pendingTransactions.get(key);
    if (pending) {
      pending.delete(nonce);
      console.log(`✅ Nonce ${nonce} confirmed for ${address}`);
    }
    
    // If no more pending transactions, clear tracked nonce
    if (!pending || pending.size === 0) {
      this.nonceQueues.delete(key);
      this.pendingTransactions.delete(key);
      console.log(`🗑️  Cleared nonce tracking for ${address} (no pending txs)`);
    }
  }

  /**
   * Mark a nonce as failed/dropped
   * Call this when transaction fails or is dropped
   */
  failNonce(address: string, nonce: number): void {
    const key = address.toLowerCase();
    
    // Remove from pending
    const pending = this.pendingTransactions.get(key);
    if (pending) {
      pending.delete(nonce);
      console.log(`❌ Nonce ${nonce} failed for ${address}`);
    }
    
    // Reset tracked nonce to allow re-use
    const trackedNonce = this.nonceQueues.get(key);
    if (trackedNonce !== undefined && trackedNonce > nonce) {
      this.nonceQueues.set(key, nonce);
      console.log(`🔄 Reset tracked nonce to ${nonce}`);
    }
  }

  /**
   * Clear all nonce tracking for an address
   * Use with caution - typically for error recovery
   */
  clearNonceTracking(address: string): void {
    const key = address.toLowerCase();
    this.nonceQueues.delete(key);
    this.pendingTransactions.delete(key);
    this.nonceQueueLocks.delete(key);
    console.log(`🗑️  Cleared all nonce tracking for ${address}`);
  }

  /**
   * Get pending nonces for an address
   */
  getPendingNonces(address: string): number[] {
    const key = address.toLowerCase();
    const pending = this.pendingTransactions.get(key);
    return pending ? Array.from(pending).sort((a, b) => a - b) : [];
  }

  /**
   * Check if address has pending transactions
   */
  hasPendingTransactions(address: string): boolean {
    const key = address.toLowerCase();
    const pending = this.pendingTransactions.get(key);
    return pending !== undefined && pending.size > 0;
  }

  /**
   * Clear all nonce tracking for all addresses
   * Use for testing or system-wide reset
   */
  clearAllNonceTracking(): void {
    this.nonceQueues.clear();
    this.nonceQueueLocks.clear();
    this.pendingTransactions.clear();
    console.log('🗑️  Cleared all nonce tracking for all addresses');
  }
}

export const nonceManager = NonceManager.getInstance();
