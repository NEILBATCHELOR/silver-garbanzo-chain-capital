/**
 * Table Audit Generator
 * 
 * Automatically generates audit services for any table in the database.
 * Handles table discovery and creates appropriate audit wrappers.
 */

import { supabase } from './../../infrastructure/database/client';
import { universalAuditService } from './UniversalAuditService';

interface TableSchema {
  table_name: string;
  primary_key: string[];
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: boolean;
  }>;
}

interface TableAuditMethods {
  create: (data: any, userId?: string) => Promise<any>;
  update: (id: string, data: any, userId?: string) => Promise<any>;
  delete: (id: string, userId?: string) => Promise<void>;
  bulkCreate: (dataArray: any[], userId?: string) => Promise<any[]>;
  bulkUpdate: (updates: Array<{id: string, data: any}>, userId?: string) => Promise<any[]>;
  bulkDelete: (ids: string[], userId?: string) => Promise<void>;
}

export class TableAuditGenerator {
  private tableSchemas: Map<string, TableSchema> = new Map();

  /**
   * All 202 tables from your database
   */
  private readonly ALL_TABLES = [
    // High volume tables
    'investors', 'role_permissions', 'token_versions', 'subscriptions', 
    'investors_backup_pre_kyc_update', 'permissions', 'invoice', 'guardian_wallets',
    'tokens', 'guardian_api_tests', 'policy_rule_approvers_backup', 'token_erc1400_partitions',
    'trigger_backup_phase1', 'policy_rule_approvers', 'investor_groups_investors',
    'investor_group_members', 'token_erc1400_properties', 'token_erc1400_controllers',
    'rules', 'wallet_transactions', 'token_erc20_properties', 'geographic_jurisdictions',
    'guardian_operations', 'pool', 'cap_tables', 'token_erc1155_types',
    'token_erc4626_strategy_params', 'token_erc721_attributes', 'token_erc1155_properties',
    'token_erc4626_properties', 'token_erc721_properties', 'token_erc4626_asset_allocations',
    'token_erc3525_slots', 'policy_template_approvers', 'audit_logs', 'roles',
    'investor_groups', 'token_erc3525_properties', 'user_sessions', 'payer', 'provider',
    'onboarding_restrictions', 'policy_templates', 'projects', 'user_roles', 'users',
    'approval_config_history', 'system_settings', 'redemption_requests', 'dfns_fiat_provider_configs',
    'token_allocations', 'distributions', 'token_templates', 'ramp_network_config',
    'auth_events', 'issuer_detail_documents', 'consensus_settings', 'redemption_approvers',
    'approval_config_approvers', 'approval_configs',
    
    // DFNS tables (all currently empty but need audit)
    'dfns_applications', 'dfns_service_accounts', 'dfns_users', 'dfns_credentials',
    'dfns_personal_access_tokens', 'dfns_wallet_balances', 'dfns_permission_assignments',
    'dfns_policies', 'dfns_policy_approvals', 'dfns_webhooks', 'dfns_webhook_deliveries',
    'dfns_exchange_integrations', 'dfns_exchange_accounts', 'dfns_exchange_balances',
    'dfns_staking_integrations', 'dfns_fee_sponsors', 'dfns_sponsored_fees',
    'dfns_validators', 'dfns_activity_logs', 'dfns_api_requests', 'dfns_sync_status',
    'dfns_signing_keys', 'dfns_wallets', 'dfns_wallet_nfts', 'dfns_transaction_history',
    'dfns_transfers', 'dfns_signatures', 'dfns_broadcast_transactions', 'dfns_permissions',
    'dfns_fiat_transactions', 'dfns_fiat_quotes', 'dfns_fiat_activity_logs',
    
    // Token tables
    'token_erc1155_type_configs', 'token_erc1155_discount_tiers', 'token_erc1155_crafting_recipes',
    'token_erc1400_corporate_actions', 'token_erc1400_custody_providers', 'token_erc1400_regulatory_filings',
    'token_erc1400_partition_transfers', 'token_erc1400_documents', 'token_erc1400_partition_balances',
    'token_erc1400_partition_operators', 'token_erc1155_uri_mappings', 'token_erc1155_balances',
    'token_erc3525_allocations', 'token_erc3525_slot_configs', 'token_erc721_trait_definitions',
    'token_erc721_mint_phases', 'token_erc4626_vault_strategies', 'token_erc4626_performance_metrics',
    'token_erc4626_fee_tiers', 'token_operations', 'token_designs', 'token_events',
    'token_deployment_history', 'token_deployments', 'token_geographic_restrictions',
    'token_sanctions_rules', 'token_whitelists', 'token_erc3525_payment_schedules',
    'token_erc3525_value_adjustments',
    
    // Financial/Payment tables
    'fiat_quotes', 'fiat_transactions', 'redemption_approver_assignments', 'redemption_settlements',
    'redemption_window_configs', 'redemption_windows', 'redemption_rules', 'distribution_redemptions',
    'fund_nav_data', 'nav_oracle_configs', 'settlement_metrics', 'invoices', 'faucet_requests',
    
    // MoonPay tables
    'moonpay_webhook_events', 'moonpay_asset_cache', 'moonpay_swap_transactions', 'moonpay_passes',
    'moonpay_projects', 'moonpay_customers', 'moonpay_policies', 'moonpay_transactions',
    'moonpay_webhook_config', 'moonpay_compliance_alerts', 'moonpay_policy_logs',
    
    // Ramp tables
    'ramp_supported_assets', 'ramp_transaction_events', 'ramp_webhook_events',
    
    // Stripe tables
    'stripe_stablecoin_accounts', 'stripe_conversion_transactions', 'stripe_webhook_events',
    
    // Wallet/Multi-sig tables
    'multi_sig_wallets', 'multi_sig_transactions', 'multi_sig_confirmations', 'wallet_details',
    'wallet_signatories', 'whitelist_settings', 'whitelist_signatories', 'whitelist_entries',
    
    // Document tables
    'documents', 'document_versions', 'document_workflows', 'document_approvals',
    'issuer_documents', 'issuer_access_roles',
    
    // Compliance/Security tables
    'compliance_reports', 'compliance_checks', 'compliance_settings', 'security_audit_logs',
    'security_events', 'risk_assessments', 'kyc_screening_logs', 'regulatory_equivalence_mapping',
    
    // System/Monitoring tables
    'alerts', 'health_checks', 'monitoring_metrics', 'system_processes', 'signatures',
    'deployment_rate_limits', 'user_mfa_settings', 'mfa_policies', 'notifications',
    
    // Transaction/Approval tables
    'transactions', 'transaction_events', 'transaction_signatures', 'transaction_proposals',
    'transaction_notifications', 'approval_requests', 'investor_approvals', 'bulk_operations',
    
    // Workflow tables
    'workflow_stages', 'stage_requirements',
    
    // Payment providers
    'ripple_payments',
    
    // Organizations/Projects
    'organizations', 'project_credentials', 'credential_usage_logs', 'project_wallets',
    
    // Cap table
    'cap_table_investors',
    
    // On-chain
    'onchain_issuers', 'onchain_verification_history', 'onchain_identities', 'onchain_claims'
  ];

