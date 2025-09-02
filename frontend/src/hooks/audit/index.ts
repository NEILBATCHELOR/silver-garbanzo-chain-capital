/**
 * Audit Hooks Index
 * Centralized exports for all audit-related hooks and utilities
 */

// Frontend audit hooks
export {
  useAuditPageView,
  useAuditInteraction,
  useAuditForm,
  useAuditFile,
  useAuditError,
  useAuditPerformance,
  useAuditComponent,
  useAuditElement,
  useAuditEvent,
  useAuditSession,
  useAuditSearch,
  withAuditTracking
} from './useAudit'

// Enhanced audit hook with comprehensive backend integration
export { useEnhancedAudit } from './useEnhancedAudit'
export type {
  EnhancedAuditOptions,
  EnhancedAuditData,
  EnhancedAuditActions
} from './useEnhancedAudit'

// Re-export frontend audit service types
export type { FrontendAuditEvent, AuditConfig } from '@/services/audit/FrontendAuditService'

// Re-export backend audit types
export type {
  AuditEvent,
  AuditQueryOptions,
  AuditStatistics,
  AuditAnalytics,
  ComplianceReport,
  AnomalyDetection
} from '@/services/audit/BackendAuditService'

// Re-export service instances
export { frontendAuditService } from '@/services/audit/FrontendAuditService'
export { backendAuditService } from '@/services/audit/BackendAuditService'
