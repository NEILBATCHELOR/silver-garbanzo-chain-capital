/**
 * MintValidator.ts
 * Validation logic for mint operations
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class MintValidator implements OperationValidator {
  async validate(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Check required parameters
    if (!operation.to) {
      errors.push({
        field: 'to',
        message: 'Recipient address is required for mint operation',
        code: 'MISSING_RECIPIENT'
      });
    }

    if (!operation.amount || BigInt(operation.amount) <= 0n) {
      errors.push({
        field: 'amount',
        message: 'Valid amount is required for mint operation',
        code: 'INVALID_AMOUNT'
      });
    }

    // Validate address format
    if (operation.to && !this.isValidAddress(operation.to, context.token.chainId)) {
      errors.push({
        field: 'to',
        message: 'Invalid recipient address format',
        code: 'INVALID_ADDRESS'
      });
    }

    // Check mint authority
    const hasMintAuthority = await this.checkMintAuthority(
      context.user.address,
      context.token.id
    );

    if (!hasMintAuthority) {
      errors.push({
        field: 'authority',
        message: 'Address does not have mint authority',
        code: 'NO_MINT_AUTHORITY'
      });
    }

    // Check token is mintable
    const isMintable = await this.checkTokenMintable(context.token.id);
    
    if (!isMintable) {
      errors.push({
        field: 'token',
        message: 'Token is not mintable',
        code: 'TOKEN_NOT_MINTABLE'
      });
    }

    // Check supply cap if applicable
    const supplyCheck = await this.checkSupplyCap(
      context.token.id,
      BigInt(operation.amount || 0)
    );
    
    if (!supplyCheck.valid) {
      errors.push({
        field: 'amount',
        message: supplyCheck.message || 'Supply cap exceeded',
        code: 'SUPPLY_CAP_EXCEEDED'
      });
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

  private async checkMintAuthority(
    userAddress: string,
    tokenId: string
  ): Promise<boolean> {
    try {
      // Check if user has minter role for this token
      const { data, error } = await supabase
        .from('token_operations')
        .select('id')
        .eq('token_id', tokenId)
        .eq('operator', userAddress)
        .eq('operation_type', 'mint')
        .limit(1);

      if (error) {
        console.error('Error checking mint authority:', error);
        return false;
      }

      // If user has minted before, they likely have authority
      // This is a simplified check - real implementation would check roles
      return data && data.length > 0;
      
    } catch (error) {
      console.error('Error checking mint authority:', error);
      return false;
    }
  }

  private async checkTokenMintable(tokenId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('metadata')
        .eq('id', tokenId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check metadata for mintable flag
      const metadata = data.metadata as any;
      return metadata?.mintable !== false;
      
    } catch (error) {
      console.error('Error checking token mintable:', error);
      return false;
    }
  }

  private async checkSupplyCap(
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
        return { valid: false, message: 'Failed to check supply cap' };
      }

      const metadata = data.metadata as any;
      const maxSupply = metadata?.maxSupply;
      
      if (!maxSupply) {
        return { valid: true }; // No cap set
      }

      const currentSupply = BigInt(data.total_supply || 0);
      const newSupply = currentSupply + amount;
      const cap = BigInt(maxSupply);

      if (newSupply > cap) {
        return {
          valid: false,
          message: `Minting ${amount} would exceed supply cap of ${cap}`
        };
      }

      return { valid: true };
      
    } catch (error) {
      console.error('Error checking supply cap:', error);
      return { valid: false, message: 'Failed to verify supply cap' };
    }
  }
}