  /**
   * Discover all tables in the database
   */
  async discoverAllTables(): Promise<string[]> {
    try {
      // Query the database using raw SQL to get table names
      const { data: tables, error } = await supabase.rpc('list_tables');
      
      if (!error && tables && Array.isArray(tables)) {
        return tables.map((t: any) => t.table_name || t.tablename || t);
      }
    } catch (error) {
      console.warn('Could not query database tables using RPC, using predefined list');
    }
    
    // Fallback to predefined list
    return this.ALL_TABLES;
  }

  /**
   * Generate audit service for any table
   */
  generateTableAuditService(tableName: string): TableAuditMethods {
    return {
      create: (data: any, userId?: string) => this.auditCreate(tableName, data, userId),
      update: (id: string, data: any, userId?: string) => this.auditUpdate(tableName, id, data, userId),
      delete: (id: string, userId?: string) => this.auditDelete(tableName, id, userId),
      bulkCreate: (dataArray: any[], userId?: string) => this.auditBulkCreate(tableName, dataArray, userId),
      bulkUpdate: (updates: Array<{id: string, data: any}>, userId?: string) => this.auditBulkUpdate(tableName, updates, userId),
      bulkDelete: (ids: string[], userId?: string) => this.auditBulkDelete(tableName, ids, userId)
    };
  }

