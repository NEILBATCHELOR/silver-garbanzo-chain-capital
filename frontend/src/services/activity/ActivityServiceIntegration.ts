/**
 * Activity Service Integration
 * 
 * Provides higher-order functions and utilities for integrating activity logging
 * into existing services and operations with minimal code changes.
 */

import { enhancedActivityService, ActivitySource, ActivityCategory, ActivityStatus, ActivitySeverity } from './EnhancedActivityService';

export interface OperationContext {
  entityType?: string;
  entityId?: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
  category?: ActivityCategory;
  severity?: ActivitySeverity;
}

/**
 * Activity Service Integration Helper
 */
export class ActivityServiceIntegration {
  /**
   * Wrap any operation with automatic activity logging
   */
  async withActivityLogging<T>(
    action: string,
    operation: () => Promise<T>,
    context: OperationContext,
    source: ActivitySource = ActivitySource.SYSTEM
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let status = ActivityStatus.SUCCESS;
    let errorDetails: string | undefined;

    try {
      result = await operation();
      return result;
    } catch (error) {
      status = ActivityStatus.FAILURE;
      errorDetails = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      await enhancedActivityService.logActivity({
        source,
        action,
        category: context.category || ActivityCategory.SYSTEM,
        severity: context.severity || (status === ActivityStatus.FAILURE ? ActivitySeverity.WARNING : ActivitySeverity.INFO),
        entityType: context.entityType,
        entityId: context.entityId,
        userId: context.userId,
        projectId: context.projectId,
        status,
        duration,
        details: errorDetails,
        metadata: {
          ...context.metadata,
          duration,
          status,
          ...(errorDetails && { error: errorDetails })
        }
      });
    }
  }

  /**
   * Log database operations
   */
  async logDatabaseOperation(
    operation: 'insert' | 'update' | 'delete' | 'select',
    table: string,
    entityId: string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    const changes: Record<string, any> = {};
    
    if (oldData && newData) {
      // Calculate changes
      Object.keys({ ...oldData, ...newData }).forEach(key => {
        if (oldData[key] !== newData[key]) {
          changes[key] = { old: oldData[key], new: newData[key] };
        }
      });
    }

    await enhancedActivityService.logActivity({
      source: ActivitySource.DATABASE,
      action: `${operation}_${table}`,
      category: ActivityCategory.DATA,
      severity: ActivitySeverity.INFO,
      entityType: table,
      entityId,
      userId,
      oldData,
      newData,
      changes,
      metadata: {
        operation,
        table,
        changedFields: Object.keys(changes)
      }
    });
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(
    eventType: 'login' | 'logout' | 'register' | 'password_change' | 'mfa_enable' | 'mfa_disable',
    userId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      reason?: string;
    }
  ): Promise<void> {
    await enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: `auth_${eventType}`,
      category: ActivityCategory.AUTH,
      severity: metadata?.success === false ? ActivitySeverity.WARNING : ActivitySeverity.INFO,
      entityType: 'user',
      entityId: userId,
      userId,
      status: metadata?.success === false ? ActivityStatus.FAILURE : ActivityStatus.SUCCESS,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      details: metadata?.reason,
      metadata
    });
  }

  /**
   * Log compliance and regulatory events
   */
  async logComplianceEvent(
    action: string,
    entityType: string,
    entityId: string,
    complianceDetails: {
      ruleId?: string;
      ruleName?: string;
      result: 'pass' | 'fail' | 'warning';
      details?: string;
      userId?: string;
    }
  ): Promise<void> {
    await enhancedActivityService.logActivity({
      source: ActivitySource.SYSTEM,
      action: `compliance_${action}`,
      category: ActivityCategory.COMPLIANCE,
      severity: complianceDetails.result === 'fail' ? ActivitySeverity.CRITICAL : 
                complianceDetails.result === 'warning' ? ActivitySeverity.WARNING : ActivitySeverity.INFO,
      entityType,
      entityId,
      userId: complianceDetails.userId,
      status: complianceDetails.result === 'fail' ? ActivityStatus.FAILURE : ActivityStatus.SUCCESS,
      details: complianceDetails.details,
      metadata: {
        ruleId: complianceDetails.ruleId,
        ruleName: complianceDetails.ruleName,
        complianceResult: complianceDetails.result
      }
    });
  }

  /**
   * Log financial operations
   */
  async logFinancialEvent(
    action: string,
    entityType: string,
    entityId: string,
    financialDetails: {
      amount?: number;
      currency?: string;
      transactionId?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: `financial_${action}`,
      category: ActivityCategory.FINANCIAL,
      severity: ActivitySeverity.NOTICE,
      entityType,
      entityId,
      userId: financialDetails.userId,
      metadata: {
        amount: financialDetails.amount,
        currency: financialDetails.currency,
        transactionId: financialDetails.transactionId,
        ...financialDetails.metadata
      }
    });
  }

  /**
   * Log blockchain operations
   */
  async logBlockchainEvent(
    action: string,
    details: {
      network?: string;
      transactionHash?: string;
      contractAddress?: string;
      gasUsed?: number;
      gasPrice?: string;
      userId?: string;
      status?: 'pending' | 'confirmed' | 'failed';
    }
  ): Promise<void> {
    await enhancedActivityService.logActivity({
      source: ActivitySource.INTEGRATION,
      action: `blockchain_${action}`,
      category: ActivityCategory.BLOCKCHAIN,
      severity: details.status === 'failed' ? ActivitySeverity.WARNING : ActivitySeverity.INFO,
      entityType: 'transaction',
      entityId: details.transactionHash,
      userId: details.userId,
      status: details.status === 'failed' ? ActivityStatus.FAILURE : 
              details.status === 'pending' ? ActivityStatus.PENDING : ActivityStatus.SUCCESS,
      metadata: details
    });
  }
}

