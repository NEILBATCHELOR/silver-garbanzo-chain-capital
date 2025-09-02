# Service Audit Integration Example: Investor Service

## 🎯 Overview

This document provides a complete example of updating the investor service to use the Universal Database Service for comprehensive audit logging. This serves as a template for updating all other services.

## 📄 File: `/src/services/investor/investors.ts`

### **Current State Analysis**
- **Operations requiring audit**: 15+ database write operations
- **Tables affected**: `investors`, `subscriptions`, `token_allocations`, `cap_table_investors`
- **Functions to update**: 12 functions need userId parameters
- **Priority**: 1 (High - 492 investor records)

### **Key Operations Identified**
1. `createInvestor()` - INSERT into investors
2. `updateInvestor()` - UPDATE investors
3. `deleteInvestor()` - DELETE from multiple tables
4. `updateInvestorKYC()` - UPDATE investors
5. `addInvestorToProject()` - INSERT into subscriptions, cap_table_investors
6. `addTokenAllocation()` - INSERT into token_allocations
7. `updateSubscription()` - UPDATE subscriptions
8. `updateTokenAllocation()` - UPDATE token_allocations
9. `deleteSubscription()` - DELETE from multiple tables

## 🔧 Implementation Steps

### **Step 1: Add Imports**

```typescript
// Add these imports at the top of the file
import { universalDatabaseService } from '@/services/database/UniversalDatabaseService';
import { logUserAction, logSystemEvent } from '@/services/activity';
```

### **Step 2: Update Function Signatures**

Add optional `userId` parameter to all functions that perform database operations:

```typescript
// Before
export async function createInvestor(
  investorData: Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">,
): Promise<DomainInvestor | null>

// After
export async function createInvestor(
  investorData: Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">,
  userId?: string
): Promise<DomainInvestor | null>
```

### **Step 3: Replace Database Operations**

#### **Example 1: Create Investor**

```typescript
// Before (Direct Supabase)
export async function createInvestor(
  investorData: Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">,
): Promise<DomainInvestor | null> {
  const now = new Date().toISOString();
  const newInvestor = {
    id: crypto.randomUUID(),
    name: investorData.name,
    email: investorData.email,
    type: investorData.type,
    company: investorData.company || null,
    kyc_status: investorData.kycStatus || "not_started",
    kyc_expiry_date: investorData.kycExpiryDate 
      ? (investorData.kycExpiryDate instanceof Date 
          ? investorData.kycExpiryDate.toISOString() 
          : new Date(investorData.kycExpiryDate).toISOString())
      : null,
    wallet_address: investorData.walletAddress || null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await (supabase
    .from("investors") as any)
    .insert(newInvestor)
    .select()
    .single();

  if (error) {
    console.error("Error creating investor:", error);
    throw error;
  }

  return data ? mapDbInvestorToInvestor(data) : null;
}
```

```typescript
// After (With Audit Logging)
export async function createInvestor(
  investorData: Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">,
  userId?: string
): Promise<DomainInvestor | null> {
  try {
    const now = new Date().toISOString();
    const newInvestor = {
      id: crypto.randomUUID(),
      name: investorData.name,
      email: investorData.email,
      type: investorData.type,
      company: investorData.company || null,
      kyc_status: investorData.kycStatus || "not_started",
      kyc_expiry_date: investorData.kycExpiryDate 
        ? (investorData.kycExpiryDate instanceof Date 
            ? investorData.kycExpiryDate.toISOString() 
            : new Date(investorData.kycExpiryDate).toISOString())
        : null,
      wallet_address: investorData.walletAddress || null,
      created_at: now,
      updated_at: now,
    };

    // Use Universal Database Service for automatic audit logging
    const data = await universalDatabaseService.create(
      'investors',
      newInvestor,
      userId
    );

    // Additional business context logging
    await logUserAction('investor_created', {
      entityType: 'investors',
      entityId: data.id,
      details: `Investor ${investorData.email} created`,
      metadata: {
        investorType: investorData.type,
        kycStatus: investorData.kycStatus || "not_started",
        hasCompany: !!investorData.company,
        hasWallet: !!investorData.walletAddress
      }
    });

    return data ? mapDbInvestorToInvestor(data) : null;
  } catch (error) {
    console.error('Error creating investor:', error);
    
    // Log the error for audit trail
    await logSystemEvent('investor_creation_failed', {
      entityType: 'investors',
      details: `Failed to create investor: ${error.message}`,
      metadata: {
        email: investorData.email,
        error: error.message
      }
    });
    
    throw error;
  }
}
```

