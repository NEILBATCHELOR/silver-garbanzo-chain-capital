import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';

// Import ABI - will need to be generated after contract deployment
// import PolicyEngineABI from '@/contracts/abis/PolicyEngine.json';

/**
 * Service for syncing policies from database to blockchain smart contracts
 * Implements Phase 2: Lock-up period support
 */
export class PolicyChainSyncService {
  private policyEngine: ethers.Contract | null = null;
  private signer: ethers.Signer;
  private chainId: number;

  constructor(chainId: number, signer: ethers.Signer) {
    this.chainId = chainId;
    this.signer = signer;
  }

  /**
   * Initialize the service by loading PolicyEngine contract address
   */
  async initialize(): Promise<void> {
    const address = await this.getPolicyEngineAddress(this.chainId);
    
    if (!address) {
      throw new Error(`PolicyEngine not deployed on chain ${this.chainId}`);
    }

    // TODO: Load ABI after contract deployment
    // For now, we'll use a minimal interface
    const minimalABI = [
      'function createPolicy(address token, string memory operationType, uint256 maxAmount, uint256 dailyLimit, uint256 cooldownPeriod, uint256 activationTime, uint256 expirationTime) external',
      'function setTimeRestrictions(address token, string memory operationType, uint256 activationTime, uint256 expirationTime) external',
      'function getPolicy(address token, string memory operationType) external view returns (tuple(bool active, uint256 maxAmount, uint256 dailyLimit, uint256 cooldownPeriod, bool requiresApproval, uint8 approvalThreshold, uint256 activationTime, uint256 expirationTime, bool hasTimeRestrictions))',
      // Phase 3: Whitelist functions
      'function enableWhitelistRequirement(address token, string memory operationType) external',
      'function addToWhitelist(address token, string memory operationType, address addressToAdd) external',
      'function addToWhitelistBatch(address token, string memory operationType, address[] memory addresses) external',
      'function removeFromWhitelist(address token, string memory operationType, address addressToRemove) external',
      'function isAddressWhitelisted(address token, string memory operationType, address addr) external view returns (bool)',
      'function getWhitelistedAddresses(address token, string memory operationType) external view returns (address[])'
    ];

    this.policyEngine = new ethers.Contract(address, minimalABI, this.signer);
  }

  /**
   * Get PolicyEngine contract address for a chain
   */
  private async getPolicyEngineAddress(chainId: number): Promise<string | null> {
    const { data, error } = await supabase
      .from('policy_engines')
      .select('contract_address')
      .eq('chain_id', chainId.toString())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Failed to get PolicyEngine address:', error);
      return null;
    }

