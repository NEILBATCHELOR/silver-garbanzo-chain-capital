/**
 * Lock Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';
import { supabase } from '../../supabaseClient';

export class LockValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.from) {
      errors.push({
        field: 'from',
        message: 'Owner address is required for lock operation',
        code: 'MISSING_OWNER'
      });
    }
    
    if (!request.parameters.amount || BigInt(request.parameters.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for lock operation',
        code: 'INVALID_AMOUNT'
      });
    }
    
    // Validate lock duration
    if (!request.parameters.duration || request.parameters.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Lock duration must be positive',
        code: 'INVALID_DURATION'
      });
    }
    
    // Check maximum lock duration
    const maxDuration = await this.getMaxLockDuration(request.tokenAddress);
    if (request.parameters.duration && request.parameters.duration > maxDuration) {
      errors.push({
        field: 'duration',
        message: `Lock duration exceeds maximum of ${maxDuration} seconds`,
        code: 'DURATION_EXCEEDS_MAX'
      });
    }
    
    // Validate lock reason
    if (!request.parameters.reason) {
      errors.push({
        field: 'reason',
        message: 'Lock reason is required',
        code: 'MISSING_REASON'
      });
    }
    
    // Validate address format
    if (request.parameters.from && !ethers.isAddress(request.parameters.from)) {
      errors.push({
        field: 'from',
        message: 'Invalid owner address format',
        code: 'INVALID_ADDRESS'
      });
    }
    
    // Check if tokens are available for locking
    if (request.parameters.from && request.parameters.amount) {
      const balance = await this.getBalance(request.parameters.from, request.tokenAddress);
      const lockAmount = BigInt(request.parameters.amount);
      
      if (balance < lockAmount) {
        errors.push({
          field: 'amount',
          message: 'Insufficient balance for lock operation',
          code: 'INSUFFICIENT_BALANCE'
        });
      }
      
      // Check for existing locks
      const existingLocks = await this.getExistingLocks(
        request.parameters.from,
        request.tokenAddress
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
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  private async getBalance(address: string, tokenAddress: string): Promise<bigint> {
    // Get balance from blockchain or database
    return BigInt(0); // Simplified for now
  }
  
  private async getMaxLockDuration(tokenAddress: string): Promise<number> {
    // Get max lock duration from token configuration
    return 365 * 24 * 60 * 60; // 1 year in seconds
  }
  
  private async getExistingLocks(address: string, tokenAddress: string): Promise<any[]> {
    const { data } = await supabase
      .from('token_locks')
      .select('*')
      .eq('owner', address)
      .eq('token_address', tokenAddress)
      .eq('status', 'locked');
    
    return data || [];
  }
}