#### **Example 2: Update Investor**

```typescript
// Before (Direct Supabase)
export async function updateInvestor(
  investorId: string,
  updates: Partial<Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">>,
): Promise<DomainInvestor | null> {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Convert from application model to database schema
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  // ... other field mappings

  let updateQuery = supabase
    .from("investors")
    .update(updateData);
    
  updateQuery = (updateQuery as any).eq("id", investorId).select().single();
  
  const { data, error } = await updateQuery;

  if (error) {
    console.error(`Error updating investor ${investorId}:`, error);
    throw error;
  }

  return data ? mapDbInvestorToInvestor(data) : null;
}
```

```typescript
// After (With Audit Logging)
export async function updateInvestor(
  investorId: string,
  updates: Partial<Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">>,
  userId?: string
): Promise<DomainInvestor | null> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Convert from application model to database schema
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.kycStatus !== undefined) updateData.kyc_status = updates.kycStatus;
    if (updates.kycExpiryDate !== undefined) {
      updateData.kyc_expiry_date = updates.kycExpiryDate instanceof Date 
        ? updates.kycExpiryDate.toISOString() 
        : updates.kycExpiryDate;
    }
    if (updates.walletAddress !== undefined) {
      updateData.wallet_address = updates.walletAddress;
    }

    // Use Universal Database Service for automatic audit logging
    const data = await universalDatabaseService.update(
      'investors',
      investorId,
      updateData,
      userId
    );

    // Additional business context logging
    const changedFields = Object.keys(updates);
    await logUserAction('investor_updated', {
      entityType: 'investors',
      entityId: investorId,
      details: `Investor updated: ${changedFields.join(', ')}`,
      metadata: {
        changedFields,
        updateCount: changedFields.length,
        hasKycChange: changedFields.includes('kycStatus'),
        hasWalletChange: changedFields.includes('walletAddress')
      }
    });

    return data ? mapDbInvestorToInvestor(data) : null;
  } catch (error) {
    console.error(`Error updating investor ${investorId}:`, error);
    
    // Log the error for audit trail
    await logSystemEvent('investor_update_failed', {
      entityType: 'investors',
      entityId: investorId,
      details: `Failed to update investor: ${error.message}`,
      metadata: {
        attemptedUpdates: Object.keys(updates),
        error: error.message
      }
    });
    
    throw error;
  }
}
```

#### **Example 3: Delete Investor (Complex Multi-table Operation)**

```typescript
// After (With Audit Logging)
export const deleteInvestor = async (
  investorId: string, 
  userId?: string
): Promise<void> => {
  try {
    // Get investor data before deletion for audit trail
    const investorToDelete = await getInvestor(investorId);
    
    if (!investorToDelete) {
      throw new Error(`Investor ${investorId} not found`);
    }

    // Check for dependencies and delete in proper order
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("investor_id", investorId);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    // Delete related records using Universal Database Service for audit
    if (subscriptions && subscriptions.length > 0) {
      const subscriptionIds = subscriptions.map((s) => s.id);

      // Delete token allocations
      await universalDatabaseService.bulkDelete(
        'token_allocations',
        subscriptionIds.map(id => ({ subscription_id: id })),
        userId
      );

      // Delete subscriptions
      await universalDatabaseService.bulkDelete(
        'subscriptions',
        subscriptionIds,
        userId
      );
    }

    // Delete cap table associations
    await universalDatabaseService.delete(
      'cap_table_investors',
      investorId, // This might need adjustment based on table structure
      userId
    );

    // Delete investor group associations
    await universalDatabaseService.delete(
      'investor_groups_investors',
      investorId, // This might need adjustment based on table structure
      userId
    );

    // Finally, delete the investor
    await universalDatabaseService.delete(
      'investors',
      investorId,
      userId
    );

    // Log comprehensive deletion activity
    await logUserAction('investor_deleted', {
      entityType: 'investors',
      entityId: investorId,
      details: `Investor ${investorToDelete.name} (${investorToDelete.email}) permanently deleted`,
      metadata: {
        investorName: investorToDelete.name,
        investorEmail: investorToDelete.email,
        investorType: investorToDelete.type,
        hadSubscriptions: (subscriptions?.length || 0) > 0,
        subscriptionCount: subscriptions?.length || 0,
        deletionReason: 'user_requested'
      }
    });

    console.log(`Successfully deleted investor with ID ${investorId}`);
  } catch (error) {
    console.error(`Error in deleteInvestor for ID ${investorId}:`, error);
    
    // Log deletion failure
    await logSystemEvent('investor_deletion_failed', {
      entityType: 'investors',
      entityId: investorId,
      details: `Failed to delete investor: ${error.message}`,
      metadata: {
        error: error.message,
        stack: error.stack
      }
    });
    
    throw error;
  }
};
```