// Export singleton instance
export const activityIntegration = new ActivityServiceIntegration();

// Higher-order function wrappers
export const withDatabaseLogging = async <T>(
  operation: 'insert' | 'update' | 'delete' | 'select',
  table: string,
  entityId: string,
  dbOperation: () => Promise<T>,
  userId?: string
): Promise<T> => {
  return await activityIntegration.withActivityLogging(
    `${operation}_${table}`,
    dbOperation,
    {
      entityType: table,
      entityId,
      userId,
      category: ActivityCategory.DATA
    },
    ActivitySource.DATABASE
  );
};

export const withApiLogging = async <T>(
  endpoint: string,
  method: string,
  apiCall: () => Promise<T>,
  userId?: string
): Promise<T> => {
  return await activityIntegration.withActivityLogging(
    `api_${method.toLowerCase()}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
    apiCall,
    {
      entityType: 'api_endpoint',
      entityId: endpoint,
      userId,
      category: ActivityCategory.INTEGRATION,
      metadata: { method, endpoint }
    },
    ActivitySource.INTEGRATION
  );
};

export const withBatchLogging = async <T>(
  operationType: string,
  itemCount: number,
  batchOperation: () => Promise<T>,
  userId?: string
): Promise<T> => {
  return await activityIntegration.withActivityLogging(
    `batch_${operationType}`,
    batchOperation,
    {
      entityType: 'batch_operation',
      entityId: `batch_${Date.now()}`,
      userId,
      category: ActivityCategory.SYSTEM,
      metadata: { itemCount, operationType }
    },
    ActivitySource.SYSTEM
  );
};

export const withUserActionLogging = async <T>(
  action: string,
  userOperation: () => Promise<T>,
  context: {
    userId: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }
): Promise<T> => {
  return await activityIntegration.withActivityLogging(
    action,
    userOperation,
    {
      ...context,
      category: ActivityCategory.USER_MANAGEMENT
    },
    ActivitySource.USER
  );
};

// Convenience logging functions
export const logUserAction = async (
  action: string,
  details: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    details?: string;
    metadata?: Record<string, any>;
  }
) => {
  await enhancedActivityService.logActivity({
    source: ActivitySource.USER,
    action,
    category: ActivityCategory.USER_MANAGEMENT,
    severity: ActivitySeverity.INFO,
    ...details
  });
};

export const logSystemEvent = async (
  action: string,
  details: {
    entityType?: string;
    entityId?: string;
    details?: string;
    metadata?: Record<string, any>;
    severity?: ActivitySeverity;
  }
) => {
  await enhancedActivityService.logActivity({
    source: ActivitySource.SYSTEM,
    action,
    category: ActivityCategory.SYSTEM,
    severity: details.severity || ActivitySeverity.INFO,
    ...details
  });
};

export const logIntegrationEvent = async (
  action: string,
  details: {
    entityType?: string;
    entityId?: string;
    details?: string;
    metadata?: Record<string, any>;
    status?: ActivityStatus;
  }
) => {
  await enhancedActivityService.logActivity({
    source: ActivitySource.INTEGRATION,
    action,
    category: ActivityCategory.INTEGRATION,
    severity: ActivitySeverity.INFO,
    ...details
  });
};

export const logComplianceCheck = async (
  ruleId: string,
  entityType: string,
  entityId: string,
  result: 'pass' | 'fail' | 'warning',
  details?: string,
  userId?: string
) => {
  await activityIntegration.logComplianceEvent(
    'rule_check',
    entityType,
    entityId,
    { ruleId, result, details, userId }
  );
};

export const logFinancialTransaction = async (
  transactionType: string,
  amount: number,
  currency: string,
  transactionId: string,
  userId?: string
) => {
  await activityIntegration.logFinancialEvent(
    transactionType,
    'transaction',
    transactionId,
    { amount, currency, transactionId, userId }
  );
};

export const logBlockchainTransaction = async (
  action: string,
  transactionHash: string,
  network: string,
  contractAddress?: string,
  userId?: string
) => {
  await activityIntegration.logBlockchainEvent(
    action,
    {
      network,
      transactionHash,
      contractAddress,
      userId,
      status: 'pending'
    }
  );
};
