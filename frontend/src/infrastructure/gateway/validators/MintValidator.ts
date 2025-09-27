/**
 * Mint Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';
import { supabase } from '../../supabaseClient';

export class MintValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check required parameters
    if (!request.parameters.to) {
      errors.push({
        field: 'to',
        message: 'Recipient address is required for mint operation',
        code: 'MISSING_RECIPIENT'
      });
    }
    
    if (!request.parameters.amount || BigInt(request.parameters.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for mint operation',
        code: 'INVALID_AMOUNT'
      });
    }
    
    // Validate address format
    if (request.parameters.to && !ethers.isAddress(request.parameters.to)) {
      errors.push({
        field: 'to',
        message: 'Invalid recipient address format',
        code: 'INVALID_ADDRESS'
      });
    }
    
    // Check token exists and is mintable
    const token = await this.getTokenInfo(request.tokenAddress, request.chain);
    if (!token) {
      errors.push({
        field: 'token',
        message: 'Token not found',
        code: 'TOKEN_NOT_FOUND'
      });
    } else if (!token.mintable) {
      errors.push({
        field: 'token',
        message: 'Token is not mintable',
        code: 'TOKEN_NOT_MINTABLE'
      });
    }
    
    // Check mint authority
    if (request.parameters.from) {
      const hasMintAuthority = await this.checkMintAuthority(
        request.parameters.from,
        request.tokenAddress
      );
      
      if (!hasMintAuthority) {
        errors.push({
          field: 'authority',
          message: 'Address does not have mint authority',
          code: 'NO_MINT_AUTHORITY'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  private async getTokenInfo(tokenAddress: string, chain: string): Promise<any> {
    const { data } = await supabase
      .from('tokens')
      .select('*')
      .eq('address', tokenAddress)
      .eq('chain', chain)
      .single();
    
    return data;
  }
  
  private async checkMintAuthority(address: string, tokenAddress: string): Promise<boolean> {
    // Check if address has mint authority for the token
    // This would check the smart contract or database for permissions
    return true; // Simplified for now
  }
}