# Profile Creation Error Fix

## Problem Summary
Error: `null value in column "id" of relation "profiles" violates not-null constraint`

## Root Cause Analysis
1. The `profiles` table has a UUID `id` column that is NOT NULL but has no default UUID generator
2. The enhanced-user-service.ts creates profiles without explicitly providing an `id` value
3. This causes the database to attempt inserting NULL, violating the NOT NULL constraint

## Database Schema Issue
Both `profiles` and `users` tables are missing UUID defaults:

```sql
-- Current problematic tables
SELECT table_name, column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE column_name = 'id' 
  AND data_type = 'uuid' 
  AND table_schema = 'public'
  AND column_default IS NULL
  AND is_nullable = 'NO';

-- Results:
-- profiles: id | NO | null
-- users: id | NO | null
```

## Solution 1: Database Migration (Recommended)

Apply this SQL migration to fix the database schema:

```sql
-- Fix profiles table UUID default
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Also fix users table for consistency
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

## Solution 2: Code Fix (Temporary)

If database migration can't be applied immediately, modify enhanced-user-service.ts:

```typescript
// Add UUID import
import { v4 as uuidv4 } from 'uuid';

// In profile creation section, change from:
.insert({
  user_id: authUserId!,
  profile_type: userData.profileType!,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

// To:
.insert({
  id: uuidv4(), // Generate UUID explicitly
  user_id: authUserId!,
  profile_type: userData.profileType!,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

## Files to Apply Migration
1. `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/fix/profiles-table-uuid-default-fix.sql`

## Impact
- Fixes profile creation errors during user registration
- Prevents future UUID constraint violations
- Aligns profiles table with other tables that have proper UUID defaults

## Priority: Critical
This blocks user registration functionality.
