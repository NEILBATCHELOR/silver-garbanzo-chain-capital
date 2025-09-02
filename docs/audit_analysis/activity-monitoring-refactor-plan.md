# Activity Monitoring System Refactor Plan

## Executive Summary

The current activity monitoring implementation uses 100+ database triggers and real-time processing that severely degrades performance. This plan outlines a comprehensive refactor to eliminate performance bottlenecks while maintaining full audit capabilities.

## Current Issues Analysis

### Performance Problems
- **Database Triggers**: 100+ triggers executing on every INSERT/UPDATE/DELETE operation
- **Synchronous Logging**: All activity logging blocks user operations
- **Complex Queries**: Real-time analytics with expensive aggregations
- **No Caching**: Direct database calls without any caching layer
- **Inefficient Schema**: 33-column audit_logs table with complex JSONB fields
- **Resource Consumption**: High I/O, memory usage, and CPU utilization

### Architecture Issues
- **Tight Coupling**: Activity logging tightly coupled to business logic
- **Single Point of Failure**: All logs go to one audit_logs table
- **No Batching**: No queuing or batching for high-volume operations
- **Poor Scalability**: Performance degrades as activity volume increases

## Refactor Strategy Overview

### Phase 1: Infrastructure Foundation (Week 1-2)
1. **Asynchronous Logging Service**
2. **Event Queue Implementation**
3. **Optimized Database Schema**
4. **Performance Monitoring**

### Phase 2: Core Service Replacement (Week 3-4)
1. **Activity Service Layer**
2. **Caching Implementation**
3. **Batch Processing**
4. **Trigger Elimination**

### Phase 3: Enhanced Features (Week 5-6)
1. **Real-time Monitoring**
2. **Advanced Analytics**
3. **Enhanced UI Components**
4. **Testing & Validation**

## Technical Implementation Plan

### 1. Asynchronous Activity Logging Service

#### New Service Architecture
```typescript
// Enhanced Activity Service with Queue
export class ActivityService {
  private eventQueue: ActivityQueue;
  private batchProcessor: BatchProcessor;
  private cache: ActivityCache;
  
  // Non-blocking activity logging
  async logActivity(activity: ActivityEvent): Promise<void> {
    // Add to queue for async processing
    await this.eventQueue.enqueue(activity);
  }
  
  // Batch processing for high-volume logs
  async processBatch(activities: ActivityEvent[]): Promise<void> {
    // Process in batches of 100-500 records
    await this.batchProcessor.processBatch(activities);
  }
}
```

#### Event Queue Implementation
```typescript
// Redis-based event queue for scalability
export class ActivityQueue {
  private redis: Redis;
  
  async enqueue(activity: ActivityEvent): Promise<void> {
    await this.redis.lpush('activity_queue', JSON.stringify(activity));
  }
  
  async dequeue(batchSize: number = 100): Promise<ActivityEvent[]> {
    const items = await this.redis.lrange('activity_queue', 0, batchSize - 1);
    await this.redis.ltrim('activity_queue', batchSize, -1);
    return items.map(item => JSON.parse(item));
  }
}
```

### 2. Optimized Database Schema

#### Partitioned Activity Tables
```sql
-- Main activity table (hot data - last 30 days)
CREATE TABLE activity_logs_current (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    source activity_source NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    user_id UUID,
    status activity_status DEFAULT 'success',
    metadata JSONB,
    INDEX idx_activity_timestamp (timestamp),
    INDEX idx_activity_source_action (source, action),
    INDEX idx_activity_entity (entity_type, entity_id),
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_status (status)
) PARTITION BY RANGE (timestamp);

-- Archive table (cold data - older than 30 days)
CREATE TABLE activity_logs_archive (
    LIKE activity_logs_current INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Materialized views for analytics
CREATE MATERIALIZED VIEW activity_metrics_daily AS
SELECT 
    date_trunc('day', timestamp) as date,
    source,
    action,
    status,
    count(*) as count
FROM activity_logs_current 
GROUP BY date, source, action, status;
```

#### Efficient Indexing Strategy
```sql
-- Composite indexes for common queries
CREATE INDEX idx_activity_filter_combo ON activity_logs_current (source, status, timestamp);
CREATE INDEX idx_activity_search ON activity_logs_current USING gin (to_tsvector('english', action || ' ' || coalesce(metadata->>'description', '')));
CREATE INDEX idx_activity_metadata ON activity_logs_current USING gin (metadata);
```

### 3. Service Layer Implementation

#### Activity Service with Caching
```typescript
export class EnhancedActivityService {
  private cache: Redis;
  private database: Database;
  private queue: ActivityQueue;
  
  // Get activities with caching
  async getActivities(filters: ActivityFilters): Promise<Activity[]> {
    const cacheKey = this.generateCacheKey(filters);
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database with optimized queries
    const activities = await this.queryActivitiesOptimized(filters);
    
    // Cache for 5 minutes
    await this.cache.setex(cacheKey, 300, JSON.stringify(activities));
    
    return activities;
  }
  
  // Optimized activity queries
  private async queryActivitiesOptimized(filters: ActivityFilters): Promise<Activity[]> {
    const query = this.buildOptimizedQuery(filters);
    return await this.database.query(query);
  }
}
```

