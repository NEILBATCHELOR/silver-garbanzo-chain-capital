# Duplicate Credential Vault Storage Fix

## Issue Description

After fixing the database constraints for `access_level` and `encryption_method`, we encountered a new error:

```
Error: Key (credential_id)=(9c374d77-9c84-478d-b6e1-7b027d40752a) already exists.
duplicate key value violates unique constraint "credential_vault_storage_credential_id_key"
```

This indicates that when we try to store the wallet credentials in the vault storage, there's already a record with the same credential_id, which violates the unique constraint.

## Root Cause

This issue occurs when:

1. A previous attempt to create a wallet partially succeeded
2. The record was created in `project_credentials` successfully
3. But the vault storage step failed due to our previous constraint issues with `access_level` or `encryption_method`
4. When we try again with the fixed constraints, it tries to create a new vault storage record with the same credential_id

Since the `credential_id` column has a unique constraint, this results in a duplicate key error.

## Solution

We've modified the `enhancedProjectWalletService.ts` file to implement an "upsert" pattern for vault storage:

1. **Check for Existing Record**: Before inserting, check if a record already exists for the credential_id
2. **Update if Exists**: If a record exists, update it instead of trying to insert a new one
3. **Insert if New**: Only insert a new record if no existing record is found
4. **Improved Error Handling**: Better logging and more resilient error recovery

### Code Changes

```typescript
// First check if a vault storage record already exists for this credential
const { data: existingRecord, error: checkError } = await supabase
  .from('credential_vault_storage')
  .select('id')
  .eq('credential_id', credentialData.id)
  .maybeSingle(); // Use maybeSingle instead of single to avoid errors

// If a record already exists, update it instead of inserting
if (existingRecord) {
  console.log('Updating existing vault storage record');
  const { data, error } = await supabase
    .from('credential_vault_storage')
    .update(vaultStorageData)
    .eq('id', existingRecord.id)
    .select()
    .single();
    
  vaultData = data;
  vaultError = error;
} else {
  // No existing record, do a normal insert
  console.log('Creating new vault storage record');
  const { data, error } = await supabase
    .from('credential_vault_storage')
    .insert(vaultStorageData)
    .select()
    .single();
    
  vaultData = data;
  vaultError = error;
}
```

## Why This Works

By checking for an existing record first and choosing to either update or insert based on what we find, we avoid the duplicate key error. This approach is commonly known as an "upsert" pattern (update or insert).

This solution:
1. Is resilient to retries and partial failures
2. Works with the existing database schema without requiring changes
3. Preserves the uniqueness constraint which is important for data integrity
4. Provides better error reporting and debugging information

## Additional Improvements

1. Added detailed logging to track what's happening
2. Improved error handling to continue even if the check for existing records fails
3. Better validation and reporting if something unexpected happens
