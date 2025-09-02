# Access Level Constraint Fix

## Issue Description

After our initial fix, we encountered another database constraint error when trying to store wallet credentials:

```
Error storing wallet credentials: {code: '23514', message: 'new row for relation "credential_vault_storage" violates check constraint "valid_access_level"'}
```

Looking more carefully at the error details:
```
Failing row contains (..., standard, f, ...)
```

We discovered that the system is attempting to use `standard` as the access level value, but the database constraint only allows 'project_admin', 'project_member', or 'revoked'.

## Two-part Solution

### 1. SQL Database Fix (Preferred)

We've created a SQL script (`update-access-level-constraint.sql`) that:
- Drops the existing constraint
- Adds it back with the additional allowed value 'standard'
- Optionally updates existing 'standard' values to 'project_admin'

```sql
-- Drop the existing constraint
ALTER TABLE credential_vault_storage 
DROP CONSTRAINT IF EXISTS valid_access_level;

-- Add the constraint back with the additional allowed value
ALTER TABLE credential_vault_storage 
ADD CONSTRAINT valid_access_level 
CHECK (access_level IN ('project_admin', 'project_member', 'revoked', 'standard'));
```

This is the preferred solution because it aligns the database with the actual usage pattern.

### 2. TypeScript Code Fix (Alternative)

We've also updated the `enhancedProjectWalletService.ts` file to:
- Add 'standard' to the `VaultAccessLevel` type
- Change the hardcoded access level from 'project_admin' to 'standard'
- Update the validation logic to include 'standard' as a valid value

This code change ensures that even if the SQL fix isn't applied, the frontend will use a value that's expected by the system.

## Why Both Fixes Are Needed

1. **SQL Fix**: This is the proper long-term solution that ensures database integrity by aligning constraints with actual usage.

2. **TypeScript Fix**: This provides immediate relief by ensuring the frontend sends the expected value, but doesn't address the underlying database constraint issue.

## Implementation Sequence

1. Apply the SQL fix to update the database constraint.
2. If the SQL fix cannot be applied immediately, deploy the TypeScript changes as a temporary workaround.

## Root Cause Analysis

It appears that 'standard' is being used as an access level value in the system, possibly by other parts of the application or through default values. This value wasn't included in the original constraint definition, causing inserts to fail.
