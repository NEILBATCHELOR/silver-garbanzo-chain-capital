# REC-Incentive Synchronization Implementation

## Overview

This implementation provides automatic synchronization between Renewable Energy Credits (RECs) and Climate Incentives, ensuring data consistency and referential integrity across both tables.

## Problem Solved

**Challenge**: RECs are a specific type of climate incentive, requiring synchronized CRUD operations between the `renewable_energy_credits` and `climate_incentives` tables.

**Solution**: A 3-tier orchestration service that coordinates CRUD operations with automatic synchronization and transaction management.

## Architecture

### 1. Core Components

#### RECIncentiveOrchestrator
- **Location**: `services/business-logic/rec-incentive-orchestrator.ts`
- **Purpose**: Coordinates CRUD operations between RECs and incentives
- **Pattern**: Singleton orchestrator with transaction management

#### Enhanced Services
- **enhancedRECService**: Wrapper for REC operations with automatic incentive sync
- **enhancedIncentiveService**: Wrapper for incentive operations with optional REC linking

### 2. Data Flow

```
Create REC → Create REC Record → Create Incentive Record → Link Records → Commit
Update REC → Update REC Record → Update Incentive Record → Commit  
Delete REC → Delete Incentive Record → Delete REC Record → Commit
```

### 3. Database Schema Changes

```sql
-- New foreign key relationships
renewable_energy_credits.incentive_id → climate_incentives.incentive_id
renewable_energy_credits.project_id → projects.id
climate_incentives.project_id → projects.id

-- New indexes for performance
idx_renewable_energy_credits_incentive_id
idx_renewable_energy_credits_project_id  
idx_climate_incentives_project_id
idx_climate_incentives_type
```

## Usage Patterns

### 1. Creating a REC with Incentive

```typescript
import { enhancedRECService } from '@/components/climateReceivables/services';

// Automatically creates both REC and incentive records
const { rec, incentive } = await enhancedRECService.createWithIncentive({
  asset_id: 'asset-uuid',
  quantity: 1000,
  vintage_year: 2024,
  market_type: 'voluntary',
  price_per_rec: 25.50,
  total_value: 25500,
  certification: 'GREEN-E',
  status: 'active'
}, projectId);
```

### 2. Updating a REC (Auto-syncs Incentive)

```typescript
// Updates REC and automatically synchronizes incentive amount/status
const { rec, incentive } = await enhancedRECService.updateWithIncentive(recId, {
  quantity: 1200,
  price_per_rec: 26.00,
  status: 'retired'
});
```

### 3. Creating Incentive with REC Link

```typescript
import { enhancedIncentiveService } from '@/components/climateReceivables/services';

// Create incentive and link to existing REC
const { incentive, rec } = await enhancedIncentiveService.createWithRECLink({
  type: 'rec',
  amount: 25500,
  status: 'active',
  project_id: projectId
}, existingRECId);
```

### 4. Direct Orchestrator Usage

```typescript
import { RECIncentiveOrchestrator } from '@/components/climateReceivables/services';

const orchestrator = RECIncentiveOrchestrator.getInstance();

// Full control over synchronization process
const result = await orchestrator.createRECWithIncentive(recData, projectId);
if (result.success) {
  console.log(`Created REC ${result.recId} with incentive ${result.incentiveId}`);
}
```

## Data Mapping

### REC → Incentive Field Mapping

| REC Field | Incentive Field | Mapping Logic |
|-----------|----------------|---------------|
| `total_value` | `amount` | Direct mapping |
| `status` | `status` | Status conversion (see below) |
| `asset_id` | `asset_id` | Direct mapping |
| `receivable_id` | `receivable_id` | Direct mapping |
| `project_id` | `project_id` | Direct mapping |
| - | `type` | Always 'rec' |
| - | `expected_receipt_date` | Always null |

### Status Mapping

| REC Status | Incentive Status |
|------------|------------------|
| `pending` | `pending` |
| `active` | `active` |
| `retired` | `received` |
| `cancelled` | `cancelled` |
| `expired` | `cancelled` |

## Transaction Management

### Database Functions Required

Run this SQL script to set up transaction management:

```sql
-- Location: scripts/setup-rec-incentive-synchronization.sql
-- Provides transaction control functions for PostgreSQL/Supabase
CREATE OR REPLACE FUNCTION begin_transaction() RETURNS void AS $$...
CREATE OR REPLACE FUNCTION commit_transaction() RETURNS void AS $$...  
CREATE OR REPLACE FUNCTION rollback_transaction() RETURNS void AS $$...
```

