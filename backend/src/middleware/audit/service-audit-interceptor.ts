import { AuditService } from '@/services/audit/AuditService'
import { AuditCategory, AuditSeverity } from '@/services/audit/types'

/**
 * Enhanced BaseService Audit Integration
 * Automatically captures service method calls without modifying existing services
 * 
 * This module provides:
 * 1. Method interception using Proxy patterns
 * 2. Data operation tracking (CRUD)
 * 3. Business logic audit trails
 * 4. Performance monitoring
 */

interface ServiceAuditConfig {
  enabled: boolean
  logLevel: AuditSeverity
  excludeMethods: string[]
  trackPerformance: boolean
  trackDataChanges: boolean
  maxMetadataSize: number
}

const defaultConfig: ServiceAuditConfig = {
  enabled: true,
  logLevel: AuditSeverity.LOW,
  excludeMethods: ['constructor', 'generateId', 'formatError', 'success', 'error', 'apiResponse', 'paginatedResponse'],
  trackPerformance: true,
  trackDataChanges: true,
  maxMetadataSize: 10000 // 10KB
}

/**
 * Audit interceptor that wraps service methods
 * Uses Proxy to intercept method calls transparently
 */
export function createServiceAuditInterceptor(
  service: any,
  serviceName: string,
  config: Partial<ServiceAuditConfig> = {}
): any {
  const auditConfig = { ...defaultConfig, ...config }
  
  if (!auditConfig.enabled) {
    return service
  }

  const auditService = new AuditService()

  return new Proxy(service, {
    get(target, propKey, receiver) {
      const origMethod = target[propKey]
      
      // Skip non-function properties and excluded methods
      if (typeof origMethod !== 'function' || 
          auditConfig.excludeMethods.includes(propKey as string)) {
        return Reflect.get(target, propKey, receiver)
      }

      // Skip private methods (starting with _)
      if (typeof propKey === 'string' && propKey.startsWith('_')) {
        return Reflect.get(target, propKey, receiver)
      }

      // Return wrapped method with audit logging
      return async function (this: any, ...args: any[]) {
        const startTime = Date.now()
        const methodName = propKey as string
        const correlationId = generateCorrelationId()
        
        // Extract user context if available
        const userContext = extractUserContext(args)

        try {
          // Log method start (for long-running operations)
          if (auditConfig.trackPerformance) {
            await auditService.quickLog(
              `${serviceName}.${methodName} [START]`,
              AuditCategory.SYSTEM_PROCESS,
              userContext?.userId,
              serviceName.toLowerCase(),
              correlationId,
              `Service method started: ${methodName}`,
              {
                method: methodName,
                service: serviceName,
                args_count: args.length,
                correlation_id: correlationId,
                started_at: new Date().toISOString()
              }
            )
          }

          // Call original method
          const result = await origMethod.apply(this, args)
          const endTime = Date.now()
          const duration = endTime - startTime

          // Analyze result for data operations
          const auditData = analyzeServiceOperation(
            serviceName,
            methodName,
            args,
            result,
            duration,
            userContext
          )

          // Log successful operation
          await auditService.quickLog(
            auditData.action,
            auditData.category,
            userContext?.userId,
            auditData.entityType,
            auditData.entityId,
            auditData.details,
            {
              ...auditData.metadata,
              correlation_id: correlationId,
              duration_ms: duration,
              status: 'success'
            }
          )

          return result

        } catch (error) {
          const endTime = Date.now()
          const duration = endTime - startTime

          // Log error operation with high priority
          await auditService.createAuditEvent({
            action: `${serviceName}.${methodName} [ERROR]`,
            category: AuditCategory.ERROR,
            severity: AuditSeverity.HIGH,
            user_id: userContext?.userId,
            entity_type: serviceName.toLowerCase(),
            entity_id: correlationId,
            details: `Service method error: ${methodName} - ${(error as Error).message}`,
            metadata: {
              method: methodName,
              service: serviceName,
              error_name: (error as Error).name,
              error_message: (error as Error).message,
              error_stack: (error as Error).stack,
              args_summary: summarizeArguments(args),
              duration_ms: duration,
              correlation_id: correlationId
            },
            correlation_id: correlationId,
            source: 'service_audit'
          })

          throw error
        }
      }
    }
  })
}

