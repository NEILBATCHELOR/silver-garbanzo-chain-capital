# CRITICAL: Multiple Supabase Client Instances Causing Double Records

**Date**: August 21, 2025  
**Issue**: TokenizationManager.tsx creating duplicate records due to multiple Supabase client instances  
**Status**: ROOT CAUSE IDENTIFIED  

## 🔍 Root Cause Analysis

### The Real Problem
**NOT a component-level issue** - The duplicate records are caused by **multiple Supabase client instances** and complex audit tracking interference.

### Evidence Found
- **Two identical tokens**: "Hypo Fund Pool A Token" (RCV3) 
- **Exact same timestamp**: `2025-08-21T12:17:29.285Z`
- **Multiple Supabase clients**: 3 different client instances found

### Client Instance Analysis

#### 1. Main Client (`/infrastructure/database/client.ts`)
```typescript
// Singleton pattern with audit proxy
let supabaseInstance: any = null;
const originalSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabase = createAuditProxy(originalSupabase);
```

#### 2. Audit Service Client (`/services/audit/UniversalDatabaseAuditService.ts`)
```typescript
// SEPARATE CLIENT INSTANCE - Problem!
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

#### 3. Audit Logger (`/infrastructure/auditLogger.ts`)
```typescript
// Uses main client but creates circular dependency
import { supabase } from '@/infrastructure/database/client';
```

### Complex Audit Chain (The Problem)
```
TokenizationManager.tsx
    ↓ calls supabase.from("tokens").insert()
client.ts audit proxy 
    ↓ intercepts INSERT operation
    ↓ successfully inserts token
    ↓ calls universalDatabaseAuditService.trackCreate()
UniversalDatabaseAuditService.ts (SEPARATE CLIENT!)
    ↓ calls logActivity() from auditLogger.ts
auditLogger.ts
    ↓ uses main client again (CIRCULAR!)
    ↓ potential timing conflicts/race conditions
```

## 🛠️ Immediate Fix Required

### Step 1: Consolidate Supabase Clients

**Fix UniversalDatabaseAuditService.ts** - Remove separate client instance:

```typescript
// REMOVE these lines (22-27):
// const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// REPLACE with import from main client:
import { supabase } from '../../infrastructure/database/client';
```

### Step 2: Temporarily Disable Audit Proxy (Testing)

**Fix client.ts** - Add audit disable flag for testing:

```typescript
// Add this flag at the top
const AUDIT_PROXY_ENABLED = false; // Set to false to test

// Modify the export
export const supabase = AUDIT_PROXY_ENABLED 
  ? createAuditProxy(createSupabaseClient()) 
  : createSupabaseClient();
```

### Step 3: Test Token Creation

1. Apply fixes above
2. Try creating a token
3. Check if duplicates still occur
4. Re-enable audit proxy if duplicates stop

## 🚨 High Priority Actions

### Immediate (Today)
1. **Fix UniversalDatabaseAuditService** - Use main client instance
2. **Test with audit proxy disabled** - Verify if duplicates stop
3. **Clean up existing duplicates** - Remove duplicate tokens

### Short Term (This Week)  
1. **Simplify audit chain** - Remove complex proxy system
2. **Add proper client singleton enforcement** - Prevent multiple instances
3. **Implement proper error boundaries** - Handle audit failures gracefully

### Long Term (Next Sprint)
1. **Redesign audit system** - Simpler, more reliable approach
2. **Add comprehensive testing** - Prevent future client instance issues
3. **Monitor client instance creation** - Add warnings for multiple instances

## 🎯 Expected Resolution

After consolidating Supabase clients:
- ✅ No more duplicate token records
- ✅ Simplified audit tracking
- ✅ Better performance (fewer client instances)
- ✅ Reduced complexity and race conditions

## 📁 Files to Modify

1. `/services/audit/UniversalDatabaseAuditService.ts` - Remove separate client
2. `/infrastructure/database/client.ts` - Add audit disable flag for testing
3. `/scripts/cleanup-duplicate-tokens.sql` - Clean existing duplicates

## ⚠️ Critical Note

This is **NOT** a component-level issue with TokenizationManager.tsx. The component code is correct. The issue is infrastructure-level with multiple Supabase client instances interfering with each other through the complex audit tracking system.

**Priority**: CRITICAL - Affects data integrity across the entire application
