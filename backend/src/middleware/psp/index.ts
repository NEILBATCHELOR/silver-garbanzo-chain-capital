/**
 * PSP Middleware Exports
 * 
 * Central export point for all PSP middleware components.
 * 
 * Middleware Order:
 * 1. Request Logging (first - logs everything)
 * 2. API Key Validation (authentication)
 * 3. IP Whitelist (authorization)
 * 4. Rate Limiting (resource protection)
 */

// Individual middleware functions
export {
  pspApiKeyValidation,
  pspApiKeyPlugin
} from './apiKeyValidation';

export {
  pspRateLimiting,
  pspRateLimitPlugin,
  getRateLimitStatus
} from './rateLimiting';

export {
  pspIpWhitelist,
  pspIpWhitelistPlugin,
  isIpInCIDR,
  parseCIDR
} from './ipWhitelist';

export {
  pspRequestLogging,
  pspRequestLoggingPlugin,
  getRequestId,
  logWithContext,
  auditLog
} from './requestLogging';

/**
 * Register all PSP middleware in the correct order
 * 
 * @param fastify - Fastify instance
 * @param options - Configuration options
 */
export async function registerPspMiddleware(
  fastify: any,
  options?: {
    enableLogging?: boolean;
    enableRateLimiting?: boolean;
    enableIpWhitelist?: boolean;
  }
): Promise<void> {
  const {
    enableLogging = true,
    enableRateLimiting = true,
    enableIpWhitelist = true
  } = options || {};

  // 1. Request logging (first - logs all requests)
  if (enableLogging) {
    const { pspRequestLoggingPlugin } = await import('./requestLogging');
    await fastify.register(pspRequestLoggingPlugin);
  }

  // 2. API key validation (authentication)
  const { pspApiKeyPlugin } = await import('./apiKeyValidation');
  await fastify.register(pspApiKeyPlugin);

  // 3. IP whitelist (authorization)
  if (enableIpWhitelist) {
    const { pspIpWhitelistPlugin } = await import('./ipWhitelist');
    await fastify.register(pspIpWhitelistPlugin);
  }

  // 4. Rate limiting (resource protection)
  if (enableRateLimiting) {
    const { pspRateLimitPlugin } = await import('./rateLimiting');
    await fastify.register(pspRateLimitPlugin);
  }
}
