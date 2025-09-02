import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { logger } from '@/utils/logger'
import { getDatabase } from '@/infrastructure/database/client'
import { JWTPayload } from '@/config/jwt'

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  action: string
  actionType: 'user' | 'system' | 'api'
  entityType: string
  entityId?: string
  userId?: string
  userEmail?: string
  username?: string
  details?: string
  status: 'success' | 'error' | 'pending'
  source: 'api' | 'web' | 'system' | 'webhook'
  ipAddress?: string
  userAgent?: string
  duration?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'auth' | 'data' | 'system' | 'compliance' | 'security'
  metadata?: Record<string, any>
  oldData?: Record<string, any>
  newData?: Record<string, any>
  changes?: Record<string, any>
}

/**
 * Audit logging middleware plugin
 * Tracks all important operations for compliance and security
 */
const auditLoggerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  /**
   * Create an audit log entry
   */
  async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const db = getDatabase()
      
      await db.audit_logs.create({
        data: {
          action: entry.action,
          action_type: entry.actionType,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          user_id: entry.userId,
          user_email: entry.userEmail,
          username: entry.username,
          details: entry.details,
          status: entry.status,
          source: entry.source,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          duration: entry.duration,
          severity: entry.severity,
          category: entry.category,
          metadata: entry.metadata,
          old_data: entry.oldData,
          new_data: entry.newData,
          changes: entry.changes,
          timestamp: new Date(),
          occurred_at: new Date()
        }
      })
    } catch (error) {
      // Don't fail the request if audit logging fails, but log the error
      logger.error({ error, entry }, 'Failed to create audit log entry')
    }
  }

  /**
   * Extract audit information from request
   */
  function extractAuditInfo(request: FastifyRequest): Partial<AuditLogEntry> {
    const user = (request as any).user as JWTPayload | undefined
    
    return {
      userId: user?.userId,
      userEmail: user?.email,
      username: user?.email?.split('@')[0],
      ipAddress: (request.headers['x-forwarded-for'] as string)?.split(',')[0] || request.ip,
      userAgent: request.headers['user-agent'],
      source: 'api' as const,
      actionType: user ? 'user' as const : 'system' as const
    }
  }

  /**
   * Determine severity based on action and entity type
   */
  function determineSeverity(action: string, entityType: string): AuditLogEntry['severity'] {
    // High severity actions
    if (action.includes('delete') || action.includes('remove')) return 'high'
    if (entityType === 'user' && (action.includes('create') || action.includes('update'))) return 'high'
    if (entityType.includes('admin') || entityType.includes('role')) return 'high'
    
    // Medium severity actions
    if (action.includes('create') || action.includes('update')) return 'medium'
    if (action.includes('login') || action.includes('logout')) return 'medium'
    
    // Low severity by default
    return 'low'
  }

  /**
   * Determine category based on action and entity type
   */
  function determineCategory(action: string, entityType: string): AuditLogEntry['category'] {
    if (action.includes('login') || action.includes('logout') || action.includes('auth')) return 'auth'
    if (entityType.includes('compliance') || entityType.includes('kyc') || entityType.includes('document')) return 'compliance'
    if (entityType.includes('user') || entityType.includes('role') || entityType.includes('permission')) return 'security'
    if (entityType.includes('system') || entityType.includes('process')) return 'system'
    return 'data'
  }

  /**
   * Audit decorator - logs the operation
   */
  fastify.decorate('audit', function(
    action: string,
    entityType: string,
    options: Partial<AuditLogEntry> = {}
  ) {
    return async function(request: FastifyRequest, reply: FastifyReply, result?: any) {
      const startTime = Date.now()
      const auditInfo = extractAuditInfo(request)
      
      const entry: AuditLogEntry = {
        action,
        entityType,
        status: 'success',
        actionType: auditInfo.actionType || 'system',
        source: auditInfo.source || 'api',
        severity: determineSeverity(action, entityType),
        category: determineCategory(action, entityType),
        duration: Date.now() - startTime,
        ...auditInfo,
        ...options
      }

      // Add result data if provided
      if (result) {
        entry.newData = result
        entry.entityId = result.id || result.uuid || result._id
      }

      await createAuditLog(entry)
    }
  })

  /**
   * Request/response audit hook
   */
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Store start time for duration calculation
    ;(request as any).startTime = Date.now()
  })

  /**
   * Response audit hook for important operations
   */
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    // Only audit non-GET requests and specific endpoints
    if (request.method === 'GET' && !request.url.includes('/admin/')) {
      return payload
    }

    // Skip health checks and docs
    if (request.url.includes('/health') || request.url.includes('/ready') || request.url.includes('/docs')) {
      return payload
    }

    const duration = Date.now() - ((request as any).startTime || Date.now())
    const auditInfo = extractAuditInfo(request)
    
    // Determine action from method and URL
    let action = `${request.method.toLowerCase()}_${request.url.split('/').pop() || 'unknown'}`
    let entityType = 'api_request'
    
    // Extract more specific entity type from URL
    const urlParts = request.url.split('/').filter(Boolean)
    if (urlParts.length >= 2) {
      entityType = urlParts[urlParts.length - 2] || entityType
    }

    const status: AuditLogEntry['status'] = reply.statusCode >= 400 ? 'error' : 'success'

    const entry: AuditLogEntry = {
      action,
      entityType,
      status,
      actionType: auditInfo.actionType || 'system',
      source: auditInfo.source || 'api',
      severity: determineSeverity(action, entityType),
      category: determineCategory(action, entityType),
      duration,
      details: `${request.method} ${request.url} - ${reply.statusCode}`,
      metadata: {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        requestBody: request.method !== 'GET' ? request.body : undefined,
        queryParams: request.query
      },
      ...auditInfo
    }

    // Don't wait for audit log to complete
    createAuditLog(entry).catch(error => {
      logger.error({ error }, 'Failed to create audit log in onSend hook')
    })

    return payload
  })

  /**
   * Authentication audit
   */
  fastify.decorate('auditAuth', async function(
    request: FastifyRequest,
    action: 'login' | 'logout' | 'token_refresh' | 'password_reset',
    status: 'success' | 'error',
    details?: string
  ) {
    const auditInfo = extractAuditInfo(request)
    
    const entry: AuditLogEntry = {
      action: `auth_${action}`,
      actionType: 'user',
      entityType: 'authentication',
      source: 'api',
      status,
      severity: status === 'error' ? 'high' : 'medium',
      category: 'auth',
      details,
      ...auditInfo
    }

    await createAuditLog(entry)
  })

  /**
   * Data modification audit
   */
  fastify.decorate('auditDataChange', async function(
    request: FastifyRequest,
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    oldData?: any,
    newData?: any
  ) {
    const auditInfo = extractAuditInfo(request)
    
    // Calculate changes if both old and new data provided
    let changes: Record<string, any> | undefined
    if (oldData && newData) {
      changes = {}
      for (const [key, value] of Object.entries(newData)) {
        if (oldData[key] !== value) {
          changes[key] = { from: oldData[key], to: value }
        }
      }
    }

    const entry: AuditLogEntry = {
      action: `${action}_${entityType}`,
      actionType: auditInfo.actionType || 'user',
      entityType,
      entityId,
      status: 'success',
      source: auditInfo.source || 'api',
      severity: determineSeverity(action, entityType),
      category: determineCategory(action, entityType),
      oldData,
      newData,
      changes,
      ...auditInfo
    }

    await createAuditLog(entry)
  })
}

// Export as Fastify plugin
export const auditLogger = fp(auditLoggerPlugin, {
  name: 'audit-logger'
})

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    audit(
      action: string, 
      entityType: string, 
      options?: Partial<AuditLogEntry>
    ): (request: FastifyRequest, reply: FastifyReply, result?: any) => Promise<void>
    
    auditAuth(
      request: FastifyRequest,
      action: 'login' | 'logout' | 'token_refresh' | 'password_reset',
      status: 'success' | 'error',
      details?: string
    ): Promise<void>
    
    auditDataChange(
      request: FastifyRequest,
      action: 'create' | 'update' | 'delete',
      entityType: string,
      entityId: string,
      oldData?: any,
      newData?: any
    ): Promise<void>
  }
}
