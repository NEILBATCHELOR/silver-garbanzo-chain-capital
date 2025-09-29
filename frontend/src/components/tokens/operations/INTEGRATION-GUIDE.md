# Policy-Aware Token Operations Integration Guide

## 📋 Executive Summary

Your token operations module has been successfully enhanced with policy-aware components. This guide outlines the cleanup process and integration steps.

## 🎯 Current Status

### Components Analysis

#### 🔴 **Redundant Components (Can be Removed)**
These original components are now replaced by PolicyAware versions:

1. **MintOperation.tsx** → Replaced by PolicyAwareMintOperation.tsx
   - Missing: Policy validation, compliance tracking, gateway integration
   
2. **BurnOperation.tsx** → Replaced by PolicyAwareBurnOperation.tsx
   - Missing: Pre-transaction validation, audit logging
   
3. **LockOperation.tsx** → Replaced by PolicyAwareLockOperation.tsx
   - Missing: Time-based policy enforcement, lock duration validation
   
4. **BlockOperation.tsx** → Replaced by PolicyAwareBlockOperation.tsx
   - Missing: Blacklist policy validation, reason tracking

#### ✅ **Components to Keep**
1. **PauseOperation.tsx** - No PolicyAware version exists (yet)
2. **All PolicyAware*.tsx components** - These are the new standard

#### 📦 **New Component Created**
- **PolicyAwareOperationsPanel.tsx** - Enhanced panel integrating all PolicyAware operations

## 🛠️ Integration Steps

### Step 1: Update Imports in Parent Components

Find components that import the old OperationsPanel and update them:

```typescript
// OLD
import OperationsPanel from '@/components/tokens/operations/OperationsPanel';

// NEW
import PolicyAwareOperationsPanel from '@/components/tokens/operations/PolicyAwareOperationsPanel';
```

### Step 2: Update Props

The new PolicyAwareOperationsPanel requires additional props:

```typescript
// Old props
<OperationsPanel
  tokenId={tokenId}
  tokenStandard={tokenStandard}
  tokenName={tokenName}
  tokenSymbol={tokenSymbol}
  isDeployed={isDeployed}
  isPaused={isPaused}
  hasPauseFeature={hasPauseFeature}
  refreshTokenData={refreshTokenData}
/>

// New props (additional required)
<PolicyAwareOperationsPanel
  tokenId={tokenId}
  tokenAddress={tokenAddress}        // NEW: Required for policy validation
  tokenStandard={tokenStandard}
  tokenName={tokenName}
  tokenSymbol={tokenSymbol}
  chain={chain}                      // NEW: Required for chain-specific policies
  isDeployed={isDeployed}
  isPaused={isPaused}
  hasPauseFeature={hasPauseFeature}
  hasLockFeature={hasLockFeature}    // NEW: Optional feature flag
  hasBlockFeature={hasBlockFeature}  // NEW: Optional feature flag
  refreshTokenData={refreshTokenData}
/>
```

### Step 3: Files to Remove

After confirming the PolicyAwareOperationsPanel works in your application:

```bash
# Remove redundant operation components
rm frontend/src/components/tokens/operations/MintOperation.tsx
rm frontend/src/components/tokens/operations/BurnOperation.tsx
rm frontend/src/components/tokens/operations/LockOperation.tsx
rm frontend/src/components/tokens/operations/BlockOperation.tsx
rm frontend/src/components/tokens/operations/OperationsPanel.tsx  # After migration
```

### Step 4: Update index.ts

```typescript
// frontend/src/components/tokens/operations/index.ts

// Remove old exports
- export { default as MintOperation } from './MintOperation';
- export { default as BurnOperation } from './BurnOperation';
- export { default as LockOperation } from './LockOperation';
- export { default as BlockOperation } from './BlockOperation';
- export { default as OperationsPanel } from './OperationsPanel';

// Add new exports
+ export { default as PolicyAwareOperationsPanel } from './PolicyAwareOperationsPanel';
+ export { default as PauseOperation } from './PauseOperation'; // Keep until PolicyAware version

// Keep all PolicyAware exports as-is
export { PolicyAwareMintOperation } from './PolicyAwareMintOperation';
// ... etc
```

