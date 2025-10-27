/**
 * PSP IP Whitelist Middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@/utils/logger';

function getClientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor : forwardedFor.split(',');
    if (ips.length > 0 && ips[0]) {
      return ips[0].trim();
    }
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  return request.ip || '0.0.0.0';
}

function isIpWhitelisted(ip: string, whitelist: string[] | null | undefined): boolean {
  if (!whitelist || whitelist.length === 0) {
    return true;
  }

  return whitelist.includes(ip);
}

export async function pspIpWhitelist(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const projectId = (request.user as any)?.project_id;
    const ipWhitelist = (request.user as any)?.ip_whitelist;

    if (!projectId) {
      logger.warn({
        msg: 'IP whitelist check: No project context',
        path: request.url,
        method: request.method
      });
      
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const clientIp = getClientIp(request);
    const allowed = isIpWhitelisted(clientIp, ipWhitelist);

    if (!allowed) {
      logger.warn({
        msg: 'IP not whitelisted',
        projectId,
        clientIp,
        whitelist: ipWhitelist,
        path: request.url,
        method: request.method,
        userAgent: request.headers['user-agent']
      });

      return reply.code(403).send({
        success: false,
        error: {
          code: 'IP_NOT_WHITELISTED',
          message: 'Your IP address is not authorized to access this resource',
          details: {
            clientIp
          }
        }
      });
    }

    logger.debug({
      msg: 'IP whitelist check passed',
      projectId,
      clientIp,
      path: request.url
    });

  } catch (error) {
    logger.error({
      msg: 'IP whitelist validation error',
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.url,
      method: request.method
    });

    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during IP validation'
      }
    });
  }
}

export async function pspIpWhitelistPlugin(fastify: any) {
  fastify.addHook('onRequest', pspIpWhitelist);
}

export function parseCIDR(cidr: string): { network: string; mask: number } | null {
  const parts = cidr.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const network = parts[0];
  const mask = parseInt(parts[1], 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return null;
  }

  return { network, mask };
}

export function isIpInCIDR(ip: string, cidr: string): boolean {
  const parsed = parseCIDR(cidr);
  if (!parsed) {
    return false;
  }

  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(parsed.network);
  const mask = -1 << (32 - parsed.mask);
  
  return (ipInt & mask) === (networkInt & mask);
}

function ipToInt(ip: string): number {
  const parts = ip.split('.');
  return parts.reduce((acc, part, index) => {
    return acc + (parseInt(part, 10) << (8 * (3 - index)));
  }, 0);
}
