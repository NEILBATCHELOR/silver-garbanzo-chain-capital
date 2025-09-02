import { AuditService } from '@/services/audit/AuditService'
import { AuditCategory, AuditSeverity } from '@/services/audit/types'

/**
 * System Process Audit Monitor
 * Captures system-level events, background processes, and scheduled jobs
 * 
 * This provides comprehensive coverage of:
 * - Scheduled job execution
 * - Background task processing
 * - System startup/shutdown
 * - External API calls
 * - Webhook events
 * - Error handling
 * - Performance monitoring
 */

interface SystemProcessConfig {
  enabled: boolean
  captureStartup: boolean
  captureShutdown: boolean
  captureJobs: boolean
  captureExternalCalls: boolean
  captureWebhooks: boolean
  captureErrors: boolean
  performanceThreshold: number // Log operations slower than this (ms)
}

const defaultConfig: SystemProcessConfig = {
  enabled: true,
  captureStartup: true,
  captureShutdown: true,
  captureJobs: true,
  captureExternalCalls: true,
  captureWebhooks: true,
  captureErrors: true,
  performanceThreshold: 5000 // 5 seconds
}

class SystemAuditMonitor {
  private auditService: AuditService
  private config: SystemProcessConfig
  private processId: string
  private startupTime: Date

  constructor(config: Partial<SystemProcessConfig> = {}) {
    this.auditService = new AuditService()
    this.config = { ...defaultConfig, ...config }
    this.processId = `proc_${Date.now()}_${process.pid}`
    this.startupTime = new Date()

    if (this.config.enabled) {
      this.initializeMonitoring()
    }
  }

  /**
   * Initialize system monitoring
   */
  private initializeMonitoring(): void {
    // Capture application startup
    if (this.config.captureStartup) {
      this.logSystemEvent('SYSTEM_STARTUP', 'Application started', {
        process_id: process.pid,
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        startup_time: this.startupTime.toISOString()
      })
    }

    // Monitor process exit
    if (this.config.captureShutdown) {
      process.on('exit', (code) => {
        this.logSystemEvent('SYSTEM_SHUTDOWN', `Application shutdown with code ${code}`, {
          exit_code: code,
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          shutdown_time: new Date().toISOString()
        })
      })

      process.on('SIGTERM', () => {
        this.logSystemEvent('SYSTEM_SIGTERM', 'Received SIGTERM signal', {
          uptime: process.uptime()
        })
      })

      process.on('SIGINT', () => {
        this.logSystemEvent('SYSTEM_SIGINT', 'Received SIGINT signal', {
          uptime: process.uptime()
        })
      })
    }

    // Monitor unhandled errors
    if (this.config.captureErrors) {
      process.on('uncaughtException', (error) => {
        this.logSystemError('UNCAUGHT_EXCEPTION', error, {
          fatal: true,
          memory_usage: process.memoryUsage()
        })
      })

      process.on('unhandledRejection', (reason, promise) => {
        this.logSystemError('UNHANDLED_REJECTION', reason as Error, {
          promise_details: String(promise),
          memory_usage: process.memoryUsage()
        })
      })
    }

    // Monitor performance
    this.setupPerformanceMonitoring()
  }

  /**
   * Log system event
   */
  async logSystemEvent(
    action: string,
    details: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.LOW
  ): Promise<void> {
    try {
      await this.auditService.quickLog(
        action,
        AuditCategory.SYSTEM_PROCESS,
        undefined, // No user for system events
        'system',
        this.processId,
        details,
        {
          ...metadata,
          process_id: this.processId,
          timestamp: new Date().toISOString(),
          is_automated: true
        }
      )
    } catch (error) {
      console.error('Failed to log system event:', error)
    }
  }