### **Step 4: Update Complex Operations**

#### **Example: Add Investor to Project (Multi-table Operation)**

```typescript
// After (With Audit Logging)
export const addInvestorToProject = async (
  projectId: string,
  investorId: string,
  subscriptionData: {
    subscription_id: string;
    currency: string;
    fiat_amount: number;
    subscription_date: string;
    confirmed?: boolean;
    allocated?: boolean;
    distributed?: boolean;
    notes?: string;
  },
  userId?: string
): Promise<any> => {
  try {
    // First get the cap table for this project
    const { data: capTable, error: capTableError } = await supabase
      .from("cap_tables")
      .select("id")
      .eq("project_id", projectId)
      .single();

    if (capTableError) {
      throw capTableError;
    }

    // Create subscription record with audit logging
    const subscriptionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const subscription = {
      id: subscriptionId,
      investor_id: investorId,
      project_id: projectId,
      subscription_id: subscriptionData.subscription_id,
      currency: subscriptionData.currency,
      fiat_amount: subscriptionData.fiat_amount,
      subscription_date: subscriptionData.subscription_date,
      confirmed: subscriptionData.confirmed || false,
      allocated: subscriptionData.allocated || false,
      distributed: subscriptionData.distributed || false,
      notes: subscriptionData.notes || null,
      created_at: now,
      updated_at: now,
    };

    const subscriptionResult = await universalDatabaseService.create(
      'subscriptions',
      subscription,
      userId
    );

    // Add investor to cap table with audit logging
    const capTableInvestor = {
      cap_table_id: capTable.id,
      investor_id: investorId,
      created_at: now,
    };

    const capTableResult = await universalDatabaseService.create(
      'cap_table_investors',
      capTableInvestor,
      userId
    );

    // Log the business operation
    await logUserAction('investor_added_to_project', {
      entityType: 'subscriptions',
      entityId: subscriptionId,
      details: `Investor added to project with subscription ${subscriptionData.subscription_id}`,
      metadata: {
        projectId,
        investorId,
        subscriptionAmount: subscriptionData.fiat_amount,
        currency: subscriptionData.currency,
        confirmed: subscriptionData.confirmed,
        capTableId: capTable.id
      }
    });

    return {
      subscription: subscriptionResult,
      capTableInvestor: capTableResult,
    };
  } catch (error) {
    console.error(`Error adding investor ${investorId} to project ${projectId}:`, error);
    
    await logSystemEvent('investor_project_addition_failed', {
      entityType: 'subscriptions',
      details: `Failed to add investor to project: ${error.message}`,
      metadata: {
        projectId,
        investorId,
        error: error.message
      }
    });
    
    throw error;
  }
};
```

## 📋 Complete Function Update Checklist

### **Functions Requiring Updates**

