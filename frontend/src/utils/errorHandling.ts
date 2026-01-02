/**
 * Utility functions for handling Supabase errors gracefully
 */

/**
 * Check if an error is an AbortError (expected when component unmounts)
 */
export function isAbortError(error: any): boolean {
  return (
    error?.name === 'AbortError' ||
    error?.message?.includes('AbortError') ||
    error?.message?.includes('user aborted') ||
    error?.code === '20' // Supabase specific abort code
  );
}

/**
 * Check if an error should be silently ignored (not logged/displayed)
 */
export function shouldIgnoreError(error: any): boolean {
  return isAbortError(error);
}

/**
 * Log error only if it's not an expected/ignorable error
 */
export function conditionalErrorLog(context: string, error: any): void {
  if (!shouldIgnoreError(error)) {
    console.error(`${context}:`, error);
  }
}
