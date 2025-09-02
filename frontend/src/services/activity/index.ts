/**
 * Activity Service Module - Main Export
 * 
 * Exports all activity monitoring and logging functionality
 * for use throughout the application.
 */

// Core service exports
export { 
  EnhancedActivityService,
  enhancedActivityService,
  ActivitySource,
  ActivityCategory,
  ActivityStatus,
  ActivitySeverity,
  logUserAction,
  logSystemEvent,
  logIntegrationEvent
} from './EnhancedActivityService';

// Integration helper exports
export {
  ActivityServiceIntegration,
  activityIntegration,
  withDatabaseLogging,
  withApiLogging,
  withBatchLogging,
  withUserActionLogging,
  logComplianceCheck,
  logFinancialTransaction,
  logBlockchainTransaction
} from './ActivityServiceIntegration';

// Type exports
export type {
  ActivityEvent,
  ActivityFilters,
  ActivityResult,
  QueueMetrics,
  ActivityAnalytics,
  OperationContext
} from './EnhancedActivityService';

// Default export for convenience
import { enhancedActivityService } from './EnhancedActivityService';
export default enhancedActivityService;
