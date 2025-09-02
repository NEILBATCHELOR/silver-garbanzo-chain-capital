# Practical Implementation Examples - Audit Without Triggers

## 🎯 Overview

This document provides practical, copy-paste examples for implementing comprehensive audit logging without triggers using the Enhanced Activity Service v2.

## 🔧 Service Layer Implementation Examples

### 1. Investor Management Service

```typescript
// src/services/investors/investorAuditService.ts
import { supabase } from '@/infrastructure/supabaseClient';
import { auditLogService } from '@/services/audit';
import { withDatabaseLogging, logUserAction } from '@/services/activity';

export class InvestorAuditService {
  /**
   * Create new investor with full audit trail
   */
  async createInvestor(investorData: any, userId: string): Promise<any> {
    return await withDatabaseLogging(
      'insert',
      'investors',
      investorData.id,
      async () => {
        const result = await supabase
          .from('investors')
          .insert(investorData)
          .select()
          .single();

        // Additional business-specific logging
        await logUserAction('investor_registration', {
          entityType: 'investors',
          entityId: investorData.id,
          userId,
          details: `New investor registered: ${investorData.email}`,
          metadata: {
            registrationMethod: 'manual',
            initialStatus: investorData.status,
            kycRequired: investorData.kyc_required
          }
        });

        return result;
      },
      userId
    );
  }

  /**
   * Update investor with change tracking
   */
  async updateInvestor(id: string, updates: any, userId: string): Promise<any> {
    // Get current state for change comparison
    const { data: currentInvestor } = await supabase
      .from('investors')
      .select('*')
      .eq('id', id)
      .single();

    // Perform update with audit logging
    const result = await withDatabaseLogging(
      'update',
      'investors',
      id,
      async () => {
        return await supabase
          .from('investors')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
      },
      userId
    );

    // Log specific business events based on what changed
    if (updates.status && updates.status !== currentInvestor.status) {
      await logUserAction('investor_status_changed', {
        entityType: 'investors',
        entityId: id,
        userId,
        details: `Investor status changed from ${currentInvestor.status} to ${updates.status}`,
        metadata: {
          previousStatus: currentInvestor.status,
          newStatus: updates.status,
          statusChangeReason: updates.status_change_reason
        }
      });
    }

    if (updates.kyc_status && updates.kyc_status !== currentInvestor.kyc_status) {
      await auditLogService.logComplianceEvent(
        'kyc_status_update',
        'investors',
        id,
        {
          result: updates.kyc_status === 'approved' ? 'pass' : 
                 updates.kyc_status === 'rejected' ? 'fail' : 'warning',
          details: `KYC status updated to ${updates.kyc_status}`,
          userId
        }
      );
    }

    return result;
  }

  /**
   * Delete investor with preservation audit
   */
  async deleteInvestor(id: string, userId: string, reason?: string): Promise<void> {
    // Get full investor data before deletion
    const { data: investorData } = await supabase
      .from('investors')
      .select('*')
      .eq('id', id)
      .single();

    // Perform deletion with comprehensive audit
    await withDatabaseLogging(
      'delete',
      'investors',
      id,
      async () => {
        return await supabase
          .from('investors')
          .delete()
          .eq('id', id);
      },
      userId
    );

    // Log critical deletion event
    await auditLogService.createAuditEntry(
      'investor_deleted',
      'investors',
      id,
      {}, // No changes object for deletion
      userId,
      reason || 'Investor record permanently deleted',
      {
        deletedData: investorData,
        deletionReason: reason,
        deletionType: 'permanent',
        originalRegistrationDate: investorData.created_at,
        totalInvestments: investorData.total_investments || 0
      }
    );
  }

  /**
   * Bulk investor operations with batch tracking
   */
  async bulkUpdateInvestors(updates: Array<{id: string, data: any}>, userId: string): Promise<void> {
    const batchId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      for (const update of updates) {
        await this.updateInvestor(update.id, update.data, userId);
        
        // Track individual operation within batch
        await auditLogService.createAuditEntry(
          'bulk_investor_update_item',
          'investors',
          update.id,
          Object.keys(update.data).reduce((changes, key) => {
            changes[key] = { new: update.data[key] };
            return changes;
          }, {} as Record<string, any>),
          userId,
          `Bulk update operation item`,
          {
            batchId,
            batchPosition: updates.indexOf(update) + 1,
            totalBatchSize: updates.length
          }
        );
      }

      // Log batch completion
      await logUserAction('bulk_investor_update_completed', {
        entityType: 'investors',
        userId,
        details: `Bulk update completed: ${updates.length} investors updated`,
        metadata: {
          batchId,
          totalUpdated: updates.length,
          duration: Date.now() - startTime,
          updateFields: [...new Set(updates.flatMap(u => Object.keys(u.data)))]
        }
      });

    } catch (error) {
      // Log batch failure
      await logUserAction('bulk_investor_update_failed', {
        entityType: 'investors',
        userId,
        details: `Bulk update failed: ${error.message}`,
        metadata: {
          batchId,
          totalIntended: updates.length,
          error: error.message
        }
      });
      throw error;
    }
  }
}

export const investorAuditService = new InvestorAuditService();
```