## 🚀 Key Features of PolicyAware Components

### 1. **Pre-Transaction Validation**
- Validates operations against database policies BEFORE blockchain execution
- Saves gas by preventing invalid transactions
- Shows clear policy violations to users

### 2. **Compliance Tracking**
- Every operation is logged to `compliance_audit_logs`
- Tracks policy violations in `compliance_violations`
- Maintains compliance score per token

### 3. **Gateway Integration**
- Uses CryptoOperationGateway for unified operation handling
- Supports multiple chains through blockchain adapters
- Handles transaction building, gas estimation, and execution

### 4. **Real-Time Policy Status**
- Shows number of active policies
- Displays current compliance score
- Tracks pending approvals and recent violations

## 📊 Database Tables Used

The PolicyAware components interact with these tables:

- `policy_operation_mappings` - Maps policies to token operations
- `rule_evaluations` - Tracks rule evaluation results
- `operation_validations` - Validation records for each operation
- `transaction_validations` - Pre-transaction validation logs
- `compliance_audit_logs` - Complete audit trail
- `compliance_violations` - Policy violation records
- `compliance_metrics` - Compliance scores and metrics

## 🔍 Testing the Integration

### 1. Test Policy Validation
```typescript
// Try to mint tokens that violate a policy
// Should see validation error BEFORE transaction
```

### 2. Check Compliance Logging
```sql
-- After operations, check audit logs
SELECT * FROM compliance_audit_logs 
WHERE token_address = 'YOUR_TOKEN_ADDRESS'
ORDER BY created_at DESC;
```

### 3. Monitor Policy Status
The PolicyAwareOperationsPanel header shows:
- Active policies count
- Current compliance score
- Last violation date
- Pending approvals

## ⚠️ Important Considerations

### 1. **Chain Parameter Required**
All PolicyAware components need the `chain` prop. Make sure parent components have access to the chain information.

### 2. **Token Address Required**
The `tokenAddress` prop is essential for policy lookups. Ensure it's available from your token data.

### 3. **Feature Flags**
Use `hasLockFeature` and `hasBlockFeature` to control which operations appear based on your token configuration.

### 4. **Pause Operation**
PauseOperation.tsx hasn't been converted to PolicyAware yet. It still works but lacks policy validation.

## 📈 Benefits of Migration

1. **Automated Compliance** - No manual policy checking needed
2. **Gas Savings** - Invalid operations blocked before blockchain
3. **Audit Trail** - Complete history of all operations
4. **Risk Management** - Real-time compliance scoring
5. **User Experience** - Clear feedback on policy violations

## 🔮 Future Enhancements

1. **PolicyAwarePauseOperation** - Coming soon
2. **Batch Operations** - Execute multiple operations with single validation
3. **Policy Override Workflows** - For emergency operations
4. **Advanced Analytics** - Policy effectiveness metrics

## 🐛 Troubleshooting

### Issue: "Cannot find chain prop"
**Solution**: Ensure parent component passes the chain parameter. Get it from token metadata or wallet connection.

### Issue: "Policy validation always passes"
**Solution**: Check if policies are configured in `policy_operation_mappings` table for your token/chain combination.

### Issue: "Operations not appearing"
**Solution**: Check token standard and feature flags. Some operations only work with specific standards.

## 📝 Summary

### ✅ **Action Items**
1. Replace OperationsPanel with PolicyAwareOperationsPanel
2. Update parent component props
3. Test operations with policy validation
4. Remove old operation components
5. Update exports in index.ts

### 🗑️ **Files to Remove** (After Testing)
- MintOperation.tsx
- BurnOperation.tsx  
- LockOperation.tsx
- BlockOperation.tsx
- OperationsPanel.tsx (after migration)

### 📦 **Files to Keep**
- All PolicyAware*.tsx components
- PauseOperation.tsx (until PolicyAware version)
- PolicyAwareOperationsPanel.tsx (new)

### 🎉 **Result**
A fully policy-integrated token operations system with automated compliance, audit logging, and enhanced user experience!

---

**Need Help?** Check the implementation in PolicyAwareOperationsPanel.tsx or review the policy integration documentation in /docs.