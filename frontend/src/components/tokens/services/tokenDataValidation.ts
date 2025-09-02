/**
 * Token Data Validation Service
 * Provides validation functions for token data to ensure integrity
 * Uses Zod schemas for validation
 */
import { TokenFormData } from '../types';
import { TokenStandard } from '@/types/core/centralModels';
import {
  tokenBaseSchema,
  erc20Schema,
  erc721Schema,
  erc1155Schema,
  erc1400Schema,
  erc3525Schema,
  erc4626Schema
} from '../validation/schemas';
import { validateForm, parseValidationErrors } from '../validation/formErrorParser';
import { standardToEnum } from '../validation/schemaAdapters';

// Re-export the validation result interface to maintain API compatibility
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Re-export the validation error interface to maintain API compatibility
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Get the appropriate schema for a token standard
 * @param standard Token standard
 * @returns Zod schema for the token standard
 */
function getSchemaForStandard(standard: TokenStandard) {
  switch (standard) {
    case TokenStandard.ERC20:
      return erc20Schema;
    case TokenStandard.ERC721:
      return erc721Schema;
    case TokenStandard.ERC1155:
      return erc1155Schema;
    case TokenStandard.ERC1400:
      return erc1400Schema;
    case TokenStandard.ERC3525:
      return erc3525Schema;
    case TokenStandard.ERC4626:
      return erc4626Schema;
    default:
      return tokenBaseSchema;
  }
}

/**
 * Convert validation result to our ValidationResult format
 * @param validationResult Result from validateForm function
 * @returns ValidationResult with formatted errors
 */
function validationResultToValidationResult(validationResult: any): ValidationResult {
  if (validationResult.isValid || validationResult.valid) {
    return { valid: true, errors: [] };
  }
  
  const validationErrors: ValidationError[] = [];
  
  // Handle both array and object error formats
  if (Array.isArray(validationResult.errors)) {
    // Handle array format (legacy)
    validationResult.errors.forEach((errorMessage: string) => {
      // Parse field name from error message format "field.path: message"
      const parts = errorMessage.split(': ');
      if (parts.length >= 2) {
        validationErrors.push({
          field: parts[0],
          message: parts.slice(1).join(': ')
        });
      } else {
        validationErrors.push({
          field: 'general',
          message: errorMessage
        });
      }
    });
  } else if (validationResult.errors && typeof validationResult.errors === 'object') {
    // Handle object format (current Zod output)
    Object.entries(validationResult.errors).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        messages.forEach((message: string) => {
          validationErrors.push({
            field,
            message
          });
        });
      } else if (typeof messages === 'string') {
        validationErrors.push({
          field,
          message: messages
        });
      }
    });
  }
  
  return {
    valid: false,
    errors: validationErrors
  };
}

/**
 * NO VALIDATION - Always returns valid
 * ALL VALIDATION REMOVED per user request
 * @param data Token data to validate
 * @param skipValidation Optional flag to skip validation (used during JSON upload)
 * @returns Always valid result
 */
export function validateTokenData(
  data: Partial<TokenFormData>,
  skipValidation: boolean = false
): ValidationResult {
  // VALIDATION REMOVED - Always return valid
  console.log('[TokenDataValidation] Validation disabled - always returning valid');
  return { valid: true, errors: [] };
  

}

/**
 * NO VALIDATION - Always returns valid for all tokens
 * @param tokensData Array of token data to validate
 * @returns Array of validation results with index (all valid)
 */
export function validateBatchTokenData(
  tokensData: Partial<TokenFormData>[]
): { index: number; tokenData: Partial<TokenFormData>; validation: ValidationResult }[] {
  return tokensData.map((tokenData, index) => ({
    index,
    tokenData,
    validation: { valid: true, errors: [] } // VALIDATION REMOVED
  }));
}

/**
 * NO VALIDATION - Always returns valid summary
 * @param validationResults Array of validation results
 * @returns Summary showing all tokens as valid
 */
export function getBatchValidationSummary(
  validationResults: { index: number; tokenData: Partial<TokenFormData>; validation: ValidationResult }[]
): { valid: boolean; invalidCount: number; validCount: number; errors: any[] } {
  // VALIDATION REMOVED - Always return all valid
  return {
    valid: true,
    invalidCount: 0,
    validCount: validationResults.length,
    errors: []
  };
} 