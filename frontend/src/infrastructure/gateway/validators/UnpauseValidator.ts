/**
 * Unpause Operation Validator
 * Note: Uses same logic as PauseValidator but specific to unpause operations
 */

import { PauseValidator } from './PauseValidator';

/**
 * Unpause validator - extends PauseValidator with same validation logic
 * The only difference is the operation type check, which is already handled
 * in the parent class's validate method
 */
export class UnpauseValidator extends PauseValidator {
  // Inherits all validation logic from PauseValidator
  // The parent's validate() method already handles both pause and unpause
  // by checking request.type === 'pause' or 'unpause'
}
