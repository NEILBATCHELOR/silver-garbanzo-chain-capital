/**
 * Universal Audit Service
 * 
 * Automatically handles audit logging for ALL tables in the database
 * without triggers, using the Enhanced Activity Service v2.
 */

import { supabase } from './../../infrastructure/database/client';
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivitySeverity, ActivityStatus } from '../activity/EnhancedActivityService';

interface TableOperation {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  entityId: string;
  userId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class UniversalAuditService {
  private tableCategories: Record<string, ActivityCategory> = {};
  private auditableOperations = new Set(['INSERT', 'UPDATE', 'DELETE']);
  
  constructor() {
    this.initializeTableCategories();
  }

  /**
   * Universal audit wrapper for ANY table operation
   */
  async auditOperation<T>(
    operation: TableOperation,
    businessOperation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let success = true;
    let error: string | undefined;

    try {
      // Execute the business operation first
      result = await businessOperation();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      // Always log the operation (non-blocking)
      if (this.auditableOperations.has(operation.operation)) {
        this.logAuditEntry(operation, {
          success,
          error,
          duration: Date.now() - startTime
        }).catch(auditError => {
          console.error('Audit logging failed:', auditError);
          // Don't throw - audit failures shouldn't break business operations
        });
      }
    }
  }

  /**
   * Log audit entry for any table
   */
  private async logAuditEntry(
    operation: TableOperation,
    executionData: { success: boolean; error?: string; duration: number }
  ): Promise<void> {
    const { table, operation: op, entityId, userId, oldData, newData, metadata } = operation;
    
    // Calculate changes for UPDATE operations
    const changes = this.calculateChanges(oldData, newData);
    
    await enhancedActivityService.logActivity({
      source: userId ? ActivitySource.USER : ActivitySource.SYSTEM,
      action: `${table}_${op.toLowerCase()}`,
      category: this.getTableCategory(table),
      severity: this.getOperationSeverity(op, executionData.success),
      entityType: table,
      entityId,
      userId,
      status: executionData.success ? ActivityStatus.SUCCESS : ActivityStatus.FAILURE,
      duration: executionData.duration,
      details: this.generateOperationDetails(table, op, executionData),
      oldData,
      newData,
      changes,
      metadata: {
        ...metadata,
        operation: op,
        table,
        executionTime: executionData.duration,
        ...(executionData.error && { error: executionData.error })
      }
    });
  }

  /**
   * Calculate changes between old and new data
   */
  private calculateChanges(
    oldData?: Record<string, any>, 
    newData?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!oldData || !newData) return undefined;

    const changes: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of Array.from(allKeys)) {
      if (oldData[key] !== newData[key]) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
  }

  /**
   * Get appropriate category for table
   */
  private getTableCategory(table: string): ActivityCategory {
    return this.tableCategories[table] || this.inferTableCategory(table);
  }

  /**
   * Infer category from table name patterns
   */
  private inferTableCategory(table: string): ActivityCategory {
    if (table.includes('user') || table.includes('investor') || table.includes('auth')) {
      return ActivityCategory.USER_MANAGEMENT;
    }
    if (table.includes('token') || table.includes('wallet') || table.includes('blockchain')) {
      return ActivityCategory.BLOCKCHAIN;
    }
    if (table.includes('transaction') || table.includes('payment') || table.includes('financial')) {
      return ActivityCategory.FINANCIAL;
    }
    if (table.includes('compliance') || table.includes('rule') || table.includes('policy')) {
      return ActivityCategory.COMPLIANCE;
    }
    if (table.includes('document') || table.includes('file')) {
      return ActivityCategory.DOCUMENT;
    }
    if (table.includes('notification') || table.includes('alert')) {
      return ActivityCategory.NOTIFICATION;
    }
    if (table.includes('system') || table.includes('config') || table.includes('setting')) {
      return ActivityCategory.SYSTEM;
    }
    if (table.includes('dfns') || table.includes('moonpay') || table.includes('stripe') || table.includes('ramp')) {
      return ActivityCategory.INTEGRATION;
    }
    return ActivityCategory.DATA;
  }