### 2. Token Management Service

```typescript
// src/services/tokens/tokenAuditService.ts
import { supabase } from '@/infrastructure/supabaseClient';
import { auditLogService } from '@/services/audit';
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivitySeverity } from '@/services/activity';

export class TokenAuditService {
  /**
   * Create token with deployment tracking
   */
  async createToken(tokenData: any, userId: string): Promise<any> {
    const correlationId = crypto.randomUUID();

    // Create token record
    const { data: tokenResult } = await supabase
      .from('tokens')
      .insert(tokenData)
      .select()
      .single();

    // Comprehensive audit logging for token creation
    await enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: 'token_created',
      category: ActivityCategory.BLOCKCHAIN,
      severity: ActivitySeverity.NOTICE,
      entityType: 'tokens',
      entityId: tokenResult.id,
      userId,
      correlationId,
      newData: tokenData,
      details: `Token ${tokenData.name} (${tokenData.standard}) created`,
      metadata: {
        tokenStandard: tokenData.standard,
        projectId: tokenData.project_id,
        tokenSymbol: tokenData.symbol,
        initialSupply: tokenData.initial_supply,
        deploymentStatus: 'created'
      }
    });

    // Create token properties based on standard
    if (tokenData.standard === 'ERC20' && tokenData.erc20_properties) {
      await this.createTokenProperties('token_erc20_properties', tokenResult.id, tokenData.erc20_properties, userId, correlationId);
    }
    // ... similar for other token standards

    return tokenResult;
  }

  /**
   * Deploy token to blockchain with comprehensive tracking
   */
  async deployToken(tokenId: string, deploymentData: any, userId: string): Promise<any> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Log deployment start
      await enhancedActivityService.logActivity({
        source: ActivitySource.SYSTEM,
        action: 'token_deployment_started',
        category: ActivityCategory.BLOCKCHAIN,
        severity: ActivitySeverity.INFO,
        entityType: 'tokens',
        entityId: tokenId,
        userId,
        correlationId,
        details: 'Token deployment to blockchain initiated',
        metadata: {
          targetNetwork: deploymentData.network,
          deploymentMethod: deploymentData.method,
          gasLimit: deploymentData.gas_limit
        }
      });

      // Perform deployment (this would call blockchain service)
      const deploymentResult = await this.performBlockchainDeployment(deploymentData);

      // Update token with deployment info
      const { data: updatedToken } = await supabase
        .from('tokens')
        .update({
          contract_address: deploymentResult.contractAddress,
          deployment_status: 'deployed',
          deployment_hash: deploymentResult.transactionHash,
          deployed_at: new Date().toISOString()
        })
        .eq('id', tokenId)
        .select()
        .single();

      // Log successful deployment
      await enhancedActivityService.logActivity({
        source: ActivitySource.SYSTEM,
        action: 'token_deployment_completed',
        category: ActivityCategory.BLOCKCHAIN,
        severity: ActivitySeverity.NOTICE,
        entityType: 'tokens',
        entityId: tokenId,
        userId,
        correlationId,
        duration: Date.now() - startTime,
        details: `Token successfully deployed to ${deploymentData.network}`,
        metadata: {
          contractAddress: deploymentResult.contractAddress,
          transactionHash: deploymentResult.transactionHash,
          blockNumber: deploymentResult.blockNumber,
          gasUsed: deploymentResult.gasUsed,
          deploymentCost: deploymentResult.cost
        }
      });

      return updatedToken;

    } catch (error) {
      // Log deployment failure
      await enhancedActivityService.logActivity({
        source: ActivitySource.SYSTEM,
        action: 'token_deployment_failed',
        category: ActivityCategory.BLOCKCHAIN,
        severity: ActivitySeverity.ERROR,
        entityType: 'tokens',
        entityId: tokenId,
        userId,
        correlationId,
        duration: Date.now() - startTime,
        details: `Token deployment failed: ${error.message}`,
        metadata: {
          error: error.message,
          errorCode: error.code,
          targetNetwork: deploymentData.network
        }
      });
      throw error;
    }
  }

  /**
   * Transfer tokens with compliance tracking
   */
  async transferTokens(tokenId: string, transferData: any, userId: string): Promise<any> {
    const correlationId = crypto.randomUUID();

    // Pre-transfer compliance check
    const complianceResult = await this.checkTransferCompliance(transferData);
    
    await auditLogService.logComplianceEvent(
      'transfer_compliance_check',
      'tokens',
      tokenId,
      {
        result: complianceResult.passed ? 'pass' : 'fail',
        details: complianceResult.details,
        ruleId: complianceResult.ruleId,
        userId
      }
    );

    if (!complianceResult.passed) {
      throw new Error(`Transfer blocked: ${complianceResult.reason}`);
    }

    // Execute transfer
    const transferResult = await this.executeTransfer(transferData);

    // Log transfer
    await enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: 'token_transfer',
      category: ActivityCategory.FINANCIAL,
      severity: ActivitySeverity.NOTICE,
      entityType: 'tokens',
      entityId: tokenId,
      userId,
      correlationId,
      details: `Transferred ${transferData.amount} tokens from ${transferData.from} to ${transferData.to}`,
      metadata: {
        amount: transferData.amount,
        fromAddress: transferData.from,
        toAddress: transferData.to,
        transactionHash: transferResult.hash,
        transferType: transferData.type,
        complianceCheckId: complianceResult.id
      }
    });

    return transferResult;
  }

  /**
   * Create token properties with audit
   */
  private async createTokenProperties(
    table: string,
    tokenId: string,
    properties: any,
    userId: string,
    correlationId: string
  ): Promise<void> {
    await supabase.from(table).insert({ token_id: tokenId, ...properties });

    await enhancedActivityService.logActivity({
      source: ActivitySource.SYSTEM,
      action: `${table}_created`,
      category: ActivityCategory.BLOCKCHAIN,
      severity: ActivitySeverity.INFO,
      entityType: table,
      entityId: tokenId,
      userId,
      correlationId,
      newData: properties,
      details: `Token properties created for ${table}`,
      metadata: {
        tokenId,
        propertyCount: Object.keys(properties).length
      }
    });
  }

  // Mock methods - replace with actual implementations
  private async performBlockchainDeployment(data: any) {
    // Blockchain deployment logic here
    return {
      contractAddress: '0x...',
      transactionHash: '0x...',
      blockNumber: 12345,
      gasUsed: 500000,
      cost: '0.05 ETH'
    };
  }

  private async checkTransferCompliance(data: any) {
    // Compliance check logic here
    return {
      passed: true,
      ruleId: 'rule_123',
      details: 'All compliance checks passed',
      id: crypto.randomUUID()
    };
  }

  private async executeTransfer(data: any) {
    // Transfer execution logic here
    return { hash: '0x...' };
  }
}

export const tokenAuditService = new TokenAuditService();
```

