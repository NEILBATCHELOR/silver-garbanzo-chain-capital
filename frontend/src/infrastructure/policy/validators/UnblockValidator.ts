/**
 * UnblockValidator.ts
 * Validation logic for unblock operations (unfreezing assets)
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class UnblockValidator implements OperationValidator {
  async validate(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check required parameters
    if (!operation.from) {
      errors.push({
        field: 'from',
        message: 'Account address is required for unblock operation',
        code: 'MISSING_ADDRESS'
      });
    }

    // Validate unblock reason
    if (!operation.lockReason) {
      errors.push({
        field: 'lockReason',
        message: 'Unblock reason is required for audit purposes',
        code: 'MISSING_REASON'
      });
    } else if (operation.lockReason.length < 20) {
      errors.push({
        field: 'lockReason',
        message: 'Unblock reason must be at least 20 characters',
        code: 'INSUFFICIENT_REASON'
      });
    }

    // Validate address format
    if (operation.from && !this.isValidAddress(operation.from, context.token.chainId)) {
      errors.push({
        field: 'from',
        message: 'Invalid account address format',
        code: 'INVALID_ADDRESS'
      });
    }

    // Check if account is actually blocked
    if (operation.from) {
      const blockDetails = await this.getBlockDetails(
        operation.from,
        context.token.address
      );

      if (!blockDetails) {
        errors.push({
          field: 'status',
          message: 'Account is not currently blocked',
          code: 'NOT_BLOCKED'
        });
      } else {
        // Check if block has auto-expired
        if (blockDetails.unlock_time) {
          const now = Date.now();
          const unlockTime = new Date(blockDetails.unlock_time).getTime();
          
          if (unlockTime <= now) {
            warnings.push('Block has already expired automatically');
          }
        }

        // Check block status
        if (blockDetails.status === 'unblocked') {
          errors.push({
            field: 'status',
            message: 'Account has already been unblocked',
            code: 'ALREADY_UNBLOCKED'
          });
        }

        // Validate against original block reason
        if (blockDetails.lock_reason) {
          const originalReason = blockDetails.lock_reason.toLowerCase();
          
          // High-severity blocks require additional validation
          if (originalReason.includes('court order') || 
              originalReason.includes('regulatory requirement')) {
            
            if (!operation.metadata?.authorizationId) {
              errors.push({
                field: 'metadata.authorizationId',
                message: 'Authorization ID required to unblock regulatory/court-ordered blocks',
                code: 'MISSING_AUTHORIZATION'
              });
            }
          }
        }
      }
    }

    // Check unblock authority
    const hasUnblockAuthority = await this.checkUnblockAuthority(
      context.user.address,
      context.token.address
    );

    if (!hasUnblockAuthority) {
      errors.push({
        field: 'permission',
        message: 'User does not have authority to unblock accounts',
        code: 'NO_UNBLOCK_AUTHORITY'
      });
    }

    // Validate compliance requirements for unblocking
    const complianceCheck = await this.validateUnblockCompliance(
      operation,
      context
    );

    if (!complianceCheck.valid) {
      errors.push(...complianceCheck.errors);
      warnings.push(...complianceCheck.warnings);
    }

    // Check if unblocking requires multi-sig approval
    if (operation.from) {
      const requiresMultiSig = await this.requiresMultiSigApproval(
        operation.from,
        context.token.address
      );

      if (requiresMultiSig) {
        if (!operation.metadata?.approvalSignatures) {
          errors.push({
            field: 'metadata.approvalSignatures',
            message: 'Multi-signature approval required for this unblock',
            code: 'MISSING_MULTISIG'
          });
        } else {
          const validSignatures = await this.validateMultiSigApprovals(
            operation.metadata.approvalSignatures,
            context.token.address
          );

          if (!validSignatures) {
            errors.push({
              field: 'metadata.approvalSignatures',
              message: 'Invalid or insufficient multi-sig approvals',
              code: 'INVALID_MULTISIG'
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async getBlockDetails(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    // Get active block details
    const { data } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operation_type', 'block')
      .eq('sender', address)
      .eq('token_id', tokenAddress)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  private async checkUnblockAuthority(
    userAddress: string,
    tokenAddress: string
  ): Promise<boolean> {
    // Check if user has authority to unblock accounts
    const { data } = await supabase
      .from('token_permissions')
      .select('permission')
      .eq('wallet_address', userAddress)
      .eq('token_address', tokenAddress)
      .in('permission', ['unblock', 'compliance', 'admin', 'owner']);

    return data && data.length > 0;
  }

  private async validateUnblockCompliance(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<{ valid: boolean; errors: ValidationError[]; warnings: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check unblock reason categories
    const validReasons = [
      'investigation_complete',
      'compliance_cleared',
      'court_order_lifted',
      'false_positive',
      'kyc_verified',
      'appeal_approved',
      'regulatory_clearance',
      'error_correction'
    ];

    const reasonLower = operation.lockReason?.toLowerCase() || '';
    const hasValidReason = validReasons.some(reason => 
      reasonLower.includes(reason.replace('_', ' '))
    );

    if (!hasValidReason) {
      warnings.push('Unblock reason should match standard compliance categories');
    }

    // Check if compliance review was completed
    if (!operation.metadata?.reviewId) {
      warnings.push('Consider attaching compliance review ID');
    }

    // Check if original block issue was resolved
    const blockDetails = await this.getBlockDetails(
      operation.from!,
      context.token.address
    );

    if (blockDetails?.lock_reason) {
      const originalIssue = blockDetails.lock_reason.toLowerCase();
      
      if (originalIssue.includes('kyc') && !operation.metadata?.kycVerified) {
        warnings.push('Original block was for KYC - confirm KYC is now verified');
      }
      
      if (originalIssue.includes('suspicious') && !operation.metadata?.investigationId) {
        warnings.push('Original block was for suspicious activity - attach investigation ID');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private async requiresMultiSigApproval(
    address: string,
    tokenAddress: string
  ): Promise<boolean> {
    // Check if this account requires multi-sig for unblocking
    const { data: blockDetails } = await supabase
      .from('token_operations')
      .select('metadata')
      .eq('operation_type', 'block')
      .eq('sender', address)
      .eq('token_id', tokenAddress)
      .eq('status', 'active')
      .single();

    // High-value accounts or regulatory blocks require multi-sig
    if (blockDetails?.metadata?.requiresMultiSig) {
      return true;
    }

    // Check token balance
    const { data: balance } = await supabase
      .from('token_balances')
      .select('balance')
      .eq('wallet_address', address)
      .eq('token_address', tokenAddress)
      .single();

    // Require multi-sig for high-value accounts (>1M tokens)
    if (balance && BigInt(balance.balance) > 1000000n * 10n ** 18n) {
      return true;
    }

    return false;
  }

  private async validateMultiSigApprovals(
    signatures: any[],
    tokenAddress: string
  ): Promise<boolean> {
    if (!signatures || signatures.length === 0) {
      return false;
    }

    // Get required signers for unblock operations
    const { data: signers } = await supabase
      .from('token_permissions')
      .select('wallet_address')
      .eq('token_address', tokenAddress)
      .in('permission', ['unblock', 'compliance', 'admin']);

    if (!signers || signers.length === 0) {
      return false;
    }

    // Validate we have enough signatures (minimum 2 or 51% of signers)
    const requiredCount = Math.max(2, Math.ceil(signers.length * 0.51));
    
    if (signatures.length < requiredCount) {
      return false;
    }

    // Validate each signature is from an authorized signer
    const signerAddresses = signers.map(s => s.wallet_address.toLowerCase());
    const validSignatures = signatures.filter(sig => 
      signerAddresses.includes(sig.signer?.toLowerCase())
    );

    return validSignatures.length >= requiredCount;
  }

  private isValidAddress(address: string, chainId: string): boolean {
    // Basic Ethereum/EVM address validation
    if (chainId.startsWith('0x') || ['ethereum', 'polygon', 'avalanche'].includes(chainId)) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    
    // Add other chain validations as needed
    return true;
  }
}
