/**
 * TransferValidator.ts
 * Validation logic for transfer operations
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class TransferValidator implements OperationValidator {
  async validate(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check required parameters
    if (!operation.from) {
      errors.push({
        field: 'from',
        message: 'Source address is required for transfer',
        code: 'MISSING_SOURCE'
      });
    }

    if (!operation.to) {
      errors.push({
        field: 'to',
        message: 'Recipient address is required for transfer',
        code: 'MISSING_RECIPIENT'
      });
    }

    if (!operation.amount || BigInt(operation.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for transfer',
        code: 'INVALID_AMOUNT'
      });
    }

    // Validate addresses
    if (operation.from && !this.isValidAddress(operation.from, context.token.chainId)) {
      errors.push({
        field: 'from',
        message: 'Invalid source address format',
        code: 'INVALID_SOURCE_ADDRESS'
      });
    }

    if (operation.to && !this.isValidAddress(operation.to, context.token.chainId)) {
      errors.push({
        field: 'to',
        message: 'Invalid recipient address format',
        code: 'INVALID_RECIPIENT_ADDRESS'
      });
    }

    // Check if self-transfer
    if (operation.from && operation.to) {
      if (operation.from.toLowerCase() === operation.to.toLowerCase()) {
        errors.push({
          field: 'to',
          message: 'Self-transfers are not allowed',
          code: 'SELF_TRANSFER'
        });
      }
    }

    // Check transfer authorization
    const hasTransferAuth = await this.checkTransferAuthorization(
      context.user.address,
      operation.from || context.user.address
    );

    if (!hasTransferAuth) {
      errors.push({
        field: 'authority',
        message: 'Not authorized to transfer from this address',
        code: 'NO_TRANSFER_AUTHORITY'
      });
    }

    // Check if token is transferable
    const isTransferable = await this.checkTokenTransferable(context.token.id);
    
    if (!isTransferable) {
      errors.push({
        field: 'token',
        message: 'Token is not transferable',
        code: 'TOKEN_NOT_TRANSFERABLE'
      });
    }

    // Check if tokens are locked
    if (operation.from) {
      const lockCheck = await this.checkTokenLocks(
        operation.from,
        context.token.id,
        BigInt(operation.amount || 0)
      );

      if (!lockCheck.valid) {
        errors.push({
          field: 'amount',
          message: lockCheck.message || 'Tokens are locked',
          code: 'TOKENS_LOCKED'
        });
      }
    }

    // Check KYC requirements
    if (operation.to) {
      const kycCheck = await this.checkKYCRequirements(
        operation.to,
        context.token.id
      );

      if (!kycCheck.valid) {
        errors.push({
          field: 'to',
          message: kycCheck.message || 'Recipient KYC required',
          code: 'KYC_REQUIRED'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidAddress(address: string, chainId: string): boolean {
    // Basic Ethereum address validation
    if (chainId.toLowerCase().includes('ethereum') || 
        chainId.toLowerCase().includes('polygon')) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    
    // Add other chain validations as needed
    return true;
  }

  private async checkTransferAuthorization(
    userAddress: string,
    fromAddress: string
  ): Promise<boolean> {
    // Check if user is authorized to transfer from address
    // In simplest case, user can only transfer from their own address
    return userAddress.toLowerCase() === fromAddress.toLowerCase();
  }

  private async checkTokenTransferable(tokenId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('metadata')
        .eq('id', tokenId)
        .single();

      if (error || !data) {
        return true; // Default to transferable
      }

      const metadata = data.metadata as any;
      return metadata?.transferable !== false;
      
    } catch (error) {
      console.error('Error checking token transferable:', error);
      return true;
    }
  }

  private async checkTokenLocks(
    address: string,
    tokenId: string,
    amount: bigint
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      // Check if there are any active locks
      const { data, error } = await supabase
        .from('token_operations')
        .select('amount, unlock_time')
        .eq('token_id', tokenId)
        .eq('operator', address)
        .eq('operation_type', 'lock')
        .eq('status', 'completed')
        .gte('unlock_time', new Date().toISOString());

      if (error) {
        return { valid: true }; // Default to no locks
      }

      if (!data || data.length === 0) {
        return { valid: true }; // No active locks
      }

      // Calculate total locked amount
      const totalLocked = data.reduce(
        (sum, lock) => sum + BigInt(lock.amount || 0),
        0n
      );

      // This would require checking actual balance
      // For now, just check if any locks exist
      if (totalLocked > 0n) {
        return {
          valid: false,
          message: `${totalLocked} tokens are currently locked`
        };
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Error checking token locks:', error);
      return { valid: true };
    }
  }

  private async checkKYCRequirements(
    address: string,
    tokenId: string
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      // Check if token requires KYC
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('metadata')
        .eq('id', tokenId)
        .single();

      if (tokenError || !tokenData) {
        return { valid: true }; // Default to no KYC required
      }

      const metadata = tokenData.metadata as any;
      
      if (!metadata?.requireKYC) {
        return { valid: true }; // No KYC required
      }

      // Check if address has KYC
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('kyc_status')
        .eq('wallet_address', address)
        .single();

      if (userError || !userData) {
        return {
          valid: false,
          message: 'Recipient address not registered or KYC not completed'
        };
      }

      if (userData.kyc_status !== 'approved') {
        return {
          valid: false,
          message: `Recipient KYC status: ${userData.kyc_status || 'pending'}`
        };
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Error checking KYC requirements:', error);
      return { valid: true };
    }
  }
}
