/**
 * Upload Validation Hook
 * 
 * Hook for managing validation state and real-time validation feedback
 * Provides validation services for upload components
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { validationService } from '../services';
import type {
  ValidationError,
  ValidationResult,
  ValidationSchema,
  BatchValidationResult,
  BatchValidationOptions
} from '../types/validationTypes';
import type { UploadEntityType } from '../types/uploadTypes';

export interface UseUploadValidationOptions {
  entityType: UploadEntityType;
  enableRealTimeValidation?: boolean;
  maxErrors?: number;
  strictMode?: boolean;
  lenientMode?: boolean;
  bypassValidation?: boolean;
  quickValidation?: boolean;
}

export interface UseUploadValidationReturn {
  // Validation state
  isValidating: boolean;
  validationErrors: ValidationError[];
  validationWarnings: ValidationError[];
  hasErrors: boolean;
  hasWarnings: boolean;
  validRowCount: number;
  invalidRowCount: number;
  
  // Validation methods
  validateData: (data: Record<string, any>[]) => Promise<BatchValidationResult>;
  validateRow: (data: Record<string, any>, rowIndex: number) => ValidationResult;
  clearValidation: () => void;
  
  // Schema management
  schema: ValidationSchema;
  updateSchema: (customRules?: any[]) => void;
  
  // Error management
  getErrorsForRow: (rowIndex: number) => ValidationError[];
  getErrorsForField: (field: string) => ValidationError[];
  dismissError: (errorIndex: number) => void;
  dismissAllErrors: () => void;
  
  // Validation statistics
  validationStats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errorCount: number;
    warningCount: number;
    processingTime: number;
  };
}

export const useUploadValidation = (options: UseUploadValidationOptions): UseUploadValidationReturn => {
  // State
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);
  const [validationStats, setValidationStats] = useState({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    errorCount: 0,
    warningCount: 0,
    processingTime: 0
  });

  // Schema
  const [schema, setSchema] = useState<ValidationSchema>(() => {
    return options.entityType === 'investor'
      ? validationService.createInvestorSchema(options.lenientMode || false)
      : validationService.createIssuerSchema(options.lenientMode || false);
  });

  // Computed state
  const hasErrors = useMemo(() => validationErrors.length > 0, [validationErrors]);
  const hasWarnings = useMemo(() => validationWarnings.length > 0, [validationWarnings]);
  const validRowCount = useMemo(() => validationStats.validRows, [validationStats.validRows]);
  const invalidRowCount = useMemo(() => validationStats.invalidRows, [validationStats.invalidRows]);

  // Validate entire dataset
  const validateData = useCallback(async (data: Record<string, any>[]): Promise<BatchValidationResult> => {
    setIsValidating(true);
    
    try {
      // Handle bypass validation
      if (options.bypassValidation) {
        const result = validationService.bypassValidation(data, options.entityType);
        setValidationErrors([]);
        setValidationWarnings([]);
        setValidationStats({
          totalRows: result.totalRows,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
          errorCount: 0,
          warningCount: 0,
          processingTime: result.processingTime
        });
        return result;
      }

      // Handle quick validation
      if (options.quickValidation) {
        const result = await validationService.quickValidate(data, options.entityType);
        const errors = result.errors.filter(e => e.severity === 'error');
        const warnings = result.errors.filter(e => e.severity === 'warning');
        
        setValidationErrors(errors);
        setValidationWarnings(warnings);
        setValidationStats({
          totalRows: result.totalRows,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
          errorCount: errors.length,
          warningCount: warnings.length,
          processingTime: result.processingTime
        });
        return result;
      }

      // Regular validation
      const batchOptions: BatchValidationOptions = {
        batchSize: 100,
        continueOnError: true,
        maxErrors: options.maxErrors || 100,
        stopOnFirstError: false,
        parallelValidation: false
      };

      const result = await validationService.validateBatch(data, schema, batchOptions);
      
      // Separate errors and warnings
      const errors = result.errors.filter(e => e.severity === 'error');
      const warnings = result.errors.filter(e => e.severity === 'warning');
      
      setValidationErrors(errors);
      setValidationWarnings(warnings);
      
      // Update statistics
      setValidationStats({
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        errorCount: errors.length,
        warningCount: warnings.length,
        processingTime: result.processingTime
      });

      return result;
    } catch (error) {
      console.error('Validation failed:', error);
      
      // Create error result
      const errorResult: BatchValidationResult = {
        totalRows: data.length,
        validRows: 0,
        invalidRows: data.length,
        warnings: 0,
        errors: [{
          row: 0,
          field: 'system',
          value: '',
          message: error instanceof Error ? error.message : 'Validation system error',
          severity: 'error',
          type: 'custom'
        }],
        processingTime: 0,
        validData: [],
        invalidData: data.map((row, index) => ({
          row: index + 2,
          data: row,
          errors: [{
            row: index + 2,
            field: 'system',
            value: '',
            message: 'Validation failed',
            severity: 'error',
            type: 'custom'
          }]
        }))
      };

      setValidationErrors(errorResult.errors);
      setValidationWarnings([]);
      setValidationStats({
        totalRows: data.length,
        validRows: 0,
        invalidRows: data.length,
        errorCount: errorResult.errors.length,
        warningCount: 0,
        processingTime: 0
      });

      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [schema, options.maxErrors, options.bypassValidation, options.quickValidation, options.entityType]);

  // Validate single row
  const validateRow = useCallback((data: Record<string, any>, rowIndex: number): ValidationResult => {
    const context = {
      entityType: options.entityType,
      row: rowIndex,
      allData: [data],
      existingEntities: []
    };

    return validationService.validateRow(data, schema, context);
  }, [schema, options.entityType]);

  // Clear validation state
  const clearValidation = useCallback(() => {
    setValidationErrors([]);
    setValidationWarnings([]);
    setValidationStats({
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errorCount: 0,
      warningCount: 0,
      processingTime: 0
    });
  }, []);

  // Update schema with custom rules
  const updateSchema = useCallback((customRules?: any[]) => {
    const baseSchema = options.entityType === 'investor'
      ? validationService.createInvestorSchema(options.lenientMode || false)
      : validationService.createIssuerSchema(options.lenientMode || false);

    if (customRules && customRules.length > 0) {
      setSchema({
        ...baseSchema,
        rules: [...baseSchema.rules, ...customRules]
      });
    } else {
      setSchema(baseSchema);
    }
  }, [options.entityType, options.lenientMode]);

  // Get errors for specific row
  const getErrorsForRow = useCallback((rowIndex: number): ValidationError[] => {
    return validationErrors.filter(error => error.row === rowIndex);
  }, [validationErrors]);

  // Get errors for specific field
  const getErrorsForField = useCallback((field: string): ValidationError[] => {
    return validationErrors.filter(error => error.field === field);
  }, [validationErrors]);

  // Dismiss specific error
  const dismissError = useCallback((errorIndex: number) => {
    setValidationErrors(prev => prev.filter((_, index) => index !== errorIndex));
    setValidationStats(prev => ({
      ...prev,
      errorCount: prev.errorCount - 1
    }));
  }, []);

  // Dismiss all errors
  const dismissAllErrors = useCallback(() => {
    setValidationErrors([]);
    setValidationStats(prev => ({
      ...prev,
      errorCount: 0
    }));
  }, []);

  // Update schema when validation options change
  useEffect(() => {
    const newSchema = options.entityType === 'investor'
      ? validationService.createInvestorSchema(options.lenientMode || false)
      : validationService.createIssuerSchema(options.lenientMode || false);
    setSchema(newSchema);
  }, [options.entityType, options.lenientMode, options.strictMode, options.bypassValidation, options.quickValidation]);

  return {
    // Validation state
    isValidating,
    validationErrors,
    validationWarnings,
    hasErrors,
    hasWarnings,
    validRowCount,
    invalidRowCount,
    
    // Validation methods
    validateData,
    validateRow,
    clearValidation,
    
    // Schema management
    schema,
    updateSchema,
    
    // Error management
    getErrorsForRow,
    getErrorsForField,
    dismissError,
    dismissAllErrors,
    
    // Validation statistics
    validationStats
  };
};

export default useUploadValidation;
