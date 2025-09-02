/**
 * Enhanced Upload Types Index
 * 
 * Central export point for all upload-related types
 */

// Upload types
export type {
  UploadEntityType,
  UploadFileFormat,
  UploadPhase,
  UploadSession,
  UploadResult,
  DataUploadResult,
  DocumentUploadResult,
  ValidationError as UploadValidationError,
  DuplicateHandlingResult,
  FailedUpload,
  UploadDocument,
  UploadProgress,
  DataUploadConfig,
  DocumentUploadConfig,
  InvestorTemplateRow,
  IssuerTemplateRow,
  UploadEventHandlers,
  DataUploadProps,
  DocumentUploadProps,
  EnhancedUploadProps
} from './uploadTypes';

// Validation types
export type {
  ValidationSeverity,
  ValidatorType,
  ValidationRule,
  ValidationResult,
  ValidationError,
  FieldValidationResult,
  ValidationContext,
  ValidationSchema,
  CommonValidationRules,
  InvestorValidationSchema,
  IssuerValidationSchema,
  BatchValidationOptions,
  BatchValidationResult,
  DataTransformer,
  NormalizationRule,
  DuplicateDetectionRule,
  DuplicateDetectionResult,
  ValidationConfigFactory
} from './validationTypes';

// Re-export validation config for convenience
export type ValidationConfig = import('./uploadTypes').ValidationConfig;
