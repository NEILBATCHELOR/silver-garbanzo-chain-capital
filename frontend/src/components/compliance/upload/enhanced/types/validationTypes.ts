/**
 * Enhanced Upload Validation Types
 * 
 * Type definitions for validation engine and related functionality
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidatorType = 'required' | 'email' | 'date' | 'json' | 'enum' | 'numeric' | 'custom';

export interface ValidationRule {
  field: string;
  type: ValidatorType;
  required?: boolean;
  message?: string;
  severity?: ValidationSeverity;
  params?: Record<string, any>;
  validator?: (value: any, row: Record<string, any>) => boolean | string;
  transformer?: (value: any) => any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  transformedData: Record<string, any>;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: ValidationSeverity;
  type: ValidatorType;
  suggestion?: string;
}

export interface FieldValidationResult {
  field: string;
  value: any;
  transformedValue?: any;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationContext {
  entityType: 'investor' | 'issuer';
  row: number;
  allData: Record<string, any>[];
  existingEntities?: Record<string, any>[];
  customRules?: ValidationRule[];
}

export interface ValidationSchema {
  entityType: 'investor' | 'issuer';
  rules: ValidationRule[];
  globalValidators?: Array<(data: Record<string, any>[], context: ValidationContext) => ValidationError[]>;
}

// Predefined validation rules for common fields
export interface CommonValidationRules {
  email: ValidationRule;
  date: ValidationRule;
  boolean: ValidationRule;
  json: ValidationRule;
  required: ValidationRule;
  numeric: ValidationRule;
  phone: ValidationRule;
  url: ValidationRule;
  uuid: ValidationRule;
}

// Validation configuration for different entity types
export interface InvestorValidationSchema extends ValidationSchema {
  entityType: 'investor';
  rules: Array<ValidationRule & {
    field: keyof import('./uploadTypes').InvestorTemplateRow;
  }>;
}

export interface IssuerValidationSchema extends ValidationSchema {
  entityType: 'issuer';
  rules: Array<ValidationRule & {
    field: keyof import('./uploadTypes').IssuerTemplateRow;
  }>;
}

// Batch validation for performance
export interface BatchValidationOptions {
  batchSize: number;
  continueOnError: boolean;
  maxErrors: number;
  stopOnFirstError: boolean;
  parallelValidation: boolean;
}

export interface BatchValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: number;
  errors: ValidationError[];
  processingTime: number;
  validData: Record<string, any>[];
  invalidData: Array<{ row: number; data: Record<string, any>; errors: ValidationError[] }>;
}

// Data transformation and normalization
export interface DataTransformer {
  field: string;
  transform: (value: any, row: Record<string, any>) => any;
  dependencies?: string[];
}

export interface NormalizationRule {
  field: string;
  normalizer: (value: any) => any;
  preserveOriginal?: boolean;
}

// Duplicate detection and handling
export interface DuplicateDetectionRule {
  fields: string[];
  caseSensitive?: boolean;
  exactMatch?: boolean;
  similarity?: number; // 0-1 for fuzzy matching
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  existingEntity?: Record<string, any>;
  matchedFields: string[];
  confidence: number;
  action: 'skip' | 'update' | 'create' | 'review';
}

// Export validation configuration factory
export interface ValidationConfigFactory {
  createInvestorSchema(): InvestorValidationSchema;
  createIssuerSchema(): IssuerValidationSchema;
  createCustomSchema(entityType: 'investor' | 'issuer', rules: ValidationRule[]): ValidationSchema;
  getCommonRules(): CommonValidationRules;
}
