/**
 * Unified Audit Coordinator
 * Central service to prevent duplicate audit entries and coordinate all audit operations
 * 
 * ENHANCED SOLUTION TO LAYER 2 CLIENT-LEVEL PROTECTION:
 * - Single entry point for all audit operations
 * - Prevents circular dependencies
 * - Eliminates duplicate entries with atomic deduplication
 * - Coordinates between multiple audit services
 * - Enhanced for rapid operations in tokenization workflows
 */

import { auditFreeSupabase, getCurrentUserId } from '../../infrastructure/database/audit-free-client';

interface AuditOperation {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  details?: string;
  oldData?: any;
  newData?: any;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  source?: string;
}

interface AuditEntry {
  operationKey: string;
  operationHash: string; // Enhanced: Add hash for even better deduplication
  timestamp: number;
  debounceTimeout?: NodeJS.Timeout;
  processing?: boolean; // Enhanced: Add processing flag for atomic operations
}

// Global window declaration for debugging
declare global {
  interface Window {
    unifiedAuditCoordinator?: UnifiedAuditCoordinator;
  }
}

class UnifiedAuditCoordinator {
  private static instance: UnifiedAuditCoordinator;
  private recentOperations = new Map<string, AuditEntry>();
  private processingQueue = new Set<string>(); // Enhanced: Atomic processing queue
  private readonly DUPLICATE_WINDOW_MS = 2000; // Enhanced: Increased from 1000ms to 2000ms
  private readonly DEBOUNCE_MS = 50; // Enhanced: Reduced from 100ms to 50ms for faster processing
  private enabled = true;
  private stats = {
    totalOperations: 0,
    duplicatesBlocked: 0,
    processingErrors: 0,
    lastOperation: Date.now()
  };

  public static getInstance(): UnifiedAuditCoordinator {
    if (!UnifiedAuditCoordinator.instance) {
      UnifiedAuditCoordinator.instance = new UnifiedAuditCoordinator();
    }
    return UnifiedAuditCoordinator.instance;
  }

  /**
   * Enhanced central audit logging method with atomic deduplication
   */
  async logOperation(operation: AuditOperation): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      this.stats.totalOperations++;
      this.stats.lastOperation = Date.now();

      // Create unique key for deduplication
      const operationKey = this.createOperationKey(operation);
      const operationHash = this.createOperationHash(operation); // Enhanced: Additional hash
      
      // Enhanced: Atomic check and mark as processing
      if (this.isProcessingOrDuplicate(operationKey, operationHash)) {
        this.stats.duplicatesBlocked++;
        console.debug(`🔄 Blocked duplicate/processing audit: ${operationKey}`);
        return false;
      }

      // Mark as processing atomically
      this.markAsProcessing(operationKey, operationHash);

