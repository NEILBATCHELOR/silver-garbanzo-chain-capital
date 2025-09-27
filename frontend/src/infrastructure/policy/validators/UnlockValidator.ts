/**
 * UnlockValidator.ts
 * Validation logic for unlock operations
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class UnlockValidator implements OperationValidator {
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
        message: 'Token holder address is required for unlock operation',
        code: 'MISSING_FROM_ADDRESS'
      });
    }

    if (!operation.amount || BigInt(operation.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for unlock operation',
        code: 'INVALID_AMOUNT'
      });
    }

    // Check if there's a lock ID or token ID
    if (!operation.tokenId && !operation.metadata?.lockId) {
      errors.push({
        field: 'tokenId',
        message: 'Lock identifier is required for unlock operation',
        code: 'MISSING_LOCK_ID'
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

    // Check if lock exists and is valid
    if (operation.from && (operation.tokenId || operation.metadata?.lockId)) {
      const lockId = operation.tokenId || operation.metadata?.lockId;
      const lock = await this.getLockDetails(lockId, operation.from);

      if (!lock) {
        errors.push({
          field: 'lock',
          message: 'Lock not found or does not belong to user',
          code: 'LOCK_NOT_FOUND'
        });
      } else {
        // Check if lock has expired
        const now = Date.now();
        const unlockTime = new Date(lock.unlock_time).getTime();
        
        if (unlockTime > now) {
          const remainingTime = Math.floor((unlockTime - now) / 1000);
          errors.push({
            field: 'unlock_time',
            message: `Lock is still active. Remaining time: ${remainingTime} seconds`,
            code: 'LOCK_NOT_EXPIRED'
          });
        }

        // Check if amount matches
        if (operation.amount && BigInt(operation.amount) > BigInt(lock.amount)) {
          errors.push({
            field: 'amount',
            message: 'Unlock amount exceeds locked amount',
            code: 'AMOUNT_EXCEEDED'
          });
        }

        // Check lock status
        if (lock.status === 'unlocked') {
          errors.push({
            field: 'status',
            message: 'Lock has already been unlocked',
            code: 'ALREADY_UNLOCKED'
          });
        }

        if (lock.status === 'cancelled') {
          errors.push({
            field: 'status',
            message: 'Lock has been cancelled',
            code: 'LOCK_CANCELLED'
          });
        }
      }
    }

    // Check unlock permissions
    const hasUnlockPermission = await this.checkUnlockPermission(
      context.user.address,
      context.token.address
    );

    if (!hasUnlockPermission) {
      // Check if user is the lock owner
      const isLockOwner = operation.from === context.user.address;
      
      if (!isLockOwner) {
        errors.push({
          field: 'permission',
          message: 'User does not have permission to unlock tokens',
          code: 'NO_UNLOCK_PERMISSION'
        });
      }
    }

    // Check for early unlock penalties
    if (operation.metadata?.earlyUnlock) {
      const penalty = await this.calculateEarlyUnlockPenalty(
        operation.tokenId || operation.metadata?.lockId,
        context.token.address
      );

      if (penalty > 0) {
        warnings.push(`Early unlock will incur a ${penalty}% penalty`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async getLockDetails(
    lockId: string,
    address: string
  ): Promise<any> {
    // Query lock details
    const { data } = await supabase
      .from('token_operations')
      .select('*')
      .eq('id', lockId)
      .eq('operator', address)
      .eq('operation_type', 'lock')
      .single();

    return data;
  }

  private async checkUnlockPermission(
    userAddress: string,
    tokenAddress: string
  ): Promise<boolean> {
    // Check if user has permission to unlock tokens
    const { data } = await supabase
      .from('token_permissions')
      .select('permission')
      .eq('wallet_address', userAddress)
      .eq('token_address', tokenAddress)
      .in('permission', ['unlock', 'admin', 'owner']);

    return data && data.length > 0;
  }

  private async calculateEarlyUnlockPenalty(
    lockId: string,
    tokenAddress: string
  ): Promise<number> {
    // Get lock details
    const { data: lock } = await supabase
      .from('token_operations')
      .select('created_at, unlock_time, lock_duration')
      .eq('id', lockId)
      .single();

    if (!lock) return 0;

    const now = Date.now();
    const unlockTime = new Date(lock.unlock_time).getTime();
    
    // If lock has expired, no penalty
    if (unlockTime <= now) return 0;

    // Get penalty configuration
    const { data: config } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `early_unlock_penalty_${tokenAddress}`)
      .single();

    const basePenalty = config?.value || 10; // Default 10% penalty

    // Calculate penalty based on time remaining
    const totalDuration = lock.lock_duration * 1000;
    const elapsed = now - new Date(lock.created_at).getTime();
    const percentComplete = (elapsed / totalDuration) * 100;

    // Reduce penalty based on time served
    const penalty = basePenalty * (1 - percentComplete / 100);
    
    return Math.max(0, Math.min(basePenalty, penalty));
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
