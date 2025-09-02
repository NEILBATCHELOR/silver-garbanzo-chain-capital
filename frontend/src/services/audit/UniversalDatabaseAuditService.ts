/**
 * Universal Database Audit Service
 * 
 * Automatically tracks all CRUD operations across all database tables
 * without triggers
 * 
 * CRITICAL FIX: Uses audit-free client to prevent circular dependencies
 * The main client.ts has audit proxy that would call this service, creating a loop
 */

import type { Database } from "../../types/core/supabase";
import { logActivity } from '../../infrastructure/auditLogger';

// CRITICAL FIX: Use audit-free client to prevent circular dependencies
// Main client has audit proxy that calls this service - would create infinite loop
import { auditFreeSupabase, getCurrentUserId } from '../../infrastructure/database/audit-free-client';

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
   * Test database connection for audit service
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await auditFreeSupabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Audit service database test failed:', error);
        return false;
      }
      
      console.log('✅ Audit service database connection successful');
      return true;
    } catch (error) {
      console.error('Exception during audit service database test:', error);
      return false;
    }
  }

  /**
   * Initialize the service by loading table schemas
   */  async initialize(): Promise<void> {
    console.log('🔄 Initializing Universal Database Audit Service...');
    
    // First test basic database connectivity
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      console.warn('⚠️ Database connection test failed, continuing with limited audit functionality');
      return;
    }
    
    try {
      // Use predefined table list instead of querying information_schema
      // This avoids the schema access privilege issues in Supabase
      console.log('🔄 Using predefined table discovery method for Supabase compatibility...');
      
      // Get table names from existing audit_logs to build our schema
      const { data: existingLogs, error: logsError } = await auditFreeSupabase
        .from('audit_logs')
        .select('entity_type')
        .not('entity_type', 'is', null)
        .limit(100);
      
      if (logsError) {
        console.error('❌ Failed to load existing audit logs for table discovery:', logsError);
        
        // Fall back to core table list
        console.log('🔄 Using fallback core table discovery...');
        this.initializeCoreTablesOnly();
        return;
      }
      
      // Extract unique table names from audit logs with proper type filtering
      const validEntityTypes = (existingLogs || [])
        .map(log => log.entity_type)
        .filter((entityType): entityType is string => 
          typeof entityType === 'string' && 
          entityType !== null && 
          entityType.trim().length > 0
        );
      
      const discoveredTables = Array.from(new Set(validEntityTypes)) as string[];
      
      // Add essential tables that might not be in audit logs yet
      const essentialTables: string[] = [
        'users', 'profiles', 'user_roles', 'roles', 'permissions',
        'organizations', 'organization_users', 'audit_logs',
        'wallet_transactions', 'policy_templates'
      ];
      
      const allTables: string[] = [...new Set([...discoveredTables, ...essentialTables])];
      
      // Initialize table schemas with basic structure
      allTables.forEach((tableName: string) => {
        if (tableName && typeof tableName === 'string' && tableName.trim().length > 0) {
          this.tableSchemas.set(tableName.trim(), []);
        }
      });
      
      console.log(`✅ Initialized ${allTables.length} tables for audit tracking`);
      console.log('📋 Tables initialized for audit:', allTables.sort().join(', '));
      
    } catch (error) {
      console.error('❌ Table schema initialization failed:', error);
      this.initializeCoreTablesOnly();
    }
  }

  /**
   * Initialize only core tables when schema introspection fails
   */
  private initializeCoreTablesOnly(): void {
    const coreTables = [
      'users', 'profiles', 'user_roles', 'roles', 'permissions',
      'organizations', 'organization_users', 'audit_logs',
      'wallet_transactions', 'policy_templates', 'documents',
      'workflows', 'workflow_steps', 'notifications'
    ];
    
    coreTables.forEach(tableName => {
      if (!this.tableSchemas.has(tableName)) {
        this.tableSchemas.set(tableName, []);
      }
    });
    
    console.log(`✅ Initialized ${coreTables.length} core tables for audit tracking`);
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
        old_data: operation.oldData,
        new_data: operation.newData,
        metadata: {
          ...operation.metadata,
          tracked_by: 'universal-audit-service',
          version: '2.0'
        }
      };

      // Store in audit_logs table using audit-free client
      const { error } = await auditFreeSupabase
        .from('audit_logs')
        .insert(auditEvent);

      if (error) {
        console.error('Failed to store audit event:', error);
      }

      // Also log to activity service for user tracking
      if (operation.userId) {
        await logActivity(
          `database_${operation.operation.toLowerCase()}`,
          operation.userId,
          operation.table,
          operation.recordId,
          `${operation.operation} on ${operation.table}`,
          'Success',
          {
            table: operation.table,
            recordId: operation.recordId,
            operation: operation.operation
          }
        );
      }
    } catch (error) {
      console.error('Error in audit tracking:', error);
    }
  }

  /**
   * Get user name for audit logging
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const { data, error } = await auditFreeSupabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return userId; // Fallback to user ID
      }

      return data.name || data.email || userId;
    } catch (error) {
      return userId; // Fallback to user ID
    }
  }

  /**
   * Enable or disable auditing
   */
  setAuditingEnabled(enabled: boolean): void {
    this.auditingEnabled = enabled;
    console.log(`🔍 Universal Database Auditing: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(): Promise<any> {
    try {
      const { data, error } = await auditFreeSupabase
        .from('audit_logs')
        .select('action, entity_type, timestamp')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      if (error) {
        return { CREATE: 0, read: 0, UPDATE: 0, DELETE: 0 };
      }

      const stats: { [key: string]: number } = {};
      data?.forEach(entry => {
        const action = entry.action?.toUpperCase() || 'UNKNOWN';
        stats[action] = (stats[action] || 0) + 1;
      });

      return {
        CREATE: stats.CREATE || 0,
        READ: stats.READ || 0,
        UPDATE: stats.UPDATE || 0,
        DELETE: stats.DELETE || 0,
        total_operations: Object.values(stats).reduce((a, b) => a + b, 0),
        tracked_tables: this.tableSchemas.size,
        time_period: '24 hours'
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      return { CREATE: 0, read: 0, UPDATE: 0, DELETE: 0 };
    }
  }

  /**
   * Get database statistics (alias for getAuditStats for compatibility)
   */
  async getDatabaseStatistics(): Promise<any> {
    return this.getAuditStats();
  }

  /**
   * Track a CREATE operation
   */
  async trackCreate(
    tableName: string, 
    newData: any, 
    userId?: string, 
    metadata?: any
  ): Promise<void> {
    const currentUserId = userId || await getCurrentUserId();
    await this.trackOperation({
      table: tableName,
      operation: 'CREATE',
      recordId: newData?.id || 'unknown',
      userId: currentUserId,
      newData,
      metadata
    });
  }

  /**
   * Track an UPDATE operation
   */
  async trackUpdate(
    tableName: string, 
    recordId: string, 
    oldData: any, 
    newData: any, 
    userId?: string, 
    metadata?: any
  ): Promise<void> {
    const currentUserId = userId || await getCurrentUserId();
    await this.trackOperation({
      table: tableName,
      operation: 'UPDATE',
      recordId,
      userId: currentUserId,
      oldData,
      newData,
      metadata
    });
  }

  /**
   * Track a DELETE operation
   */
  async trackDelete(
    tableName: string, 
    oldData: any, 
    userId?: string, 
    metadata?: any
  ): Promise<void> {
    const currentUserId = userId || await getCurrentUserId();
    await this.trackOperation({
      table: tableName,
      operation: 'DELETE',
      recordId: oldData?.id || 'unknown',
      userId: currentUserId,
      oldData,
      metadata
    });
  }
}

// Export singleton instance
export const universalDatabaseAuditService = UniversalDatabaseAuditService.getInstance();
export default universalDatabaseAuditService;