### Error Handling

- **Transaction Rollback**: All operations are wrapped in transactions with automatic rollback on errors
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Error Propagation**: Detailed error messages with operation context

## Implementation Details

### 1. Singleton Pattern

```typescript
export class RECIncentiveOrchestrator {
  private static instance: RECIncentiveOrchestrator;
  
  public static getInstance(): RECIncentiveOrchestrator {
    if (!this.instance) {
      this.instance = new RECIncentiveOrchestrator();
    }
    return this.instance;
  }
}
```

### 2. Transaction Wrapper Pattern

```typescript
// Start transaction
const { error: transactionError } = await supabase.rpc('begin_transaction');

try {
  // Perform coordinated operations
  const rec = await recsService.create(recData);
  const incentive = await incentivesService.create(incentiveData);
  
  // Commit transaction
  const { error: commitError } = await supabase.rpc('commit_transaction');
  
} catch (error) {
  // Rollback on any error
  await supabase.rpc('rollback_transaction');
  throw error;
}
```

### 3. Service Composition

```typescript
// Enhanced services compose base services with orchestrator
export const enhancedRECService = {
  orchestrator: RECIncentiveOrchestrator.getInstance(),
  
  async createWithIncentive(rec, projectId) {
    const result = await this.orchestrator.createRECWithIncentive(rec, projectId);
    // Handle result...
  },
  
  // Delegate standard operations to base service
  async getAll(...args) {
    return await recsService.getAll(...args);
  }
};
```

## Performance Considerations

### 1. Database Indexes

- Added indexes on foreign key columns for faster joins
- Type-based filtering index on `climate_incentives.type`
- Project-based filtering indexes for multi-tenant support

### 2. Transaction Efficiency

- Minimal transaction scope (only CRUD operations)
- Early error detection to minimize rollback overhead
- Single database connection per orchestration operation

### 3. Service Layering

- **Base Services**: Direct database operations (existing)
- **Enhanced Services**: Add orchestration without breaking existing code
- **Orchestrator**: Centralized coordination logic

## Testing Strategy

### 1. Unit Tests

```typescript
describe('RECIncentiveOrchestrator', () => {
  it('should create REC with synchronized incentive', async () => {
    const result = await orchestrator.createRECWithIncentive(testREC, projectId);
    expect(result.success).toBe(true);
    expect(result.incentive.amount).toBe(testREC.total_value);
  });
});
```

### 2. Integration Tests

- Test transaction rollback scenarios
- Verify referential integrity constraints
- Test concurrent operation handling

### 3. End-to-End Tests

- Complete CRUD workflows
- Data consistency verification
- Error recovery testing

## Migration Notes

### Existing Code Compatibility

- All existing services remain unchanged
- New enhanced services are opt-in
- Gradual migration path available

### Database Migration

```sql
-- Run scripts/setup-rec-incentive-synchronization.sql
-- Adds foreign keys, indexes, and transaction functions
-- Safe to run on existing data
```

## Best Practices

### 1. Use Enhanced Services

```typescript
// ✅ Recommended: Use enhanced services for new code
import { enhancedRECService } from '@/services';

// ⚠️ Existing: Direct service usage (still works)
import { recsService } from '@/services';
```

### 2. Handle Async Operations

```typescript
// ✅ Proper error handling
try {
  const { rec, incentive } = await enhancedRECService.createWithIncentive(data, projectId);
} catch (error) {
  console.error('REC-Incentive sync failed:', error);
}
```

### 3. Transaction Boundaries

- Keep transactions focused on related operations
- Minimize transaction duration
- Handle rollback scenarios gracefully

## Future Enhancements

1. **Event-Driven Architecture**: Emit events for REC-incentive operations
2. **Batch Operations**: Support bulk REC-incentive synchronization
3. **Audit Logging**: Track all synchronization operations
4. **Real-time Notifications**: Alert on synchronization failures
5. **Performance Metrics**: Monitor operation success rates and timing

## Files Created/Modified

### New Files
- `services/business-logic/rec-incentive-orchestrator.ts` (502 lines)
- `services/enhanced-rec-incentive-service.ts` (167 lines)
- `scripts/setup-rec-incentive-synchronization.sql` (82 lines)

### Modified Files
- `services/index.ts` - Added exports for new services

### Database Changes
- Foreign key constraints
- Performance indexes  
- Transaction management functions
- Updated triggers

---

**Implementation Status**: ✅ Complete
**Ready for Integration**: ✅ Yes
**Database Migration Required**: ✅ Yes (run SQL script)
