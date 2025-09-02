/**
 * Enhanced Compliance Upload Types
 * 
 * Type definitions for the enhanced compliance upload system
 * supporting both investor and issuer data and document uploads
 */

import { UploadDocumentType } from '@/types/core/documentTypes';
import { Investor, Organization } from '@/types/core/centralModels';

export type UploadEntityType = 'investor' | 'issuer';
export type UploadFileFormat = 'csv' | 'xlsx';
export type UploadPhase = 'data' | 'documents' | 'complete';

export interface UploadSession {
  id: string;
  entityType: UploadEntityType;
  phase: UploadPhase;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  documents: UploadDocument[];
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export interface UploadResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: {
    total: number;
    processed: number;
    failed: number;
    duplicates: number;
    updated: number;
  };
}

export interface DataUploadResult extends UploadResult {
  data?: {
    entities: (Investor | Organization)[];
    validationErrors: ValidationError[];
    duplicateHandling: DuplicateHandlingResult[];
  };
}

export interface DocumentUploadResult extends UploadResult {
  data?: {
    documents: UploadDocument[];
    failed: FailedUpload[];
    entityDocumentCounts?: Record<string, number>;
  };
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface DuplicateHandlingResult {
  row: number;
  entity: Investor | Organization;
  action: 'created' | 'updated' | 'skipped';
  reason: string;
}

export interface FailedUpload {
  file: File;
  error: string;
  retryable: boolean;
}

export interface UploadDocument {
  id?: string;
  file: File;
  documentType: UploadDocumentType;
  entityId?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UploadProgress {
  phase: UploadPhase;
  entityType?: UploadEntityType;
  total?: number;
  completed?: number;
  failed?: number;
  percentage: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
  message?: string;
}

export interface DataUploadConfig {
  entityType: UploadEntityType;
  fileFormat: UploadFileFormat;
  hasHeaders: boolean;
  batchSize: number;
  allowDuplicates: boolean;
  duplicateAction: 'skip' | 'update' | 'create';
  validation: ValidationConfig;
}

export interface ValidationConfig {
  strictMode: boolean;
  lenientMode?: boolean;
  bypassValidation?: boolean;
  quickValidation?: boolean;
  requiredFields: string[];
  customValidators: Record<string, (value: any) => boolean>;
  dataTransformers: Record<string, (value: any) => any>;
}

export interface DocumentUploadConfig {
  allowedTypes: UploadDocumentType[];
  maxFileSize: number;
  maxFiles: number;
  generateThumbnails: boolean;
  generatePreviews: boolean;
  concurrentUploads: number;
  autoLink: boolean;
}

// Template row interfaces for CSV/XLSX parsing
export interface InvestorTemplateRow {
  // Basic Information (Required)
  name: string;
  email: string;
  
  // Optional Basic Fields
  company?: string;
  type: string; // individual, institutional, syndicate
  notes?: string;
  
  // Investor Classification
  investor_type?: string; // Different from type - more granular classification
  investor_status?: string; // active, inactive, pending, suspended
  onboarding_completed?: string; // true/false
  
  // Wallet & Blockchain
  wallet_address?: string;
  
  // KYC Information
  kyc_status?: string; // not_started, pending, approved, rejected, expired
  kyc_verified_at?: string;
  kyc_expiry_date?: string;
  verification_details?: string; // JSONB - detailed KYC verification data
  
  // Accreditation
  accreditation_status?: string; // not_started, pending, approved, rejected, expired
  accreditation_type?: string; // income, net_worth, entity, professional
  accreditation_verified_at?: string;
  accreditation_expires_at?: string;
  
  // Risk Assessment
  risk_score?: string;
  risk_factors?: string; // JSONB - array of risk factors
  risk_assessment?: string; // JSONB - complete risk assessment data
  
  // Tax & Compliance
  tax_residency?: string;
  tax_id_number?: string;
  last_compliance_check?: string;
  
  // Preferences & Profile
  investment_preferences?: string; // JSONB - investment preferences and restrictions
  profile_data?: string; // JSONB - additional profile information
  
  // System Fields
  user_id?: string;
  lastUpdated?: string;
}

export interface IssuerTemplateRow {
  // Basic Information (Required)
  name: string;
  
  // Legal Entity Information
  legal_name?: string; // Full legal name of entity
  registration_number?: string; // Business registration/incorporation number
  registration_date?: string; // Date of incorporation/registration
  tax_id?: string; // Tax identification number
  jurisdiction?: string; // Legal jurisdiction (state/country)
  business_type?: string; // Industry/business type classification
  
  // Status & Compliance
  status?: string; // active, inactive, pending, suspended
  compliance_status?: string; // compliant, non_compliant, pending_review, under_review
  onboarding_completed?: string; // true/false
  
  // Contact Information
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  
  // Structured Data (JSONB)
  address?: string; // JSONB - complete address information
  legal_representatives?: string; // JSONB - array of legal representatives with roles
}

// Event handlers for upload components
export interface UploadEventHandlers {
  onPhaseComplete?: (phase: UploadPhase, result: UploadResult) => void;
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error, context: string) => void;
  onValidationError?: (errors: ValidationError[]) => void;
  onDuplicateFound?: (duplicates: DuplicateHandlingResult[]) => void;
  onDocumentUpload?: (document: UploadDocument) => void;
  onComplete?: (session: UploadSession) => void;
}

// Component prop interfaces
export interface DataUploadProps {
  entityType: UploadEntityType;
  config?: Partial<DataUploadConfig>;
  onComplete?: (result: DataUploadResult) => void;
  onProgress?: (progress: UploadProgress) => void;
  onCancel?: () => void;
}

export interface DocumentUploadProps {
  entityType: UploadEntityType;
  entities: (Investor | Organization)[];
  config?: Partial<DocumentUploadConfig>;
  onComplete?: (result: DocumentUploadResult) => void;
  onProgress?: (progress: UploadProgress) => void;
  onCancel?: () => void;
}

export interface EnhancedUploadProps {
  entityType: UploadEntityType;
  dataConfig?: Partial<DataUploadConfig>;
  documentConfig?: Partial<DocumentUploadConfig>;
  eventHandlers?: UploadEventHandlers;
  autoAdvancePhases?: boolean;
  allowPhaseSkip?: boolean;
}
