/**
 * Organization Assignment Audit Service
 * Service for viewing and managing organization assignment audit trails
 * Integrated with centralized audit logging system
 */

import { supabase } from '@/infrastructure/database/client';
import { universalDatabaseAuditService } from '@/services/audit/UniversalDatabaseAuditService';

export interface OrganizationAssignmentAuditRecord {
  id: string;
  tableName: 'user_organization_roles' | 'project_organization_assignments';
  recordId: string;
  operationType: 'INSERT' | 'UPDATE' | 'DELETE';
  changedBy: string | null;
  changedByName?: string | null;
  changedByEmail?: string | null;
  changedAt: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  changedFields: string[];
  changeReason: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface AuditQueryOptions {
  tableName?: 'user_organization_roles' | 'project_organization_assignments';
  operationType?: 'INSERT' | 'UPDATE' | 'DELETE';
  userId?: string;
  recordId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export class OrganizationAssignmentAuditService {
  /**
   * Get audit records with filtering options using centralized audit system
   */
  static async getAuditRecords(options: AuditQueryOptions = {}): Promise<{
    records: OrganizationAssignmentAuditRecord[];
    total: number;
  }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Filter by organization-related tables
      if (options.tableName) {
        query = query.eq('entity_type', options.tableName);
      } else {
        // Default to organization-related tables
        query = query.in('entity_type', ['user_organization_roles', 'project_organization_assignments', 'organizations']);
      }

      // Map operation types
      if (options.operationType) {
        const actionMap = {
          'INSERT': 'create',
          'UPDATE': 'update', 
          'DELETE': 'delete'
        };
        query = query.eq('action', actionMap[options.operationType] || options.operationType.toLowerCase());
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.recordId) {
        query = query.eq('entity_id', options.recordId);
      }

      if (options.dateFrom) {
        query = query.gte('timestamp', options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte('timestamp', options.dateTo);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset && options.limit) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch audit records:', error);
        throw new Error(`Failed to fetch audit records: ${error.message}`);
      }

      // Map audit_logs data to OrganizationAssignmentAuditRecord format
      const records = (data || []).map(item => ({
        id: item.id,
        tableName: item.entity_type as 'user_organization_roles' | 'project_organization_assignments',
        recordId: item.entity_id || 'unknown',
        operationType: this.mapActionToOperationType(item.action),
        changedBy: item.user_id,
        changedByName: item.username,
        changedByEmail: item.user_email,
        changedAt: item.timestamp,
        oldValues: item.old_data,
        newValues: item.new_data,
        changedFields: this.extractChangedFields(item.old_data, item.new_data),
        changeReason: item.details,
        ipAddress: item.ip_address,
        userAgent: item.user_agent,
        sessionId: item.session_id,
        metadata: item.metadata,
        createdAt: item.timestamp
      }));

      return {
        records,
        total: count || 0
      };
    } catch (error) {
      console.warn('Error fetching audit records, returning empty results:', error);
      return {
        records: [],
        total: 0
      };
    }
  }

  /**
   * Get audit records for specific user organization role
   */
  static async getUserOrganizationRoleAuditHistory(userOrganizationRoleId: string): Promise<OrganizationAssignmentAuditRecord[]> {
    try {
      const { records } = await this.getAuditRecords({
        tableName: 'user_organization_roles',
        recordId: userOrganizationRoleId
      });
      return records;
    } catch (error) {
      console.error('Error in getUserOrganizationRoleAuditHistory:', error);
      return [];
    }
  }

  /**
   * Get audit records for specific project organization assignment
   */
  static async getProjectOrganizationAssignmentAuditHistory(assignmentId: string): Promise<OrganizationAssignmentAuditRecord[]> {
    try {
      const { records } = await this.getAuditRecords({
        tableName: 'project_organization_assignments',
        recordId: assignmentId
      });
      return records;
    } catch (error) {
      console.error('Error in getProjectOrganizationAssignmentAuditHistory:', error);
      return [];
    }
  }

