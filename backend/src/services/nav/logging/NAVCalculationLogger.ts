/**
 * NAV Calculation Logger
 * 
 * Provides structured logging for NAV calculations
 * Tracks detailed calculation steps, timing, and data flow
 * Essential for debugging, auditing, and performance optimization
 * 
 * Key Features:
 * - Hierarchical log levels (debug, info, warn, error)
 * - Calculation step tracking
 * - Performance timing
 * - Data source tracking
 * - Error context capture
 * - Structured log output (JSON)
 * 
 * Log Levels:
 * - DEBUG: Detailed step-by-step calculation traces
 * - INFO: Key calculation milestones and results
 * - WARN: Non-critical issues (data quality warnings)
 * - ERROR: Critical failures preventing calculation
 */

import { Decimal } from 'decimal.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  calculationId: string
  assetType: string
  productId: string
  step?: string
  message: string
  data?: any
  duration?: number // milliseconds
  error?: {
    code: string
    message: string
    stack?: string
  }
}

export interface CalculationLogSummary {
  calculationId: string
  assetType: string
  productId: string
  startTime: Date
  endTime: Date
  totalDuration: number
  status: 'success' | 'failure'
  stepsCompleted: string[]
  errors: LogEntry[]
  warnings: LogEntry[]
  dataSourcesUsed: string[]
  performanceMetrics: {
    dataFetchTime: number
    calculationTime: number
    validationTime: number
  }
}

export interface LoggerConfig {
  minLevel: LogLevel // Minimum log level to record
  console: boolean // Output to console
  file: boolean // Write to file (future enhancement)
  structured: boolean // Use JSON format
  includeStackTraces: boolean // Include stack traces for errors
  timestampFormat: 'iso' | 'unix' | 'human' // Timestamp format
}

/**
 * NAV Calculation Logger
 * Thread-safe, performance-optimized logger for NAV calculations
 */
export class NAVCalculationLogger {
  private readonly config: LoggerConfig
  private logs: Map<string, LogEntry[]> // calculationId -> logs
  private summaries: Map<string, Partial<CalculationLogSummary>>
  
