/**
 * LockValidator.ts
 * Validation logic for lock operations
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class LockValidator implements OperationValidator {
  async validate(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check required parameters
    if (!operation.from) {
      errors.push({
        field: 'from',
        message: 'Token holder address is required for lock operation',
        code: 'MISSING_FROM_ADDRESS'
      });
    }

    if (!operation.amount || BigInt(operation.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for lock operation',
        code: 'INVALID_AMOUNT'
      });
    }

    // Validate lock duration
    if (!operation.lockDuration || operation.lockDuration <= 0) {
      errors.push({
        field: 'lockDuration',
        message: 'Lock duration must be positive',
        code: 'INVALID_DURATION'
      });
    }

    // Check maximum lock duration
    const maxDuration = await this.getMaxLockDuration(context.token.address);
    if (operation.lockDuration && operation.lockDuration > maxDuration) {
      errors.push({
        field: 'lockDuration',
        message: `Lock duration exceeds maximum of ${maxDuration} seconds`,
        code: 'DURATION_EXCEEDED'
      });
    }

    // Validate lock reason
    if (!operation.lockReason) {
      warnings.push('Lock reason is recommended for audit purposes');
    } else if (operation.lockReason.length < 10) {
      errors.push({
        field: 'lockReason',
        message: 'Lock reason must be at least 10 characters',
        code: 'INVALID_REASON'
      });
    }

    // Validate address format
    if (operation.from && !this.isValidAddress(operation.from, context.token.chainId)) {
      errors.push({
        field: 'from',
        message: 'Invalid token holder address format',
        code: 'INVALID_ADDRESS'
      });
    }

    // Check if tokens are available for locking
    if (operation.from && operation.amount) {
      const balance = await this.getBalance(
        operation.from,
        context.token.address
      );

      const lockAmount = BigInt(operation.amount);
      if (balance < lockAmount) {
        errors.push({
          field: 'amount',
          message: 'Insufficient balance for lock operation',
          code: 'INSUFFICIENT_BALANCE'
        });
      }

      // Check for existing locks
      const existingLocks = await this.getExistingLocks(
        operation.from,
        context.token.address
      );

      if (existingLocks.length > 0) {
        const totalLocked = existingLocks.reduce(
          (sum, lock) => sum + BigInt(lock.amount),
          0n
        );

        if (balance - totalLocked < lockAmount) {
          errors.push({
            field: 'amount',
            message: 'Insufficient unlocked balance',
            code: 'INSUFFICIENT_UNLOCKED_BALANCE'
          });
        }

        // Warn about multiple locks
        if (existingLocks.length >= 5) {
          warnings.push(`User already has ${existingLocks.length} active locks`);
        }
      }
    }

    // Check lock permissions
    const hasLockPermission = await this.checkLockPermission(
      context.user.address,
      context.token.address
    );

    if (!hasLockPermission) {
      errors.push({
        field: 'permission',
        message: 'User does not have permission to lock tokens',
        code: 'NO_LOCK_PERMISSION'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async getMaxLockDuration(tokenAddress: string): Promise<number> {
    // Query from system_settings or token configuration
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `max_lock_duration_${tokenAddress}`)
      .single();

    return data?.value || 31536000; // Default: 1 year
  }

  private async getBalance(
    address: string,
    tokenAddress: string
  ): Promise<bigint> {
    // Query token balances
    const { data } = await supabase
      .from('token_balances')
      .select('balance')
      .eq('wallet_address', address)
      .eq('token_address', tokenAddress)
      .single();

    return data?.balance ? BigInt(data.balance) : 0n;
  }

  private async getExistingLocks(
    address: string,
    tokenAddress: string
  ): Promise<any[]> {
    // Query existing locks
    const { data } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operation_type', 'lock')
      .eq('operator', address)
      .eq('token_id', tokenAddress)
      .eq('status', 'active')
      .gte('unlock_time', new Date().toISOString());

    return data || [];
  }

  private async checkLockPermission(
    userAddress: string,
    tokenAddress: string
  ): Promise<boolean> {
    // Check if user has permission to lock tokens
    const { data } = await supabase
      .from('token_permissions')
      .select('permission')
      .eq('wallet_address', userAddress)
      .eq('token_address', tokenAddress)
      .in('permission', ['lock', 'admin', 'owner']);

    return data && data.length > 0;
  }

  private isValidAddress(address: string, chainId: string): boolean {
    // Basic Ethereum/EVM address validation
    if (chainId.startsWith('0x') || ['ethereum', 'polygon', 'avalanche'].includes(chainId)) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    
    // Add other chain validations as needed
    return true;
  }
}
