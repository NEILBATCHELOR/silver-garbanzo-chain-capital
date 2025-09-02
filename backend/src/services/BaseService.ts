import { randomUUID } from 'crypto'
import { PrismaClient } from '@/infrastructure/database/generated/index'
import { getDatabase } from '@/infrastructure/database/client'
import { logger, createLogger } from '@/utils/logger'
import { 
  QueryOptions, 
  PaginatedResponse, 
  ServiceResult, 
  BatchResult,
  ApiResponse 
} from '@/types/index'

// Export ServiceResult type for use by service implementations
export type { ServiceResult }
import { AuditCategory, AuditSeverity } from './audit/types'

/**
 * Base service class providing common database operations and utilities
 * All domain services should extend this class
 */
export abstract class BaseService {
  private _db: PrismaClient | null = null
  protected logger: ReturnType<typeof createLogger>
  protected serviceName: string

  constructor(serviceName: string) {
    this.serviceName = serviceName
    this.logger = createLogger(`${serviceName}Service`)
    
    // TODO: Fix circular dependency with AuditService before re-enabling
    // Return proxied instance for automatic audit interception
    // return new Proxy(this, this.createAuditInterceptor())
  }

  /**
   * Lazy database getter - initializes connection when first accessed
   */
  protected get db(): PrismaClient {
    if (!this._db) {
      this._db = getDatabase()
    }
    return this._db
  }

  /**
   * Prisma client getter for backward compatibility
   */
  protected get prisma(): PrismaClient {
    return this.db
  }

