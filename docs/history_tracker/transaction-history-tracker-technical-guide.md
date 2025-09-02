# Transaction History Tracker - Technical Implementation Guide

**Date**: July 17, 2025  
**Feature**: Multi-Address Transaction History Tracking  
**External API**: Alchemy (Existing Infrastructure)  

## **Overview**

This guide provides detailed technical specifications for implementing the Transaction History Tracker feature using our existing Alchemy infrastructure. The feature will allow users to track up to 50 wallet addresses simultaneously across multiple blockchain networks.

## **Architecture Decision**

### **Why Alchemy (Current Choice)**
- ✅ **Already Integrated**: API key `Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP` configured
- ✅ **Multi-Network Support**: 8+ networks already configured
- ✅ **Performance Claims**: 500x-1,000,000x faster than native methods
- ✅ **Comprehensive Coverage**: External, internal, ERC20, ERC721, ERC1155 transfers
- ✅ **Real-Time Support**: Address Activity Notifications available

### **Alternative Considered**
- **Moralis API**: Similar features, wallet-optimized, but requires new setup
- **Decision**: Start with Alchemy, keep Moralis as backup option

## **Database Schema Extensions**

### **New Tables**

```sql
-- Store addresses that users want to track
CREATE TABLE tracked_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    address text NOT NULL,
    blockchain text NOT NULL,
    label text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_synced_at timestamptz,
    
    -- Constraints
    CONSTRAINT tracked_addresses_unique_user_address UNIQUE (user_id, address, blockchain),
    CONSTRAINT tracked_addresses_valid_blockchain CHECK (blockchain IN (
        'ethereum', 'polygon', 'optimism', 'arbitrum', 'base', 'zksync', 'solana'
    ))
);

-- Track synchronization status for each address
CREATE TABLE external_sync_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_address_id uuid NOT NULL REFERENCES tracked_addresses(id) ON DELETE CASCADE,
    last_block_synced bigint,
    last_transaction_hash text,
    sync_status text DEFAULT 'pending',
    last_sync_error text,
    total_transactions_synced integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT sync_status_valid_status CHECK (sync_status IN (
        'pending', 'syncing', 'completed', 'failed', 'paused'
    ))
);

-- Enhanced wallet_transactions table (extend existing)
-- Add index for better performance on address queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_from_address 
ON wallet_transactions(from_address);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_to_address 
ON wallet_transactions(to_address);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at 
ON wallet_transactions(created_at DESC);

-- Add foreign key to link transactions to tracked addresses
ALTER TABLE wallet_transactions 
ADD COLUMN tracked_address_id uuid REFERENCES tracked_addresses(id);
```

### **Row Level Security (RLS)**

```sql
-- Enable RLS on new tables
ALTER TABLE tracked_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sync_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tracked addresses
CREATE POLICY "Users can view own tracked addresses" ON tracked_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracked addresses" ON tracked_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracked addresses" ON tracked_addresses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracked addresses" ON tracked_addresses
    FOR DELETE USING (auth.uid() = user_id);

-- Sync status follows tracked addresses permissions
CREATE POLICY "Users can view sync status for own addresses" ON external_sync_status
    FOR SELECT USING (
        tracked_address_id IN (
            SELECT id FROM tracked_addresses WHERE user_id = auth.uid()
        )
    );
```

## **Service Layer Implementation**

### **1. Alchemy Service Integration**

