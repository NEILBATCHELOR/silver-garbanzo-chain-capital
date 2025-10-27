/**
 * PSP API Key Validation Middleware
 * 
 * Validates API keys for PSP routes and attaches project context to the request.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '@/services/psp/auth/apiKeyService';
import { logger } from '@/utils/logger';

const apiKeyService = new ApiKeyService();

function extractApiKey(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const apiKey = parts[1];
  if (!apiKey || !apiKey.startsWith('warp_')) {
    return null;
  }

  return apiKey;
}

function getClientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ipsRaw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (ipsRaw) {
      const ips = ipsRaw.split(',');
      if (ips.length > 0 && ips[0]) {
        return ips[0].trim();
      }
    }
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  return request.ip || '0.0.0.0';
}

export async function pspApiKeyValidation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const apiKey = extractApiKey(authHeader);

    if (!apiKey) {
      logger.warn({
        msg: 'Missing or invalid API key format',
        path: request.url,
        method: request.method,
        hasAuth: !!authHeader
      });

      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid API key. Expected format: Bearer warp_...'
        }
      });
    }

    const clientIp = getClientIp(request);
    const validatedKey = await apiKeyService.validateApiKey(apiKey, clientIp);

    if (!validatedKey) {
      logger.warn({
        msg: 'API key validation failed',
        path: request.url,
        method: request.method,
        clientIp
      });

      return reply.code(401).send({
        success: false,
        error: {
          code: 'INVALID_KEY',
          message: 'Invalid API key or IP not whitelisted'
        }
      });
    }

    const existingUser = request.user as Record<string, any> | undefined;
    request.user = {
      ...(existingUser ?? {}),
      project_id: validatedKey.projectId,
      api_key_id: validatedKey.id,
      environment: validatedKey.environment,
      warp_api_key: validatedKey.warpApiKey
    };

    logger.debug({
      msg: 'API key validated successfully',
      projectId: validatedKey.projectId,
      keyId: validatedKey.id,
      environment: validatedKey.environment,
      clientIp,
      path: request.url
    });

  } catch (error) {
    logger.error({
      msg: 'API key validation error',
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.url,
      method: request.method
    });

    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during authentication'
      }
    });
  }
}

export async function pspApiKeyPlugin(fastify: any) {
  fastify.addHook('onRequest', pspApiKeyValidation);
}
