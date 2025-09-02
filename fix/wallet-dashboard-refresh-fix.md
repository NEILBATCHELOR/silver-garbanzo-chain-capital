# Wallet Dashboard Refresh Fix

## Problem
The Wallets tab in the Wallet Dashboard was not properly refreshing wallet status. Wallets would continue showing as "Creating and Pending..." even after they were completed in the Guardian API.

## Root Causes

### 1. Independent State Management
- `WalletDashboardPage` maintained its own `guardianWallets` state
- `GuardianWalletList` maintained its own `wallets` state
- Both components were loading the same data independently
- Refresh button only updated the dashboard's state, not the child component's state

### 2. Data Sync Gap
- Local database was showing wallet status as "pending"
- Guardian API was showing wallet status as "completed"
- No sync mechanism between Guardian API and local database

## Solution

### 1. Unified State Management
Updated `GuardianWalletList` to accept external data as props:

```typescript
interface GuardianWalletListProps {
  // ... existing props
  wallets?: (Wallet & GuardianWalletExtension)[];
  loading?: boolean;
  onRefresh?: () => void;
}
```

The component now:
- Uses external wallets data when provided via props
- Falls back to internal state management when no external data is provided
- Maintains backward compatibility

### 2. Guardian API Sync
Added sync functions to `GuardianWalletService`:

```typescript
// Sync individual wallet by operation ID
async syncWalletWithGuardianApi(operationId: string): Promise<Wallet & GuardianWalletExtension | null>

// Sync all pending wallets
async syncAllPendingWallets(): Promise<(Wallet & GuardianWalletExtension)[]>
```

These functions:
- Fetch operation status from Guardian API
- Update local database with latest status and addresses
- Return updated wallet data

### 3. Enhanced Refresh Logic
Updated `WalletDashboardPage.loadGuardianWallets()` to:

```typescript
const loadGuardianWallets = async () => {
  if (!user) return;
  
  try {
    setGuardianLoading(true);
    
    // First sync any pending wallets with Guardian API
    await guardianWalletService.syncAllPendingWallets();
    
    // Then load the updated wallets
    const wallets = await guardianWalletService.listWallets();
    const userWallets = wallets.filter(wallet => wallet.userId === user.id);
    setGuardianWallets(userWallets);
  } catch (error) {
    console.error('Error loading Guardian wallets:', error);
  } finally {
    setGuardianLoading(false);
  }
};
```

## Benefits

1. **Consistent State**: Single source of truth for wallet data
2. **Real-time Sync**: Automatic sync with Guardian API during refresh
3. **Better UX**: Proper loading states and immediate status updates
4. **Backward Compatibility**: Components still work independently when needed

## Files Modified

1. `/src/components/wallet/components/guardian/GuardianWalletList.tsx`
   - Added props for external data management
   - Updated component logic to use external data when provided

2. `/src/services/guardian/GuardianWalletService.ts`
   - Added `syncWalletWithGuardianApi()` method
   - Added `syncAllPendingWallets()` method

3. `/src/pages/wallet/WalletDashboardPage.tsx`
   - Updated `loadGuardianWallets()` to include sync
   - Passed wallet data as props to `GuardianWalletList`
   - Enhanced refresh logic

## Testing

To test the fix:

1. Create a Guardian wallet (it will show as "Creating and Pending...")
2. Wait for the wallet to be completed in the Guardian API
3. Click the Refresh button in the Wallet Dashboard
4. The wallet status should update to "Active" immediately

## Future Improvements

1. **Polling**: Implement automatic polling for pending wallets
2. **WebSocket**: Use real-time updates from Guardian API
3. **Optimistic Updates**: Show immediate feedback for user actions
4. **Error Handling**: Better error states and retry mechanisms