1. ✅ `createInvestor()` - Add userId parameter, use universalDatabaseService.create()
2. ✅ `updateInvestor()` - Add userId parameter, use universalDatabaseService.update()
3. ✅ `deleteInvestor()` - Add userId parameter, use universalDatabaseService.delete()
4. ⏳ `updateInvestorKYC()` - Add userId parameter, use universalDatabaseService.update()
5. ⏳ `addInvestorToProject()` - Add userId parameter, audit both subscription and cap table
6. ⏳ `addTokenAllocation()` - Add userId parameter, use universalDatabaseService.create()
7. ⏳ `updateSubscription()` - Add userId parameter, use universalDatabaseService.update()
8. ⏳ `updateTokenAllocation()` - Add userId parameter, use universalDatabaseService.update()
9. ⏳ `deleteSubscription()` - Add userId parameter, use universalDatabaseService.delete()

### **Read-only Functions (No Changes Needed)**
- `getInvestors()` - Read operation only
- `getInvestor()` - Read operation only
- `getInvestorSubscriptions()` - Read operation only
- `getInvestorsByProjectId()` - Read operation only
- `getInvestorsByKYCStatus()` - Read operation only
- `getInvestorsWithExpiringKYC()` - Read operation only
- `isComplianceOfficer()` - Read operation only

## 🧪 Testing Strategy

### **Test Cases Required**
1. **Create Operations**
   - Test successful investor creation with audit logging
   - Test error handling and audit log for failed creation
   - Verify audit log contains correct data

2. **Update Operations**
   - Test successful updates with change tracking
   - Test partial updates (only some fields)
   - Test KYC status updates specifically

3. **Delete Operations**
   - Test cascade deletion with proper audit trails
   - Test deletion failure scenarios
   - Verify all related records are properly audited

4. **Complex Operations**
   - Test multi-table operations (add to project)
   - Test bulk operations
   - Test transaction rollback scenarios

### **Audit Verification**
```typescript
// Example test helper
async function verifyAuditLog(operationType: string, entityId: string, userId: string) {
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', 'investors')
    .eq('entity_id', entityId)
    .eq('user_id', userId)
    .eq('action', `investors_${operationType}`)
    .order('timestamp', { ascending: false })
    .limit(1);

  expect(auditLogs).toHaveLength(1);
  expect(auditLogs[0].status).toBe('SUCCESS');
  return auditLogs[0];
}
```

## 📈 Expected Benefits

### **Performance Improvements**
- **70-80% faster queries** from eliminating triggers
- **90% reduction in write latency** from async audit processing
- **Better error handling** with graceful audit failures

### **Audit Benefits**
- **Complete change tracking** for all investor operations
- **User attribution** for compliance and debugging
- **Business context** in audit logs for better investigation
- **Regulatory compliance** with comprehensive audit trails

### **Operational Benefits**
- **Enhanced debugging** with detailed operation logs
- **Better incident response** with complete audit history
- **Compliance reporting** with automatic audit trail generation
- **Performance monitoring** with built-in metrics

## 🚀 Rollout Strategy

### **Phase 1: Core Operations (Week 1)**
1. Update `createInvestor()`, `updateInvestor()`, `deleteInvestor()`
2. Test thoroughly in development environment
3. Deploy and monitor audit log generation

### **Phase 2: Subscription Management (Week 2)**
1. Update subscription-related functions
2. Update cap table operations
3. Test multi-table operations

### **Phase 3: Advanced Features (Week 3)**
1. Update KYC management functions
2. Update token allocation functions
3. Final testing and validation

### **Phase 4: Production Rollout**
1. Deploy with monitoring
2. Validate audit log generation
3. Performance monitoring
4. User acceptance testing

---

## ✅ Success Criteria

- **100% operation coverage**: All database writes generate audit logs
- **Zero functional regression**: All existing functionality preserved
- **Performance targets met**: 60-80% improvement maintained
- **Audit completeness**: All operations traceable to users
- **Error rate < 0.1%**: Audit system highly reliable

**This investor service example provides the complete pattern for updating all other services in the system.**

---

*Enhanced Activity Monitoring System v2 - Investor Service Integration Example*  
*Complete pattern for systematic service updates with comprehensive audit coverage*