  /**
   * Log system error
   */
  async logSystemError(
    action: string,
    error: Error,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditService.createAuditEvent({
        action,
        category: AuditCategory.ERROR,
        severity: AuditSeverity.CRITICAL,
        entity_type: 'system_error',
        entity_id: this.processId,
        details: `System error: ${error.message}`,
        metadata: {
          ...metadata,
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack,
          process_id: this.processId,
          timestamp: new Date().toISOString(),
          is_automated: true
        },
        source: 'system_monitor'
      })
    } catch (auditError) {
      console.error('Failed to log system error:', auditError)
    }
  }

  /**
   * Monitor scheduled job execution
   */
  async logScheduledJob(
    jobName: string,
    startTime: Date,
    endTime: Date,
    success: boolean,
    result?: any,
    error?: Error
  ): Promise<void> {
    if (!this.config.captureJobs) return

    const duration = endTime.getTime() - startTime.getTime()

    try {
      await this.auditService.quickLog(
        `JOB_${success ? 'COMPLETED' : 'FAILED'}: ${jobName}`,
        AuditCategory.SYSTEM_PROCESS,
        undefined,
        'scheduled_job',
        `job_${jobName}_${startTime.getTime()}`,
        `Scheduled job ${jobName} ${success ? 'completed' : 'failed'}`,
        {
          job_name: jobName,
          duration_ms: duration,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          success,
          result: success ? this.summarizeResult(result) : undefined,
          error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : undefined,
          is_automated: true
        }
      )

      // Log slow jobs with higher severity
      if (duration > this.config.performanceThreshold) {
        await this.auditService.createAuditEvent({
          action: `SLOW_JOB: ${jobName}`,
          category: AuditCategory.PERFORMANCE,
          severity: AuditSeverity.MEDIUM,
          entity_type: 'slow_operation',
          entity_id: `job_${jobName}_${startTime.getTime()}`,
          details: `Slow job detected: ${jobName} took ${duration}ms`,
          metadata: {
            job_name: jobName,
            duration_ms: duration,
            threshold_ms: this.config.performanceThreshold,
            is_automated: true
          },
          source: 'performance_monitor'
        })
      }
    } catch (error) {
      console.error('Failed to log scheduled job:', error)
    }
  }

  /**
   * Monitor external API calls
   */
  async logExternalAPICall(
    url: string,
    method: string,
    startTime: Date,
    endTime: Date,
    statusCode: number,
    success: boolean,
    requestData?: any,
    responseData?: any,
    error?: Error
  ): Promise<void> {
    if (!this.config.captureExternalCalls) return

    const duration = endTime.getTime() - startTime.getTime()

    try {
      await this.auditService.quickLog(
        `EXTERNAL_API: ${method} ${url}`,
        AuditCategory.SYSTEM_PROCESS,
        undefined,
        'external_api',
        `api_${url}_${startTime.getTime()}`,
        `External API call to ${url}`,
        {
          url,
          method,
          status_code: statusCode,
          duration_ms: duration,
          success,
          request_size: requestData ? JSON.stringify(requestData).length : 0,
          response_size: responseData ? JSON.stringify(responseData).length : 0,
          error: error ? {
            name: error.name,
            message: error.message
          } : undefined,
          is_automated: true
        }
      )
    } catch (error) {
      console.error('Failed to log external API call:', error)
    }
  }

  /**
   * Monitor webhook events
   */
  async logWebhookEvent(
    webhookType: string,
    url: string,
    payload: any,
    success: boolean,
    statusCode?: number,
    error?: Error
  ): Promise<void> {
    if (!this.config.captureWebhooks) return

    try {
      await this.auditService.quickLog(
        `WEBHOOK_${success ? 'SENT' : 'FAILED'}: ${webhookType}`,
        AuditCategory.SYSTEM_PROCESS,
        undefined,
        'webhook',
        `webhook_${webhookType}_${Date.now()}`,
        `Webhook ${webhookType} ${success ? 'sent successfully' : 'failed'}`,
        {
          webhook_type: webhookType,
          url,
          payload_size: JSON.stringify(payload).length,
          success,
          status_code: statusCode,
          error: error ? {
            name: error.name,
            message: error.message
          } : undefined,
          is_automated: true
        }
      )
    } catch (error) {
      console.error('Failed to log webhook event:', error)
    }
  }

  /**
   * Monitor database operations
   */
  async logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    recordCount?: number,
    error?: Error
  ): Promise<void> {
    try {
      const success = !error

      await this.auditService.quickLog(
        `DB_${operation.toUpperCase()}: ${table}`,
        AuditCategory.DATA_OPERATION,
        undefined,
        'database',
        `db_${table}_${Date.now()}`,
        `Database ${operation} on ${table}`,
        {
          operation,
          table,
          duration_ms: duration,
          record_count: recordCount,
          success,
          error: error ? {
            name: error.name,
            message: error.message
          } : undefined,
          is_automated: true
        }
      )

      // Log slow database operations
      if (duration > this.config.performanceThreshold / 2) { // Half threshold for DB ops
        await this.auditService.createAuditEvent({
          action: `SLOW_DB: ${operation} ${table}`,
          category: AuditCategory.PERFORMANCE,
          severity: AuditSeverity.MEDIUM,
          entity_type: 'slow_database_operation',
          entity_id: `db_${table}_${Date.now()}`,
          details: `Slow database operation: ${operation} on ${table} took ${duration}ms`,
          metadata: {
            operation,
            table,
            duration_ms: duration,
            threshold_ms: this.config.performanceThreshold / 2,
            is_automated: true
          },
          source: 'database_monitor'
        })
      }
    } catch (error) {
      console.error('Failed to log database operation:', error)
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor memory usage every 5 minutes
    setInterval(() => {
      const memUsage = process.memoryUsage()
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      }

      // Log high memory usage
      if (memUsageMB.heapUsed > 512) { // More than 512MB
        this.logSystemEvent(
          'HIGH_MEMORY_USAGE',
          `High memory usage detected: ${memUsageMB.heapUsed}MB`,
          {
            memory_usage_mb: memUsageMB,
            uptime: process.uptime()
          },
          AuditSeverity.MEDIUM
        )
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Monitor event loop lag
    setInterval(() => {
      const start = process.hrtime.bigint()
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start
        const lag = Number(delta / 1000000n) // Convert to milliseconds

        if (lag > 100) { // More than 100ms lag
          this.logSystemEvent(
            'EVENT_LOOP_LAG',
            `Event loop lag detected: ${lag}ms`,
            {
              lag_ms: lag,
              uptime: process.uptime()
            },
            lag > 1000 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM
          )
        }
      })
    }, 30 * 1000) // Check every 30 seconds
  }

  /**
   * Helper method to summarize results
   */
  private summarizeResult(result: any): any {
    if (!result) return null

    if (typeof result === 'object') {
      if (Array.isArray(result)) {
        return { type: 'array', length: result.length }
      }
      return { type: 'object', keys: Object.keys(result).slice(0, 5) }
    }

    return { type: typeof result, value: result }
  }
}

