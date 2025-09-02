/**
 * Audit Services Index
 * Centralized exports for all audit-related services
 */

// Frontend audit service for user action tracking
export {
  frontendAuditService as default,
  frontendAuditService
} from './FrontendAuditService'

// Backend audit service for comprehensive API integration
export { backendAuditService } from './BackendAuditService'

// Legacy audit services
export { auditLogService } from './auditLogService'
export { tableAuditGenerator } from './TableAuditGenerator'
export { universalAuditService } from './UniversalAuditService'

// Frontend types
export type {
  FrontendAuditEvent,
  AuditConfig
} from './FrontendAuditService'

// Backend types
export type {
  AuditEvent,
  AuditQueryOptions,
  PaginatedResponse,
  AuditStatistics,
  AuditAnalytics,
  ComplianceReport,
  AnomalyDetection,
} from './BackendAuditService'
