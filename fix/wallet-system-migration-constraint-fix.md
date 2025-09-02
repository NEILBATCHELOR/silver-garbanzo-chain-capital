# Wallet System Migration Fix

## Problem

The original wallet system database migration failed with the error:
```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## Root Cause

The `credential_vault_storage` table existed but was missing the `UNIQUE(credential_id)` constraint required for the `ON CONFLICT (credential_id)` clause in the INSERT statement.

### Database State Analysis

**Existing constraints:**
- Primary key on `id`
- Foreign key on `credential_id` → `project_credentials(id)`
- Unique constraint on `vault_id` (not credential_id)

**Missing constraint:**
- `UNIQUE(credential_id)` - required for conflict resolution during migration

## Solution

Created a corrected migration script: `wallet-system-database-migration-2025-08-18-fixed.sql`

### Key Improvements

1. **Conditional Constraint Creation:**
   ```sql
   DO $$
   BEGIN
       IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE table_name = 'credential_vault_storage' 
           AND constraint_type = 'UNIQUE'
           AND constraint_name LIKE '%credential_id%'
       ) THEN
           ALTER TABLE credential_vault_storage 
           ADD CONSTRAINT credential_vault_storage_credential_id_key UNIQUE (credential_id);
       END IF;
   END $$;
   ```

2. **Safer Migration Logic:**
   - Added `EXISTS` checks to prevent duplicate insertions
   - Improved error handling with explicit constraint verification

3. **Better Debugging:**
   - Added status queries to show migration progress
   - Included summary reports for verification

## Files

- **Fixed Migration:** `/scripts/wallet-system-database-migration-2025-08-18-fixed.sql`
- **Original (Failed):** `/documents/wallet-system-database-migration-2025-08-18.sql`

## Lessons Learned

1. **Always verify constraints exist** before using `ON CONFLICT` clauses
2. **Query the database schema** before writing migration scripts
3. **Use conditional DDL** when working with existing tables
4. **Include verification queries** in migration scripts for debugging

## Usage

Run the fixed migration script to:
1. Add the missing unique constraint
2. Migrate wallet private keys to vault storage
3. Update vault storage flags
4. Create monitoring views

The script is safe to run multiple times and includes proper error handling.
