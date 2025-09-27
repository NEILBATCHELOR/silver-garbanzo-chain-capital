/**
 * Unblock Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';

export class UnblockValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.to) {
      errors.push({
        field: 'to',
        message: 'Address to unblock is required',
        code: 'MISSING_ADDRESS'
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
    
    // Check if address is blocked
    if (request.parameters.to) {
      const isBlocked = await this.isAddressBlocked(
        request.parameters.to,
        request.tokenAddress
      );
      
      if (!isBlocked) {
        errors.push({
          field: 'to',
          message: 'Address is not blocked',
          code: 'NOT_BLOCKED'
        });
      }
    }
    
    // Check unblock authority
    if (request.parameters.from) {
      const hasUnblockAuthority = await this.checkUnblockAuthority(
        request.parameters.from,
        request.tokenAddress
      );
      
      if (!hasUnblockAuthority) {
        errors.push({
          field: 'authority',
          message: 'Address does not have unblock authority',
          code: 'NO_UNBLOCK_AUTHORITY'
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
    return true; // Simplified for now
  }
  
  private async checkUnblockAuthority(address: string, tokenAddress: string): Promise<boolean> {
    // Check if address has authority to unblock addresses
    return true; // Simplified for now
  }
}