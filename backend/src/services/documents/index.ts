/**
 * Document Management Service Module
 * Centralized exports for all document-related services
 */

// Main services
export { DocumentService } from './DocumentService'
export { DocumentValidationService } from './DocumentValidationService'
export { DocumentAnalyticsService } from './DocumentAnalyticsService'

// Types
export type {
  // Core types
  Document,
  DocumentVersion,
  DocumentApproval,
  DocumentWorkflow,
  IssuerDocument,
  IssuerDetailDocument,
  
  // Enums
  DocumentStatus,
  DocumentType,
  WorkflowStatus,
  EntityType,
  DocumentCategory,
  
  // Request/Response types
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentUploadRequest,
  CreateDocumentVersionRequest,
  DocumentApprovalRequest,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  DocumentResponse,
  DocumentWithStats,
  
  // Query and analytics types
  DocumentQueryOptions,
  DocumentStatistics,
  DocumentAnalytics,
  BulkDocumentUpdateRequest,
  DocumentExportOptions,
  DocumentImportData,
  
  // Validation types
  DocumentValidationResult,
  FileValidationOptions,
  
  // Template and workflow types
  DocumentTemplate,
  WorkflowStep,
  WorkflowTemplate,
  
  // Audit and event types
  DocumentAuditEntry,
  DocumentEvent,
  
  // Service result types
  DocumentServiceResult,
  DocumentBatchResult,
  
  // Storage and integration types
  StorageProvider,
  FileUploadResult,
  ExternalDocumentProvider,
  DocumentSyncStatus,
  
  // Metadata types
  DocumentMetadata
} from '@/types/document-service'

// Default exports for convenience
export { DocumentService as default } from './DocumentService'
