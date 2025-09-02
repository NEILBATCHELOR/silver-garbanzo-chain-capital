# Comprehensive Audit Log Repopulation

## Overview

This system repopulates the `audit_logs` table from all existing data across your 202 database tables. It generates historical CREATE and UPDATE audit entries based on timestamps, providing a complete audit trail for your entire database.

## 🎯 Current Situation

- **Current audit_logs**: Only 7 rows
- **Total tables**: 202 tables with significant data
- **Top tables by volume**:
  - investors: 492 records
  - role_permissions: 307 records  
  - token_versions: 256 records
  - subscriptions: 144 records
  - permissions: 122 records
  - tokens: 64 records

## 🚀 Features

### Intelligent Categorization
The system automatically categorizes tables and generates appropriate audit entries:

- **User Management**: users, user_sessions, user_roles
- **Financial**: invoices, subscriptions, wallet_transactions, distributions
- **Blockchain**: tokens, guardian_wallets, multi_sig_wallets
- **Compliance**: investors, kyc_screening_logs, compliance_reports
- **Documents**: documents, document_versions, document_approvals
- **Policies**: rules, permissions, roles, policy_templates
- **Integrations**: dfns_*, moonpay_*, ramp_*, stripe_*

### Comprehensive Audit Trail
- **CREATE entries**: Generated for all records with `created_at` timestamps
- **UPDATE entries**: Generated where `updated_at` differs from `created_at`
- **Smart metadata**: Includes operation type, table info, migration flags
- **Enhanced Activity Service**: Uses v2 enums and structure

## 📋 Prerequisites

1. **Enhanced Activity Service v2** must be running
2. **Database functions** must be installed
3. **Node.js** with ES modules support

## 🛠️ Installation

### Step 1: Install Database Functions

```sql
-- Run this in your Supabase SQL editor
\i scripts/audit-repopulation/setup-functions.sql
```

### Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## 📊 Usage

### 1. Analyze Database (Recommended First Step)

```bash
node scripts/audit-repopulation/comprehensive-audit-repopulation.mjs --analyze
```

**Output:**
- Total tables and categorization
- Tables with timestamp columns
- Estimated audit entries to be generated
- Breakdown by activity category

### 2. Dry Run (Test Without Changes)

```bash
node scripts/audit-repopulation/comprehensive-audit-repopulation.mjs --dry-run
```

**What it does:**
- Processes all tables
- Generates audit entries in memory
- Shows exactly what would be inserted
- **No data is actually inserted**

### 3. Process Single Table (Testing)

```bash
node scripts/audit-repopulation/comprehensive-audit-repopulation.mjs --table investors --dry-run
```

**Use cases:**
- Test the process on high-value tables
- Debug issues with specific tables
- Process tables incrementally

### 4. Full Repopulation

```bash
node scripts/audit-repopulation/comprehensive-audit-repopulation.mjs
```

**⚠️ Warning:** This will generate thousands of audit entries. Run analysis and dry-run first!

## 📈 Expected Results

Based on your data analysis:

### Volume Estimates
- **Total records to process**: ~1,800+ across all tables
- **Estimated CREATE entries**: ~1,800+ (one per record with created_at)
- **Estimated UPDATE entries**: ~540+ (30% estimated update rate)
- **Total new audit entries**: ~2,340+

### Performance
- **Processing rate**: ~50-100 records/second
- **Batch size**: 100 audit entries per batch
- **Expected duration**: 2-5 minutes for full repopulation

### Database Impact
- **audit_logs table growth**: From 7 rows to ~2,347+ rows
- **Storage increase**: ~2-5 MB (depending on data complexity)
- **Index updates**: Automatic for timestamp, entity_type, project_id columns

## 🔧 Configuration Options

### Batch Processing
```javascript
const CONFIG = {
  batchSize: 100,              // Audit entries per batch
  maxConcurrentBatches: 5,     // Parallel processing limit
  dryRun: false,               // Set to true for testing
  targetTable: null,           // Process specific table only
  analyzeOnly: false           // Analysis mode only
};
```

### Command Line Options
- `--analyze`: Analysis mode only
- `--dry-run`: Test mode (no data insertion)
- `--table <name>`: Process single table
- No flags: Full repopulation

## 📊 Monitoring & Validation

### Real-time Progress
The script provides detailed output:
```
🔄 Processing table: investors
  📦 Found 492 records
  ✅ Inserted batch of 100 audit entries
  ✅ Inserted batch of 100 audit entries
  📊 Generated 492 CREATE + 147 UPDATE entries
```