  /**
   * Audit CREATE operation
   */
  private async auditCreate(tableName: string, data: any, userId?: string): Promise<any> {
    const entityId = data.id || crypto.randomUUID();
    
    return universalAuditService.auditOperation(
      {
        table: tableName,
        operation: 'INSERT',
        entityId,
        userId,
        newData: data
      },
      async () => {
        const { data: result, error } = await (supabase as any)
          .from(tableName)
          .insert(data)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      }
    );
  }

  /**
   * Audit UPDATE operation
   */
  private async auditUpdate(tableName: string, id: string, data: any, userId?: string): Promise<any> {
    // Get current data first for change tracking
    const { data: oldData } = await (supabase as any)
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    return universalAuditService.auditOperation(
      {
        table: tableName,
        operation: 'UPDATE',
        entityId: id,
        userId,
        oldData,
        newData: data
      },
      async () => {
        const { data: result, error } = await (supabase as any)
          .from(tableName)
          .update(data)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      }
    );
  }

  /**
   * Audit DELETE operation
   */
  private async auditDelete(tableName: string, id: string, userId?: string): Promise<void> {
    // Get data before deletion for audit trail
    const { data: oldData } = await (supabase as any)
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    return universalAuditService.auditOperation(
      {
        table: tableName,
        operation: 'DELETE',
        entityId: id,
        userId,
        oldData
      },
      async () => {
        const { error } = await (supabase as any)
          .from(tableName)
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }
    );
  }

  /**
   * Audit BULK CREATE operations
   */
  private async auditBulkCreate(tableName: string, dataArray: any[], userId?: string): Promise<any[]> {
    const batchId = crypto.randomUUID();
    
    return universalAuditService.auditOperation(
      {
        table: tableName,
        operation: 'INSERT',
        entityId: `bulk_${batchId}`,
        userId,
        newData: dataArray,
        metadata: { batchSize: dataArray.length, batchId, operation: 'bulk_create' }
      },
      async () => {
        const { data: results, error } = await (supabase as any)
          .from(tableName)
          .insert(dataArray)
          .select();
        
        if (error) throw error;
        return results || [];
      }
    );
  }

  /**
   * Audit BULK UPDATE operations
   */
  private async auditBulkUpdate(
    tableName: string, 
    updates: Array<{id: string, data: any}>, 
    userId?: string
  ): Promise<any[]> {
    const batchId = crypto.randomUUID();
    const results = [];

    // Process each update individually for proper audit trail
    for (const update of updates) {
      try {
        const result = await this.auditUpdate(tableName, update.id, update.data, userId);
        results.push(result);
      } catch (error) {
        console.error(`Bulk update failed for ${tableName}:${update.id}:`, error);
        // Continue with other updates even if one fails
      }
    }

    // Log batch completion
    await universalAuditService.auditOperation(
      {
        table: tableName,
        operation: 'UPDATE',
        entityId: `bulk_${batchId}`,
        userId,
        metadata: { 
          batchSize: updates.length, 
          batchId, 
          operation: 'bulk_update_completed',
          updatedIds: updates.map(u => u.id),
          successCount: results.length
        }
      },
      async () => results
    );

    return results;
  }

  /**
   * Audit BULK DELETE operations
   */
  private async auditBulkDelete(tableName: string, ids: string[], userId?: string): Promise<void> {
    const batchId = crypto.randomUUID();

    // Get all data before deletion
    const { data: oldDataArray } = await (supabase as any)
      .from(tableName)
      .select('*')
      .in('id', ids);

    return universalAuditService.auditOperation(
      {
        table: tableName,
        operation: 'DELETE',
        entityId: `bulk_${batchId}`,
        userId,
        oldData: oldDataArray,
        metadata: { batchSize: ids.length, batchId, operation: 'bulk_delete', deletedIds: ids }
      },
      async () => {
        const { error } = await (supabase as any)
          .from(tableName)
          .delete()
          .in('id', ids);
        
        if (error) throw error;
      }
    );
  }

  /**
   * Get all predefined tables
   */
  getAllTables(): string[] {
    return [...this.ALL_TABLES];
  }

  /**
   * Check if table exists and is accessible
   */
  async validateTableAccess(tableName: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from(tableName)
        .select('*')
        .limit(1);

      // Table is accessible if no error or only "no rows" error
      return !error || error.message.includes('0 rows');
    } catch (error) {
      console.error(`Table ${tableName} is not accessible:`, error);
      return false;
    }
  }
}

export const tableAuditGenerator = new TableAuditGenerator();
