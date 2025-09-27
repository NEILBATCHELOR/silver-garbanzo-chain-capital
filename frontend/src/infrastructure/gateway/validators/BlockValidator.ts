/**
 * Block Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';

export class BlockValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.to) {
      errors.push({
        field: 'to',
        message: 'Address to block is required',
        code: 'MISSING_ADDRESS'
      });
    }
    
    // Validate block reason
    if (!request.parameters.reason) {
      errors.push({
        field: 'reason',
        message: 'Block reason is required',
        code: 'MISSING_REASON'
      });
    }
    
    // Validate address format
    if (request.parameters.to && !ethers.isAddress(request.parameters.to)) {
      errors.push({
        field: 'to',
        message: 'Invalid address format',
        code: 'INVALID_ADDRESS'
      });
    }
    
    // Check if address is already blocked
    if (request.parameters.to) {
      const isBlocked = await this.isAddressBlocked(
        request.parameters.to,
        request.tokenAddress
      );
      
      if (isBlocked) {
        errors.push({
          field: 'to',
          message: 'Address is already blocked',
          code: 'ALREADY_BLOCKED'
        });
      }
    }
    
    // Check block authority
    if (request.parameters.from) {
      const hasBlockAuthority = await this.checkBlockAuthority(
        request.parameters.from,
        request.tokenAddress
      );
      
      if (!hasBlockAuthority) {
        errors.push({
          field: 'authority',
          message: 'Address does not have block authority',
          code: 'NO_BLOCK_AUTHORITY'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  private async isAddressBlocked(address: string, tokenAddress: string): Promise<boolean> {
    // Check if address is blocked for this token
    return false; // Simplified for now
  }
  
  private async checkBlockAuthority(address: string, tokenAddress: string): Promise<boolean> {
    // Check if address has authority to block addresses
    return true; // Simplified for now
  }
}