// Global system monitor instance
let systemMonitor: SystemAuditMonitor | null = null

/**
 * Initialize system audit monitoring
 */
export function initializeSystemAuditMonitor(config?: Partial<SystemProcessConfig>): SystemAuditMonitor {
  if (!systemMonitor) {
    systemMonitor = new SystemAuditMonitor(config)
  }
  return systemMonitor
}

/**
 * Get the global system monitor instance
 */
export function getSystemAuditMonitor(): SystemAuditMonitor | null {
  return systemMonitor
}

/**
 * Decorator for automatic job monitoring
 */
export function monitorJob(jobName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const monitor = getSystemAuditMonitor()
      if (!monitor) {
        return originalMethod.apply(this, args)
      }

      const startTime = new Date()
      let success = false
      let result: any
      let error: Error | undefined

      try {
        result = await originalMethod.apply(this, args)
        success = true
        return result
      } catch (err) {
        error = err as Error
        success = false
        throw err
      } finally {
        const endTime = new Date()
        await monitor.logScheduledJob(jobName, startTime, endTime, success, result, error)
      }
    }

    return descriptor
  }
}

/**
 * Decorator for automatic external API call monitoring
 */
export function monitorExternalAPI() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const monitor = getSystemAuditMonitor()
      if (!monitor) {
        return originalMethod.apply(this, args)
      }

      // Extract URL and method from arguments (customize based on your API wrapper)
      const url = args[0] || 'unknown'
      const method = args[1] || 'GET'
      const requestData = args[2]

      const startTime = new Date()
      let success = false
      let statusCode = 0
      let responseData: any
      let error: Error | undefined

      try {
        const response = await originalMethod.apply(this, args)
        success = true
        statusCode = response?.status || 200
        responseData = response?.data
        return response
      } catch (err) {
        error = err as Error
        statusCode = (err as any)?.response?.status || 500
        success = false
        throw err
      } finally {
        const endTime = new Date()
        await monitor.logExternalAPICall(
          url,
          method,
          startTime,
          endTime,
          statusCode,
          success,
          requestData,
          responseData,
          error
        )
      }
    }

    return descriptor
  }
}

export default SystemAuditMonitor
