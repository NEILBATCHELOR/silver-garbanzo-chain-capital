/**
 * Token Validation Helpers - NO VALIDATION VERSION
 * 
 * Per user request: ALL VALIDATION REMOVED
 * These functions now always return valid=true to bypass validation entirely
 */

import { TokenStandard } from '@/types/core/centralModels';
import { TokenFormData } from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  fieldErrors?: Record<string, string[]>;
}

/**
 * Check for missing critical fields in token data
 * NO VALIDATION - Always returns empty array
 * 
 * @param tokenData - Token form data to validate
 * @returns Empty array (no missing fields)
 */
export function checkMissingCriticalFields(tokenData: Partial<TokenFormData>): string[] {
  // USER REQUEST: ALL VALIDATION REMOVED
  return [];
}

/**
 * Validate token data before submission
 * NO VALIDATION - Always returns valid=true
 * 
 * @param tokenData - Token form data to validate
 * @param configMode - Configuration mode ('min' or 'max')
 * @param context - Logging context
 * @returns Always valid result
 */
export function validateTokenBeforeSubmission(
  tokenData: Partial<TokenFormData>,
  configMode: 'min' | 'max' | 'basic' | 'advanced',
  context: string = 'TokenValidation'
): ValidationResult {
  // USER REQUEST: ALL VALIDATION REMOVED
  return {
    valid: true,
    errors: [],
    warnings: [],
    fieldErrors: {}
  };
}

/**
 * Validate standard-specific fields
 * NO VALIDATION - Always returns valid result
 * 
 * @param tokenData - Token form data
 * @param configMode - Configuration mode
 * @returns Always valid result
 */
function validateStandardSpecificFields(
  tokenData: Partial<TokenFormData>,
  configMode: string
): ValidationResult {
  // USER REQUEST: ALL VALIDATION REMOVED
  return {
    valid: true,
    errors: [],
    warnings: [],
    fieldErrors: {}
  };
}

/**
 * Format validation errors for display
 * NO VALIDATION - Returns empty array
 * 
 * @param errors - Array of error strings
 * @returns Empty array
 */
export function formatValidationErrors(errors: string[]): string[] {
  // USER REQUEST: ALL VALIDATION REMOVED
  return [];
}

/**
 * Format validation errors by field for detailed display
 * NO VALIDATION - Returns empty object
 * 
 * @param validationResult - Validation result with field errors
 * @returns Empty object
 */
export function formatValidationErrorsByField(validationResult: ValidationResult): Record<string, string[]> {
  // USER REQUEST: ALL VALIDATION REMOVED
  return {};
}

/**
 * Check if a string is a valid URI
 * NO VALIDATION - Always returns true
 * 
 * @param uri - String to validate
 * @returns Always true
 */
function isValidURI(uri: string): boolean {
  // USER REQUEST: ALL VALIDATION REMOVED
  return true;
}

/**
 * Check if a string is a valid Ethereum address
 * NO VALIDATION - Always returns true
 * 
 * @param address - String to validate
 * @returns Always true
 */
function isValidAddress(address: string): boolean {
  // USER REQUEST: ALL VALIDATION REMOVED
  return true;
}
