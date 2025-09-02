# Activity Monitoring System V2 - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the enhanced activity monitoring system V2, which replaces the inefficient trigger-based approach with a high-performance, asynchronous service architecture.

## Quick Start

### 1. Install Dependencies

First, ensure you have the required dependencies:

```bash
# Required for virtual scrolling in UI components
npm install @tanstack/react-virtual

# Required for charting in dashboard
npm install recharts

# Required for testing (if not already installed)
npm install -D vitest @types/uuid
```

### 2. Apply Database Optimizations

Run the database optimization script to improve performance:

```sql
-- Run this in your Supabase SQL editor or psql
-- File: scripts/activity-db-optimization.sql

-- This will:
-- - Add optimized indexes
-- - Create materialized views for analytics
-- - Set up database functions for efficient queries
\i scripts/activity-db-optimization.sql
```

### 3. Initialize the New Service

```typescript
import { enhancedActivityService } from '@/services/activity-v2';

// The service automatically starts when imported
// No additional initialization required
```

### 4. Start Using Enhanced Logging

```typescript
import { logUserAction, logSystemEvent } from '@/services/activity-v2';

// Replace old logging calls with new service
await logUserAction('user_login', {
  entityType: 'user',
  entityId: user.id,
  details: 'User logged in successfully'
});
```

## Detailed Implementation Steps

### Phase 1: Service Deployment (Week 1)

#### Step 1.1: Deploy Core Service

1. **Copy the V2 services** to your project:
   - `src/services/activity-v2/EnhancedActivityService.ts`
   - `src/services/activity-v2/ActivityServiceIntegration.ts`
   - `src/services/activity-v2/index.ts`

2. **Update your imports** in key files:

```typescript
// In your main app initialization (App.tsx or main.tsx)
import { enhancedActivityService } from '@/services/activity-v2';

// Service starts automatically on import
console.log('Enhanced Activity Service initialized');
```

#### Step 1.2: Update Type Definitions

Ensure your activity types are compatible:

```typescript
// In @/types/domain/activity/ActivityTypes.ts
export enum ActivitySource {
  USER = 'user',
  SYSTEM = 'system',
  INTEGRATION = 'integration',
  DATABASE = 'database',
  SCHEDULED = 'scheduled'
}

export enum ActivityStatus {
  SUCCESS = 'success',
  FAILURE = 'failure', 
  PENDING = 'pending',
  CANCELED = 'canceled'
}

export enum ActivitySeverity {
  INFO = 'info',
  NOTICE = 'notice',
  WARNING = 'warning',
  CRITICAL = 'critical'
}
```

#### Step 1.3: Test Basic Functionality

```typescript
// Test the service with a simple activity
import { enhancedActivityService, ActivitySource } from '@/services/activity-v2';

const testActivity = {
  source: ActivitySource.SYSTEM,
  action: 'service_initialization_test',
  entityType: 'system',
  entityId: 'initialization',
  details: 'Testing enhanced activity service initialization'
};

await enhancedActivityService.logActivity(testActivity);
console.log('Activity service test completed');
```

### Phase 2: UI Component Updates (Week 1-2)

#### Step 2.1: Deploy Enhanced UI Components

1. **Copy the V2 components**:
   - `src/components/activity-v2/EnhancedActivityMonitor.tsx`
   - `src/components/activity-v2/EnhancedActivityDetails.tsx`
   - `src/components/activity-v2/EnhancedActivityDashboard.tsx`

2. **Update existing component imports**:

```typescript
// Replace old ActivityMonitor imports
// Old:
import ActivityMonitor from '@/components/activity/ActivityMonitor';

// New:
import { EnhancedActivityMonitor } from '@/components/activity-v2';
```

#### Step 2.2: Update Component Usage

```typescript
// In your dashboard or monitoring pages
import { EnhancedActivityMonitor, EnhancedActivityDashboard } from '@/components/activity-v2';

export const DashboardPage = () => {
  return (
    <div>
      {/* Real-time dashboard */}
      <EnhancedActivityDashboard />
      
      {/* Activity monitor with enhanced performance */}
      <EnhancedActivityMonitor 
        height={600}
        refreshInterval={30000}
        showHeader={true}
      />
    </div>
  );
};
```

### Phase 3: Service Integration (Week 2-3)

