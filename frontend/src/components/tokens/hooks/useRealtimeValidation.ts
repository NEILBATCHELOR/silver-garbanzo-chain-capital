/**
 * NO VALIDATION HOOK
 * ALL VALIDATION REMOVED per user request
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { TokenFormData } from '../types';
import { StorageConfigMode } from '../utils/configModeUtils';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  errorsByField: Record<string, string[]>;
  isValidating: boolean;
}

interface UseRealtimeValidationOptions {
  debounceMs?: number;
  validateOnMount?: boolean;
  skipValidationWhen?: () => boolean;
  // New options for better UX
  aggressiveMode?: boolean; // When false, only validates critical issues
  minFieldsBeforeValidation?: number; // Wait until user has entered some data
}

/**
 * NO VALIDATION HOOK - Always returns valid state
 */
export const useRealtimeValidation = (
  tokenData: Partial<TokenFormData>,
  configMode: StorageConfigMode,
  options: UseRealtimeValidationOptions = {}
) => {
  // VALIDATION REMOVED - Always return valid state
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    errorsByField: {},
    isValidating: false
  });

  // VALIDATION REMOVED - All callback functions are no-ops

  return {
    ...validationResult,
    validateImmediately: () => {}, // NO-OP
    clearValidation: () => {}, // NO-OP
    // Additional utilities
    hasMinimumData: true,
    validationCount: 0
  };
};

/**
 * NO FIELD VALIDATION - Always returns valid
 */
export const useFieldValidation = (
  fieldName: string,
  fieldValue: any,
  validator: (value: any) => { isValid: boolean; message?: string },
  debounceMs: number = 800
) => {
  // VALIDATION REMOVED - Always return valid
  return {
    isValid: true,
    isValidating: false,
    message: undefined
  };
};