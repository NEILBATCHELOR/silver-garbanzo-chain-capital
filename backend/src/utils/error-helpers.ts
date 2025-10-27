/**
 * Error Helper Utilities
 * 
 * Utilities for safe error handling with unknown types
 */

/**
 * Type guard to check if an error is an Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unknown error occurred'
}

/**
 * Safely extract error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack
  }
  return undefined
}

/**
 * Create a formatted error object from unknown error
 */
export function formatError(error: unknown): { message: string; stack?: string } {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error)
  }
}