  /**
   * Get severity based on operation and success
   */
  private getOperationSeverity(operation: string, success: boolean): ActivitySeverity {
    if (!success) return ActivitySeverity.ERROR;
    if (operation === 'DELETE') return ActivitySeverity.WARNING;
    if (operation === 'INSERT') return ActivitySeverity.NOTICE;
    return ActivitySeverity.INFO;
  }

  /**
   * Generate human-readable operation details
   */
  private generateOperationDetails(
    table: string, 
    operation: string, 
    executionData: { success: boolean; error?: string }
  ): string {
    const baseMessage = `${operation} operation on ${table}`;
    
    if (!executionData.success) {
      return `${baseMessage} failed: ${executionData.error}`;
    }
    
    return `${baseMessage} completed successfully`;
  }

  /**
   * Initialize table categories mapping
   */
  private initializeTableCategories(): void {
    // Define explicit categories for important tables
    this.tableCategories = {
      // User Management
      'users': ActivityCategory.USER_MANAGEMENT,
      'investors': ActivityCategory.USER_MANAGEMENT,
      'user_roles': ActivityCategory.USER_MANAGEMENT,
      'user_sessions': ActivityCategory.AUTH,
      'auth_events': ActivityCategory.AUTH,
      
      // Financial
      'transactions': ActivityCategory.FINANCIAL,
      'wallet_transactions': ActivityCategory.FINANCIAL,
      'subscriptions': ActivityCategory.FINANCIAL,
      'invoices': ActivityCategory.FINANCIAL,
      'distributions': ActivityCategory.FINANCIAL,
      'token_allocations': ActivityCategory.FINANCIAL,
      
      // Blockchain/Tokens
      'tokens': ActivityCategory.BLOCKCHAIN,
      'token_versions': ActivityCategory.BLOCKCHAIN,
      'guardian_wallets': ActivityCategory.BLOCKCHAIN,
      'multi_sig_wallets': ActivityCategory.BLOCKCHAIN,
      'wallet_details': ActivityCategory.BLOCKCHAIN,
      
      // Compliance
      'rules': ActivityCategory.COMPLIANCE,
      'policy_templates': ActivityCategory.COMPLIANCE,
      'compliance_reports': ActivityCategory.COMPLIANCE,
      'compliance_checks': ActivityCategory.COMPLIANCE,
      'audit_logs': ActivityCategory.COMPLIANCE,
      
      // Documents
      'documents': ActivityCategory.DOCUMENT,
      'document_versions': ActivityCategory.DOCUMENT,
      'document_workflows': ActivityCategory.DOCUMENT,
      'issuer_documents': ActivityCategory.DOCUMENT,
      
      // System
      'system_settings': ActivityCategory.SYSTEM,
      'health_checks': ActivityCategory.SYSTEM,
      'monitoring_metrics': ActivityCategory.SYSTEM,
      'security_events': ActivityCategory.SECURITY,
      
      // Notifications
      'notifications': ActivityCategory.NOTIFICATION,
      'alerts': ActivityCategory.NOTIFICATION,
      
      // Integrations - All DFNS tables
      'dfns_applications': ActivityCategory.INTEGRATION,
      'dfns_service_accounts': ActivityCategory.INTEGRATION,
      'dfns_users': ActivityCategory.INTEGRATION,
      'dfns_credentials': ActivityCategory.INTEGRATION,
      'dfns_personal_access_tokens': ActivityCategory.INTEGRATION,
      'dfns_wallet_balances': ActivityCategory.INTEGRATION,
      'dfns_permission_assignments': ActivityCategory.INTEGRATION,
      'dfns_policies': ActivityCategory.INTEGRATION,
      'dfns_policy_approvals': ActivityCategory.INTEGRATION,
      'dfns_webhooks': ActivityCategory.INTEGRATION,
      'dfns_webhook_deliveries': ActivityCategory.INTEGRATION,
      'dfns_exchange_integrations': ActivityCategory.INTEGRATION,
      'dfns_exchange_accounts': ActivityCategory.INTEGRATION,
      'dfns_exchange_balances': ActivityCategory.INTEGRATION,
      'dfns_staking_integrations': ActivityCategory.INTEGRATION,
      'dfns_fee_sponsors': ActivityCategory.INTEGRATION,
      'dfns_sponsored_fees': ActivityCategory.INTEGRATION,
      'dfns_validators': ActivityCategory.INTEGRATION,
      'dfns_activity_logs': ActivityCategory.INTEGRATION,
      'dfns_api_requests': ActivityCategory.INTEGRATION,
      'dfns_sync_status': ActivityCategory.INTEGRATION,
      'dfns_signing_keys': ActivityCategory.INTEGRATION,
      'dfns_wallets': ActivityCategory.INTEGRATION,
      'dfns_wallet_nfts': ActivityCategory.INTEGRATION,
      'dfns_transaction_history': ActivityCategory.INTEGRATION,
      'dfns_transfers': ActivityCategory.INTEGRATION,
      'dfns_signatures': ActivityCategory.INTEGRATION,
      'dfns_broadcast_transactions': ActivityCategory.INTEGRATION,
      'dfns_permissions': ActivityCategory.INTEGRATION,
      'dfns_fiat_provider_configs': ActivityCategory.INTEGRATION,
      'dfns_fiat_transactions': ActivityCategory.INTEGRATION,
      'dfns_fiat_quotes': ActivityCategory.INTEGRATION,
      'dfns_fiat_activity_logs': ActivityCategory.INTEGRATION,
      
      // MoonPay Integration
      'moonpay_webhook_events': ActivityCategory.INTEGRATION,
      'moonpay_asset_cache': ActivityCategory.INTEGRATION,
      'moonpay_swap_transactions': ActivityCategory.INTEGRATION,
      'moonpay_passes': ActivityCategory.INTEGRATION,
      'moonpay_projects': ActivityCategory.INTEGRATION,
      'moonpay_customers': ActivityCategory.INTEGRATION,
      'moonpay_policies': ActivityCategory.INTEGRATION,
      'moonpay_transactions': ActivityCategory.INTEGRATION,
      'moonpay_webhook_config': ActivityCategory.INTEGRATION,
      'moonpay_compliance_alerts': ActivityCategory.INTEGRATION,
      'moonpay_policy_logs': ActivityCategory.INTEGRATION,
      
      // Stripe Integration
      'stripe_stablecoin_accounts': ActivityCategory.INTEGRATION,
      'stripe_conversion_transactions': ActivityCategory.INTEGRATION,
      'stripe_webhook_events': ActivityCategory.INTEGRATION,
      
      // Ramp Integration
      'ramp_network_config': ActivityCategory.INTEGRATION,
      'ramp_supported_assets': ActivityCategory.INTEGRATION,
      'ramp_transaction_events': ActivityCategory.INTEGRATION,
      'ramp_webhook_events': ActivityCategory.INTEGRATION,
      
      // Token Properties
      'token_erc20_properties': ActivityCategory.BLOCKCHAIN,
      'token_erc721_properties': ActivityCategory.BLOCKCHAIN,
      'token_erc1155_properties': ActivityCategory.BLOCKCHAIN,
      'token_erc1400_properties': ActivityCategory.BLOCKCHAIN,
      'token_erc3525_properties': ActivityCategory.BLOCKCHAIN,
      'token_erc4626_properties': ActivityCategory.BLOCKCHAIN,
      
      // All other token-related tables
      'token_erc1400_partitions': ActivityCategory.BLOCKCHAIN,
      'token_erc1400_controllers': ActivityCategory.BLOCKCHAIN,
      'token_erc1155_types': ActivityCategory.BLOCKCHAIN,
      'token_erc4626_strategy_params': ActivityCategory.BLOCKCHAIN,
      'token_erc721_attributes': ActivityCategory.BLOCKCHAIN,
      'token_erc4626_asset_allocations': ActivityCategory.BLOCKCHAIN,
      'token_erc3525_slots': ActivityCategory.BLOCKCHAIN
    };
  }
}

export const universalAuditService = new UniversalAuditService();
