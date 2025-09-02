# ERC-1400 Token Test Utility Guide

## Overview

This guide explains how to test the complete ERC-1400 token functionality using the Token Test Utility, including validation that all related database tables are properly populated.

## ERC-1400 Database Tables

The ERC-1400 implementation includes **10 database tables**:

### Core Tables (✅ Working)
- `token_erc1400_properties` - Main token properties
- `token_erc1400_partitions` - Token partitions/tranches
- `token_erc1400_controllers` - Access controllers
- `token_erc1400_documents` - Legal documents

### Additional Tables (🔧 Recently Fixed)
- `token_erc1400_corporate_actions` - Corporate events
- `token_erc1400_custody_providers` - Custodian management
- `token_erc1400_regulatory_filings` - Compliance filings
- `token_erc1400_partition_balances` - Partition balance tracking
- `token_erc1400_partition_operators` - Partition operators
- `token_erc1400_partition_transfers` - Transfer history

## Test Data Examples

### 1. Comprehensive Example
Use `erc1400ComprehensiveExample` from `erc1400-test-examples.ts` for full functionality testing:

```typescript
import { erc1400ComprehensiveExample } from './erc1400-test-examples';

// This example includes:
// - 3 partitions (Senior, Mezzanine, Equity tranches)
// - 3 controllers with different roles
// - 4 legal documents
// - 3 corporate actions (dividend, capital call, redemption)
// - 3 custody providers
// - 4 regulatory filings
// - 6 partition balances across different investors
// - 4 partition operators with delegated permissions
// - 4 partition transfers showing transaction history
```

### 2. Minimal Example
Use `erc1400MinimalExample` for basic functionality testing:

```typescript
import { erc1400MinimalExample } from './erc1400-test-examples';

// Minimal setup with:
// - 1 partition
// - 1 controller
// - 1 document
```

## Testing Instructions

### Step 1: Create Token
1. Navigate to Token Test Utility
2. Select **Create Token** operation
3. Select **ERC-1400** standard
4. Select **Advanced** configuration mode
5. Load the comprehensive example JSON
6. Click **Create**

Expected result: Token created with all 10 tables populated

### Step 2: Verify Database Population
Run these SQL queries to verify all tables are populated:

```sql
-- Check main properties
SELECT COUNT(*) FROM token_erc1400_properties WHERE token_id = 'YOUR_TOKEN_ID';

-- Check partitions
SELECT COUNT(*) FROM token_erc1400_partitions WHERE token_id = 'YOUR_TOKEN_ID';

-- Check controllers  
SELECT COUNT(*) FROM token_erc1400_controllers WHERE token_id = 'YOUR_TOKEN_ID';

-- Check documents
SELECT COUNT(*) FROM token_erc1400_documents WHERE token_id = 'YOUR_TOKEN_ID';

-- Check corporate actions
SELECT COUNT(*) FROM token_erc1400_corporate_actions WHERE token_id = 'YOUR_TOKEN_ID';

-- Check custody providers
SELECT COUNT(*) FROM token_erc1400_custody_providers WHERE token_id = 'YOUR_TOKEN_ID';

-- Check regulatory filings
SELECT COUNT(*) FROM token_erc1400_regulatory_filings WHERE token_id = 'YOUR_TOKEN_ID';

-- Check partition balances
SELECT COUNT(*) FROM token_erc1400_partition_balances 
WHERE partition_id IN (
  SELECT id FROM token_erc1400_partitions WHERE token_id = 'YOUR_TOKEN_ID'
);

-- Check partition operators
SELECT COUNT(*) FROM token_erc1400_partition_operators 
WHERE partition_id IN (
  SELECT id FROM token_erc1400_partitions WHERE token_id = 'YOUR_TOKEN_ID'
);

-- Check partition transfers
SELECT COUNT(*) FROM token_erc1400_partition_transfers 
WHERE partition_id IN (
  SELECT id FROM token_erc1400_partitions WHERE token_id = 'YOUR_TOKEN_ID'
);
```

### Step 3: Test Read Operation
1. Select **Read Token** operation
2. Select the created token ID
3. Click **Read**

Expected result: Complete token data including all related tables

### Step 4: Test Update Operation
1. Select **Update Token** operation
2. Select the token ID
3. Modify the JSON (e.g., add new partition, document, or corporate action)
4. Click **Update**

Expected result: Token updated with new related records created

### Step 5: Test Delete Operation
1. Select **Delete Token** operation
2. Select the token ID
3. Click **Delete**

Expected result: Token and all related records deleted (cascade delete)

## Expected Record Counts

For the **comprehensive example**, expect these record counts:

| Table | Expected Count |
|-------|----------------|
| token_erc1400_properties | 1 |
| token_erc1400_partitions | 3 |
| token_erc1400_controllers | 3 |
| token_erc1400_documents | 4 |
| token_erc1400_corporate_actions | 3 |
| token_erc1400_custody_providers | 3 |
| token_erc1400_regulatory_filings | 4 |
| token_erc1400_partition_balances | 6 |
| token_erc1400_partition_operators | 4 |
| token_erc1400_partition_transfers | 4 |

## JSON Structure Requirements

### Minimum Required Structure
```json
{
  "name": "Token Name",
  "symbol": "SYMBOL",
  "standard": "ERC-1400",
  "securityType": "equity|debt|preferred|bond|option",
  "isIssuable": true,
  "standardArrays": {
    "partitions": [
      {
        "name": "Partition Name",
        "partitionId": "PARTITION-ID",
        "amount": "1000000",
        "transferable": true
      }
    ],
    "controllers": ["0x1234..."],
    "documents": [
      {
        "name": "Document Name",
        "documentUri": "https://...",
        "documentType": "legal-agreement"
      }
    ]
  }
}
```

### Full Structure for Complete Testing
See `erc1400ComprehensiveExample` in `erc1400-test-examples.ts` for the complete structure that tests all database tables.

## Troubleshooting

### Issue: Some tables not populated
**Cause**: Missing or incorrectly structured `standardArrays` object
**Solution**: Ensure all array data is under `standardArrays` key

### Issue: Partition-related tables empty
**Cause**: Partitions not created first
**Solution**: Ensure partitions are created in main properties before related partition data

### Issue: Foreign key violations
**Cause**: References to non-existent partitions
**Solution**: Ensure `partitionId` values in balances/operators/transfers match existing partition IDs

## Validation Functions

Use the provided validation function:

```typescript
import { validateERC1400TestData } from './erc1400-test-examples';

const validation = validateERC1400TestData(yourTokenData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

## Performance Notes

- Creating comprehensive tokens with all related data may take 10-15 seconds
- Large partition balance/transfer arrays may affect performance
- Consider using minimal example for quick testing

## Advanced Testing

### Custom Test Data Generation
```typescript
import { erc1400TestUtils } from './erc1400-test-examples';

// Generate custom test data
const customToken = {
  name: "Custom Test Token",
  symbol: "CTT",
  standard: "ERC-1400",
  securityType: "equity",
  isIssuable: true,
  standardArrays: {
    partitions: erc1400TestUtils.generateTestPartitions(5),
    controllers: erc1400TestUtils.generateTestControllers(3),
    documents: erc1400TestUtils.generateTestDocuments(3)
  }
};
```

This guide ensures comprehensive testing of all ERC-1400 functionality and database table population.
