/**
 * Document Management Service Types
 * Comprehensive type definitions for document management operations
 */

// === Core Enums ===

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum DocumentType {
  COMMERCIAL_REGISTER = 'commercial_register',
  CERTIFICATE_INCORPORATION = 'certificate_incorporation',
  MEMORANDUM_ARTICLES = 'memorandum_articles',
  DIRECTOR_LIST = 'director_list',
  SHAREHOLDER_REGISTER = 'shareholder_register',
  FINANCIAL_STATEMENTS = 'financial_statements',
  REGULATORY_STATUS = 'regulatory_status',
  QUALIFICATION_SUMMARY = 'qualification_summary',
  BUSINESS_DESCRIPTION = 'business_description',
  ORGANIZATIONAL_CHART = 'organizational_chart',
  KEY_PEOPLE_CV = 'key_people_cv',
  AML_KYC_DESCRIPTION = 'aml_kyc_description'
}

export enum WorkflowStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export enum EntityType {
  PROJECT = 'project',
  INVESTOR = 'investor',
  ISSUER = 'issuer',
  USER = 'user',
  ORGANIZATION = 'organization',
  TOKEN = 'token'
}

export enum DocumentCategory {
  COMPLIANCE = 'compliance',
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  TECHNICAL = 'technical',
  OPERATIONAL = 'operational',
  GENERAL = 'general'
}

// === Core Interfaces ===

export interface DocumentMetadata {
  fileType?: string;
  fileSize?: number;
  fileName?: string;
  uploadedBy?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  required?: boolean;
  rejectionReason?: string;
  reviewComments?: string;
  checksum?: string;
  [key: string]: any;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  status: DocumentStatus | string;
  file_path?: string;
  file_url?: string;
  entity_id: string;
  entity_type: EntityType | string;
  metadata?: DocumentMetadata;
  created_at?: Date | string;
  updated_at?: Date | string;
  category?: DocumentCategory | string;
  project_id?: string;
  uploaded_by?: string;
  expiry_date?: Date | string;
  workflow_stage_id?: string;
  version?: number;
}

export interface DocumentVersion {
  id: string;
  document_id?: string;
  version_number: number;
  file_path?: string;
  file_url?: string;
  uploaded_by?: string;
  metadata?: DocumentMetadata;
  created_at?: Date | string;
}

export interface DocumentApproval {
  id: string;
  document_id?: string;
  approver_id?: string;
  status: string;
  comments?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface DocumentWorkflow {
  id: string;
  document_id: string;
  required_signers: string[];
  completed_signers: string[];
  status: WorkflowStatus;
  deadline?: Date | string;
  metadata: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string;
  updated_by: string;
}

export interface IssuerDocument {
  id: string;
  issuer_id: string;
  document_type: DocumentType;
  file_url: string;
  status: DocumentStatus;
  uploaded_at: Date | string;
  expires_at?: Date | string;
  last_reviewed_at?: Date | string;
  reviewed_by?: string;
  version: number;
  metadata: Record<string, any>;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string;
  updated_by: string;
}

export interface IssuerDetailDocument {
  id: string;
  project_id: string;
  document_type: string;
  document_url: string;
  document_name: string;
  uploaded_at?: Date | string;
  updated_at?: Date | string;
  uploaded_by?: string;
  status?: string;
  metadata?: Record<string, any>;
  is_public: boolean;
}

// === Request/Response Types ===

export interface CreateDocumentRequest {
  name: string;
  type: string;
  entity_id: string;
  entity_type: EntityType | string;
  file_path?: string;
  file_url?: string;
  metadata?: DocumentMetadata;
  category?: DocumentCategory | string;
  project_id?: string;
  uploaded_by?: string;
  expiry_date?: Date | string;
  workflow_stage_id?: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  type?: string;
  status?: DocumentStatus | string;
  file_path?: string;
  file_url?: string;
  metadata?: DocumentMetadata;
  category?: DocumentCategory | string;
  expiry_date?: Date | string;
  workflow_stage_id?: string;
  version?: number;
}

export interface DocumentUploadRequest extends CreateDocumentRequest {
  file?: Buffer | Uint8Array;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface CreateDocumentVersionRequest {
  document_id: string;
  file_path?: string;
  file_url?: string;
  uploaded_by?: string;
  metadata?: DocumentMetadata;
}

export interface DocumentApprovalRequest {
  document_id: string;
  approver_id: string;
  status: 'approved' | 'rejected' | 'pending';
  comments?: string;
}

export interface CreateWorkflowRequest {
  document_id: string;
  required_signers: string[];
  deadline?: Date | string;
  metadata?: Record<string, any>;
  created_by: string;
}

export interface UpdateWorkflowRequest {
  required_signers?: string[];
  completed_signers?: string[];
  status?: WorkflowStatus;
  deadline?: Date | string;
  metadata?: Record<string, any>;
  updated_by: string;
}

// === Response Types ===

export interface DocumentResponse {
  document: Document;
  versions?: DocumentVersion[];
  approvals?: DocumentApproval[];
  workflow?: DocumentWorkflow;
}

export interface DocumentWithStats extends Document {
  version_count?: number;
  approval_count?: number;
  pending_approvals?: number;
  has_workflow?: boolean;
  workflow_status?: WorkflowStatus;
  days_until_expiry?: number;
  is_expired?: boolean;
}

export interface DocumentStatistics {
  total_documents: number;
  by_status: Record<DocumentStatus | string, number>;
  by_type: Record<string, number>;
  by_category: Record<DocumentCategory | string, number>;
  by_entity_type: Record<EntityType | string, number>;
  expired_count: number;
  expiring_soon_count: number;
  pending_approvals: number;
  total_versions: number;
  storage_used: number;
  average_approval_time: number;
}

export interface DocumentAnalytics {
  statistics: DocumentStatistics;
  trends: {
    uploads_by_month: Array<{ month: string; count: number }>;
    approvals_by_month: Array<{ month: string; count: number }>;
    rejections_by_month: Array<{ month: string; count: number }>;
  };
  entity_breakdown: Array<{
    entity_type: string;
    entity_id: string;
    document_count: number;
    pending_count: number;
    approved_count: number;
  }>;
  user_activity: Array<{
    user_id: string;
    uploads: number;
    approvals: number;
    last_activity: Date | string;
  }>;
}

// === Query and Filter Types ===

export interface DocumentQueryOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string[];
  
