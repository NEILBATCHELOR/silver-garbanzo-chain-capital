/**
 * MPT Blockchain Monitor Service
 * 
 * Automatically monitors blockchain for MPT transactions and syncs to database
 * 
 * Features:
 * - WebSocket subscription to real-time transactions
 * - Automatic sync of all MPT-related transactions
 * - Multi-project support
 * - Graceful connection handling
 */

import { Client } from 'xrpl';
import { mptSyncService } from './mpt-sync.service';

interface MonitoredProject {
  projectId: string;
  addresses: string[];  // Issuer + holder addresses to monitor
  issuanceIds: string[]; // MPT issuance IDs
}

export class MPTMonitorService {
  private client: Client;
  private monitoredProjects: Map<string, MonitoredProject> = new Map();
  private isMonitoring = false;

  constructor(rpcUrl: string = 'wss://s.altnet.rippletest.net:51233') {
    this.client = new Client(rpcUrl);
  }

  /**
   * Start monitoring for a project
   */
  async startMonitoring(
    projectId: string,
    addresses: string[],
    issuanceIds: string[]
  ): Promise<void> {
    // Store project configuration
    this.monitoredProjects.set(projectId, {
      projectId,
      addresses,
      issuanceIds
    });

    // Connect if not already connected
    if (!this.client.isConnected()) {
      await this.client.connect();
      this.setupEventHandlers();
    }

    // Subscribe to accounts
    await this.subscribeToAccounts(addresses);

    this.isMonitoring = true;
    console.log(`✅ Started monitoring project ${projectId} with ${addresses.length} addresses`);
  }

  /**
   * Stop monitoring for a project
   */
  async stopMonitoring(projectId: string): Promise<void> {
    const project = this.monitoredProjects.get(projectId);
    if (!project) return;

    // Unsubscribe from accounts
    await this.unsubscribeFromAccounts(project.addresses);

    this.monitoredProjects.delete(projectId);

    // Disconnect if no more projects
    if (this.monitoredProjects.size === 0) {
      await this.client.disconnect();
      this.isMonitoring = false;
      console.log('✅ Stopped all monitoring');
    } else {
      console.log(`✅ Stopped monitoring project ${projectId}`);
    }
  }

  /**
   * Subscribe to transaction streams for addresses
   */
  private async subscribeToAccounts(addresses: string[]): Promise<void> {
    try {
      await this.client.request({
        command: 'subscribe',
        accounts: addresses
      });

      console.log(`📡 Subscribed to ${addresses.length} addresses`);
    } catch (error) {
      console.error('Error subscribing to accounts:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from transaction streams
   */
  private async unsubscribeFromAccounts(addresses: string[]): Promise<void> {
    try {
      await this.client.request({
        command: 'unsubscribe',
        accounts: addresses
      });

      console.log(`📡 Unsubscribed from ${addresses.length} addresses`);
    } catch (error) {
      console.error('Error unsubscribing from accounts:', error);
    }
  }

  /**
   * Setup event handlers for real-time transactions
   */
  private setupEventHandlers(): void {
    this.client.on('transaction', async (tx: any) => {
      try {
        // Check if this is an MPT transaction
        if (!this.isMPTTransaction(tx)) {
          return;
        }

        // Find which project this transaction belongs to
        const projectId = this.findProjectForTransaction(tx);
        if (!projectId) {
          console.warn('Received MPT transaction but no matching project found');
          return;
        }

        console.log(`🔔 New MPT transaction detected: ${tx.transaction.hash}`);

        // Sync transaction to database
        await mptSyncService.processMPTTransaction(projectId, tx.transaction.hash);

        console.log(`✅ Auto-synced transaction ${tx.transaction.hash}`);
      } catch (error) {
        console.error('Error processing monitored transaction:', error);
      }
    });

    this.client.on('disconnected', (code: number) => {
      console.warn(`⚠️ WebSocket disconnected (code: ${code})`);
      this.handleDisconnection();
    });

    this.client.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Check if transaction involves MPTs
   */
  private isMPTTransaction(tx: any): boolean {
    const transaction = tx.transaction;
    if (!transaction) return false;

    // Check transaction type
    const mptTransactionTypes = [
      'MPTokenIssuanceCreate',
      'MPTokenIssuanceSet',
      'MPTokenIssuanceDestroy',
      'MPTokenAuthorize',
      'Clawback'
    ];

    if (mptTransactionTypes.includes(transaction.TransactionType)) {
      return true;
    }

    // Check for Payment with MPT amount
    if (transaction.TransactionType === 'Payment') {
      const amount = transaction.Amount || transaction.DeliverMax;
      if (amount && typeof amount === 'object' && 'mpt_issuance_id' in amount) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find which project this transaction belongs to
   */
  private findProjectForTransaction(tx: any): string | null {
    const transaction = tx.transaction;
    const account = transaction.Account;
    const destination = transaction.Destination;

    // Extract MPT issuance ID if present
    let issuanceId: string | null = null;
    if (transaction.MPTokenIssuanceID) {
      issuanceId = transaction.MPTokenIssuanceID;
    } else if (transaction.Amount && typeof transaction.Amount === 'object') {
      issuanceId = transaction.Amount.mpt_issuance_id;
    } else if (transaction.DeliverMax && typeof transaction.DeliverMax === 'object') {
      issuanceId = transaction.DeliverMax.mpt_issuance_id;
    }

    // Find matching project
    for (const [projectId, project] of this.monitoredProjects.entries()) {
      // Check if transaction involves monitored addresses
      if (project.addresses.includes(account) || 
          (destination && project.addresses.includes(destination))) {
        // If we have an issuance ID, verify it's one we're monitoring
        if (issuanceId) {
          if (project.issuanceIds.includes(issuanceId)) {
            return projectId;
          }
        } else {
          // No issuance ID, but address matches
          return projectId;
        }
      }
    }

    return null;
  }

  /**
   * Handle disconnection - attempt reconnection
   */
  private async handleDisconnection(): Promise<void> {
    if (!this.isMonitoring) return;

    console.log('🔄 Attempting to reconnect...');

    try {
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Reconnect
      await this.client.connect();

      // Re-subscribe to all addresses
      const allAddresses = new Set<string>();
      for (const project of this.monitoredProjects.values()) {
        project.addresses.forEach(addr => allAddresses.add(addr));
      }

      await this.subscribeToAccounts(Array.from(allAddresses));

      console.log('✅ Successfully reconnected and re-subscribed');
    } catch (error) {
      console.error('Failed to reconnect:', error);
      // Try again
      setTimeout(() => this.handleDisconnection(), 10000);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    projectCount: number;
    monitoredAddresses: number;
    connected: boolean;
  } {
    const allAddresses = new Set<string>();
    for (const project of this.monitoredProjects.values()) {
      project.addresses.forEach(addr => allAddresses.add(addr));
    }

    return {
      isMonitoring: this.isMonitoring,
      projectCount: this.monitoredProjects.size,
      monitoredAddresses: allAddresses.size,
      connected: this.client.isConnected()
    };
  }
}

export const mptMonitorService = new MPTMonitorService();