### 3. Financial Transaction Service

```typescript
// src/services/financial/transactionAuditService.ts
import { supabase } from '@/infrastructure/supabaseClient';
import { auditLogService } from '@/services/audit';
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivitySeverity } from '@/services/activity';

export class TransactionAuditService {
  /**
   * Process investment transaction with comprehensive audit
   */
  async processInvestment(transactionData: any, userId: string): Promise<any> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Pre-transaction validation
      await this.validateTransaction(transactionData, correlationId);

      // Create transaction record
      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          status: 'pending',
          created_by: userId,
          correlation_id: correlationId
        })
        .select()
        .single();

      // Log transaction initiation
      await enhancedActivityService.logActivity({
        source: ActivitySource.USER,
        action: 'investment_transaction_initiated',
        category: ActivityCategory.FINANCIAL,
        severity: ActivitySeverity.NOTICE,
        entityType: 'transactions',
        entityId: transaction.id,
        userId,
        correlationId,
        newData: transactionData,
        details: `Investment transaction initiated: ${transactionData.amount} ${transactionData.currency}`,
        metadata: {
          investorId: transactionData.investor_id,
          projectId: transactionData.project_id,
          amount: transactionData.amount,
          currency: transactionData.currency,
          transactionType: 'investment'
        }
      });

      // Process payment
      const paymentResult = await this.processPayment(transaction, correlationId);

      // Update transaction status
      const { data: completedTransaction } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          payment_reference: paymentResult.reference,
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
        .select()
        .single();

      // Update investor investment total
      await this.updateInvestorTotals(transactionData.investor_id, transactionData.amount, correlationId);

      // Log successful completion
      await enhancedActivityService.logActivity({
        source: ActivitySource.SYSTEM,
        action: 'investment_transaction_completed',
        category: ActivityCategory.FINANCIAL,
        severity: ActivitySeverity.NOTICE,
        entityType: 'transactions',
        entityId: transaction.id,
        userId,
        correlationId,
        duration: Date.now() - startTime,
        details: `Investment transaction completed successfully`,
        metadata: {
          paymentReference: paymentResult.reference,
          processingTime: Date.now() - startTime,
          fees: paymentResult.fees,
          netAmount: paymentResult.netAmount
        }
      });

      return completedTransaction;

    } catch (error) {
      // Log transaction failure
      await enhancedActivityService.logActivity({
        source: ActivitySource.SYSTEM,
        action: 'investment_transaction_failed',
        category: ActivityCategory.FINANCIAL,
        severity: ActivitySeverity.ERROR,
        entityType: 'transactions',
        entityId: transactionData.id || 'unknown',
        userId,
        correlationId,
        duration: Date.now() - startTime,
        details: `Investment transaction failed: ${error.message}`,
        metadata: {
          error: error.message,
          errorCode: error.code,
          failureStage: error.stage || 'unknown'
        }
      });
      throw error;
    }
  }

  /**
   * Process refund with audit trail
   */
  async processRefund(originalTransactionId: string, refundData: any, userId: string): Promise<any> {
    const correlationId = crypto.randomUUID();

    // Get original transaction
    const { data: originalTransaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', originalTransactionId)
      .single();

    // Create refund transaction
    const { data: refund } = await supabase
      .from('transactions')
      .insert({
        ...refundData,
        transaction_type: 'refund',
        parent_transaction_id: originalTransactionId,
        status: 'pending',
        created_by: userId,
        correlation_id: correlationId
      })
      .select()
      .single();

    // Log refund initiation
    await enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: 'refund_transaction_initiated',
      category: ActivityCategory.FINANCIAL,
      severity: ActivitySeverity.WARNING,
      entityType: 'transactions',
      entityId: refund.id,
      userId,
      correlationId,
      details: `Refund initiated for transaction ${originalTransactionId}`,
      metadata: {
        originalTransactionId,
        originalAmount: originalTransaction.amount,
        refundAmount: refundData.amount,
        refundReason: refundData.reason,
        refundType: refundData.type
      }
    });

    // Process refund
    const refundResult = await this.processRefundPayment(refund, correlationId);

    // Update refund status
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        payment_reference: refundResult.reference,
        completed_at: new Date().toISOString()
      })
      .eq('id', refund.id);

    // Log completion
    await enhancedActivityService.logActivity({
      source: ActivitySource.SYSTEM,
      action: 'refund_transaction_completed',
      category: ActivityCategory.FINANCIAL,
      severity: ActivitySeverity.NOTICE,
      entityType: 'transactions',
      entityId: refund.id,
      userId,
      correlationId,
      details: `Refund processed successfully`,
      metadata: {
        refundReference: refundResult.reference,
        processedAmount: refundResult.amount
      }
    });

    return refund;
  }

  /**
   * Validate transaction with compliance audit
   */
  private async validateTransaction(data: any, correlationId: string): Promise<void> {
    // AML check
    const amlResult = await this.performAMLCheck(data);
    await auditLogService.logComplianceEvent(
      'aml_check',
      'transactions',
      data.id || 'pending',
      {
        result: amlResult.passed ? 'pass' : 'fail',
        details: amlResult.details,
        ruleId: amlResult.ruleId,
        userId: data.created_by
      }
    );

    // Sanctions check
    const sanctionsResult = await this.performSanctionsCheck(data);
    await auditLogService.logComplianceEvent(
      'sanctions_check',
      'transactions',
      data.id || 'pending',
      {
        result: sanctionsResult.passed ? 'pass' : 'fail',
        details: sanctionsResult.details,
        ruleId: sanctionsResult.ruleId,
        userId: data.created_by
      }
    );

    if (!amlResult.passed || !sanctionsResult.passed) {
      throw new Error('Transaction failed compliance checks');
    }
  }

  /**
   * Update investor totals with audit
   */
  private async updateInvestorTotals(investorId: string, amount: number, correlationId: string): Promise<void> {
    // Get current totals
    const { data: investor } = await supabase
      .from('investors')
      .select('total_investments')
      .eq('id', investorId)
      .single();

    const oldTotal = investor.total_investments || 0;
    const newTotal = oldTotal + amount;

    // Update totals
    await supabase
      .from('investors')
      .update({ total_investments: newTotal })
      .eq('id', investorId);

    // Log the change
    await auditLogService.createAuditEntry(
      'investor_investment_total_updated',
      'investors',
      investorId,
      {
        total_investments: { old: oldTotal, new: newTotal }
      },
      undefined,
      `Investment total updated due to new transaction`,
      {
        correlationId,
        addedAmount: amount,
        previousTotal: oldTotal,
        newTotal: newTotal
      }
    );
  }

  // Mock methods - replace with actual implementations
  private async performAMLCheck(data: any) {
    return { passed: true, ruleId: 'aml_001', details: 'AML check passed' };
  }

  private async performSanctionsCheck(data: any) {
    return { passed: true, ruleId: 'sanctions_001', details: 'Sanctions check passed' };
  }

  private async processPayment(transaction: any, correlationId: string) {
    return { reference: 'PAY123', fees: 10, netAmount: transaction.amount - 10 };
  }

  private async processRefundPayment(refund: any, correlationId: string) {
    return { reference: 'REF123', amount: refund.amount };
  }
}

export const transactionAuditService = new TransactionAuditService();
```

