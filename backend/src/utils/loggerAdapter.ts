import { type Logger } from 'pino'
import { type FastifyBaseLogger } from 'fastify'

// Define compatible logger interface
interface CompatibleLogger {
  error: (message: string) => void
  warn: (message: string) => void
  info: (message: string) => void
  debug: (message: string) => void
}

/**
 * Convert unknown input to safe log string
 */
function toLogString(input: unknown): string {
  if (input === null) return 'null'
  if (input === undefined) return 'undefined'
  
  if (input instanceof Error) {
    return `${input.name}: ${input.message}${input.stack ? '\n' + input.stack : ''}`
  }
  
  if (typeof input === 'string') return input
  if (typeof input === 'number' || typeof input === 'boolean') return String(input)
  
  try {
    const jsonString = JSON.stringify(input, null, 2)
    // Truncate very large objects for log safety
    return jsonString.length > 1000 ? jsonString.substring(0, 1000) + '...[truncated]' : jsonString
  } catch {
    return '[Circular/Unserializable Object]'
  }
}

/**
 * Log error with safe string formatting
 */
export function logError(logger: CompatibleLogger | Logger | FastifyBaseLogger, context: string, data?: unknown): void {
  const message = data ? `${context}: ${toLogString(data)}` : context
  logger.error(message)
}

/**
 * Log warning with safe string formatting
 */
export function logWarn(logger: CompatibleLogger | Logger | FastifyBaseLogger, context: string, data?: unknown): void {
  const message = data ? `${context}: ${toLogString(data)}` : context
  logger.warn(message)
}

/**
 * Log info with safe string formatting
 */
export function logInfo(logger: CompatibleLogger | Logger | FastifyBaseLogger, context: string, data?: unknown): void {
  const message = data ? `${context}: ${toLogString(data)}` : context
  logger.info(message)
}

/**
 * Log debug with safe string formatting
 */
export function logDebug(logger: CompatibleLogger | Logger | FastifyBaseLogger, context: string, data?: unknown): void {
  const message = data ? `${context}: ${toLogString(data)}` : context
  logger.debug(message)
}

/**
 * Export the utility function for direct use
 */
export { toLogString }