/**
 * Analyze service operation to determine audit category and extract relevant data
 */
function analyzeServiceOperation(
  serviceName: string,
  methodName: string,
  args: any[],
  result: any,
  duration: number,
  userContext?: any
): {
  action: string
  category: AuditCategory
  entityType: string
  entityId: string
  details: string
  metadata: Record<string, any>
} {
  const action = `${serviceName}.${methodName}`
  let category = AuditCategory.SYSTEM_PROCESS
  let entityType = serviceName.toLowerCase()
  let entityId = 'unknown'
  let details = `Service operation: ${methodName}`

  // Determine category based on method name patterns
  if (isDataOperation(methodName)) {
    category = AuditCategory.DATA_OPERATION
    const operationType = getOperationType(methodName)
    details = `Data operation: ${operationType} in ${serviceName}`
    
    // Try to extract entity ID
    entityId = extractEntityId(args, result) || generateCorrelationId()
  } else if (isUserAction(methodName)) {
    category = AuditCategory.USER_ACTION
    details = `User action: ${methodName} in ${serviceName}`
  } else if (isValidationOperation(methodName)) {
    category = AuditCategory.COMPLIANCE
    details = `Validation operation: ${methodName}`
  } else if (isAuthOperation(methodName)) {
    category = AuditCategory.AUTHENTICATION
    details = `Authentication operation: ${methodName}`
  }

  // Build metadata
  const metadata: Record<string, any> = {
    service: serviceName,
    method: methodName,
    operation_type: getOperationType(methodName),
    args_count: args.length,
    has_result: !!result,
    duration_ms: duration,
    timestamp: new Date().toISOString()
  }

  // Add argument summary (sanitized)
  if (args.length > 0) {
    metadata.args_summary = summarizeArguments(args)
  }

  // Add result summary for data operations
  if (category === AuditCategory.DATA_OPERATION && result) {
    metadata.result_summary = summarizeResult(result)
    
    // Track changes if available
    if (result.data && typeof result.data === 'object') {
      metadata.affected_records = getAffectedRecords(result)
      metadata.success = result.success !== false
    }
  }

  // Add user context
  if (userContext) {
    metadata.user_context = userContext
  }

  return {
    action,
    category,
    entityType,
    entityId,
    details,
    metadata
  }
}

/**
 * Helper functions for method analysis
 */

function isDataOperation(methodName: string): boolean {
  const dataPatterns = [
    /^(create|insert|add)/i,
    /^(update|modify|change|edit)/i,
    /^(delete|remove|destroy)/i,
    /^(get|find|fetch|retrieve|list)/i,
    /^(bulk|batch)/i
  ]
  return dataPatterns.some(pattern => pattern.test(methodName))
}

function isUserAction(methodName: string): boolean {
  const userPatterns = [
    /^(login|logout|signin|signout)/i,
    /^(register|signup)/i,
    /^(submit|approve|reject)/i,
    /^(upload|download)/i
  ]
  return userPatterns.some(pattern => pattern.test(methodName))
}

function isValidationOperation(methodName: string): boolean {
  const validationPatterns = [
    /^(validate|verify|check)/i,
    /^(compliance|audit)/i
  ]
  return validationPatterns.some(pattern => pattern.test(methodName))
}

function isAuthOperation(methodName: string): boolean {
  const authPatterns = [
    /^(auth|authenticate)/i,
    /^(authorize|permission)/i,
    /^(token|jwt)/i
  ]
  return authPatterns.some(pattern => pattern.test(methodName))
}

function getOperationType(methodName: string): string {
  if (/^(create|insert|add)/i.test(methodName)) return 'CREATE'
  if (/^(update|modify|change|edit)/i.test(methodName)) return 'UPDATE'
  if (/^(delete|remove|destroy)/i.test(methodName)) return 'DELETE'
  if (/^(get|find|fetch|retrieve|list)/i.test(methodName)) return 'READ'
  if (/^(bulk|batch)/i.test(methodName)) return 'BATCH'
  return 'OTHER'
}