  /**
   * Create Proxy handler for automatic method audit interception
   */
  private createAuditInterceptor(): ProxyHandler<BaseService> {
    let auditService: any = null
    const getAuditService = () => {
      if (!auditService && this.serviceName !== 'Audit') {
        try {
          const { AuditService: AuditServiceClass } = require('./audit/AuditService.js')
          auditService = new AuditServiceClass()
        } catch (error) {
          // If audit service fails to load, continue without auditing
          auditService = null
        }
      }
      return auditService
    }
    const originalMethods = new WeakMap<Function, string>()
    
    return {
      get: (target: BaseService, prop: string | symbol) => {
        const originalValue = (target as any)[prop]
        
        // Only intercept methods, not properties
        if (typeof originalValue !== 'function' || typeof prop !== 'string') {
          return originalValue
        }
        
        // Skip private methods and constructor
        if (prop.startsWith('_') || prop === 'constructor' || prop.startsWith('create') && prop.includes('Audit')) {
          return originalValue
        }
        
        // Skip already wrapped methods
        if (originalMethods.has(originalValue)) {
          return originalValue
        }
        
        // Create intercepted method
        const interceptedMethod = async function(this: BaseService, ...args: any[]) {
          const startTime = Date.now()
          const correlationId = target.generateId()
          
          try {
            // Log method start (if audit service available)
            const auditSvc = getAuditService()
            if (auditSvc) {
              await auditSvc.quickLog(
              `${target.serviceName}.${prop}`,
              AuditCategory.DATA_OPERATION,
              undefined, // userId will be extracted from context
              target.serviceName.toLowerCase(),
              correlationId,
              `Service method invocation`,
              {
                service: target.serviceName,
                method: prop,
                args: args.length > 0 ? '[ARGUMENTS_PROVIDED]' : '[NO_ARGUMENTS]',
                timestamp: new Date().toISOString()
              }
              )
            }
            
            // Execute original method
            const result = await originalValue.apply(this, args)
            const duration = Date.now() - startTime
            
            // Log successful completion (if audit service available)
            if (result && typeof result === 'object' && 'success' in result && auditSvc) {
              await auditSvc.quickLog(
                `${target.serviceName}.${prop}_SUCCESS`,
                AuditCategory.DATA_OPERATION,
                undefined,
                target.serviceName.toLowerCase(),
                correlationId,
                `Service method completed successfully`,
                {
                  service: target.serviceName,
                  method: prop,
                  duration_ms: duration,
                  success: result.success,
                  timestamp: new Date().toISOString()
                }
              )
            }
            
            return result
            
          } catch (error) {
            const duration = Date.now() - startTime
            
            // Log error (if audit service available)
            const auditSvc = getAuditService()
            if (auditSvc) {
              await auditSvc.createAuditEvent({
              action: `${target.serviceName}.${prop}_ERROR`,
              category: AuditCategory.DATA_OPERATION,
              severity: AuditSeverity.HIGH,
              entity_type: target.serviceName.toLowerCase(),
              entity_id: correlationId,
              details: `Service method failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              metadata: {
                service: target.serviceName,
                method: prop,
                duration_ms: duration,
                error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
                error_message: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              },
              correlation_id: correlationId,
              source: 'service_interceptor'
              })
            }
            
            throw error
          }
        }
        
        // Mark method as wrapped
        originalMethods.set(interceptedMethod, prop)
        
        return interceptedMethod
      }
    }
  }

  /**
   * Create a successful service result
   */
  protected success<T>(data: T, message?: string): ServiceResult<T> {
    return {
      success: true,
      data,
      statusCode: 200
    }
  }

  /**
   * Create an error service result
   */
  protected error(message: string, code?: string, statusCode = 500): ServiceResult {
    return {
      success: false,
      error: message,
      code,
      statusCode
    }
  }

  /**
   * Create an API response
   */
  protected apiResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
      data,
      message,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Create a paginated response
   */
  protected paginatedResponse<T>(
    data: T[], 
    total: number, 
    page: number, 
    limit: number,
    message?: string
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit)
    
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        hasMore: page < totalPages,
        totalPages,
        nextPage: page < totalPages ? page + 1 : undefined,
        prevPage: page > 1 ? page - 1 : undefined
      },
      message,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Parse and validate query options
   */
  protected parseQueryOptions(options: QueryOptions = {}): {
    skip: number
    take: number
    where: any
    orderBy: any
    include: any
    select: any
  } {
    const {
      page = 1,
      limit = 20,
      offset,
      where = {},
      sortBy,
      sortOrder = 'desc',
      search,
      searchFields = [],
      dateFrom,
      dateTo,
      include,
      select
    } = options

    // Calculate pagination
    const skip = offset !== undefined ? offset : (page - 1) * limit
    const take = Math.min(limit, 100) // Max 100 items per page

    // Build where clause
    const whereClause: any = { ...where }

    // Add search functionality
    if (search && searchFields.length > 0) {
      whereClause.OR = searchFields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive'
        }
      }))
    }

    // Add date filtering
    if (dateFrom || dateTo) {
      const createdAtFilter: any = {}
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom)
      if (dateTo) createdAtFilter.lte = new Date(dateTo)
      whereClause.created_at = createdAtFilter
    }

    // Build order by
    const orderBy = sortBy ? { [sortBy]: sortOrder } : { created_at: 'desc' }

    return {
      skip,
      take,
      where: whereClause,
      orderBy,
      include,
      select
    }
  }

  /**
   * Execute a paginated query
   */
  protected async executePaginatedQuery<T>(
    model: any,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<T>> {
    const { skip, take, where, orderBy, include, select } = this.parseQueryOptions(options)

    const [data, total] = await Promise.all([
      model.findMany({
        skip,
        take,
        where,
        orderBy,
        include,
        select
      }),
      model.count({ where })
    ])

    const page = Math.floor(skip / take) + 1
    return this.paginatedResponse(data, total, page, take)
  }

  /**
   * Find entity by ID with error handling
   */
  protected async findById<T>(
    model: any, 
    id: string, 
    include?: any,
    select?: any
  ): Promise<ServiceResult<T>> {
    try {
      const entity = await model.findUnique({
        where: { id },
        include,
        select
      })

      if (!entity) {
        return this.error(`${this.serviceName} not found`, 'NOT_FOUND', 404)
      }

      return this.success(entity)
    } catch (error) {
      this.logger.error({ error, id }, `Failed to find ${this.serviceName} by ID`)
      return this.error(`Failed to find ${this.serviceName}`, 'DATABASE_ERROR')
    }
  }

  /**
   * Create entity with error handling
   */
  protected async createEntity<T>(
    model: any,
    data: any,
    include?: any
  ): Promise<ServiceResult<T>> {
    try {
      const entity = await model.create({
        data: {
          ...data,
          id: data.id || undefined, // Let database generate ID if not provided
          created_at: new Date(),
          updated_at: new Date()
        },
        include
      })

      this.logger.info({ entityId: entity.id }, `${this.serviceName} created successfully`)
      return this.success(entity)
    } catch (error) {
      this.logger.error({ error, data }, `Failed to create ${this.serviceName}`)
      
      if ((error as any).code === 'P2002') {
        return this.error('Resource already exists', 'CONFLICT', 409)
      }
      
      return this.error(`Failed to create ${this.serviceName}`, 'DATABASE_ERROR')
    }
  }

  /**
   * Update entity with error handling
   */
  protected async updateEntity<T>(
    model: any,
    id: string,
    data: any,
    include?: any
  ): Promise<ServiceResult<T>> {
    try {
      const entity = await model.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date()
        },
        include
      })

      this.logger.info({ entityId: id }, `${this.serviceName} updated successfully`)
      return this.success(entity)
    } catch (error) {
      this.logger.error({ error, id, data }, `Failed to update ${this.serviceName}`)
      
      if ((error as any).code === 'P2025') {
        return this.error(`${this.serviceName} not found`, 'NOT_FOUND', 404)
      }
      
      return this.error(`Failed to update ${this.serviceName}`, 'DATABASE_ERROR')
    }
  }

  /**
   * Delete entity with error handling
   */
  protected async deleteEntity(
    model: any,
    id: string
  ): Promise<ServiceResult<boolean>> {
    try {
      await model.delete({
        where: { id }
      })

      this.logger.info({ entityId: id }, `${this.serviceName} deleted successfully`)
      return this.success(true)
    } catch (error) {
      this.logger.error({ error, id }, `Failed to delete ${this.serviceName}`)
      
      if ((error as any).code === 'P2025') {
        return this.error(`${this.serviceName} not found`, 'NOT_FOUND', 404)
      }
      
      return this.error(`Failed to delete ${this.serviceName}`, 'DATABASE_ERROR')
    }
  }

  /**
   * Soft delete entity (set deletedAt timestamp)
   */
  protected async softDeleteEntity(
    model: any,
    id: string
  ): Promise<ServiceResult<boolean>> {
    try {
      await model.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updated_at: new Date()
        }
      })

      this.logger.info({ entityId: id }, `${this.serviceName} soft deleted successfully`)
      return this.success(true)
    } catch (error) {
      this.logger.error({ error, id }, `Failed to soft delete ${this.serviceName}`)
      
      if ((error as any).code === 'P2025') {
        return this.error(`${this.serviceName} not found`, 'NOT_FOUND', 404)
      }
      
      return this.error(`Failed to soft delete ${this.serviceName}`, 'DATABASE_ERROR')
    }
  }

  /**
   * Execute batch operations with error handling
   * TODO: Fix generic type constraints
   */
  /*
  protected async executeBatch<T, U extends NonNullable<any>>(
    items: T[],
    operation: (item: T) => Promise<U>
  ): Promise<BatchResult<U>> {
    const successful: U[] = []
    const failed: BatchResult<U>['failed'] = []

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await operation(items[i])
        successful.push(result)
      } catch (error) {
        failed.push({
          item: items[i],
          error: error instanceof Error ? error.message : 'Unknown error',
          index: i
        })
        this.logger.error({ error, item: items[i], index: i }, 'Batch operation failed for item')
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: items.length,
        success: successful.length,
        failed: failed.length
      }
    }
  }
  */

  /**
   * Validate required fields
   */
  protected validateRequiredFields<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
  ): ServiceResult<T> {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    )

    if (missingFields.length > 0) {
      return this.error(
        `Missing required fields: ${missingFields.join(', ')}`,
        'VALIDATION_ERROR',
        400
      )
    }

    return this.success(data as T)
  }

  /**
   * Handle database transaction
   */
  protected async withTransaction<T>(
    operation: (tx: any) => Promise<T>
  ): Promise<ServiceResult<T>> {
    try {
      const result = await this.db.$transaction(async (tx) => {
        return await operation(tx)
      })

      return this.success(result)
    } catch (error) {
      this.logger.error({ error }, 'Transaction failed')
      return this.error('Transaction failed', 'TRANSACTION_ERROR')
    }
  }

  /**
   * Generate unique identifier
   */
  protected generateId(): string {
    return randomUUID()
  }

  /**
   * Quick audit log for high-frequency operations
   */
  protected async quickAudit(
    action: string,
    entityType?: string,
    entityId?: string,
    userId?: string,
    details?: string
  ): Promise<void> {
    try {
      if (this.serviceName === 'Audit') return // Prevent circular dependency
      const { AuditService: AuditServiceClass } = await import('./audit/AuditService.js')
      const auditService = new AuditServiceClass()
      await auditService.quickLog(
        action,
        AuditCategory.DATA_OPERATION,
        userId,
        entityType || this.serviceName.toLowerCase(),
        entityId,
        details,
        {
          service: this.serviceName,
          timestamp: new Date().toISOString()
        }
      )
    } catch (error) {
      this.logger.warn('Quick audit failed', { error: this.formatError(error) })
    }
  }

  /**
   * Format error message for logging
   */
  protected formatError(error: any): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return JSON.stringify(error)
  }

  /**
   * Handle error and return ServiceResult (backward compatibility)
   */
  protected handleError(context: string, error?: any): ServiceResult {
    const errorMessage = error ? this.formatError(error) : 'Unknown error'
    const fullMessage = `${context}: ${errorMessage}`
    
    this.logger.error({ error, context }, fullMessage)
    
    // Check for common Prisma errors
    if (error && typeof error === 'object') {
      if (error.code === 'P2002') {
        return this.error('Resource already exists', 'CONFLICT', 409)
      }
      if (error.code === 'P2025') {
        return this.error('Resource not found', 'NOT_FOUND', 404)
      }
    }
    
    return this.error(fullMessage, 'DATABASE_ERROR')
  }

  /**
   * Enhanced audit logging using AuditService
   */
  protected async logActivity(
    action: string,
    entityType: string,
    entityId: string,
    details?: any,
    userId?: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    try {
      if (this.serviceName === 'Audit') return // Prevent circular dependency
      const { AuditService: AuditServiceClass } = await import('./audit/AuditService.js')
      const auditService = new AuditServiceClass()
      
      await auditService.createAuditEvent({
        action,
        category: this.determineAuditCategory(action, entityType),
        severity: this.determineAuditSeverity(action),
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined,
        old_data: oldData,
        new_data: newData,
        changes: this.calculateChanges(oldData, newData),
        correlation_id: this.generateId(),
        source: 'service_method',
        metadata: {
          service: this.serviceName,
          timestamp: new Date().toISOString()
        }
      })
      
      this.logger.info('Enhanced activity logged', {
        action,
        entityType,
        entityId,
        userId,
        service: this.serviceName
      })
    } catch (error) {
      this.logger.warn('Failed to log enhanced activity', { error: this.formatError(error) })
      
      // Fallback to basic logging
      try {
        await this.db.audit_logs.create({
          data: {
            user_id: userId || null,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details: details ? JSON.stringify(details) : null,
            timestamp: new Date(),
            occurred_at: new Date()
          }
        })
      } catch (fallbackError) {
        this.logger.error('Fallback audit logging failed', { error: this.formatError(fallbackError) })
      }
    }
  }

  /**
   * Determine audit category based on action and entity type
   */
  private determineAuditCategory(action: string, entityType: string): AuditCategory {
    if (action.includes('auth') || action.includes('login') || action.includes('logout')) {
      return AuditCategory.AUTHENTICATION
    }
    if (entityType.includes('user') || entityType.includes('role') || entityType.includes('permission')) {
      return AuditCategory.USER_ACTION
    }
    if (action.includes('compliance') || action.includes('kyc') || action.includes('document')) {
      return AuditCategory.COMPLIANCE
    }
    if (action.includes('delete') || action.includes('remove') || action.includes('purge')) {
      return AuditCategory.DATA_OPERATION
    }
    return AuditCategory.DATA_OPERATION
  }

  /**
   * Determine audit severity based on action
   */
  private determineAuditSeverity(action: string): AuditSeverity {
    if (action.includes('delete') || action.includes('remove') || action.includes('purge')) {
      return AuditSeverity.HIGH
    }
    if (action.includes('create') || action.includes('update') || action.includes('modify')) {
      return AuditSeverity.MEDIUM
    }
    if (action.includes('error') || action.includes('fail')) {
      return AuditSeverity.HIGH
    }
    return AuditSeverity.LOW
  }

  /**
   * Calculate changes between old and new data
   */
  private calculateChanges(oldData: any, newData: any): Record<string, { from: any; to: any }> | undefined {
    if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') {
      return undefined
    }

    const changes: Record<string, { from: any; to: any }> = {}
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    for (const key of allKeys) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        }
      }
    }

    return Object.keys(changes).length > 0 ? changes : undefined
  }
}