      try {
        // Create audit event
        const auditEvent = await this.createAuditEvent(operation);

        // Log to database with enhanced retry logic
        await this.logToDatabase(auditEvent);

        console.debug(`✅ Audit logged: ${operation.action} on ${operation.entityType}`);
        return true;
      } finally {
        // Always remove from processing queue
        this.markAsCompleted(operationKey);
      }

    } catch (error) {
      this.stats.processingErrors++;
      console.error('❌ Unified audit coordinator error:', error);
      return false;
    }
  }

  /**
   * Enhanced debounced logging for high-frequency operations
   */
  async logOperationDebounced(operation: AuditOperation): Promise<void> {
    const operationKey = this.createOperationKey(operation);
    const operationHash = this.createOperationHash(operation);
    const existing = this.recentOperations.get(operationKey);

    // Clear existing timeout
    if (existing?.debounceTimeout) {
      clearTimeout(existing.debounceTimeout);
    }

    // Set new debounced timeout
    const debounceTimeout = setTimeout(async () => {
      await this.logOperation(operation);
      this.recentOperations.delete(operationKey);
    }, this.DEBOUNCE_MS);

    // Store the debounced operation
    this.recentOperations.set(operationKey, {
      operationKey,
      operationHash,
      timestamp: Date.now(),
      debounceTimeout
    });
  }

  /**
   * High-level convenience methods
   */
  async logDatabaseOperation(
    table: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
    recordId: string,
    data?: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const userId = await getCurrentUserId();
    
    return this.logOperation({
      action: `database_${operation.toLowerCase()}`,
      entityType: table,
      entityId: recordId,
      userId,
      details: `Performed ${operation} operation on ${table} table`,
      newData: operation === 'CREATE' || operation === 'UPDATE' ? data : undefined,
      oldData: operation === 'DELETE' ? data : undefined,
      metadata: {
        ...metadata,
        operation_type: operation,
        table_name: table,
        source: 'database_audit',
        automated: true
      },
      severity: operation === 'DELETE' ? 'medium' : 'low',
      category: 'database',
      source: 'unified_coordinator'
    });
  }

  async logUserAction(
    action: string,
    details: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const userId = await getCurrentUserId();
    
    return this.logOperation({
      action,
      entityType: 'user_action',
      entityId: userId || 'anonymous',
      userId,
      details,
      metadata: {
        ...metadata,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        source: 'user_interaction'
      },
      severity: 'low',
      category: 'user_action',
      source: 'unified_coordinator'
    });
  }

  async logSystemEvent(
    action: string,
    details: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.logOperation({
      action,
      entityType: 'system_event',
      entityId: 'system',
      details,
      metadata: {
        ...metadata,
        source: 'system',
        automated: true
      },
      severity,
      category: 'system',
      source: 'unified_coordinator'
    });
  }

  /**
   * Control methods
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`🔧 Unified audit coordinator ${enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enhanced debugging and reset methods
   */
  reset(): void {
    // Clear all timeouts
    this.recentOperations.forEach(entry => {
      if (entry.debounceTimeout) {
        clearTimeout(entry.debounceTimeout);
      }
    });

    // Clear all data structures
    this.recentOperations.clear();
    this.processingQueue.clear();

    // Reset stats
    this.stats = {
      totalOperations: 0,
      duplicatesBlocked: 0,
      processingErrors: 0,
      lastOperation: Date.now()
    };

    console.log('🔄 Unified audit coordinator reset');
  }

  debug(): void {
    console.group('🔍 Unified Audit Coordinator Debug Info');
    console.log('Stats:', this.getStats());
    
    // Convert Map to array for logging
    const recentOpsArray: Array<[string, AuditEntry]> = [];
    this.recentOperations.forEach((value, key) => {
      recentOpsArray.push([key, value]);
    });
    console.log('Recent Operations:', recentOpsArray);
    
    // Convert Set to array for logging
    const processingArray: string[] = [];
    this.processingQueue.forEach(key => {
      processingArray.push(key);
    });
    console.log('Processing Queue:', processingArray);
    
    console.log('Enabled:', this.enabled);
    console.groupEnd();
  }

  /**
   * Enhanced cleanup and maintenance
   */
  cleanup(): void {
    // Clear debounce timeouts
    this.recentOperations.forEach(entry => {
      if (entry.debounceTimeout) {
        clearTimeout(entry.debounceTimeout);
      }
    });

    // Clear old entries (older than 5 minutes) but preserve processing ones
    const cutoff = Date.now() - 5 * 60 * 1000;
    const keysToDelete: string[] = [];
    
    this.recentOperations.forEach((entry, key) => {
      if (entry.timestamp < cutoff && !entry.processing) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.recentOperations.delete(key);
      this.processingQueue.delete(key); // Ensure consistency
    });

    // Clean up orphaned processing queue entries
    const orphanedKeys: string[] = [];
    this.processingQueue.forEach(key => {
      if (!this.recentOperations.has(key)) {
        orphanedKeys.push(key);
      }
    });
    
    orphanedKeys.forEach(key => {
      this.processingQueue.delete(key);
    });

    // Reset stats if they get too large (prevent memory issues)
    if (this.stats.totalOperations > 1000000) {
      this.stats = {
        totalOperations: 0,
        duplicatesBlocked: 0,
        processingErrors: 0,
        lastOperation: Date.now()
      };
    }
  }

  getStats(): {
    enabled: boolean;
    recentOperationsCount: number;
    oldestOperationAge: number;
    totalOperations: number;
    duplicatesBlocked: number;
    processingErrors: number;
    processingQueueSize: number;
    successRate: number;
    lastOperationAge: number;
  } {
    // Convert Map values to array for timestamp calculation
    const timestamps: number[] = [];
    this.recentOperations.forEach(entry => {
      timestamps.push(entry.timestamp);
    });
    
    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const successRate = this.stats.totalOperations > 0 
      ? ((this.stats.totalOperations - this.stats.processingErrors) / this.stats.totalOperations) * 100 
      : 100;

    return {
      enabled: this.enabled,
      recentOperationsCount: this.recentOperations.size,
      oldestOperationAge: Date.now() - oldestTimestamp,
      totalOperations: this.stats.totalOperations,
      duplicatesBlocked: this.stats.duplicatesBlocked,
      processingErrors: this.stats.processingErrors,
      processingQueueSize: this.processingQueue.size,
      successRate: Math.round(successRate * 100) / 100,
      lastOperationAge: Date.now() - this.stats.lastOperation
    };
  }

  /**
   * Enhanced private helper methods for atomic deduplication
   */
  private createOperationKey(operation: AuditOperation): string {
    // Create a key that uniquely identifies this operation for deduplication
    const keyParts = [
      operation.action,
      operation.entityType,
      operation.entityId,
      operation.userId || 'anonymous'
    ];

    // Add additional distinguishing factors if needed
    if (operation.metadata?.correlation_id) {
      keyParts.push(operation.metadata.correlation_id);
    }

    // Enhanced: Add timestamp-based component for rapid operations
    if (operation.metadata?.operation_type) {
      keyParts.push(operation.metadata.operation_type);
    }

    return keyParts.join('|');
  }

  private createOperationHash(operation: AuditOperation): string {
    // Enhanced: Create a content-based hash for even better deduplication
    const contentToHash = [
      operation.action,
      operation.entityType,
      operation.entityId,
      operation.details || '',
      JSON.stringify(operation.metadata || {}),
      JSON.stringify(operation.newData || {})
    ].join('###');

    // Simple hash function for browser compatibility
    let hash = 0;
    for (let i = 0; i < contentToHash.length; i++) {
      const char = contentToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isProcessingOrDuplicate(operationKey: string, operationHash: string): boolean {
    // Check if currently processing
    if (this.processingQueue.has(operationKey)) {
      return true;
    }

    // Check for recent duplicate
    const existing = this.recentOperations.get(operationKey);
    if (!existing) {
      return false;
    }

    // Check time window
    const timeDiff = Date.now() - existing.timestamp;
    if (timeDiff >= this.DUPLICATE_WINDOW_MS) {
      return false;
    }

    // Check hash match for content-based deduplication
    return existing.operationHash === operationHash;
  }

  private markAsProcessing(operationKey: string, operationHash: string): void {
    // Clear any existing debounce timeout
    const existing = this.recentOperations.get(operationKey);
    if (existing?.debounceTimeout) {
      clearTimeout(existing.debounceTimeout);
    }

    // Mark as processing
    this.processingQueue.add(operationKey);
    this.recentOperations.set(operationKey, {
      operationKey,
      operationHash,
      timestamp: Date.now(),
      processing: true
    });
  }

  private markAsCompleted(operationKey: string): void {
    this.processingQueue.delete(operationKey);
    
    // Keep the operation in recent operations for duplicate detection
    const existing = this.recentOperations.get(operationKey);
    if (existing) {
      existing.processing = false;
    }
  }

  private async createAuditEvent(operation: AuditOperation): Promise<any> {
    const timestamp = new Date().toISOString();
    
    return {
      action: operation.action,
      entity_type: operation.entityType,
      entity_id: operation.entityId,
      user_id: operation.userId,
      details: operation.details || `${operation.action} performed on ${operation.entityType}`,
      status: 'success',
      severity: operation.severity || 'low',
      category: operation.category || 'general',
      old_data: operation.oldData,
      new_data: operation.newData,
      metadata: {
        ...operation.metadata,
        source: operation.source || 'unified_coordinator',
        coordinator_version: '1.0.0',
        processed_at: timestamp,
        is_automated: !operation.userId
      },
      timestamp,
      created_at: timestamp
    };
  }

  private async logToDatabase(auditEvent: any): Promise<void> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await auditFreeSupabase
          .from('audit_logs')
          .insert(auditEvent);
        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(`📝 Audit database insert attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw new Error(`Failed to log audit event after ${maxRetries} attempts: ${lastError}`);
  }
}

// Export singleton instance
export const unifiedAuditCoordinator = UnifiedAuditCoordinator.getInstance();

// Add to window for debugging and monitoring
if (typeof window !== 'undefined') {
  window.unifiedAuditCoordinator = unifiedAuditCoordinator;
  
  // Start cleanup interval
  setInterval(() => {
    unifiedAuditCoordinator.cleanup();
  }, 60000); // Clean up every minute
  
  // Log coordinator initialization
  console.log('🔧 UnifiedAuditCoordinator initialized and available at window.unifiedAuditCoordinator');
}

export default unifiedAuditCoordinator;
