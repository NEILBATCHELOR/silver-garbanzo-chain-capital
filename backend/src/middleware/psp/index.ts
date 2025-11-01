/**
 * PSP Middleware Exports
 * 
 * Note: Main PSP authentication middleware is now in parent directory
 * at /middleware/psp-auth.ts
 * 
 * This index exists for potential future middleware extensions.
 */

// Re-export from parent psp-auth middleware
export { pspAuthMiddleware, requireEnvironment, requireProject } from '../psp-auth'
export type { PSPAuthContext } from '@/types/psp-auth'
