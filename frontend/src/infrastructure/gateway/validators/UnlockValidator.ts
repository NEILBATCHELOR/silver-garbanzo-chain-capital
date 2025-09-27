/**
 * Unlock Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';
import { supabase } from '../../supabaseClient';

export class UnlockValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.from) {
      errors.push({
        field: 'from',
        message: 'Owner address is required for unlock operation',
        code: 'MISSING_OWNER'
      });
    }
    
    if (!request.parameters.tokenId && !request.parameters.amount) {
      errors.push({
        field: 'identifier',
        message: 'Token ID or amount is required for unlock operation',
        code: 'MISSING_IDENTIFIER'
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
    
    // Check if lock exists and is unlockable
    if (request.parameters.from) {
      const lock = await this.getLockInfo(
        request.parameters.from,
        request.tokenAddress,
        request.parameters.tokenId
      );
      
      if (!lock) {
        errors.push({
          field: 'lock',
          message: 'No lock found for this token',
          code: 'LOCK_NOT_FOUND'
        });
      } else if (!this.isUnlockable(lock)) {
        errors.push({
          field: 'lock',
          message: `Lock period not yet expired. Unlock available at ${lock.unlock_time}`,
          code: 'LOCK_PERIOD_ACTIVE'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  private async getLockInfo(address: string, tokenAddress: string, tokenId?: string): Promise<any> {
    const query = supabase
      .from('token_locks')
      .select('*')
      .eq('owner', address)
      .eq('token_address', tokenAddress)
      .eq('status', 'locked');
    
    if (tokenId) {
      query.eq('token_id', tokenId);
    }
    
    const { data } = await query.single();
    return data;
  }
  
  private isUnlockable(lock: any): boolean {
    const now = new Date().getTime();
    const unlockTime = new Date(lock.unlock_time).getTime();
    return now >= unlockTime;
  }
}