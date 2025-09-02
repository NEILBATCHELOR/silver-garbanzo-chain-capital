/**
 * Fixed UniversalDatabaseAuditService - Uses main Supabase client instance
 * Date: August 21, 2025
 * Fix for: Multiple Supabase client instances causing duplicate records
 */

import type { Database } from "../../types/core/supabase";
import { logActivity } from '../../infrastructure/auditLogger';

// FIXED: Import from main client instead of creating separate instance
import { supabase } from '../../infrastructure/database/client';

// REMOVED: Separate client creation (lines 22-27 in original file)
// const getEnv = (key: string): string => { ... }
// const supabaseUrl = getEnv('VITE_SUPABASE_URL') || '...';
// const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || '...';
// const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

interface DatabaseOperation {
  table: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  recordId: string;
  userId?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
}

interface DatabaseTableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
}

class UniversalDatabaseAuditService {
  private static instance: UniversalDatabaseAuditService;
  private tableSchemas: Map<string, DatabaseTableInfo[]> = new Map();
  private auditingEnabled = true;

  public static getInstance(): UniversalDatabaseAuditService {
    if (!UniversalDatabaseAuditService.instance) {
      UniversalDatabaseAuditService.instance = new UniversalDatabaseAuditService();
    }
    return UniversalDatabaseAuditService.instance;
  }

  /**
   * Initialize the service by loading all table schemas
   */
  async initialize(): Promise<void> {
    try {
      // Get all tables and their schemas
      const { data: tables, error } = await (supabase.rpc as any)('get_all_table_schemas');
      
      if (error) {
        console.error('Failed to load table schemas:', error);
        return;
      }

      // Group columns by table - ensure tables is an array
      const tableArray = Array.isArray(tables) ? tables : [];
      tableArray.forEach((table: DatabaseTableInfo) => {
        if (!this.tableSchemas.has(table.table_name)) {
          this.tableSchemas.set(table.table_name, []);
        }
        this.tableSchemas.get(table.table_name)?.push(table);
      });

      console.log(`✅ Audit service initialized for ${this.tableSchemas.size} tables using main Supabase client`);
    } catch (error) {
      console.error('Error initializing database audit service:', error);
    }
  }

  /**
   * Track a database operation
   */
  async trackOperation(operation: DatabaseOperation): Promise<void> {
    if (!this.auditingEnabled) return;

    try {
      const auditEvent = {
        timestamp: new Date().toISOString(),
        action: operation.operation.toLowerCase(),
        entity_type: operation.table,
        entity_id: operation.recordId,
        user_id: operation.userId,
        username: operation.userId ? await this.getUserName(operation.userId) : 'system',
        details: this.generateOperationDetails(operation),
        category: 'system',
        severity: this.getOperationSeverity(operation.operation),
        status: 'success',
        metadata: {
          ...operation.metadata,
          table_name: operation.table,
          operation_type: operation.operation,
          automated: !operation.userId,
          tracked_by: 'UniversalDatabaseAuditService',
          client_source: 'main_singleton' // Track that we're using main client
        },
        old_data: operation.oldData,
        new_data: operation.newData,
        is_automated: !operation.userId
      };

      // Log to backend audit service
      await logActivity(
        auditEvent.action,
        auditEvent.user_id || 'system',
        auditEvent.entity_type,
        auditEvent.entity_id,
        auditEvent.details,
        'Success',
        auditEvent.metadata,
        auditEvent.old_data,
        auditEvent.new_data
      );

      // Also log to audit_logs table directly for redundancy
      await this.logToAuditTable(auditEvent);

    } catch (error) {
      console.error('Error tracking database operation:', error);
    }
  }

  // ... rest of the methods remain the same ...
  
  /**
   * Track CREATE operations
   */
  async trackCreate(table: string, record: any, userId?: string, metadata?: any): Promise<void> {
    const recordId = this.extractRecordId(table, record);
    await this.trackOperation({
      table,
      operation: 'CREATE',
      recordId,
      userId,
      newData: record,
      metadata: {
        ...metadata,
        fixed_client: true // Mark that this is using the fixed client
      }
    });
  }

  /**
   * Track UPDATE operations
   */
  async trackUpdate(table: string, recordId: string, oldData: any, newData: any, userId?: string, metadata?: any): Promise<void> {
    await this.trackOperation({
      table,
      operation: 'UPDATE',
      recordId,
      userId,
      oldData,
      newData,
      metadata: {
        ...metadata,
        fixed_client: true
      }
    });
  }

  /**
   * Track DELETE operations
   */
  async trackDelete(table: string, record: any, userId?: string, metadata?: any): Promise<void> {
    const recordId = this.extractRecordId(table, record);
    await this.trackOperation({
      table,
      operation: 'DELETE',
      recordId,
      userId,
      oldData: record,
      metadata: {
        ...metadata,
        fixed_client: true
      }
    });
  }

  /**
   * Track READ operations (optional, can be high volume)
   */
  async trackRead(table: string, recordId: string, userId?: string, metadata?: any): Promise<void> {
    // Only track sensitive table reads to avoid noise
    const sensitiveTables = [
      'users', 'investors', 'wallets', 'tokens', 'documents',
      'compliance_checks', 'security_events', 'audit_logs'
    ];

    if (sensitiveTables.includes(table)) {
      await this.trackOperation({
        table,
        operation: 'READ',
        recordId,
        userId,
        metadata: {
          ...metadata,
          fixed_client: true
        }
      });
    }
  }

  // ... rest of private methods remain the same but now use the main supabase client ...

  private extractRecordId(table: string, record: any): string {
    const idFields = ['id', `${table.slice(0, -1)}_id`, 'uuid', 'primary_key'];
    
    for (const field of idFields) {
      if (record[field]) {
        return String(record[field]);
      }
    }

    return JSON.stringify(record).substring(0, 100);
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      return user?.name || user?.email || 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  private generateOperationDetails(operation: DatabaseOperation): string {
    switch (operation.operation) {
      case 'CREATE':
        return `Created new record in ${operation.table}`;
      case 'UPDATE':
        return `Updated record ${operation.recordId} in ${operation.table}`;
      case 'DELETE':
        return `Deleted record ${operation.recordId} from ${operation.table}`;
      case 'READ':
        return `Accessed record ${operation.recordId} in ${operation.table}`;
      default:
        return `Performed ${operation.operation} on ${operation.table}`;
    }
  }

  private getOperationSeverity(operation: string): string {
    switch (operation) {
      case 'DELETE': return 'high';
      case 'UPDATE': return 'medium';
      case 'CREATE': return 'low';
      case 'READ': return 'low';
      default: return 'medium';
    }
  }

  private async logToAuditTable(auditEvent: any): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          ...auditEvent,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging to audit_logs table:', error);
    }
  }

  // ... remaining methods stay the same ...

  /**
   * Enable/disable auditing
   */
  setAuditingEnabled(enabled: boolean): void {
    this.auditingEnabled = enabled;
    console.log(`Database auditing ${enabled ? 'enabled' : 'disabled'} (using main client)`);
  }
}

// Export singleton instance
export const universalDatabaseAuditService = UniversalDatabaseAuditService.getInstance();
export default universalDatabaseAuditService;