```typescript
// src/services/external-apis/AlchemyTransfersService.ts

import { ALCHEMY_API_KEY } from '@/infrastructure/web3/rpc/config';

export interface AlchemyTransferResponse {
  transfers: AlchemyTransfer[];
  pageKey?: string;
}

export interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  category: 'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155';
  rawContract: {
    address: string;
    decimal: string;
  };
  metadata: {
    blockTimestamp: string;
  };
}

export class AlchemyTransfersService {
  private readonly baseUrl = 'https://eth-mainnet.g.alchemy.com/v2';
  private readonly apiKey = ALCHEMY_API_KEY;

  // Get transaction history for a specific address
  async getAddressTransfers(
    address: string,
    blockchain: string = 'ethereum',
    options: {
      fromBlock?: string;
      toBlock?: string;
      category?: string[];
      pageKey?: string;
      maxCount?: number;
    } = {}
  ): Promise<AlchemyTransferResponse> {
    const rpcUrl = this.getRpcUrl(blockchain);
    
    const payload = {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [{
        fromAddress: address,
        category: options.category || ['external', 'internal', 'erc20', 'erc721'],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: `0x${(options.maxCount || 1000).toString(16)}`,
        ...(options.fromBlock && { fromBlock: options.fromBlock }),
        ...(options.toBlock && { toBlock: options.toBlock }),
        ...(options.pageKey && { pageKey: options.pageKey })
      }]
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Alchemy API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    return {
      transfers: data.result.transfers || [],
      pageKey: data.result.pageKey
    };
  }

  // Get transfers both from and to an address
  async getCompleteAddressHistory(
    address: string,
    blockchain: string = 'ethereum'
  ): Promise<AlchemyTransfer[]> {
    const [fromTransfers, toTransfers] = await Promise.all([
      this.getAddressTransfers(address, blockchain),
      this.getAddressTransfers(address, blockchain, { 
        // Use toAddress parameter for incoming transfers
        category: ['external', 'internal', 'erc20', 'erc721']
      })
    ]);

    // Combine and deduplicate transfers
    const allTransfers = [...fromTransfers.transfers, ...toTransfers.transfers];
    const uniqueTransfers = allTransfers.reduce((acc, transfer) => {
      const key = `${transfer.hash}_${transfer.from}_${transfer.to}`;
      if (!acc.has(key)) {
        acc.set(key, transfer);
      }
      return acc;
    }, new Map<string, AlchemyTransfer>());

    return Array.from(uniqueTransfers.values())
      .sort((a, b) => parseInt(b.blockNum) - parseInt(a.blockNum));
  }

  // Get RPC URL for specific blockchain
  private getRpcUrl(blockchain: string): string {
    const urls = {
      ethereum: `${this.baseUrl}/${this.apiKey}`,
      polygon: `https://polygon-mainnet.g.alchemy.com/v2/${this.apiKey}`,
      optimism: `https://opt-mainnet.g.alchemy.com/v2/${this.apiKey}`,
      arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${this.apiKey}`,
      base: `https://base-mainnet.g.alchemy.com/v2/${this.apiKey}`,
      zksync: `https://zksync-mainnet.g.alchemy.com/v2/${this.apiKey}`,
      solana: `https://solana-mainnet.g.alchemy.com/v2/${this.apiKey}`
    };

    return urls[blockchain as keyof typeof urls] || urls.ethereum;
  }
}

export const alchemyTransfersService = new AlchemyTransfersService();
```

### **2. Address Tracking Service**

```typescript
// src/services/wallet/AddressTrackingService.ts

import { supabase } from '@/infrastructure/database/client';
import type { TrackedAddress, ExternalSyncStatus } from '@/types/wallet/addressTracking';

export class AddressTrackingService {
  // Add multiple addresses for tracking
  async addTrackedAddresses(
    addresses: Array<{
      address: string;
      blockchain: string;
      label?: string;
      notes?: string;
    }>
  ): Promise<TrackedAddress[]> {
    // Validate max 50 addresses per user
    const { count } = await supabase
      .from('tracked_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if ((count || 0) + addresses.length > 50) {
      throw new Error('Maximum 50 addresses can be tracked simultaneously');
    }

    const { data, error } = await supabase
      .from('tracked_addresses')
      .insert(addresses)
      .select();

    if (error) throw error;
    return data || [];
  }