  // Document-specific filters
  status?: DocumentStatus | string | (DocumentStatus | string)[];
  type?: string | string[];
  category?: DocumentCategory | string | (DocumentCategory | string)[];
  entity_type?: EntityType | string | (EntityType | string)[];
  entity_id?: string | string[];
  project_id?: string | string[];
  uploaded_by?: string | string[];
  
  // Date filters
  created_after?: Date | string;
  created_before?: Date | string;
  expires_after?: Date | string;
  expires_before?: Date | string;
  
  // Include related data
  include_versions?: boolean;
  include_approvals?: boolean;
  include_workflow?: boolean;
  include_stats?: boolean;
}

export interface BulkDocumentUpdateRequest {
  document_ids: string[];
  updates: UpdateDocumentRequest;
  updated_by?: string;
}

export interface DocumentExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  filters?: DocumentQueryOptions;
  include_metadata?: boolean;
  include_versions?: boolean;
  include_approvals?: boolean;
}

export interface DocumentImportData {
  documents: CreateDocumentRequest[];
  import_options?: {
    skip_duplicates?: boolean;
    update_existing?: boolean;
    create_versions?: boolean;
  };
}

// === Validation Types ===

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields?: string[];
  invalidFields?: Record<string, string>;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  requireChecksum?: boolean;
  scanForViruses?: boolean;
}

// === Workflow Types ===

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  required_role?: string;
  required_permissions?: string[];
  auto_approve?: boolean;
  timeout_hours?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  document_types: DocumentType[];
  steps: WorkflowStep[];
  is_active: boolean;
}

// === Audit Types ===

export interface DocumentAuditEntry {
  id: string;
  document_id: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'version_created' | 'workflow_started' | 'workflow_completed';
  user_id?: string;
  user_email?: string;
  timestamp: Date | string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// === Template Types ===

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  document_type: DocumentType | string;
  entity_type: EntityType | string;
  required_fields: string[];
  optional_fields: string[];
  validation_rules: Record<string, any>;
  template_file_url?: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

// === Storage Types ===

export interface StorageProvider {
  provider: 'supabase' | 'aws' | 'gcp' | 'azure';
  bucket: string;
  region?: string;
  endpoint?: string;
  credentials?: Record<string, string>;
}

export interface FileUploadResult {
  success: boolean;
  file_path?: string;
  file_url?: string;
  file_size?: number;
  checksum?: string;
  error?: string;
}

// === Service Result Types ===

export interface DocumentServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode?: number;
  errors?: string[];
  warnings?: string[];
}

export interface DocumentBatchResult<T = any> {
  successful: T[];
  failed: Array<{
    item: any;
    error: string;
    index: number;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// === Event Types ===

export interface DocumentEvent {
  type: 'document.created' | 'document.updated' | 'document.deleted' | 'document.approved' | 'document.rejected' | 'version.created' | 'workflow.started' | 'workflow.completed';
  document_id: string;
  entity_id: string;
  entity_type: string;
  user_id?: string;
  timestamp: Date | string;
  data: Record<string, any>;
}

// === Integration Types ===

export interface ExternalDocumentProvider {
  provider: string;
  api_key: string;
  base_url: string;
  supported_operations: string[];
  webhook_url?: string;
}

export interface DocumentSyncStatus {
  document_id: string;
  external_id?: string;
  provider: string;
  last_sync: Date | string;
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict';
  error_message?: string;
}