function extractEntityId(args: any[], result: any): string | undefined {
  // Try to find ID in first argument
  if (args.length > 0 && typeof args[0] === 'string') {
    // UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args[0])) {
      return args[0]
    }
  }

  // Try to find ID in result
  if (result?.data?.id) {
    return result.data.id
  }

  // Try to find ID in first argument object
  if (args.length > 0 && typeof args[0] === 'object' && args[0]?.id) {
    return args[0].id
  }

  return undefined
}

function extractUserContext(args: any[]): any {
  // Look for user context in arguments
  for (const arg of args) {
    if (arg && typeof arg === 'object') {
      if (arg.userId || arg.user_id) {
        return {
          userId: arg.userId || arg.user_id,
          sessionId: arg.sessionId || arg.session_id
        }
      }
    }
  }

  return undefined
}

function summarizeArguments(args: any[]): any {
  return args.map((arg, index) => {
    if (arg === null || arg === undefined) {
      return { index, type: 'null', value: null }
    }

    const type = typeof arg
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return { index, type, value: arg }
    }

    if (type === 'object') {
      if (Array.isArray(arg)) {
        return { index, type: 'array', length: arg.length }
      }
      
      // Summarize object (avoid sensitive data)
      const keys = Object.keys(arg).filter(key => 
        !['password', 'secret', 'token', 'key'].some(sensitive => 
          key.toLowerCase().includes(sensitive)
        )
      ).slice(0, 5) // Max 5 keys

      return { index, type: 'object', keys }
    }

    return { index, type }
  })
}

function summarizeResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return { type: typeof result }
  }

  const summary: any = { type: 'object' }

  if (result.success !== undefined) {
    summary.success = result.success
  }

  if (result.data) {
    if (Array.isArray(result.data)) {
      summary.data = { type: 'array', length: result.data.length }
    } else if (typeof result.data === 'object') {
      summary.data = { 
        type: 'object', 
        keys: Object.keys(result.data).slice(0, 5) 
      }
    }
  }

  if (result.pagination) {
    summary.pagination = {
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit
    }
  }

  return summary
}

function getAffectedRecords(result: any): number {
  if (result.data) {
    if (Array.isArray(result.data)) {
      return result.data.length
    }
    return 1
  }

  if (result.pagination?.total) {
    return result.pagination.total
  }

  return 0
}

function generateCorrelationId(): string {
  return `svc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Enhanced logActivity method for BaseService
 * This replaces the existing logActivity method in BaseService
 */
export async function enhancedLogActivity(
  service: any,
  action: string,
  entityType: string,
  entityId: string,
  details?: any,
  userId?: string,
  oldData?: any,
  newData?: any
): Promise<void> {
  const auditService = new AuditService()

  try {
    await auditService.quickLog(
      action,
      AuditCategory.DATA_OPERATION,
      userId,
      entityType,
      entityId,
      typeof details === 'string' ? details : JSON.stringify(details),
      {
        service: service.serviceName,
        old_data: oldData,
        new_data: newData,
        changes: oldData && newData ? calculateChanges(oldData, newData) : undefined,
        timestamp: new Date().toISOString()
      }
    )

  } catch (error) {
    // Log to service logger but don't throw - audit failures shouldn't break business logic
    if (service.logger) {
      service.logger.warn('Failed to log activity', { 
        error: (error as Error).message,
        action,
        entityType,
        entityId
      })
    }
  }
}

/**
 * Calculate changes between old and new data
 */
function calculateChanges(oldData: any, newData: any): Record<string, { from: any; to: any }> {
  if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') {
    return {}
  }

  const changes: Record<string, { from: any; to: any }> = {}

  // Check all keys in newData
  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = oldData[key]
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { from: oldValue, to: newValue }
    }
  }

  // Check for removed keys
  for (const [key, oldValue] of Object.entries(oldData)) {
    if (!(key in newData)) {
      changes[key] = { from: oldValue, to: undefined }
    }
  }

  return changes
}
