import { Client } from 'xrpl';
import type { XRPLNetwork } from '../config/XRPLConfig';
import { xrplClientManager } from '../core/XRPLClientManager';
import { XRPL_NETWORKS } from '../config/XRPLConfig';

/**
 * MPT Holder information from blockchain
 */
export interface MPTHolderInfo {
  address: string;
  balance: string;
  authorized: boolean;
  locked: boolean;
}

/**
 * MPToken object from mpt_holders response
 */
interface MPTokenResponse {
  account: string;
  flags: number;
  mpt_amount: string;
  mptoken_index: string;
}

/**
 * MPT Blockchain Query Service
 * 
 * Queries XRPL ledger directly for MPT holder information
 * Uses official mpt_holders API (Clio) with fallback to transaction analysis
 */
export class XRPLMPTBlockchainQuery {
  private client: Client | null = null;
  private network: XRPLNetwork;

  constructor(network: XRPLNetwork = 'TESTNET') {
    this.network = network;
  }

  /**
   * Initialize client connection
   */
  private async getClient(): Promise<Client> {
    if (!this.client || !this.client.isConnected()) {
      this.client = await xrplClientManager.getClient(this.network);
    }
    return this.client;
  }

  /**
   * Get all holders using official mpt_holders API (Clio servers)
   * This is the recommended method - fast and reliable
   * 
   * @param mptIssuanceId - The MPT issuance ID (192-bit hex string)
   * @returns Array of holder information
   */
  async getHoldersMPTHoldersAPI(mptIssuanceId: string): Promise<MPTHolderInfo[]> {
    try {
      const client = await this.getClient();
      const holders: MPTHolderInfo[] = [];
      let marker: string | undefined;

      console.log('🔍 Querying holders via mpt_holders API...');
      console.log('Issuance ID:', mptIssuanceId);

      // Use mpt_holders command with pagination
      do {
        const response = await client.request({
          command: 'mpt_holders',
          mpt_issuance_id: mptIssuanceId,
          ledger_index: 'validated',
          limit: 400, // Max limit per request
          ...(marker && { marker })
        } as any);

        const result = response.result as any;

        // Process mptokens array
        if (result.mptokens && Array.isArray(result.mptokens)) {
          for (const mptoken of result.mptokens as MPTokenResponse[]) {
            const flags = mptoken.flags || 0;
            const locked = (flags & 0x0001) !== 0;      // lsfMPTLocked
            const authorized = (flags & 0x0002) !== 0;  // lsfMPTAuthorized

            holders.push({
              address: mptoken.account,
              balance: mptoken.mpt_amount,
              authorized,
              locked
            });
          }

          console.log(`  ✓ Retrieved ${holders.length} holders so far...`);
        }

        // Get marker for next page
        marker = result.marker;

      } while (marker);

      console.log(`✅ mpt_holders API: Found ${holders.length} total holders`);

      // Sort by balance (highest first)
      return holders.sort((a, b) => {
        const balanceA = BigInt(a.balance);
        const balanceB = BigInt(b.balance);
        return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is because mpt_holders is not available
      if (errorMessage.includes('unknownCmd') || 
          errorMessage.includes('Unknown command') ||
          errorMessage.includes('Unknown method') ||  // THIS is the actual error
          errorMessage.includes('not supported')) {
        console.warn('⚠️ mpt_holders command not available (not a Clio server)');
        throw new Error('MPT_HOLDERS_NOT_AVAILABLE');
      }

      console.error('❌ mpt_holders API failed:', error);
      throw new Error(
        `Failed to query mpt_holders: ${errorMessage}`
      );
    }
  }

  /**
   * Get all holders by analyzing issuer's transaction history
   * This is a fallback method when mpt_holders is not available
   * 
   * @param mptIssuanceId - The MPT issuance ID (192-bit hex string)
   * @param issuerAddress - The issuer's address
   * @returns Array of holder information
   */
  async getHoldersByTransactionAnalysis(
    mptIssuanceId: string,
    issuerAddress: string
  ): Promise<MPTHolderInfo[]> {
    try {
      const client = await this.getClient();
      const holderBalances = new Map<string, bigint>();
      const holderFlags = new Map<string, number>();

      console.log('🔍 Analyzing transaction history for holders...');
      console.log('Issuance ID:', mptIssuanceId);
      console.log('Issuer:', issuerAddress);

      let marker: string | undefined;
      let transactionsProcessed = 0;
      const MAX_TRANSACTIONS = 2000; // Increased limit

      do {
        const response = await client.request({
          command: 'account_tx',
          account: issuerAddress,
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 200,
          ...(marker && { marker })
        });

        const result = response.result as any;
        
        if (result.transactions && Array.isArray(result.transactions)) {
          for (const txData of result.transactions) {
            // XRPL returns transaction data in tx_json field
            const tx = txData.tx_json;
            const meta = txData.meta;

            // Skip if transaction data is missing
            if (!tx || !meta) {
              continue;
            }

            // Skip failed transactions
            if (meta.TransactionResult !== 'tesSUCCESS') {
              continue;
            }

            // Process MPTokenAuthorize transactions
            if (tx.TransactionType === 'MPTokenAuthorize' && 
                tx.MPTokenIssuanceID === mptIssuanceId) {
              const holder = tx.Account;
              if (holder !== issuerAddress && !holderBalances.has(holder)) {
                holderBalances.set(holder, 0n);
                holderFlags.set(holder, 0);
              }
            }

            // Process Payment transactions with MPTs
            // Check both DeliverMax (newer) and Amount (legacy) fields
            const deliverAmount = tx.DeliverMax || tx.Amount;
            
            if (tx.TransactionType === 'Payment' && 
                typeof deliverAmount === 'object' &&
                deliverAmount.mpt_issuance_id === mptIssuanceId) {
              
              const from = tx.Account;
              const to = tx.Destination;
              const amount = BigInt(deliverAmount.value || '0');

              // Update sender balance (decrease)
              if (from !== issuerAddress) {
                const currentBalance = holderBalances.get(from) || 0n;
                holderBalances.set(from, currentBalance - amount);
              }

              // Update recipient balance (increase)
              if (to !== issuerAddress) {
                const currentBalance = holderBalances.get(to) || 0n;
                holderBalances.set(to, currentBalance + amount);
                
                // Initialize holder if not exists
                if (!holderFlags.has(to)) {
                  holderFlags.set(to, 0);
                }
              }
            }
          }

          transactionsProcessed += result.transactions.length;
          console.log(`  Processed ${transactionsProcessed} transactions...`);
        }

        marker = result.marker;
        
        if (transactionsProcessed >= MAX_TRANSACTIONS) {
          console.warn(`⚠️ Reached transaction limit (${MAX_TRANSACTIONS})`);
          break;
        }
      } while (marker);

      console.log(`✅ Analyzed ${transactionsProcessed} transactions`);

      // Now verify actual balances from ledger for each holder
      const holders: MPTHolderInfo[] = [];
      
      for (const [address, calculatedBalance] of holderBalances.entries()) {
        if (calculatedBalance > 0n) {
          // Get actual balance from ledger
          const holderInfo = await this.getHolderInfo(address, mptIssuanceId);
          if (holderInfo) {
            holders.push(holderInfo);
          } else if (calculatedBalance > 0n) {
            // If ledger query fails but we calculated a balance, use that
            holders.push({
              address,
              balance: calculatedBalance.toString(),
              authorized: true, // Must be authorized to have balance
              locked: false
            });
          }
        }
      }

      console.log(`✅ Found ${holders.length} holders with balances > 0`);

      // Sort by balance (highest first)
      return holders.sort((a, b) => {
        const balanceA = BigInt(a.balance);
        const balanceB = BigInt(b.balance);
        return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
      });

    } catch (error) {
      console.error('❌ Transaction analysis failed:', error);
      throw new Error(
        `Failed to analyze transactions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all holders with automatic method selection
   * Tries mpt_holders API first, falls back to transaction analysis
   * 
   * @param mptIssuanceId - The MPT issuance ID
   * @param issuerAddress - The issuer's address (required for fallback)
   * @returns Array of holder information
   */
  async getAllHolders(
    mptIssuanceId: string,
    issuerAddress: string
  ): Promise<MPTHolderInfo[]> {
    console.log('🔍 Getting all holders (auto method selection)...');

    try {
      // Try mpt_holders API first (fastest and most reliable)
      console.log('  Attempting mpt_holders API...');
      return await this.getHoldersMPTHoldersAPI(mptIssuanceId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`  mpt_holders failed: ${errorMessage}`);
      
      // If mpt_holders is not available, fall back to transaction analysis
      if (errorMessage.includes('MPT_HOLDERS_NOT_AVAILABLE') || 
          errorMessage.includes('unknownCmd') ||
          errorMessage.includes('Unknown method') ||
          errorMessage.includes('Unknown command')) {
        console.log('⚠️ mpt_holders not available, using transaction analysis fallback...');
        return await this.getHoldersByTransactionAnalysis(mptIssuanceId, issuerAddress);
      }
      
      // For other errors, throw
      console.error('❌ Unexpected error in getAllHolders:', error);
      throw error;
    }
  }

  /**
   * Get specific holder's balance and authorization status
   * This queries the ledger directly for the MPToken entry
   * 
   * @param holderAddress - Holder's XRPL address
   * @param mptIssuanceId - The MPT issuance ID
   * @returns Holder information or null if not found
   */
  async getHolderInfo(
    holderAddress: string,
    mptIssuanceId: string
  ): Promise<MPTHolderInfo | null> {
    try {
      const client = await this.getClient();

      // Query the specific MPToken entry
      const response = await client.request({
        command: 'ledger_entry',
        mptoken: {
          mpt_issuance_id: mptIssuanceId.toUpperCase(),
          account: holderAddress
        },
        ledger_index: 'validated'
      } as any);

      const result = response.result as any;
      const mptoken = result.node as any;

      if (!mptoken) {
        return null;
      }

      const flags = mptoken.Flags || 0;
      const locked = (flags & 0x0001) !== 0;      // lsfMPTLocked
      const authorized = (flags & 0x0002) !== 0;  // lsfMPTAuthorized

      return {
        address: holderAddress,
        balance: mptoken.MPTAmount || '0',
        authorized,
        locked
      };

    } catch (error) {
      // If entry doesn't exist, return null rather than throwing
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('entryNotFound') || errorMessage.includes('objectNotFound')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get holders using known addresses from database
   * This is the fastest method if you already have potential holder addresses
   * 
   * @param holderAddresses - Array of addresses to check
   * @param mptIssuanceId - The MPT issuance ID
   * @returns Array of holder information
   */
  async getHoldersFromAddresses(
    holderAddresses: string[],
    mptIssuanceId: string
  ): Promise<MPTHolderInfo[]> {
    console.log(`🔍 Checking ${holderAddresses.length} potential holders...`);
    
    const holders: MPTHolderInfo[] = [];

    for (const address of holderAddresses) {
      try {
        const holderInfo = await this.getHolderInfo(address, mptIssuanceId);
        if (holderInfo && holderInfo.balance !== '0') {
          holders.push(holderInfo);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get info for ${address.slice(0, 8)}...`);
        // Continue with other addresses
      }
    }

    console.log(`✅ Found ${holders.length} active holders`);

    return holders.sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
    });
  }

  /**
   * Check if an address has authorized an MPT (has MPToken entry)
   * 
   * @param holderAddress - Holder's XRPL address
   * @param mptIssuanceId - The MPT issuance ID
   * @returns True if holder has MPToken entry (authorized to receive)
   */
  async isAuthorizedHolder(
    holderAddress: string,
    mptIssuanceId: string
  ): Promise<boolean> {
    try {
      const holderInfo = await this.getHolderInfo(holderAddress, mptIssuanceId);
      return holderInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive holder statistics
   * 
   * @param mptIssuanceId - The MPT issuance ID
   * @param issuerAddress - The issuer's address
   * @returns Holder statistics
   */
  async getHolderStatistics(
    mptIssuanceId: string,
    issuerAddress: string
  ): Promise<{
    totalHolders: number;
    totalBalance: string;
    averageBalance: string;
    authorizedCount: number;
    lockedCount: number;
    topHolders: MPTHolderInfo[];
  }> {
    const holders = await this.getAllHolders(mptIssuanceId, issuerAddress);

    let totalBalance = 0n;
    let authorizedCount = 0;
    let lockedCount = 0;

    for (const holder of holders) {
      totalBalance += BigInt(holder.balance);
      if (holder.authorized) authorizedCount++;
      if (holder.locked) lockedCount++;
    }

    const averageBalance = holders.length > 0 
      ? (totalBalance / BigInt(holders.length)).toString()
      : '0';

    return {
      totalHolders: holders.length,
      totalBalance: totalBalance.toString(),
      averageBalance,
      authorizedCount,
      lockedCount,
      topHolders: holders.slice(0, 10) // Top 10 holders
    };
  }

  /**
   * Check if the connected server supports mpt_holders command
   * 
   * @returns True if mpt_holders is available (Clio server)
   */
  async isMPTHoldersAvailable(): Promise<boolean> {
    try {
      const config = XRPL_NETWORKS[this.network];
      // mpt_holders is only available on Clio servers
      return config.clioUrl !== undefined;
    } catch {
      return false;
    }
  }
}