#### Step 3.1: Update Existing Service Calls

Use the integration helper to update your existing services:

```typescript
// Before (old audit service)
import { auditService } from '@/services/audit/auditLogService';
await auditService.createLog('USER_LOGIN', userId, 'user', user);

// After (new activity service)
import { logUserAction } from '@/services/activity-v2';
await logUserAction('user_login', {
  entityType: 'user',
  entityId: userId,
  details: 'User logged in successfully'
});
```

#### Step 3.2: Wrap Operations with Activity Logging

```typescript
import { ActivityServiceIntegration } from '@/services/activity-v2';

class UserService {
  private activityIntegration = new ActivityServiceIntegration();

  async createUser(userData: CreateUserData) {
    return await this.activityIntegration.withActivityLogging(
      'create_user',
      async () => {
        // Your existing user creation logic
        const user = await this.database.users.create(userData);
        return user;
      },
      {
        entityType: 'user',
        entityId: userData.email,
        metadata: { 
          userType: userData.type,
          source: 'registration_form'
        }
      }
    );
  }
}
```

#### Step 3.3: Use Convenience Functions

```typescript
import { 
  withDatabaseLogging,
  withApiLogging,
  withBatchLogging 
} from '@/services/activity-v2';

// Database operations
const result = await withDatabaseLogging(
  'insert',
  'users',
  user.id,
  () => database.users.insert(user)
);

// API calls
const apiResult = await withApiLogging(
  '/api/external/users',
  'POST',
  () => fetch('/api/external/users', { method: 'POST', body: JSON.stringify(userData) })
);

// Batch operations
const batchResult = await withBatchLogging(
  'user_import',
  users.length,
  () => importUsers(users)
);
```

### Phase 4: Migration from Triggers (Week 3-4)

#### Step 4.1: Prepare for Migration

```typescript
import { 
  activityMigration,
  startActivityMigration,
  getMigrationStatus 
} from '@/services/activity-v2';

// Check current migration status
const status = getMigrationStatus();
console.log(`Migration status: ${status.phase} - ${status.progress}%`);
```

#### Step 4.2: Run Migration

```typescript
// Start the migration process
const migrationSuccess = await startActivityMigration();

if (migrationSuccess) {
  console.log('Migration completed successfully');
} else {
  console.error('Migration failed');
  const status = getMigrationStatus();
  console.error('Errors:', status.errors);
}
```

#### Step 4.3: Monitor Migration Progress

```typescript
// Check migration status periodically
const checkMigration = setInterval(() => {
  const status = getMigrationStatus();
  console.log(`${status.phase}: ${status.progress}%`);
  
  if (status.progress === 100 || status.success === false) {
    clearInterval(checkMigration);
    console.log('Migration completed');
  }
}, 5000);
```

### Phase 5: Validation and Testing (Week 4)

#### Step 5.1: Run Test Suite

```bash
# Run the comprehensive test suite
npm run test src/services/activity-v2/__tests__/
```

#### Step 5.2: Performance Validation

```typescript
// Performance test - log 1000 activities
const activities = Array.from({ length: 1000 }, (_, i) => ({
  source: ActivitySource.SYSTEM,
  action: 'performance_test',
  entityType: 'test',
  entityId: `test-${i}`,
  details: `Performance test ${i}`
}));

const startTime = Date.now();
await enhancedActivityService.logActivities(activities);
const duration = Date.now() - startTime;

console.log(`Logged 1000 activities in ${duration}ms`);
// Should be under 100ms (non-blocking)
```

#### Step 5.3: Data Integrity Check

```typescript
// Verify that activities are being logged correctly
const recentActivities = await enhancedActivityService.getActivities({
  startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
  limit: 100
});

console.log(`Found ${recentActivities.totalCount} activities in the last hour`);
console.log('Sample activity:', recentActivities.activities[0]);
```

## Configuration Options

### Service Configuration

```typescript
// In your service initialization
const customService = new EnhancedActivityService();

// Configure batch processing
customService['batchConfig'] = {
  maxBatchSize: 1000,      // Increase for higher throughput
  batchTimeout: 10000,     // 10 seconds
  maxRetries: 5,
  retryDelay: 2000
};
```

### Component Configuration

