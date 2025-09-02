# Wallet Generation Migration Fix

## Issue
The original migration script failed with error:
```
ERROR: 42703: column p.created_by does not exist
HINT: Perhaps you meant to reference the column "pc.created_by".
```

## Root Cause
The original RLS policy assumed the `projects` table had a `created_by` column, but after analyzing the database schema, the access control model is organization-based:

- Projects have an `organization_id` 
- Users have roles within organizations through `user_organization_roles`
- Project credentials have a `created_by` field pointing to the user who created them

## Solution
Created a corrected migration script (`wallet-generation-fixes-migration-corrected.sql`) with:

### 1. Fixed RLS Policies
- **Organization-based access**: Users can access vault storage for projects in their organization
- **Creator-based access**: Users can access vault storage for credentials they created

### 2. Enhanced Security Features
- `credential_vault_storage` table for encrypted private key storage
- Vault ID tracking with unique constraints
- Access level controls (project_admin, project_member, revoked)
- Encryption method tracking (AES-256-GCM, ChaCha20-Poly1305, AES-256-CBC)

### 3. Duplicate Prevention
- `check_duplicate_wallet()` function to prevent duplicate wallet generation
- Automatic cleanup of existing duplicates (keeps most recent, deactivates older ones)

### 4. Monitoring & Audit
- `vault_storage_status` view for monitoring vault storage status
- Automatic timestamp updates with triggers
- Comprehensive logging and comments

## Files Created
- `/fix/wallet-generation-fixes-migration-corrected.sql` - Corrected migration script

## Next Steps
1. Run the corrected migration script on Supabase
2. Test wallet generation with duplicate prevention
3. Verify vault storage functionality works correctly
4. Update frontend wallet generation components
5. Test the monitoring view for vault storage status

## Database Schema Understanding
```sql
-- Access Control Flow:
projects (organization_id) -> user_organization_roles (user_id, organization_id) -> users
project_credentials (created_by) -> users
credential_vault_storage -> project_credentials
```

## Testing Checklist
- [ ] Migration runs without errors
- [ ] RLS policies allow proper access
- [ ] Duplicate wallet prevention works
- [ ] Vault storage creation works
- [ ] Monitoring view returns correct data
- [ ] Automatic cleanup of duplicates completed
