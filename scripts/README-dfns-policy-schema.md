# DFNS Policy Engine Schema Migration

## Overview

This directory contains SQL scripts for implementing the enhanced DFNS Policy Engine database schema. The enhanced schema supports the full DFNS Policy Engine API functionality including rules, actions, approval workflows, and policy evaluations.

## Files

### `dfns-policy-engine-schema.sql` (Original)
- Complete CREATE statements for all tables
- Suitable for fresh database installations
- Contains IF NOT EXISTS checks

### `dfns-policy-engine-alter-schema.sql` (ALTER Version)
- ALTER statements for existing tables (`dfns_policies`, `dfns_policy_approvals`)
- CREATE statements only for new tables that don't exist yet
- Safe to run on existing databases with DFNS policy tables

## Schema Changes

### Enhanced `dfns_policies` Table

**New columns added:**
- `rule_kind` - Type of policy rule (AlwaysTrigger, TransactionAmountLimit, etc.)
- `rule_configuration` - JSONB configuration for the rule
- `action_kind` - Type of action (Block, RequestApproval, NoAction)
- `action_configuration` - JSONB configuration for the action
- `filters` - JSONB filters for policy application
- `metadata` - Additional JSONB metadata

**Modified columns:**
- `rule` → `rule_legacy` (renamed to preserve existing data)
- Enhanced constraints for `status` and `activity_kind`

### Enhanced `dfns_policy_approvals` Table

**New columns added:**
- `dfns_policy_id` - Reference to DFNS policy ID
- `initiator_id` - User who initiated the action requiring approval
- `expiration_date` - When the approval expires
- `activity_details` - Full activity details as JSONB
- `evaluated_policies` - Policies that were evaluated for this approval

**Updated constraints:**
- Enhanced `status` constraint to include all DFNS approval statuses

### New Tables Created

1. **`dfns_policy_approval_groups`**
   - Manages approval groups for RequestApproval actions
   - Supports quorum-based approval requirements

2. **`dfns_policy_evaluations`**
   - Historical record of policy evaluations
   - Tracks when policies trigger or are skipped

3. **`dfns_policy_approval_decisions`**
   - Individual approval/denial decisions by users
   - Links to the main approval record

4. **`dfns_policy_change_requests`**
   - Policy modification requests requiring approval
   - Supports policy governance workflows

## Migration Instructions

### For Existing Databases (Recommended)

1. Use `dfns-policy-engine-alter-schema.sql`
2. This will safely add new columns and tables without affecting existing data
3. Existing `rule` column is renamed to `rule_legacy` to preserve data

```sql
-- Run the ALTER version
\i scripts/dfns-policy-engine-alter-schema.sql
```

### For Fresh Installations

1. Use `dfns-policy-engine-schema.sql`
2. This creates all tables from scratch

```sql
-- Run the CREATE version
\i scripts/dfns-policy-engine-schema.sql
```

## Data Migration Notes

### Rule Data Migration

If you have existing data in the `rule` column (now `rule_legacy`), you may need to migrate it to the new structure:

```sql
-- Example: Migrate existing rule data to new format
UPDATE dfns_policies 
SET 
    rule_kind = 'AlwaysTrigger',
    action_kind = 'RequestApproval'
WHERE rule_legacy IS NOT NULL;
```

### Policy Approval Data

Existing approval records will continue to work. New fields are nullable and can be populated as needed.

## API Alignment

The enhanced schema aligns with the DFNS Policy Engine API v1:

- **Policy Rules**: Supports all rule types (TransactionAmountLimit, etc.)
- **Policy Actions**: Supports Block, RequestApproval, NoAction
- **Approval Workflows**: Full approval group and decision tracking
- **Policy Evaluations**: Complete audit trail of policy evaluations
- **Change Management**: Policy modification approval workflows

## Indexes and Performance

The schema includes comprehensive indexes for:
- Policy lookups by DFNS ID
- Status-based filtering
- Activity-based queries
- User-based approval queries
- Timestamp-based historical queries

## Next Steps

After applying the schema:

1. Update DFNS service classes to use new schema structure
2. Migrate existing rule data if needed
3. Test policy creation and approval workflows
4. Update dashboard components to use enhanced data structure

## Rollback

If needed, you can rollback by:
1. Dropping the new columns (data will be lost)
2. Renaming `rule_legacy` back to `rule`
3. Dropping the new tables

**Note**: Always backup your database before running migration scripts.