  /**
   * Get audit records for specific user (all their changes)
   */
  static async getUserAuditActivity(userId: string, options: Omit<AuditQueryOptions, 'userId'> = {}): Promise<{
    records: OrganizationAssignmentAuditRecord[];
    total: number;
  }> {
    try {
      return await this.getAuditRecords({
        ...options,
        userId
      });
    } catch (error) {
      console.error('Error in getUserAuditActivity:', error);
      return {
        records: [],
        total: 0
      };
    }
  }

  /**
   * Get audit statistics using centralized audit system
   */
  static async getAuditStatistics(dateFrom?: string, dateTo?: string): Promise<{
    totalChanges: number;
    userRoleChanges: number;
    projectAssignmentChanges: number;
    changesByOperation: { operation: string; count: number }[];
    changesByUser: { userId: string; userName: string; count: number }[];
    changesByDay: { date: string; count: number }[];
  }> {
    try {
      // Use the centralized audit service for database statistics
      const dbStats = await universalDatabaseAuditService.getDatabaseStatistics();
      
      // Build base query for organization-specific audit records
      let baseQuery = supabase
        .from('audit_logs')
        .select('*')
        .in('entity_type', ['user_organization_roles', 'project_organization_assignments', 'organizations']);

      if (dateFrom) {
        baseQuery = baseQuery.gte('timestamp', dateFrom);
      }

      if (dateTo) {
        baseQuery = baseQuery.lte('timestamp', dateTo);
      }

      const { data: allRecords, error } = await baseQuery;

      if (error) {
        throw new Error(`Failed to fetch audit statistics: ${error.message}`);
      }

      const records = allRecords || [];

      // Calculate statistics
      const totalChanges = records.length;
      const userRoleChanges = records.filter(r => r.entity_type === 'user_organization_roles').length;
      const projectAssignmentChanges = records.filter(r => r.entity_type === 'project_organization_assignments').length;

      // Changes by operation
      const operationCounts = records.reduce((acc, record) => {
        const operation = this.mapActionToOperationType(record.action);
        acc[operation] = (acc[operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const changesByOperation = Object.entries(operationCounts).map(([operation, count]) => ({
        operation,
        count: count as number
      }));

      // Changes by user
      const userCounts = records.reduce((acc, record) => {
        const userId = record.user_id || 'unknown';
        const userName = record.username || 'Unknown User';
        
        if (!acc[userId]) {
          acc[userId] = { userId, userName, count: 0 };
        }
        acc[userId].count++;
        return acc;
      }, {} as Record<string, { userId: string; userName: string; count: number }>);

      const changesByUser: { userId: string; userName: string; count: number }[] = (Object.values(userCounts) as { userId: string; userName: string; count: number }[])
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 users

      // Changes by day
      const dayCounts = records.reduce((acc, record) => {
        const date = new Date(record.timestamp).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const changesByDay: { date: string; count: number }[] = Object.entries(dayCounts)
        .map(([date, count]) => ({ date, count: count as number }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalChanges,
        userRoleChanges,
        projectAssignmentChanges,
        changesByOperation,
        changesByUser,
        changesByDay
      };
    } catch (error) {
      console.warn('Error fetching audit statistics, returning empty results:', error);
      return {
        totalChanges: 0,
        userRoleChanges: 0,
        projectAssignmentChanges: 0,
        changesByOperation: [],
        changesByUser: [],
        changesByDay: []
      };
    }
  }

  /**
   * Export audit records to CSV
   */
  static async exportAuditRecordsToCSV(options: AuditQueryOptions = {}): Promise<string> {
    try {
      const { records } = await this.getAuditRecords({
        ...options,
        limit: 10000 // Large limit for export
      });

      // Create CSV headers
      const headers = [
        'ID',
        'Table Name',
        'Record ID',
        'Operation',
        'Changed By',
        'Changed By Name',
        'Changed At',
        'Changed Fields',
        'Change Reason',
        'Old Values',
        'New Values'
      ];

      // Create CSV rows
      const rows = records.map(record => [
        record.id,
        record.tableName,
        record.recordId,
        record.operationType,
        record.changedBy || '',
        record.changedByName || '',
        record.changedAt,
        record.changedFields.join(', '),
        record.changeReason || '',
        JSON.stringify(record.oldValues || {}),
        JSON.stringify(record.newValues || {})
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error in exportAuditRecordsToCSV:', error);
      throw error;
    }
  }

  /**
   * Get audit record diff summary
   */
  static getAuditRecordDiff(record: OrganizationAssignmentAuditRecord): {
    added: Record<string, any>;
    modified: Record<string, { from: any; to: any }>;
    removed: Record<string, any>;
  } {
    const diff = {
      added: {} as Record<string, any>,
      modified: {} as Record<string, { from: any; to: any }>,
      removed: {} as Record<string, any>
    };

    if (record.operationType === 'INSERT') {
      // All new values are additions
      if (record.newValues) {
        Object.entries(record.newValues).forEach(([key, value]) => {
          if (record.changedFields.includes(key)) {
            diff.added[key] = value;
          }
        });
      }
    } else if (record.operationType === 'DELETE') {
      // All old values are removals
      if (record.oldValues) {
        Object.entries(record.oldValues).forEach(([key, value]) => {
          if (record.changedFields.includes(key)) {
            diff.removed[key] = value;
          }
        });
      }
    } else if (record.operationType === 'UPDATE') {
      // Compare old and new values
      record.changedFields.forEach(field => {
        const oldValue = record.oldValues?.[field];
        const newValue = record.newValues?.[field];
        
        if (oldValue === undefined && newValue !== undefined) {
          diff.added[field] = newValue;
        } else if (oldValue !== undefined && newValue === undefined) {
          diff.removed[field] = oldValue;
        } else if (oldValue !== newValue) {
          diff.modified[field] = { from: oldValue, to: newValue };
        }
      });
    }

    return diff;
  }

  /**
   * Track organization assignment changes using centralized audit service
   */
  static async trackUserOrganizationRoleChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    recordId: string,
    oldData?: any,
    newData?: any,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      switch (operation) {
        case 'CREATE':
          await universalDatabaseAuditService.trackCreate('user_organization_roles', newData, userId, metadata);
          break;
        case 'UPDATE':
          await universalDatabaseAuditService.trackUpdate('user_organization_roles', recordId, oldData, newData, userId, metadata);
          break;
        case 'DELETE':
          await universalDatabaseAuditService.trackDelete('user_organization_roles', oldData, userId, metadata);
          break;
      }
    } catch (error) {
      console.error('Error tracking user organization role change:', error);
    }
  }

  /**
   * Track project organization assignment changes using centralized audit service
   */
  static async trackProjectOrganizationAssignmentChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    recordId: string,
    oldData?: any,
    newData?: any,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      switch (operation) {
        case 'CREATE':
          await universalDatabaseAuditService.trackCreate('project_organization_assignments', newData, userId, metadata);
          break;
        case 'UPDATE':
          await universalDatabaseAuditService.trackUpdate('project_organization_assignments', recordId, oldData, newData, userId, metadata);
          break;
        case 'DELETE':
          await universalDatabaseAuditService.trackDelete('project_organization_assignments', oldData, userId, metadata);
          break;
      }
    } catch (error) {
      console.error('Error tracking project organization assignment change:', error);
    }
  }

  /**
   * Private helper methods
   */
  private static mapActionToOperationType(action: string): 'INSERT' | 'UPDATE' | 'DELETE' {
    switch (action?.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'INSERT';
      case 'update':
      case 'modify':
        return 'UPDATE';
      case 'delete':
      case 'remove':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  private static extractChangedFields(oldData: any, newData: any): string[] {
    const fields = new Set<string>();

    if (oldData) {
      Object.keys(oldData).forEach(key => fields.add(key));
    }

    if (newData) {
      Object.keys(newData).forEach(key => fields.add(key));
    }

    return Array.from(fields);
  }
}

export default OrganizationAssignmentAuditService;