```typescript
// Enhanced Activity Monitor options
<EnhancedActivityMonitor
  projectId="your-project-id"          // Filter by project
  height={800}                         // Custom height
  refreshInterval={15000}              // 15 second refresh
  showHeader={false}                   // Hide header
  compactMode={true}                   // Compact display
/>

// Enhanced Activity Dashboard options
<EnhancedActivityDashboard />
```

### Database Configuration

```sql
-- Adjust materialized view refresh frequency
-- Run this to refresh views every 5 minutes
SELECT cron.schedule('refresh-activity-metrics', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY activity_metrics_daily;');
```

## Performance Monitoring

### Service Metrics

```typescript
// Monitor service performance
import { enhancedActivityService } from '@/services/activity-v2';

// Check queue size
const queueSize = enhancedActivityService['queue'].size();
console.log(`Current queue size: ${queueSize}`);

// Check cache performance
const cacheSize = enhancedActivityService['cache'].size;
console.log(`Cache entries: ${cacheSize}`);
```

### Database Performance

```sql
-- Monitor query performance
SELECT * FROM activity_query_performance;

-- Monitor index usage
SELECT * FROM activity_index_usage ORDER BY idx_scan DESC;

-- Check materialized view freshness
SELECT 
  schemaname,
  matviewname,
  matviewowner,
  ispopulated,
  definition
FROM pg_matviews 
WHERE matviewname LIKE 'activity_%';
```

## Troubleshooting

### Common Issues

#### Issue 1: High Queue Size

```typescript
// If queue size grows too large
if (enhancedActivityService['queue'].size() > 5000) {
  console.warn('Queue size is high, activities may be delayed');
  
  // Force immediate processing
  await enhancedActivityService['processBatch']();
}
```

#### Issue 2: Database Connection Issues

```typescript
// Handle database connection errors
try {
  await enhancedActivityService.logActivity(activity);
} catch (error) {
  console.error('Activity logging failed:', error);
  // Implement fallback logging if needed
}
```

#### Issue 3: Migration Issues

```typescript
// If migration fails
const status = getMigrationStatus();
if (status.errors.length > 0) {
  console.error('Migration errors:', status.errors);
  
  // Abort migration if needed
  abortActivityMigration();
}
```

### Performance Optimization

#### Batch Size Tuning

```typescript
// Adjust batch size based on your workload
if (averageActivityVolume > 10000) {
  // High volume: larger batches, less frequent processing
  enhancedActivityService['batchConfig'].maxBatchSize = 1000;
  enhancedActivityService['batchConfig'].batchTimeout = 2000;
} else {
  // Low volume: smaller batches, more frequent processing
  enhancedActivityService['batchConfig'].maxBatchSize = 100;
  enhancedActivityService['batchConfig'].batchTimeout = 5000;
}
```

#### Cache Optimization

```typescript
// Adjust cache timeout based on your needs
enhancedActivityService['cacheTimeout'] = 10 * 60 * 1000; // 10 minutes

// Clear cache manually if needed
enhancedActivityService['cache'].clear();
```

## Migration Checklist

### Pre-Migration

- [ ] Database optimizations applied
- [ ] New service deployed and tested
- [ ] UI components updated
- [ ] Integration points identified
- [ ] Backup strategy in place

### During Migration

- [ ] Monitor migration progress
- [ ] Watch for errors in logs
- [ ] Verify data integrity
- [ ] Check system performance
- [ ] Have rollback plan ready

### Post-Migration

- [ ] Validate all triggers removed
- [ ] Confirm performance improvements
- [ ] Test all activity logging features
- [ ] Update monitoring dashboards
- [ ] Document changes for team

## Next Steps

1. **Review Implementation**: Go through each phase carefully
2. **Test in Development**: Thoroughly test in a development environment
3. **Gradual Rollout**: Deploy to staging, then production
4. **Monitor Performance**: Watch metrics closely after deployment
5. **Iterate and Improve**: Gather feedback and optimize further

## Support

For issues or questions during implementation:

1. Check the test suite for examples
2. Review the performance monitoring sections
3. Use the troubleshooting guide
4. Monitor system logs for detailed error information

The enhanced activity monitoring system provides significant performance improvements while maintaining full functionality. Following this guide ensures a smooth transition from the old trigger-based system to the new high-performance architecture.
