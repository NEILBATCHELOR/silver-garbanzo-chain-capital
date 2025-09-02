# Transaction History Tracker Feature Request

**Date**: July 17, 2025  
**Status**: Planning Phase  
**Priority**: High  
**External API**: Alchemy (Existing Infrastructure)  

## **Executive Summary**

Create a comprehensive transaction history tracking facility within the Wallet Dashboard that allows users to monitor up to 50 wallet addresses simultaneously using real-time blockchain data from our existing Alchemy infrastructure.

## **Current Infrastructure Analysis**

### **✅ Existing Alchemy Setup**
- **API Key**: `Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP` (Already configured)
- **Supported Networks**: 
  - Ethereum Mainnet/Sepolia/Holesky
  - Polygon Mainnet/Amoy  
  - Optimism Mainnet/Sepolia
  - Arbitrum Mainnet/Sepolia
  - Base Mainnet/Sepolia
  - zkSync Mainnet/Sepolia
  - Solana Mainnet/Devnet

### **✅ Current Technical Stack**
- **Web3**: `viem 2.29.0`, `wagmi ^2.15.2`
- **Data Fetching**: `@tanstack/react-query ^5.75.2`
- **Database**: `@supabase/supabase-js ^2.45.6`
- **UI**: Radix UI components, Tailwind CSS
- **Existing Tables**: `wallet_transactions`, `transaction_notifications`

### **✅ Existing Components**
- `TransactionHistory.tsx` - Basic transaction display
- `TransactionMonitorService.ts` - Supabase-based transaction fetching
- Wallet dashboard infrastructure in `/components/wallet/components/dashboard/`

## **Feature Requirements**

### **Core Functionality**
1. **Multi-Address Input**: Support pasting up to 50 wallet addresses at once
2. **Real-Time Tracking**: Monitor all incoming/outgoing transactions for tracked addresses
3. **Multi-Chain Support**: Utilize existing Alchemy network coverage
4. **Live Data Only**: No mock data - must use real blockchain transaction data
5. **Dashboard Integration**: Seamless integration within existing Wallet Dashboard

### **User Experience**
- **Bulk Address Management**: Easy paste/import of multiple addresses
- **Address Labeling**: Custom labels for tracked addresses
- **Activity Feed**: Real-time transaction notifications
- **Historical View**: Complete transaction history per address
- **Export Functionality**: Data export for accounting/compliance

## **Technical Implementation Strategy**

### **Phase 1: Alchemy API Integration Service**
**Location**: `/src/services/external-apis/`
```typescript
// AlchemyTransfersService.ts - Leverage existing API key
// TransactionSyncService.ts - Sync external data to Supabase
// AddressTrackingService.ts - Manage multiple addresses
```

**Key Alchemy Endpoints**:
- `alchemy_getAssetTransfers` - Main transaction history endpoint
- `alchemy_pendingTransactions` - Real-time pending transactions  
- Address Activity Notifications - Webhook support

