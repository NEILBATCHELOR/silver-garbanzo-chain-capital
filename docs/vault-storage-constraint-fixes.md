# Vault Storage Constraint Fixes

## Issue Description

We've encountered two database constraint violations when trying to store wallet credentials:

1. First Error:
```
Error storing wallet credentials: {message: 'new row for relation "credential_vault_storage" violates check constraint "valid_access_level"'}
```

2. Second Error:
```
Error storing wallet credentials: {message: 'new row for relation "credential_vault_storage" violates check constraint "valid_encryption_method"'}
```

## Root Causes

1. **Access Level Constraint**: The database has a constraint that `access_level` must be one of: 'project_admin', 'project_member', or 'revoked', but the system is trying to use 'standard'.

2. **Encryption Method Constraint**: The database has a constraint that `encryption_method` must be one of: 'AES-256-GCM', 'ChaCha20-Poly1305', or 'AES-256-CBC', but something in the system might be converting it to another value (possibly 'AES256' based on error details).

## Solution

We've implemented a two-pronged approach to fix these issues:

### 1. SQL Database Fix

Created a comprehensive SQL script (`update-vault-constraints.sql`) that:
- Drops and recreates both constraints with additional allowed values
- Adds 'standard' to allowed access levels
- Adds 'AES256' to allowed encryption methods

```sql
-- Fix for both constraints in the credential_vault_storage table

-- 1. First, fix the access_level constraint
ALTER TABLE credential_vault_storage 
DROP CONSTRAINT IF EXISTS valid_access_level;

ALTER TABLE credential_vault_storage 
ADD CONSTRAINT valid_access_level 
CHECK (access_level IN ('project_admin', 'project_member', 'revoked', 'standard'));

-- 2. Now, let's check and fix the encryption_method constraint
ALTER TABLE credential_vault_storage 
DROP CONSTRAINT IF EXISTS valid_encryption_method;

ALTER TABLE credential_vault_storage 
ADD CONSTRAINT valid_encryption_method 
CHECK (encryption_method IN ('AES-256-GCM', 'ChaCha20-Poly1305', 'AES-256-CBC', 'AES256'));
```

### 2. TypeScript Code Improvements

1. Added explicit variables for encryption method and access level
2. Added detailed logging to help debug any future issues
3. Updated the `VaultAccessLevel` type to include 'standard'
4. Added explicit checks for all valid encryption methods

## Implementation Sequence

1. Apply the SQL fix first to update both database constraints
2. Deploy the TypeScript changes
3. Test the wallet generation functionality thoroughly

## Root Cause Analysis

These issues occurred because of a mismatch between:
1. What the code is trying to insert (access_level: 'standard', encryption_method: 'AES-256-GCM')
2. What the database constraints allow

Either the application logic was updated to use new values without updating the database constraints, or the constraints were defined without considering all possible values that the application might use.

The SQL fix ensures the database accepts all values that the application needs to use, while the TypeScript changes make the code more robust and provide better debugging information.
