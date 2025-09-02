/**
 * Audit Log Service
 * 
 * Traditional audit logging service that works alongside the Enhanced Activity Service.
 * Provides backward compatibility for existing audit functionality.
 */

import { supabase } from '@/infrastructure/supabaseClient';
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivitySeverity } from '../activity/EnhancedActivityService';

// Audit Event Types
export enum AuditEventType {
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // Project Management
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  PROJECT_STATUS_CHANGED = 'PROJECT_STATUS_CHANGED',
  
  // Token Operations
  TOKEN_CREATED = 'TOKEN_CREATED',
  TOKEN_UPDATED = 'TOKEN_UPDATED',
  TOKEN_DEPLOYED = 'TOKEN_DEPLOYED',
  TOKEN_TRANSFERRED = 'TOKEN_TRANSFERRED',
  TOKEN_MINTED = 'TOKEN_MINTED',
  TOKEN_BURNED = 'TOKEN_BURNED',
  
  // Compliance
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  RULE_APPLIED = 'RULE_APPLIED',
  POLICY_UPDATED = 'POLICY_UPDATED',
  POLICY_CREATED = 'POLICY_CREATED',
  
  // Approval Events
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  
  // Financial
  INVESTMENT_CREATED = 'INVESTMENT_CREATED',
  INVESTMENT_UPDATED = 'INVESTMENT_UPDATED',
  TRANSACTION_PROCESSED = 'TRANSACTION_PROCESSED',
  
  // Document Management
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  
  // System Events
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED'
}

// Audit Log Entry Interface
export interface AuditLogEntry {
  id?: string;
  timestamp?: Date;
  action: string;
  actionType?: AuditEventType;
  userId?: string;
  userEmail?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  details?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changes?: Record<string, { old?: any; new?: any }>;
  metadata?: Record<string, any>;
  status?: string;
  correlationId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Audit Query Options
export interface AuditQueryOptions {
  entityType?: string;
  entityId?: string;
  userId?: string;
  projectId?: string;
  actionType?: AuditEventType[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit Log Service Class
 * 
 * Provides comprehensive audit logging functionality with
 * integration to the Enhanced Activity Service for improved performance.
 * 
 * This service maintains backward compatibility with the legacy createLog method
 * while leveraging the new Enhanced Activity Service for better performance.
 */
export class AuditLogService {
  /**
   * Create an audit log entry
   */
  async createAuditEntry(
    action: string,
    entityType: string,
    entityId: string,
    changes: Record<string, { old?: any; new?: any }>,
    userId?: string,
    details?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Create audit entry
      const auditEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        action,
        userId,
        entityType,
        entityId,
        details,
        changes,
        metadata,
        correlationId: this.generateCorrelationId()
      };

      // Extract old and new data from changes
      const oldData: Record<string, any> = {};
      const newData: Record<string, any> = {};

      Object.entries(changes).forEach(([key, value]) => {
        if (value.old !== undefined) oldData[key] = value.old;
        if (value.new !== undefined) newData[key] = value.new;
      });

      auditEntry.oldData = Object.keys(oldData).length > 0 ? oldData : undefined;
      auditEntry.newData = Object.keys(newData).length > 0 ? newData : undefined;

      // Log to Enhanced Activity Service for better performance
      await enhancedActivityService.logActivity({
        source: ActivitySource.SYSTEM,
        action,
        category: this.getCategoryFromAction(action),
        severity: this.getSeverityFromAction(action),
        entityType,
        entityId,
        userId,
        details,
        oldData: auditEntry.oldData,
        newData: auditEntry.newData,
        changes,
        metadata,
        correlationId: auditEntry.correlationId
      });

      // Also log to traditional audit_logs table for backward compatibility
      await this.insertAuditEntry(auditEntry);

    } catch (error) {
      console.error('Failed to create audit entry:', error);
      throw error;
    }
  }

  /**
   * Log user action
   */
  async logUserAction(
    action: string,
    userId: string,
    entityType?: string,
    entityId?: string,
    details?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.createAuditEntry(
      action,
      entityType || 'user',
      entityId || userId,
      {},
      userId,
      details,
      metadata
    );
  }

  /**
   * Log data change
   */
  async logDataChange(
    entityType: string,
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    userId?: string,
    action?: string
  ): Promise<void> {
    // Calculate changes
    const changes: Record<string, { old?: any; new?: any }> = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    });

    await this.createAuditEntry(
      action || `${entityType}_updated`,
      entityType,
      entityId,
      changes,
      userId,
      `${entityType} ${entityId} was updated`
    );
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(options: AuditQueryOptions = {}): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*');