  // Get user's tracked addresses
  async getTrackedAddresses(
    filters: {
      blockchain?: string;
      isActive?: boolean;
    } = {}
  ): Promise<TrackedAddress[]> {
    let query = supabase
      .from('tracked_addresses')
      .select(`
        *,
        external_sync_status (
          sync_status,
          last_synced_at,
          total_transactions_synced,
          last_sync_error
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.blockchain) {
      query = query.eq('blockchain', filters.blockchain);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Update address label/notes
  async updateTrackedAddress(
    id: string,
    updates: {
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<TrackedAddress> {
    const { data, error } = await supabase
      .from('tracked_addresses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Remove tracked address
  async removeTrackedAddress(id: string): Promise<void> {
    const { error } = await supabase
      .from('tracked_addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get sync status for addresses
  async getSyncStatus(addressIds: string[]): Promise<ExternalSyncStatus[]> {
    const { data, error } = await supabase
      .from('external_sync_status')
      .select('*')
      .in('tracked_address_id', addressIds);

    if (error) throw error;
    return data || [];
  }
}

export const addressTrackingService = new AddressTrackingService();
```

### **3. Transaction Sync Service**

```typescript
// src/services/wallet/TransactionSyncService.ts

import { alchemyTransfersService } from '../external-apis/AlchemyTransfersService';
import { addressTrackingService } from './AddressTrackingService';
import { supabase } from '@/infrastructure/database/client';
import type { WalletTransactionsTable } from '@/types/core/database';

export class TransactionSyncService {
  // Sync transactions for a specific tracked address
  async syncAddressTransactions(trackedAddressId: string): Promise<void> {
    try {
      // Update sync status to 'syncing'
      await this.updateSyncStatus(trackedAddressId, 'syncing');

      // Get tracked address details
      const { data: trackedAddress } = await supabase
        .from('tracked_addresses')
        .select('*')
        .eq('id', trackedAddressId)
        .single();

      if (!trackedAddress) {
        throw new Error('Tracked address not found');
      }

      // Get complete transaction history from Alchemy
      const transfers = await alchemyTransfersService.getCompleteAddressHistory(
        trackedAddress.address,
        trackedAddress.blockchain
      );

      // Convert and insert transactions
      let syncedCount = 0;
      for (const transfer of transfers) {
        await this.insertOrUpdateTransaction(transfer, trackedAddressId);
        syncedCount++;
      }

      // Update sync status to 'completed'
      await this.updateSyncStatus(trackedAddressId, 'completed', {
        totalTransactionsSynced: syncedCount,
        lastSyncedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Sync failed for address:', trackedAddressId, error);
      await this.updateSyncStatus(trackedAddressId, 'failed', {
        lastSyncError: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Convert Alchemy transfer to database transaction
  private async insertOrUpdateTransaction(
    transfer: any,
    trackedAddressId: string
  ): Promise<void> {
    const transaction: Partial<WalletTransactionsTable> = {
      tx_hash: transfer.hash,
      from_address: transfer.from,
      to_address: transfer.to,
      value: transfer.value?.toString() || '0',
      chain_id: this.getChainId(transfer.blockchain),
      status: 'confirmed', // Alchemy only returns confirmed transactions
      token_symbol: transfer.asset,
      token_address: transfer.rawContract?.address,
      data: transfer, // Store complete Alchemy response
      tracked_address_id: trackedAddressId,
      created_at: new Date(transfer.metadata.blockTimestamp).toISOString()
    };

    // Use upsert to handle duplicates
    const { error } = await supabase
      .from('wallet_transactions')
      .upsert(transaction, {
        onConflict: 'tx_hash',
        ignoreDuplicates: false
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }

  // Update sync status
  private async updateSyncStatus(
    trackedAddressId: string,
    status: string,
    additional: {
      totalTransactionsSynced?: number;
      lastSyncedAt?: string;
      lastSyncError?: string;
    } = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('external_sync_status')
      .upsert({
        tracked_address_id: trackedAddressId,
        sync_status: status,
        updated_at: new Date().toISOString(),
        ...additional
      }, {
        onConflict: 'tracked_address_id'
      });

    if (error) throw error;
  }

  private getChainId(blockchain: string): string {
    const chainIds = {
      ethereum: '1',
      polygon: '137',
      optimism: '10',
      arbitrum: '42161',
      base: '8453',
      zksync: '324',
      solana: 'solana-mainnet'
    };
    return chainIds[blockchain as keyof typeof chainIds] || '1';
  }

  // Sync all active tracked addresses for a user
  async syncAllUserAddresses(): Promise<void> {
    const trackedAddresses = await addressTrackingService.getTrackedAddresses({
      isActive: true
    });

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < trackedAddresses.length; i += batchSize) {
      const batch = trackedAddresses.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(address => 
          this.syncAddressTransactions(address.id).catch(error => {
            console.error(`Failed to sync address ${address.address}:`, error);
          })
        )
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < trackedAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export const transactionSyncService = new TransactionSyncService();
```

## **Type Definitions**

```typescript
// src/types/wallet/addressTracking.ts

export interface TrackedAddress {
  id: string;
  user_id: string;
  address: string;
  blockchain: string;
  label?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
  external_sync_status?: ExternalSyncStatus;
}

export interface ExternalSyncStatus {
  id: string;
  tracked_address_id: string;
  last_block_synced?: number;
  last_transaction_hash?: string;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed' | 'paused';
  last_sync_error?: string;
  total_transactions_synced: number;
  created_at: string;
  updated_at: string;
}

export interface AddressTrackingFilters {
  blockchain?: string;
  isActive?: boolean;
  label?: string;
}

export interface BulkAddressInput {
  addresses: Array<{
    address: string;
    blockchain?: string;
    label?: string;
  }>;
}
```

## **Performance Considerations**

### **API Rate Limiting**
- **Batch Processing**: Process addresses in batches of 5
- **Delay Between Batches**: 1-second delay between batches
- **Error Handling**: Retry failed requests with exponential backoff
- **Usage Monitoring**: Track API calls and implement alerts

### **Database Optimization**
- **Indexes**: Created on frequently queried columns
- **Pagination**: Implement cursor-based pagination for large datasets
- **Connection Pooling**: Use Supabase's built-in connection pooling
- **Query Optimization**: Use selective queries with proper filters

### **Caching Strategy**
- **React Query**: Cache API responses for 5 minutes
- **Local Storage**: Cache user preferences and settings
- **Database Caching**: Leverage Supabase's built-in caching
- **Progressive Loading**: Load recent transactions first, older ones on demand

## **Error Handling**

### **API Errors**
```typescript
export class AlchemyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'AlchemyAPIError';
  }
}

export class RateLimitError extends AlchemyAPIError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}
```

### **Retry Logic**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## **Security Considerations**

### **Data Validation**
- **Address Validation**: Validate Ethereum addresses using viem
- **Input Sanitization**: Sanitize all user inputs
- **Rate Limiting**: Implement user-level rate limiting
- **API Key Protection**: Ensure API keys are not exposed to client

### **Privacy**
- **RLS Policies**: Ensure users can only see their own data
- **Data Encryption**: Consider encrypting sensitive data at rest
- **Audit Logging**: Log all critical operations
- **GDPR Compliance**: Implement data deletion capabilities

## **Testing Strategy**

### **Unit Tests**
```typescript
// Example test for AlchemyTransfersService
describe('AlchemyTransfersService', () => {
  it('should fetch transfers for a valid address', async () => {
    const transfers = await alchemyTransfersService.getAddressTransfers(
      '0x742d35cc6b3C5bD9ACF85F35B5d7c3e9F1F96F0F'
    );
    
    expect(transfers.transfers).toBeDefined();
    expect(Array.isArray(transfers.transfers)).toBe(true);
  });
});
```

### **Integration Tests**
- Test complete sync workflow
- Test error handling and recovery
- Test rate limiting behavior
- Test database operations

## **Deployment Checklist**

### **Environment Variables**
- ✅ `VITE_ALCHEMY_API_KEY` - Already configured
- ✅ Database connection - Already configured
- ⚠️ Monitor Alchemy usage limits
- ⚠️ Set up webhook endpoints for real-time notifications

### **Database Migrations**
- [ ] Run schema migration scripts
- [ ] Verify RLS policies
- [ ] Test with sample data
- [ ] Create database indexes

### **Monitoring**
- [ ] Set up API usage monitoring
- [ ] Configure error alerting
- [ ] Monitor sync job performance
- [ ] Track user adoption metrics

---

**Next Steps**: Begin implementation with Phase 1 (Alchemy API Integration)