  // Log level hierarchy
  private readonly logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: config?.minLevel ?? 'info',
      console: config?.console ?? true,
      file: config?.file ?? false,
      structured: config?.structured ?? true,
      includeStackTraces: config?.includeStackTraces ?? true,
      timestampFormat: config?.timestampFormat ?? 'iso'
    }
    
    this.logs = new Map()
    this.summaries = new Map()
  }
  
  /**
   * Start logging for a new calculation
   */
  startCalculation(
    calculationId: string,
    assetType: string,
    productId: string,
    input: any
  ): void {
    
    this.summaries.set(calculationId, {
      calculationId,
      assetType,
      productId,
      startTime: new Date(),
      stepsCompleted: [],
      errors: [],
      warnings: [],
      dataSourcesUsed: [],
      performanceMetrics: {
        dataFetchTime: 0,
        calculationTime: 0,
        validationTime: 0
      }
    })
    
    this.logs.set(calculationId, [])
    
    this.info(calculationId, assetType, productId, 'calculation_start', 
      `Starting ${assetType} NAV calculation for product ${productId}`,
      { input }
    )
  }
  
  /**
   * Log completion of a calculation step
   */
  logStep(
    calculationId: string,
    assetType: string,
    productId: string,
    stepName: string,
    message: string,
    data?: any,
    duration?: number
  ): void {
    
    const summary = this.summaries.get(calculationId)
    if (summary) {
      summary.stepsCompleted?.push(stepName)
      
      // Track performance metrics
      if (duration && summary.performanceMetrics) {
        if (stepName.includes('fetch') || stepName.includes('load')) {
          summary.performanceMetrics.dataFetchTime += duration
        } else if (stepName.includes('calculate') || stepName.includes('compute')) {
          summary.performanceMetrics.calculationTime += duration
        } else if (stepName.includes('validate') || stepName.includes('check')) {
          summary.performanceMetrics.validationTime += duration
        }
      }
    }
    
    this.info(calculationId, assetType, productId, stepName, message, data, duration)
  }
  
  /**
   * Log calculation error
   */
  logError(
    calculationId: string,
    assetType: string,
    productId: string,
    step: string,
    error: Error | string,
    context?: any
  ): void {
    
    const errorObj = error instanceof Error
      ? {
          code: (error as any).code || 'UNKNOWN_ERROR',
          message: error.message,
          stack: this.config.includeStackTraces ? error.stack : undefined
        }
      : {
          code: 'CUSTOM_ERROR',
          message: String(error)
        }
    
    const entry = this.createLogEntry(
      'error',
      calculationId,
      assetType,
      productId,
      step,
      errorObj.message,
      context,
      undefined,
      errorObj
    )
    
    const summary = this.summaries.get(calculationId)
    if (summary) {
      summary.errors?.push(entry)
      summary.status = 'failure'
    }
    
    this.addLogEntry(calculationId, entry)
  }
  
  /**
   * Log calculation warning
   */
  logWarning(
    calculationId: string,
    assetType: string,
    productId: string,
    step: string,
    message: string,
    data?: any
  ): void {
    
    const entry = this.createLogEntry(
      'warn',
      calculationId,
      assetType,
      productId,
      step,
      message,
      data
    )
    
    const summary = this.summaries.get(calculationId)
    if (summary) {
      summary.warnings?.push(entry)
    }
    
    this.addLogEntry(calculationId, entry)
  }
  
  /**
   * Log data source usage
   */
  logDataSource(
    calculationId: string,
    assetType: string,
    productId: string,
    sourceName: string,
    recordCount: number,
    details?: any
  ): void {
    
    const summary = this.summaries.get(calculationId)
    if (summary && !summary.dataSourcesUsed?.includes(sourceName)) {
      summary.dataSourcesUsed?.push(sourceName)
    }
    
    this.debug(
      calculationId,
      assetType,
      productId,
      'data_source',
      `Using data source: ${sourceName} (${recordCount} records)`,
      { sourceName, recordCount, ...details }
    )
  }
  
  /**
   * Complete calculation logging
   */
  completeCalculation(
    calculationId: string,
    assetType: string,
    productId: string,
    result: any,
    success: boolean = true
  ): CalculationLogSummary | null {
    
    const summary = this.summaries.get(calculationId)
    if (!summary) {
      console.error(`No calculation summary found for ID ${calculationId}`)
      return null
    }
    
    summary.endTime = new Date()
    summary.totalDuration = summary.endTime.getTime() - summary.startTime!.getTime()
    summary.status = success ? 'success' : 'failure'
    
    this.info(
      calculationId,
      assetType,
      productId,
      'calculation_complete',
      `Completed ${assetType} NAV calculation ${success ? 'successfully' : 'with errors'}`,
      { 
        result: this.sanitizeForLog(result),
        duration: summary.totalDuration
      }
    )
    
    return summary as CalculationLogSummary
  }
  
  /**
   * Get all logs for a calculation
   */
  getCalculationLogs(calculationId: string): LogEntry[] {
    return this.logs.get(calculationId) || []
  }
  
  /**
   * Get calculation summary
   */
  getCalculationSummary(calculationId: string): CalculationLogSummary | null {
    const summary = this.summaries.get(calculationId)
    return summary ? (summary as CalculationLogSummary) : null
  }
  
  /**
   * Export logs as JSON
   */
  exportLogs(calculationId?: string): string {
    if (calculationId) {
      const logs = this.logs.get(calculationId) || []
      const summary = this.summaries.get(calculationId)
      return JSON.stringify({
        summary,
        logs
      }, null, 2)
    }
    
    // Export all logs
    const allData: any = {}
    for (const [id, logs] of this.logs.entries()) {
      allData[id] = {
        summary: this.summaries.get(id),
        logs
      }
    }
    return JSON.stringify(allData, null, 2)
  }
  
  /**
   * Clear logs for a calculation (free memory)
   */
  clearCalculationLogs(calculationId: string): void {
    this.logs.delete(calculationId)
    this.summaries.delete(calculationId)
  }
  
  /**
   * Clear all logs (free memory)
   */
  clearAllLogs(): void {
    this.logs.clear()
    this.summaries.clear()
  }
  
  /**
   * Debug level logging
   */
  debug(
    calculationId: string,
    assetType: string,
    productId: string,
    step: string,
    message: string,
    data?: any,
    duration?: number
  ): void {
    
    const entry = this.createLogEntry(
      'debug',
      calculationId,
      assetType,
      productId,
      step,
      message,
      data,
      duration
    )
    
    this.addLogEntry(calculationId, entry)
  }
  
  /**
   * Info level logging
   */
  info(
    calculationId: string,
    assetType: string,
    productId: string,
    step: string,
    message: string,
    data?: any,
    duration?: number
  ): void {
    
    const entry = this.createLogEntry(
      'info',
      calculationId,
      assetType,
      productId,
      step,
      message,
      data,
      duration
    )
    
    this.addLogEntry(calculationId, entry)
  }
  
  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    calculationId: string,
    assetType: string,
    productId: string,
    step: string,
    message: string,
    data?: any,
    duration?: number,
    error?: LogEntry['error']
  ): LogEntry {
    
    return {
      timestamp: new Date(),
      level,
      calculationId,
      assetType,
      productId,
      step,
      message,
      data: data ? this.sanitizeForLog(data) : undefined,
      duration,
      error
    }
  }
  
  /**
   * Add log entry to store and optionally output to console
   */
  private addLogEntry(calculationId: string, entry: LogEntry): void {
    
    // Check if log level meets minimum threshold
    if (this.logLevels[entry.level] < this.logLevels[this.config.minLevel]) {
      return
    }
    
    // Store log
    const logs = this.logs.get(calculationId) || []
    logs.push(entry)
    this.logs.set(calculationId, logs)
    
    // Console output
    if (this.config.console) {
      this.outputToConsole(entry)
    }
    
    // File output (future enhancement)
    if (this.config.file) {
      // TODO: Implement file logging
    }
  }
  
  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    
    const timestamp = this.formatTimestamp(entry.timestamp)
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.assetType}:${entry.productId}]`
    
    if (this.config.structured) {
      // JSON output
      const structuredEntry = {
        ...entry,
        timestamp: this.formatTimestamp(entry.timestamp)
      }
      console.log(JSON.stringify(structuredEntry))
    } else {
      // Human-readable output
      const message = entry.step 
        ? `${prefix} [${entry.step}] ${entry.message}`
        : `${prefix} ${entry.message}`
      
      switch (entry.level) {
        case 'debug':
          console.debug(message, entry.data || '')
          break
        case 'info':
          console.log(message, entry.data || '')
          break
        case 'warn':
          console.warn(message, entry.data || '')
          break
        case 'error':
          console.error(message, entry.error || entry.data || '')
          break
      }
    }
  }
  
  /**
   * Format timestamp according to config
   */
  private formatTimestamp(date: Date): string {
    switch (this.config.timestampFormat) {
      case 'iso':
        return date.toISOString()
      case 'unix':
        return String(date.getTime())
      case 'human':
        return date.toLocaleString()
      default:
        return date.toISOString()
    }
  }
  
  /**
   * Sanitize data for logging (convert Decimals, limit size)
   */
  private sanitizeForLog(data: any): any {
    if (data === null || data === undefined) {
      return data
    }
    
    // Handle Decimal objects
    if (data instanceof Decimal) {
      return data.toNumber()
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLog(item))
    }
    
    // Handle objects
    if (typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeForLog(value)
      }
      return sanitized
    }
    
    // Handle Map objects
    if (data instanceof Map) {
      const obj: any = {}
      for (const [key, value] of data.entries()) {
        obj[String(key)] = this.sanitizeForLog(value)
      }
      return obj
    }
    
    return data
  }
}

/**
 * Singleton logger instance
 * Use this for global logging across the application
 */
let globalLogger: NAVCalculationLogger | null = null

/**
 * Get or create global logger instance
 */
export function getLogger(config?: Partial<LoggerConfig>): NAVCalculationLogger {
  if (!globalLogger) {
    globalLogger = new NAVCalculationLogger(config)
  }
  return globalLogger
}

/**
 * Create new logger instance (for testing or isolated contexts)
 */
export function createLogger(config?: Partial<LoggerConfig>): NAVCalculationLogger {
  return new NAVCalculationLogger(config)
}