#### Batch Processing Service
```typescript
export class ActivityBatchProcessor {
  private batchSize = 500;
  private processingInterval = 5000; // 5 seconds
  
  async startBatchProcessing(): Promise<void> {
    setInterval(async () => {
      await this.processPendingActivities();
    }, this.processingInterval);
  }
  
  private async processPendingActivities(): Promise<void> {
    const activities = await this.queue.dequeue(this.batchSize);
    
    if (activities.length === 0) return;
    
    // Process in batches for better performance
    const batches = this.chunkArray(activities, 100);
    
    for (const batch of batches) {
      await this.insertBatch(batch);
    }
  }
  
  private async insertBatch(activities: Activity[]): Promise<void> {
    // Use PostgreSQL COPY for high-performance bulk inserts
    await this.database.bulk_insert('activity_logs_current', activities);
  }
}
```

### 4. Enhanced Frontend Components

#### Optimized Activity Monitor
```typescript
export const OptimizedActivityMonitor: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debounced search to prevent excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Virtual scrolling for large datasets
  const { virtualItems, totalSize } = useVirtualizer({
    count: activities.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 60,
  });
  
  // Efficient data fetching with caching
  const { data, error, mutate } = useSWR(
    `/api/activities?${new URLSearchParams(filters)}`,
    activityFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );
  
  return (
    <div className="activity-monitor">
      {/* Virtual scrolling list */}
      <div
        ref={scrollElementRef}
        style={{ height: '400px', overflow: 'auto' }}
      >
        <div style={{ height: totalSize }}>
          {virtualItems.map((virtualItem) => (
            <ActivityRow
              key={virtualItem.key}
              activity={activities[virtualItem.index]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 5. Trigger Elimination Strategy

#### Replace Database Triggers with Service Calls
```typescript
// Instead of database triggers, use service layer
export class UserService {
  private activityService: ActivityService;
  
  async createUser(userData: CreateUserData): Promise<User> {
    const user = await this.database.users.create(userData);
    
    // Async activity logging (non-blocking)
    this.activityService.logActivity({
      source: ActivitySource.USER,
      action: 'user_created',
      entityType: 'user',
      entityId: user.id,
      details: { name: user.name, email: user.email },
    });
    
    return user;
  }
}
```

#### Progressive Trigger Removal Plan
1. **Week 1**: Remove redundant triggers (multiple triggers on same table)
2. **Week 2**: Replace user-facing operation triggers with service calls
3. **Week 3**: Replace system operation triggers with background jobs
4. **Week 4**: Remove remaining triggers and validate functionality

### 6. Performance Monitoring & Alerting

#### Performance Metrics Collection
```typescript
export class ActivityPerformanceMonitor {
  private metrics: MetricsCollector;
  
  async trackPerformance(operation: string, duration: number): Promise<void> {
    await this.metrics.record({
      operation,
      duration,
      timestamp: Date.now(),
    });
    
    // Alert if performance degrades
    if (duration > this.getThreshold(operation)) {
      await this.alerting.sendAlert({
        type: 'performance_degradation',
        operation,
        duration,
      });
    }
  }
}
```

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Create AsyncActivityService
- [ ] Implement Redis event queue
- [ ] Set up batch processing
- [ ] Create optimized database schema

### Week 3-4: Core Services
- [ ] Implement service layer with caching
- [ ] Replace critical triggers with service calls
- [ ] Add performance monitoring
- [ ] Create database migration scripts

### Week 5-6: Enhancement & Testing
- [ ] Update frontend components
- [ ] Implement real-time monitoring
- [ ] Complete trigger removal
- [ ] Performance testing and optimization

## Performance Improvements Expected

### Database Performance
- **Query Performance**: 70-80% improvement in activity query response times
- **Write Performance**: 90% reduction in write latency from eliminating triggers
- **Resource Usage**: 60% reduction in database CPU and I/O usage
- **Scalability**: Support for 10x more concurrent users

### Application Performance
- **Response Times**: 50-70% improvement in page load times
- **Memory Usage**: 40% reduction in frontend memory consumption
- **API Performance**: 80% improvement in activity API response times
- **User Experience**: Eliminate blocking operations during user actions

## Risk Mitigation

### Data Integrity
- **Transactional Consistency**: Use database transactions for critical operations
- **Retry Mechanisms**: Implement retry logic for failed activity logs
- **Data Validation**: Add comprehensive validation before processing
- **Backup Strategy**: Maintain separate backup logging mechanism

### System Reliability
- **Graceful Degradation**: System continues to function if activity logging fails
- **Circuit Breakers**: Prevent cascade failures
- **Monitoring**: Comprehensive monitoring and alerting
- **Rollback Plan**: Ability to rollback to current system if needed

## Migration Strategy

### Phase 1: Parallel Implementation
- Deploy new system alongside existing system
- Dual-write to both systems for validation
- Compare results and tune performance

### Phase 2: Gradual Migration
- Migrate low-impact areas first
- Monitor performance and stability
- Gradually increase traffic to new system

### Phase 3: Complete Migration
- Switch all traffic to new system
- Remove old triggers and components
- Cleanup and optimization

## Success Metrics

### Performance Metrics
- Database query response time < 100ms (95th percentile)
- Activity logging latency < 50ms (99th percentile)
- API response times < 200ms (95th percentile)
- System resource usage reduction > 50%

### Reliability Metrics
- Activity logging success rate > 99.9%
- System uptime > 99.95%
- Error rate < 0.1%
- Data consistency validation 100%

## Conclusion

This refactor will transform the activity monitoring system from a performance bottleneck into a scalable, efficient system that supports the platform's growth while maintaining comprehensive audit capabilities. The implementation follows best practices for scalability, performance, and reliability while preserving all existing functionality.