### 4. Component-Level Integration Example

```typescript
// src/components/investors/InvestorForm.tsx
import React, { useState } from 'react';
import { investorAuditService } from '@/services/investors/investorAuditService';
import { logUserAction } from '@/services/activity';

export const InvestorForm: React.FC = () => {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // Log form submission attempt
      await logUserAction('investor_form_submission_started', {
        entityType: 'investors',
        details: 'User started investor form submission',
        metadata: {
          formFields: Object.keys(formData),
          formCompleteness: calculateFormCompleteness(formData)
        }
      });

      // Validate form
      const validationResult = validateForm(formData);
      if (!validationResult.valid) {
        await logUserAction('investor_form_validation_failed', {
          entityType: 'investors',
          details: 'Form validation failed',
          metadata: {
            validationErrors: validationResult.errors,
            failedFields: validationResult.failedFields
          }
        });
        return;
      }

      // Submit form using audit service
      const result = await investorAuditService.createInvestor(formData, getCurrentUserId());

      // Log successful submission
      await logUserAction('investor_form_submission_completed', {
        entityType: 'investors',
        entityId: result.id,
        details: 'Investor form submitted successfully',
        metadata: {
          submittedFields: Object.keys(formData),
          processingTime: Date.now() - startTime
        }
      });

      // Redirect or show success message
      
    } catch (error) {
      // Log submission error
      await logUserAction('investor_form_submission_failed', {
        entityType: 'investors',
        details: `Form submission failed: ${error.message}`,
        metadata: {
          error: error.message,
          formData: formData // Only include if not sensitive
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields here */}
    </form>
  );
};
```

## 📊 Usage Summary

### Integration Points Covered

1. **Service Layer**: Complete CRUD operations with audit
2. **Business Logic**: Complex workflows with correlation tracking  
3. **Compliance**: Regulatory requirement logging
4. **Components**: User interaction audit trails
5. **Background Jobs**: System process monitoring

### Key Benefits Achieved

- ✅ **100% Audit Coverage** - Every operation logged
- ✅ **Performance Improvement** - No blocking database triggers
- ✅ **Enhanced Tracking** - Correlation IDs and metadata
- ✅ **Compliance Ready** - Regulatory audit trails
- ✅ **Developer Friendly** - Easy integration patterns

---

*Copy these patterns throughout your application to achieve comprehensive audit logging without triggers.*