    return data.contract_address;
  }

  /**
   * Sync a lock-up period rule to blockchain
   * Phase 2: Lock-up support
   */
  async syncLockUpPeriod(rule: PolicyRule): Promise<SyncResult> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    if (rule.type !== 'lock_up_period') {
      return {
        success: false,
        error: 'Invalid rule type for lock-up sync. Expected "lock_up_period"'
      };
    }

    if (!rule.tokenAddress || !rule.startDate || !rule.endDate) {
      return {
        success: false,
        error: 'Lock-up period requires tokenAddress, startDate, and endDate'
      };
    }

    try {
      const activationTime = Math.floor(new Date(rule.startDate).getTime() / 1000);
      const expirationTime = Math.floor(new Date(rule.endDate).getTime() / 1000);

      // Validate times
      if (activationTime <= 0 || expirationTime <= 0) {
        return {
          success: false,
          error: 'Invalid activation or expiration time'
        };
      }

      if (expirationTime <= activationTime) {
        return {
          success: false,
          error: 'Expiration time must be after activation time'
        };
      }

      // Call smart contract to create lock-up policy
      // Block ERC20_TRANSFER during lock-up period
      const tx = await this.policyEngine.createPolicy(
        rule.tokenAddress,
        'ERC20_TRANSFER',  // Block transfers during lock-up
        0,                  // No amount limit
        0,                  // No daily limit
        0,                  // No cooldown
        activationTime,     // Lock-up start
        expirationTime      // Lock-up end
      );

      console.log('Lock-up policy transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }

      // Save sync record to database
      await this.saveSyncRecord({
        policyId: rule.id!,
        chainId: this.chainId.toString(),
        ruleType: 'lock_up_period',
        transactionHash: receipt.hash,
        syncStatus: 'confirmed'
      });

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error: any) {
      console.error('Failed to sync lock-up period:', error);

      // Save failed sync attempt
      if (rule.id) {
        await this.saveSyncRecord({
          policyId: rule.id,
          chainId: this.chainId.toString(),
          ruleType: 'lock_up_period',
          syncStatus: 'failed',
          errorMessage: error.message
        });
      }

      return {
        success: false,
        error: error.message || 'Failed to sync lock-up period to blockchain'
      };
    }
  }

  /**
   * Update time restrictions for an existing policy
   */
  async updateTimeRestrictions(
    tokenAddress: string,
    operationType: string,
    activationTime: number,
    expirationTime: number
  ): Promise<SyncResult> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      const tx = await this.policyEngine.setTimeRestrictions(
        tokenAddress,
        operationType,
        activationTime,
        expirationTime
      );

      const receipt = await tx.wait();

      return {
        success: receipt.status === 1,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync whitelist transfer rule to blockchain
   * Phase 3: Whitelist support
   */
  async syncWhitelistTransfer(rule: PolicyRule): Promise<SyncResult> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    if (rule.type !== 'whitelist_transfer') {
      return {
        success: false,
        error: 'Invalid rule type for whitelist sync. Expected "whitelist_transfer"'
      };
    }

    if (!rule.tokenAddress) {
      return {
        success: false,
        error: 'Whitelist transfer requires tokenAddress'
      };
    }

    if (!rule.addresses || !Array.isArray(rule.addresses) || rule.addresses.length === 0) {
      return {
        success: false,
        error: 'Whitelist transfer requires a non-empty addresses array'
      };
    }

    try {
      const transactionHashes: string[] = [];

      // Step 1: Enable whitelist requirement for transfers
      console.log('Enabling whitelist requirement for token:', rule.tokenAddress);
      const enableTx = await this.policyEngine.enableWhitelistRequirement(
        rule.tokenAddress,
        'ERC20_TRANSFER'
      );

      const enableReceipt = await enableTx.wait();
      if (enableReceipt.status === 0) {
        throw new Error('Failed to enable whitelist requirement');
      }
      transactionHashes.push(enableReceipt.hash);

      console.log('Whitelist requirement enabled:', enableReceipt.hash);

      // Step 2: Add addresses in batches (max 100 per transaction to avoid gas limits)
      const batchSize = 100;
      const addresses = rule.addresses as string[];
      
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        
        console.log(`Adding batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(addresses.length / batchSize)}: ${batch.length} addresses`);
        
        const addTx = await this.policyEngine.addToWhitelistBatch(
          rule.tokenAddress,
          'ERC20_TRANSFER',
          batch
        );

        const addReceipt = await addTx.wait();
        if (addReceipt.status === 0) {
          throw new Error(`Failed to add batch ${Math.floor(i / batchSize) + 1}`);
        }
        transactionHashes.push(addReceipt.hash);

        console.log(`Batch ${Math.floor(i / batchSize) + 1} added:`, addReceipt.hash);
      }

      // Save sync record to database
      await this.saveWhitelistSyncRecord({
        policyId: rule.id!,
        chainId: this.chainId.toString(),
        addressesSynced: addresses.length,
        totalAddresses: addresses.length,
        transactionHashes,
        syncStatus: 'confirmed'
      });

      return {
        success: true,
        transactionHash: enableReceipt.hash,
        blockNumber: enableReceipt.blockNumber,
        additionalInfo: {
          totalAddresses: addresses.length,
          transactionHashes
        }
      };

    } catch (error: any) {
      console.error('Failed to sync whitelist:', error);

      // Save failed sync attempt
      if (rule.id) {
        await this.saveWhitelistSyncRecord({
          policyId: rule.id,
          chainId: this.chainId.toString(),
          addressesSynced: 0,
          totalAddresses: (rule.addresses as string[]).length,
          syncStatus: 'failed'
        });

        // Also save to policy_blockchain_sync for consistency
        await this.saveSyncRecord({
          policyId: rule.id,
          chainId: this.chainId.toString(),
          ruleType: 'whitelist_transfer',
          syncStatus: 'failed',
          errorMessage: error.message
        });
      }

      return {
        success: false,
        error: error.message || 'Failed to sync whitelist to blockchain'
      };
    }
  }

  /**
   * Add a single address to whitelist
   */
  async addToWhitelist(
    tokenAddress: string,
    operationType: string,
    addressToAdd: string
  ): Promise<SyncResult> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      const tx = await this.policyEngine.addToWhitelist(
        tokenAddress,
        operationType,
        addressToAdd
      );

      const receipt = await tx.wait();

      return {
        success: receipt.status === 1,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove an address from whitelist
   */
  async removeFromWhitelist(
    tokenAddress: string,
    operationType: string,
    addressToRemove: string
  ): Promise<SyncResult> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      const tx = await this.policyEngine.removeFromWhitelist(
        tokenAddress,
        operationType,
        addressToRemove
      );

      const receipt = await tx.wait();

      return {
        success: receipt.status === 1,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if an address is whitelisted
   */
  async isAddressWhitelisted(
    tokenAddress: string,
    operationType: string,
    address: string
  ): Promise<boolean> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      return await this.policyEngine.isAddressWhitelisted(
        tokenAddress,
        operationType,
        address
      );
    } catch (error: any) {
      console.error('Failed to check whitelist status:', error);
      return false;
    }
  }

  /**
   * Get all whitelisted addresses for a token and operation
   */
  async getWhitelistedAddresses(
    tokenAddress: string,
    operationType: string
  ): Promise<string[]> {
    if (!this.policyEngine) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      return await this.policyEngine.getWhitelistedAddresses(
        tokenAddress,
        operationType
      );
    } catch (error: any) {
      console.error('Failed to get whitelisted addresses:', error);
      return [];
    }
  }

  /**
   * Check if a policy is synced to blockchain
   */
  async isPolicySynced(policyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('policy_blockchain_sync')
      .select('sync_status')
      .eq('policy_id', policyId)
      .eq('chain_id', this.chainId.toString())
      .eq('sync_status', 'confirmed')
      .single();

    if (error || !data) {
      return false;
    }

    return data.sync_status === 'confirmed';
  }

  /**
   * Get sync status for a policy
   */
  async getSyncStatus(policyId: string): Promise<SyncStatusResult | null> {
    const { data, error } = await supabase
      .from('policy_blockchain_sync')
      .select('*')
      .eq('policy_id', policyId)
      .eq('chain_id', this.chainId.toString())
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      policyId: data.policy_id,
      chainId: data.chain_id,
      ruleType: data.rule_type,
      syncStatus: data.sync_status,
      transactionHash: data.transaction_hash,
      syncedAt: data.synced_at,
      errorMessage: data.error_message
    };
  }

  /**
   * Save sync record to database
   */
  private async saveSyncRecord(record: SyncRecord): Promise<void> {
    const { error } = await supabase
      .from('policy_blockchain_sync')
      .upsert({
        policy_id: record.policyId,
        chain_id: record.chainId,
        rule_type: record.ruleType,
        sync_status: record.syncStatus,
        transaction_hash: record.transactionHash,
        synced_at: record.syncStatus === 'confirmed' ? new Date().toISOString() : null,
        error_message: record.errorMessage
      }, {
        onConflict: 'policy_id,chain_id'
      });

    if (error) {
      console.error('Failed to save sync record:', error);
      throw error;
    }
  }

  /**
   * Save whitelist sync record to database
   * Phase 3: Whitelist tracking
   */
  private async saveWhitelistSyncRecord(record: WhitelistSyncRecord): Promise<void> {
    const { error } = await supabase
      .from('whitelist_blockchain_sync')
      .upsert({
        policy_id: record.policyId,
        chain_id: record.chainId,
        addresses_synced: record.addressesSynced,
        total_addresses: record.totalAddresses,
        transaction_hashes: record.transactionHashes || [],
        sync_status: record.syncStatus,
        synced_at: record.syncStatus === 'confirmed' ? new Date().toISOString() : null
      }, {
        onConflict: 'policy_id,chain_id'
      });

    if (error) {
      console.error('Failed to save whitelist sync record:', error);
      throw error;
    }
  }

  /**
   * Get all sync records for a chain
   */
  async getAllSyncRecords(): Promise<SyncStatusResult[]> {
    const { data, error } = await supabase
      .from('policy_blockchain_sync')
      .select('*')
      .eq('chain_id', this.chainId.toString())
      .order('synced_at', { ascending: false });

    if (error || !data) {
      console.error('Failed to get sync records:', error);
      return [];
    }

    return data.map(d => ({
      policyId: d.policy_id,
      chainId: d.chain_id,
      ruleType: d.rule_type,
      syncStatus: d.sync_status,
      transactionHash: d.transaction_hash,
      syncedAt: d.synced_at,
      errorMessage: d.error_message
    }));
  }
}

// ============ Types ============

export interface PolicyRule {
  id?: string;
  type: string;
  tokenAddress?: string;
  startDate?: string;
  endDate?: string;
  limitAmount?: number;
  addresses?: string[];  // Phase 3: Whitelist addresses
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
  additionalInfo?: {
    totalAddresses?: number;
    transactionHashes?: string[];
  };
}

export interface SyncRecord {
  policyId: string;
  chainId: string;
  ruleType: string;
  syncStatus: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  errorMessage?: string;
}

export interface WhitelistSyncRecord {
  policyId: string;
  chainId: string;
  addressesSynced: number;
  totalAddresses: number;
  transactionHashes?: string[];
  syncStatus: 'pending' | 'confirmed' | 'failed';
}

export interface SyncStatusResult {
  policyId: string;
  chainId: string;
  ruleType: string;
  syncStatus: string;
  transactionHash: string | null;
  syncedAt: string | null;
  errorMessage: string | null;
}

/**
 * Factory function to create PolicyChainSyncService
 */
export async function createPolicyChainSyncService(
  chainId: number,
  signer: ethers.Signer
): Promise<PolicyChainSyncService> {
  const service = new PolicyChainSyncService(chainId, signer);
  await service.initialize();
  return service;
}
