/**
 * Activity Components Module - Main Export
 * 
 * Exports all activity monitoring and comprehensive audit components
 */

// Legacy activity monitoring components
export { default as ActivityMonitor } from './ActivityMonitor';
export { default as SystemProcessDashboard } from './SystemProcessDashboard';
export { default as ActivityMetrics } from './ActivityMetrics';
export { default as DatabaseChangeLog } from './DatabaseChangeLog';
export { ActivityLogProvider, useActivityLog } from './ActivityLogProvider';

// New comprehensive audit components (simplified)
export { ComprehensiveAuditDashboard } from './ComprehensiveAuditDashboard';
export { ComplianceDashboard } from './ComplianceDashboard';
export { AuditEventsTable } from './AuditEventsTable';
export { DatabaseDataTable } from './DatabaseDataTable';

// Re-export types from the activity service
export type {
  ActivityEvent,
  ActivityFilters,
  ActivityResult,
  QueueMetrics,
  ActivityAnalytics
} from '@/services/activity';

export {
  ActivitySource,
  ActivityCategory,
  ActivityStatus,
  ActivitySeverity
} from '@/services/activity';

// Re-export types from audit services
export type {
  AuditEvent,
  AuditQueryOptions,
  AuditStatistics,
  AuditAnalytics,
  ComplianceReport,
  AnomalyDetection
} from '@/services/audit';

// Convenience aliases
export { default as LegacyAuditMonitor } from './ActivityMonitor';
export { ComprehensiveAuditDashboard as AuditDashboard } from './ComprehensiveAuditDashboard';
