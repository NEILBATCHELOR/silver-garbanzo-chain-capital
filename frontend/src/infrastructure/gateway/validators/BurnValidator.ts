/**
 * Burn Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';
import { supabase } from '../../supabaseClient';

export class BurnValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.from) {
      errors.push({
        field: 'from',
        message: 'Source address is required for burn operation',
        code: 'MISSING_SOURCE'
      });
    }
    
    if (!request.parameters.amount || BigInt(request.parameters.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for burn operation',
        code: 'INVALID_AMOUNT'
      });
    }
    
    // Validate address format
    if (request.parameters.from && !ethers.isAddress(request.parameters.from)) {
      errors.push({
        field: 'from',
        message: 'Invalid source address format',
        code: 'INVALID_ADDRESS'
      });
    }
    
    // Check balance
    if (request.parameters.from && request.parameters.amount) {
      const balance = await this.getBalance(request.parameters.from, request.tokenAddress);
      const burnAmount = BigInt(request.parameters.amount);
      
      if (balance < burnAmount) {
        errors.push({
          field: 'amount',
          message: 'Insufficient balance for burn operation',
          code: 'INSUFFICIENT_BALANCE'
        });
      }
    }
    
    // Check burn authority
    if (request.parameters.from) {
      const hasBurnAuthority = await this.checkBurnAuthority(
        request.parameters.from,
        request.tokenAddress
      );
      
      if (!hasBurnAuthority) {
        errors.push({
          field: 'authority',
          message: 'Address does not have burn authority',
          code: 'NO_BURN_AUTHORITY'
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
  
  private async checkBurnAuthority(address: string, tokenAddress: string): Promise<boolean> {
    // Check if address has burn authority for the token
    return true; // Simplified for now
  }
}