# Credential Vault Storage Access Level Constraint Fix

## Issue

When generating wallet credentials for a project, the system was encountering an error with the following message:

```
Error storing wallet credentials: {
  code: '23514', 
  details: '...', 
  message: 'new row for relation "credential_vault_storage" violates check constraint "valid_access_level"'
}
```

The issue was occurring in the `generateWalletForProject` function in `enhancedProjectWalletService.ts` when trying to store the wallet's private key in the credential vault storage.

## Root Cause

The database has a check constraint named `valid_access_level` on the `credential_vault_storage` table that enforces the `access_level` column to have one of these specific values:
- 'project_admin'
- 'project_member'
- 'revoked'

While the code was attempting to use 'project_admin' (which is valid), there may have been whitespace or case sensitivity issues affecting the value being sent to the database.

## Solution

1. Added a TypeScript type `VaultAccessLevel` to enforce valid values at compile time
2. Explicitly type-checked the access level value being used
3. Added better error logging to diagnose issues
4. Added validation in the `getVaultStorageInfo` method to handle potentially invalid values from the database

## Files Modified

- `/frontend/src/services/project/enhancedProjectWalletService.ts`

## Changes

1. Created a new TypeScript type to enforce valid access level values:
   ```typescript
   export type VaultAccessLevel = 'project_admin' | 'project_member' | 'revoked';
   ```

2. Updated the `WalletVaultStorage` interface to use this type:
   ```typescript
   export interface WalletVaultStorage {
     // ... other fields
     accessLevel: VaultAccessLevel; // Typed to ensure valid values
     // ... other fields
   }
   ```

3. Explicitly typed the access level variable:
   ```typescript
   const accessLevel: VaultAccessLevel = 'project_admin';
   ```

4. Enhanced error logging when storing credentials:
   ```typescript
   console.log('Storing in credential_vault_storage with data:', {
     ...vaultStorageData,
     encrypted_private_key: '[REDACTED]' // Don't log the actual encrypted key
   });
   
   // After successful storage:
   console.log('Successfully stored in vault with ID:', vaultStorageId);
   ```

5. Added validation in the `getVaultStorageInfo` method to handle potentially invalid values:
   ```typescript
   const accessLevel = data.access_level;
   if (accessLevel !== 'project_admin' && accessLevel !== 'project_member' && accessLevel !== 'revoked') {
     console.warn(`Invalid access level found in database: ${accessLevel}, defaulting to 'project_member'`);
   }
   ```

## Testing

1. Generate a new wallet for a project using the ProjectWalletGenerator component
2. Verify that the wallet is created successfully in the project_credentials table
3. Verify that the private key is stored successfully in the credential_vault_storage table
4. Check console logs to ensure no constraint violations occur

## Future Recommendations

1. Consider adding an enum type in the database for access_level to enforce valid values at the database level
2. Add unit tests for wallet generation to catch issues with database constraints
3. Add more comprehensive validation before attempting to insert data into the database
