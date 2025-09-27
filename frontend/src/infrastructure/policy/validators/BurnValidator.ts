/**
 * BurnValidator.ts
 * Validation logic for burn operations
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class BurnValidator implements OperationValidator {
  async validate(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check required parameters
    if (!operation.amount || BigInt(operation.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for burn operation',
        code: 'INVALID_AMOUNT'
      });
    }

    if (!operation.from && !context.user.address) {
      errors.push({
        field: 'from',
        message: 'Source address is required for burn operation',
        code: 'MISSING_SOURCE'
      });
    }

    const fromAddress = operation.from || context.user.address;

    // Check burn authority
    const hasBurnAuthority = await this.checkBurnAuthority(
      context.user.address,
      context.token.id
    );

    if (!hasBurnAuthority) {
      errors.push({
        field: 'authority',
        message: 'Address does not have burn authority',
        code: 'NO_BURN_AUTHORITY'
      });
    }

    // Check token balance
    const balanceCheck = await this.checkBalance(
      fromAddress,
      context.token.id,
      BigInt(operation.amount || 0)
    );

    if (!balanceCheck.valid) {
      errors.push({
        field: 'amount',
        message: balanceCheck.message || 'Insufficient balance',
        code: 'INSUFFICIENT_BALANCE'
      });
    }

    // Check if token is burnable
    const isBurnable = await this.checkTokenBurnable(context.token.id);
    
    if (!isBurnable) {
      errors.push({
        field: 'token',
        message: 'Token is not burnable',
        code: 'TOKEN_NOT_BURNABLE'
      });
    }

    // Check minimum supply
    const minSupplyCheck = await this.checkMinimumSupply(
      context.token.id,
      BigInt(operation.amount || 0)
    );
    
    if (!minSupplyCheck.valid) {
      errors.push({
        field: 'amount',
        message: minSupplyCheck.message || 'Would violate minimum supply',
        code: 'MIN_SUPPLY_VIOLATION'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async checkBurnAuthority(
    userAddress: string,
    tokenId: string
  ): Promise<boolean> {
    try {
      // Check if user has burn role for this token
      const { data, error } = await supabase
        .from('token_operations')
        .select('id')
        .eq('token_id', tokenId)
        .eq('operator', userAddress)
        .eq('operation_type', 'burn')
        .limit(1);

      if (error) {
        console.error('Error checking burn authority:', error);
        return false;
      }

      // Simplified check - real implementation would check roles
      return data && data.length > 0;
      
    } catch (error) {
      console.error('Error checking burn authority:', error);
      return false;
    }
  }

  private async checkBalance(
    address: string,
    tokenId: string,
    amount: bigint
  ): Promise<{ valid: boolean; message?: string }> {
    // In a real implementation, this would check blockchain state
    // For now, return a simplified check
    return {
      valid: true,
      message: 'Balance check requires blockchain integration'
    };
  }

  private async checkTokenBurnable(tokenId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('metadata')
        .eq('id', tokenId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check metadata for burnable flag
      const metadata = data.metadata as any;
      return metadata?.burnable !== false;
      
    } catch (error) {
      console.error('Error checking token burnable:', error);
      return false;
    }
  }

  private async checkMinimumSupply(
    tokenId: string,
    amount: bigint
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('total_supply, metadata')
        .eq('id', tokenId)
        .single();

      if (error || !data) {
        return { valid: false, message: 'Failed to check minimum supply' };
      }

      const metadata = data.metadata as any;
      const minSupply = metadata?.minSupply;
      
      if (!minSupply) {
        return { valid: true }; // No minimum set
      }

      const currentSupply = BigInt(data.total_supply || 0);
      const newSupply = currentSupply - amount;
      const minimum = BigInt(minSupply);

      if (newSupply < minimum) {
        return {
          valid: false,
          message: `Burning ${amount} would violate minimum supply of ${minimum}`
        };
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Error checking minimum supply:', error);
      return { valid: false, message: 'Failed to verify minimum supply' };
    }
  }
}
