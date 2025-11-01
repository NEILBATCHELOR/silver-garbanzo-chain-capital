/**
 * Pause Operation Validator
 */

import { ethers } from 'ethers';
import type { OperationRequest, OperationValidator, ValidationResult, ValidationError } from '../types';
import { supabase } from '../../supabaseClient';

export class PauseValidator implements OperationValidator {
  async validate(request: OperationRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check token exists and is pausable
    const token = await this.getTokenInfo(request.tokenAddress, request.chain);
    if (!token) {
      errors.push({
        field: 'token',
        message: 'Token not found',
        code: 'TOKEN_NOT_FOUND'
      });
    } else if (!token.pausable) {
      errors.push({
        field: 'token',
        message: 'Token is not pausable',
        code: 'TOKEN_NOT_PAUSABLE'
      });
    }
    
    // Check pause authority
    if (request.parameters.from) {
      const hasPauseAuthority = await this.checkPauseAuthority(
        request.parameters.from,
        request.tokenAddress
      );
      
      if (!hasPauseAuthority) {
        errors.push({
          field: 'authority',
          message: 'Address does not have pause authority',
          code: 'NO_PAUSE_AUTHORITY'
        });
      }
    }
    
    // For pause operation, check if token is already paused
    if (request.type === 'pause') {
      const isPaused = await this.checkTokenPauseStatus(request.tokenAddress);
      if (isPaused) {
        errors.push({
          field: 'token',
          message: 'Token is already paused',
          code: 'TOKEN_ALREADY_PAUSED'
        });
      }
    }
    
    // For unpause operation, check if token is actually paused
    if (request.type === 'unpause') {
      const isPaused = await this.checkTokenPauseStatus(request.tokenAddress);
      if (!isPaused) {
        errors.push({
          field: 'token',
          message: 'Token is not paused',
          code: 'TOKEN_NOT_PAUSED'
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
  
  private async checkPauseAuthority(address: string, tokenAddress: string): Promise<boolean> {
    // Check if address has pause authority for the token
    // This would check the smart contract or database for PAUSER_ROLE permissions
    return true; // Simplified for now
  }
  
  private async checkTokenPauseStatus(tokenAddress: string): Promise<boolean> {
    // Query the token contract to check if it's currently paused
    // This would call the paused() view function on the contract
    return false; // Simplified for now
  }
}