      // Apply filters
      if (options.entityType) {
        query = query.eq('entity_type', options.entityType);
      }
      if (options.entityId) {
        query = query.eq('entity_id', options.entityId);
      }
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }
      if (options.actionType?.length) {
        query = query.in('action_type', options.actionType);
      }
      if (options.dateFrom) {
        query = query.gte('timestamp', options.dateFrom.toISOString());
      }
      if (options.dateTo) {
        query = query.lte('timestamp', options.dateTo.toISOString());
      }

      // Apply pagination
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Order by timestamp desc
      query = query.order('timestamp', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Convert database records to AuditLogEntry objects with proper Date conversion
      const entries: AuditLogEntry[] = (data || []).map(record => ({
        ...record,
        timestamp: record.timestamp ? new Date(record.timestamp) : undefined,
        actionType: record.action_type as AuditEventType,
        userId: record.user_id,
        userEmail: record.user_email,
        entityType: record.entity_type,
        entityId: record.entity_id,
        projectId: record.project_id,
        oldData: record.old_data ? (typeof record.old_data === 'string' ? JSON.parse(record.old_data) : record.old_data) as Record<string, any> : undefined,
        newData: record.new_data ? (typeof record.new_data === 'string' ? JSON.parse(record.new_data) : record.new_data) as Record<string, any> : undefined,
        changes: record.changes ? (typeof record.changes === 'string' ? JSON.parse(record.changes) : record.changes) as Record<string, { old?: any; new?: any }> : undefined,
        metadata: record.metadata ? (typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata) as Record<string, any> : undefined,
        correlationId: record.correlation_id,
        sessionId: record.session_id,
        ipAddress: record.ip_address,
        userAgent: record.user_agent
      }));

      return entries;
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for entity
   */
  async getAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return this.queryAuditLogs({
      entityType,
      entityId,
      limit
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.queryAuditLogs({
      userId,
      dateFrom,
      dateTo,
      limit
    });
  }

  /**
   * Log compliance event
   */
  async logComplianceEvent(
    ruleId: string,
    entityType: string,
    entityId: string,
    result: 'pass' | 'fail' | 'warning',
    details?: string,
    userId?: string
  ): Promise<void> {
    await this.createAuditEntry(
      'compliance_check',
      entityType,
      entityId,
      {
        complianceResult: { new: result },
        ruleId: { new: ruleId }
      },
      userId,
      details,
      { ruleId, result }
    );
  }

  /**
   * Create a log entry (backward compatibility method)
   * 
   * This method provides backward compatibility for existing code that uses
   * the legacy createLog method signature.
   */
  async createLog(
    eventType: AuditEventType,
    userId: string,
    entityId: string,
    entityType: string,
    details?: Record<string, any> | string
  ): Promise<void> {
    try {
      // Convert details to proper format
      const detailsText = typeof details === 'string' ? details : JSON.stringify(details || {});
      const metadata = typeof details === 'object' ? details : {};
      
      // Create audit entry using the new format
      await this.createAuditEntry(
        eventType,
        entityType,
        entityId,
        {}, // No specific changes for this legacy method
        userId,
        detailsText,
        metadata
      );
    } catch (error) {
      console.error('Failed to create log entry:', error);
      throw error;
    }
  }

  /**
   * Insert audit entry into database
   */
  private async insertAuditEntry(entry: AuditLogEntry): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        id: entry.id,
        timestamp: entry.timestamp?.toISOString(),
        action: entry.action,
        action_type: entry.actionType,
        user_id: entry.userId,
        user_email: entry.userEmail,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        project_id: entry.projectId,
        details: entry.details,
        old_data: entry.oldData,
        new_data: entry.newData,
        changes: entry.changes,
        metadata: entry.metadata,
        status: entry.status,
        correlation_id: entry.correlationId,
        session_id: entry.sessionId,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent
      });

    if (error) throw error;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get activity category from action
   */
  private getCategoryFromAction(action: string): ActivityCategory {
    if (action.includes('user') || action.includes('login') || action.includes('auth')) {
      return ActivityCategory.AUTH;
    }
    if (action.includes('compliance') || action.includes('rule') || action.includes('policy')) {
      return ActivityCategory.COMPLIANCE;
    }
    if (action.includes('token') || action.includes('blockchain')) {
      return ActivityCategory.BLOCKCHAIN;
    }
    if (action.includes('document')) {
      return ActivityCategory.DOCUMENT;
    }
    if (action.includes('financial') || action.includes('investment') || action.includes('transaction')) {
      return ActivityCategory.FINANCIAL;
    }
    if (action.includes('project')) {
      return ActivityCategory.USER_MANAGEMENT;
    }
    return ActivityCategory.SYSTEM;
  }

  /**
   * Get activity severity from action
   */
  private getSeverityFromAction(action: string): ActivitySeverity {
    if (action.includes('delete') || action.includes('fail') || action.includes('error')) {
      return ActivitySeverity.WARNING;
    }
    if (action.includes('critical') || action.includes('security')) {
      return ActivitySeverity.CRITICAL;
    }
    if (action.includes('important') || action.includes('compliance')) {
      return ActivitySeverity.NOTICE;
    }
    return ActivitySeverity.INFO;
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();

// Legacy compatibility exports
export { AuditLogService as AuditService };
export { auditLogService as auditService };

export default auditLogService;