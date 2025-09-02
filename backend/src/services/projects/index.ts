/**
 * Projects Service Module
 * Centralized exports for all project-related services
 */

// Main services
export { ProjectService } from './ProjectService'
export { ProjectValidationService } from './ProjectValidationService'
export { ProjectAnalyticsService } from './ProjectAnalyticsService'

// Types
export type {
  // Core types
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectResponse,
  ProjectWithStats,
  ProjectStatistics,
  ProjectFormData,
  ProjectQueryOptions,
  ProjectValidationResult,
  ProjectCreationResult,
  ProjectDuration,
  ProjectStatus,
  InvestmentStatus,
  ProjectCategory,
  
  // Bulk operations
  BulkProjectUpdateRequest,
  
  // Analytics and reporting
  ProjectAnalytics,
  ProjectComplianceSummary,
  ProjectExportOptions,
  ProjectImportData,
  ProjectAuditEntry,
  ProjectWalletInfo
} from '@/types/project-service'

// Default exports for convenience
export { ProjectService as default } from './ProjectService'
