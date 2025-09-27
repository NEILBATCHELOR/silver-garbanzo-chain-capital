/**
 * BlockValidator.ts
 * Validation logic for block operations (freezing assets)
 */

import type { 
  CryptoOperation, 
  PolicyContext, 
  OperationValidator, 
  ValidationResult, 
  ValidationError 
} from '../types';
import { supabase } from '@/infrastructure/database/client';

export class BlockValidator implements OperationValidator {
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
        message: 'Account address is required for block operation',
        code: 'MISSING_ADDRESS'
      });
    }

    // Validate block reason (required for compliance)
    if (!operation.lockReason) {
      errors.push({
        field: 'lockReason',
        message: 'Block reason is required for compliance purposes',
        code: 'MISSING_REASON'
      });
    } else if (operation.lockReason.length < 20) {
      errors.push({
        field: 'lockReason',
        message: 'Block reason must be at least 20 characters for proper documentation',
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

    // Check if account is already blocked
    if (operation.from) {
      const isBlocked = await this.isAccountBlocked(
        operation.from,
        context.token.address
      );

      if (isBlocked) {
        errors.push({
          field: 'status',
          message: 'Account is already blocked',
          code: 'ALREADY_BLOCKED'
        });
      }
    }

    // Check block authority
    const hasBlockAuthority = await this.checkBlockAuthority(
      context.user.address,
      context.token.address
    );

    if (!hasBlockAuthority) {
      errors.push({
        field: 'permission',
        message: 'User does not have authority to block accounts',
        code: 'NO_BLOCK_AUTHORITY'
      });
    }

    // Validate compliance requirements
    const complianceCheck = await this.validateComplianceRequirements(
      operation,
      context
    );

    if (!complianceCheck.valid) {
      errors.push(...complianceCheck.errors);
      warnings.push(...complianceCheck.warnings);
    }

    // Check if blocking would affect critical operations
    if (operation.from) {
      const impact = await this.assessBlockingImpact(
        operation.from,
        context.token.address
      );

      if (impact.hasActiveTransfers) {
        warnings.push('Account has pending transfers that will be affected');
      }

      if (impact.isLiquidityProvider) {
        warnings.push('Account is a liquidity provider - blocking may affect market');
      }

      if (impact.hasLockedTokens) {
        warnings.push(`Account has ${impact.lockedAmount} locked tokens`);
      }
    }

    // Validate block duration if specified
    if (operation.lockDuration) {
      if (operation.lockDuration < 3600) { // Minimum 1 hour
        errors.push({
          field: 'lockDuration',
          message: 'Block duration must be at least 1 hour (3600 seconds)',
          code: 'DURATION_TOO_SHORT'
        });
      }

      const maxDuration = await this.getMaxBlockDuration(context.token.address);
      if (operation.lockDuration > maxDuration) {
        errors.push({
          field: 'lockDuration',
          message: `Block duration exceeds maximum of ${maxDuration} seconds`,
          code: 'DURATION_EXCEEDED'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async isAccountBlocked(
    address: string,
    tokenAddress: string
  ): Promise<boolean> {
    // Check if account is already blocked
    const { data } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operation_type', 'block')
      .eq('sender', address)
      .eq('token_id', tokenAddress)
      .eq('status', 'active')
      .single();

    return !!data;
  }

  private async checkBlockAuthority(
    userAddress: string,
    tokenAddress: string
  ): Promise<boolean> {
    // Check if user has authority to block accounts
    const { data } = await supabase
      .from('token_permissions')
      .select('permission')
      .eq('wallet_address', userAddress)
      .eq('token_address', tokenAddress)
      .in('permission', ['block', 'compliance', 'admin', 'owner']);

    return data && data.length > 0;
  }

  private async validateComplianceRequirements(
    operation: CryptoOperation,
    context: PolicyContext
  ): Promise<{ valid: boolean; errors: ValidationError[]; warnings: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if reason matches compliance categories
    const validReasons = [
      'suspicious_activity',
      'regulatory_requirement',
      'court_order',
      'security_breach',
      'kyc_failure',
      'aml_violation',
      'sanctions_match',
      'fraud_investigation'
    ];

    const reasonLower = operation.lockReason?.toLowerCase() || '';
    const hasValidReason = validReasons.some(reason => 
      reasonLower.includes(reason.replace('_', ' '))
    );

    if (!hasValidReason) {
      warnings.push('Block reason should match standard compliance categories');
    }

    // Check if compliance documentation exists
    if (!operation.metadata?.complianceDocId) {
      warnings.push('Consider attaching compliance documentation ID');
    }

    // Check jurisdiction requirements
    if (context.user.jurisdiction) {
      const jurisdictionRequirements = await this.getJurisdictionRequirements(
        context.user.jurisdiction
      );

      if (jurisdictionRequirements.requiresCourtOrder && 
          !operation.metadata?.courtOrderId) {
        errors.push({
          field: 'metadata.courtOrderId',
          message: `${context.user.jurisdiction} requires court order for blocking`,
          code: 'MISSING_COURT_ORDER'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private async assessBlockingImpact(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    // Check pending transfers
    const { data: transfers } = await supabase
      .from('token_operations')
      .select('*')
      .eq('operation_type', 'transfer')
      .or(`sender.eq.${address},recipient.eq.${address}`)
      .eq('token_id', tokenAddress)
      .eq('status', 'pending');

    // Check if account is liquidity provider
    const { data: liquidity } = await supabase
      .from('liquidity_providers')
      .select('*')
      .eq('provider_address', address)
      .eq('token_address', tokenAddress)
      .single();

    // Check locked tokens
    const { data: locks } = await supabase
      .from('token_operations')
      .select('amount')
      .eq('operation_type', 'lock')
      .eq('operator', address)
      .eq('token_id', tokenAddress)
      .eq('status', 'active');

    const lockedAmount = locks?.reduce(
      (sum, lock) => sum + BigInt(lock.amount || 0),
      0n
    );

    return {
      hasActiveTransfers: transfers && transfers.length > 0,
      isLiquidityProvider: !!liquidity,
      hasLockedTokens: lockedAmount > 0n,
      lockedAmount: lockedAmount.toString()
    };
  }

  private async getMaxBlockDuration(tokenAddress: string): Promise<number> {
    // Query from system_settings
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `max_block_duration_${tokenAddress}`)
      .single();

    return data?.value || 7776000; // Default: 90 days
  }

  private async getJurisdictionRequirements(jurisdiction: string): Promise<any> {
    // Query jurisdiction-specific requirements
    const { data } = await supabase
      .from('jurisdiction_requirements')
      .select('*')
      .eq('jurisdiction', jurisdiction)
      .single();

    return data || { requiresCourtOrder: false };
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
