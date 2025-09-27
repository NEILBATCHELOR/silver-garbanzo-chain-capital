/**
 * Transfer Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';

export class TransferValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.from) {
      errors.push({
        field: 'from',
        message: 'Source address is required for transfer operation',
        code: 'MISSING_SOURCE'
      });
    }
    
    if (!request.parameters.to) {
      errors.push({
        field: 'to',
        message: 'Destination address is required for transfer operation',
        code: 'MISSING_DESTINATION'
      });
    }
    
    if (!request.parameters.amount || BigInt(request.parameters.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for transfer operation',
        code: 'INVALID_AMOUNT'
      });
    }
    
    // Validate address formats
    if (request.parameters.from && !ethers.isAddress(request.parameters.from)) {
      errors.push({
        field: 'from',
        message: 'Invalid source address format',
        code: 'INVALID_SOURCE_ADDRESS'
      });
    }
    
    if (request.parameters.to && !ethers.isAddress(request.parameters.to)) {
      errors.push({
        field: 'to',
        message: 'Invalid destination address format',
        code: 'INVALID_DESTINATION_ADDRESS'
      });
    }
    
    // Check same address transfer
    if (request.parameters.from === request.parameters.to) {
      errors.push({
        field: 'to',
        message: 'Cannot transfer to same address',
        code: 'SAME_ADDRESS'
      });
    }
    
    // Check balance
    if (request.parameters.from && request.parameters.amount) {
      const balance = await this.getBalance(request.parameters.from, request.tokenAddress);
      const transferAmount = BigInt(request.parameters.amount);
      
      if (balance < transferAmount) {
        errors.push({
          field: 'amount',
          message: 'Insufficient balance for transfer',
          code: 'INSUFFICIENT_BALANCE'
        });
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
}