### **Phase 2: Database Schema Extensions**
**New Tables Required**:
```sql
CREATE TABLE tracked_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  address text NOT NULL,
  blockchain text NOT NULL,
  label text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_synced_at timestamptz
);

CREATE TABLE external_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  blockchain text NOT NULL,
  last_block_synced bigint,
  sync_status text DEFAULT 'pending',
  last_sync_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### **Phase 3: Enhanced UI Components**
**Location**: `/src/components/wallet/components/transaction-tracker/`
```
├── AddressInput.tsx           # Bulk address input (up to 50)
├── AddressManager.tsx         # Manage tracked addresses  
├── TrackedAddressList.tsx     # Display tracked addresses
├── BulkTransactionHistory.tsx # Multi-address transaction view
├── AddressActivityFeed.tsx    # Real-time activity feed
└── index.ts
```

### **Phase 4: Background Sync & Real-Time Updates**
- **Background Jobs**: Periodic sync of transaction data
- **Webhooks**: Alchemy Address Activity Notifications
- **Real-Time UI**: Supabase subscriptions for live updates
- **Rate Limiting**: Intelligent API call management

## **Alchemy API Integration Details**

### **Existing Infrastructure Leverage**
- **No New Setup Required**: Use existing `VITE_ALCHEMY_API_KEY`
- **Multi-Network Support**: Leverage current RPC endpoint configuration
- **Rate Limits**: Monitor existing usage, implement intelligent batching

### **Key API Methods**
```typescript
// Get transaction history for an address
const transfers = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "id": 1,
    "jsonrpc": "2.0", 
    "method": "alchemy_getAssetTransfers",
    "params": [{
      "fromAddress": "0x...", // or "toAddress" for incoming
      "category": ["external", "internal", "erc20", "erc721", "erc1155"],
      "withMetadata": true,
      "excludeZeroValue": true,
      "maxCount": "0x3e8" // 1000 transactions
    }]
  })
});
```

### **Performance Optimizations**
- **Batch Requests**: Group multiple addresses per API call where possible
- **Incremental Sync**: Only fetch new transactions since last sync
- **Caching**: Store transaction data locally to minimize API calls
- **Smart Pagination**: Implement efficient pagination for large transaction sets

## **Cost Analysis**

### **Alchemy API Usage**
- **Current Plan**: Using existing account (Plan unknown)
- **Expected Usage**: 
  - Initial sync: High usage for historical data
  - Ongoing: Moderate usage for new transactions
  - 50 addresses × multiple networks = Significant API calls
- **Recommendation**: Monitor usage and upgrade Alchemy plan if needed

### **Development Effort**
- **Phase 1**: 2-3 days (API integration)
- **Phase 2**: 1 day (Database schema)
- **Phase 3**: 3-4 days (UI components)
- **Phase 4**: 2-3 days (Real-time features)
- **Total**: ~8-11 days

## **Risk Assessment**

### **Technical Risks**
- **API Rate Limits**: May hit Alchemy limits with 50 addresses
- **Data Volume**: Large transaction histories may impact performance
- **Network Coverage**: Some networks may have limited Alchemy support

### **Mitigation Strategies**
- **Intelligent Batching**: Optimize API calls to minimize requests
- **Incremental Loading**: Paginate large transaction sets
- **Fallback Options**: Maintain Moralis as backup API service
- **Usage Monitoring**: Track API usage and optimize accordingly

## **Success Criteria**

### **Functional Requirements**
- ✅ Support for 50+ tracked addresses
- ✅ Real-time transaction detection
- ✅ Multi-chain transaction history
- ✅ User-friendly address management
- ✅ Export/reporting capabilities

### **Performance Requirements**
- ✅ <3 second response time for transaction queries
- ✅ Real-time notifications within 30 seconds
- ✅ Support for 100+ simultaneous users
- ✅ 99.9% uptime for tracking service

## **Next Steps**

### **Immediate Actions**
1. **API Testing**: Test Alchemy `alchemy_getAssetTransfers` with sample addresses
2. **Usage Assessment**: Review current Alchemy plan limits and usage
3. **Database Migration**: Create new tables for address tracking
4. **Service Implementation**: Build AlchemyTransfersService

### **Implementation Order**
1. **Start with Alchemy API Service** (Leverage existing infrastructure)
2. **Create database schema extensions** (Data foundation)  
3. **Build address input/management UI** (User interface)
4. **Implement background sync** (Data synchronization)
5. **Add real-time features** (Live updates)

### **Dependencies**
- ✅ **Alchemy API Access**: Already configured
- ✅ **Database Access**: Supabase ready
- ✅ **UI Framework**: Radix/Tailwind in place
- ❌ **API Usage Plan**: May need Alchemy upgrade
- ❌ **Webhook Infrastructure**: Need setup for real-time notifications

## **Approval Required**

- [ ] **Technical Architecture** - Approved by Development Team
- [ ] **API Usage Costs** - Approved by Finance Team  
- [ ] **Timeline** - Approved by Project Manager
- [ ] **Feature Scope** - Approved by Product Owner

---

**Contact**: Development Team  
**Next Review**: Upon technical architecture approval
