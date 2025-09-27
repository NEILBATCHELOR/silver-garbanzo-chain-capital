/**
 * Validators Index
 * Exports all operation validators for policy enforcement
 */

export { MintValidator } from './MintValidator';
export { BurnValidator } from './BurnValidator';
export { TransferValidator } from './TransferValidator';
export { LockValidator } from './LockValidator';
export { UnlockValidator } from './UnlockValidator';
export { BlockValidator } from './BlockValidator';
export { UnblockValidator } from './UnblockValidator';

// Re-export types for convenience
export type { 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';

// Validator factory
import { MintValidator } from './MintValidator';
import { BurnValidator } from './BurnValidator';
import { TransferValidator } from './TransferValidator';
import { LockValidator } from './LockValidator';
import { UnlockValidator } from './UnlockValidator';
import { BlockValidator } from './BlockValidator';
import { UnblockValidator } from './UnblockValidator';
import type { OperationType, OperationValidator } from '../types';

export class ValidatorFactory {
  private static validators = new Map<OperationType, OperationValidator>();

  static {
    // Initialize validators
    this.validators.set('mint', new MintValidator());
    this.validators.set('burn', new BurnValidator());
    this.validators.set('transfer', new TransferValidator());
    this.validators.set('lock', new LockValidator());
    this.validators.set('unlock', new UnlockValidator());
    this.validators.set('block', new BlockValidator());
    this.validators.set('unblock', new UnblockValidator());
  }

  static getValidator(type: OperationType): OperationValidator | undefined {
    return this.validators.get(type);
  }

  static getAllValidators(): Map<OperationType, OperationValidator> {
    return new Map(this.validators);
  }
}