### Final Statistics
```
🎉 REPOPULATION COMPLETE!
📊 FINAL STATISTICS:
  Tables processed: 50
  Total records processed: 1,847
  CREATE audit entries: 1,847
  UPDATE audit entries: 554
  Total audit entries: 2,401
  Errors: 0
  Duration: 45.23 seconds
  Processing rate: 40.84 records/second
```

### Validation Queries

```sql
-- Check audit entry distribution
SELECT 
    source,
    category,
    COUNT(*) as entries
FROM audit_logs 
WHERE metadata->>'migration' = 'historical_repopulation'
GROUP BY source, category
ORDER BY entries DESC;

-- Check timeline coverage
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as entries
FROM audit_logs
WHERE metadata->>'migration' = 'historical_repopulation'
GROUP BY DATE(timestamp)
ORDER BY date;

-- Verify specific table coverage
SELECT 
    entity_type,
    action,
    COUNT(*) as entries
FROM audit_logs
WHERE metadata->>'migration' = 'historical_repopulation'
AND entity_type = 'investors'
GROUP BY entity_type, action;
```

## 🛡️ Safety Features

### Data Integrity
- **No existing data modified**: Only inserts new audit entries
- **Unique IDs**: Each audit entry gets a unique UUID
- **Consistent timestamps**: Uses original created_at/updated_at values
- **Migration flags**: All entries marked with migration metadata

### Error Handling
- **Graceful failures**: Table errors don't stop overall process
- **Batch isolation**: Failed batches don't affect others
- **Comprehensive logging**: All errors reported with context
- **Rollback capability**: Migration entries can be identified and removed

### Rollback Process
If you need to remove the migrated entries:

```sql
-- Remove all migrated audit entries
DELETE FROM audit_logs 
WHERE metadata->>'migration' = 'historical_repopulation';

-- Verify removal
SELECT COUNT(*) FROM audit_logs;
```

## 🎯 Best Practices

### Before Running
1. **Backup your database** (especially audit_logs table)
2. **Run analysis** to understand scope
3. **Test with dry-run** to verify output
4. **Test single table** on important tables
5. **Monitor disk space** for large datasets

### During Execution
1. **Monitor progress** through console output
2. **Check for errors** in real-time
3. **Verify database connectivity** stays stable
4. **Don't interrupt** the process mid-stream

### After Completion
1. **Validate results** with provided queries
2. **Check Enhanced Activity Service** performance
3. **Update materialized views** if using activity analytics
4. **Document completion** in your deployment logs

## 🔍 Troubleshooting

### Common Issues

**Issue**: "Failed to fetch tables"
```bash
# Solution: Check Supabase connection
node -e "console.log('Testing connection...')"
```

**Issue**: "Permission denied on table"
```bash
# Solution: Verify service role key has proper permissions
# Check your Supabase service role configuration
```

**Issue**: "Out of memory" 
```bash
# Solution: Reduce batch size in CONFIG
# or process tables individually with --table flag
```

**Issue**: "Duplicate key errors"
```bash
# Solution: Check if migration was partially run
# Verify existing audit entries before re-running
```

### Performance Optimization

**For large datasets (10,000+ records):**
```bash
# Process in smaller batches
CONFIG.batchSize = 50

# Process high-volume tables individually
node scripts/audit-repopulation/comprehensive-audit-repopulation.mjs --table investors
node scripts/audit-repopulation/comprehensive-audit-repopulation.mjs --table role_permissions
```

**For monitoring during execution:**
```sql
-- Watch progress in real-time
SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE metadata->>'migration' = 'historical_repopulation') as migrated_entries,
    MAX(timestamp) as latest_entry
FROM audit_logs;
```

## 📚 Integration with Enhanced Activity Service

The repopulated audit entries are fully compatible with:

- **Activity Monitor components** (real-time viewing)
- **Activity Metrics dashboards** (analytics and trends)
- **Enhanced Activity Analytics** (system health scoring)
- **Activity filtering and search** (all UI components)

After repopulation, you'll have a complete historical audit trail that integrates seamlessly with your Enhanced Activity Monitoring System v2.

## 📋 Summary

This comprehensive audit repopulation system transforms your sparse 7-row audit_logs table into a complete historical audit trail with thousands of entries, providing:

✅ **Complete audit coverage** across all 202 tables  
✅ **Intelligent categorization** by activity type  
✅ **Seamless integration** with Enhanced Activity Service v2  
✅ **Safe, reversible process** with comprehensive validation  
✅ **Production-ready performance** with batch processing  

**The result**: A robust audit foundation supporting compliance, debugging, and system monitoring across your entire platform.