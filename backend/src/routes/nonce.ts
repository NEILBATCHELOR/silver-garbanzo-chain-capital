/**
 * Nonce Management API Routes
 * 
 * Provides endpoints for nonce reservation, confirmation, and release
 * Prevents double-spending and nonce conflicts in parallel transactions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { NonceManagerService } from '../services/wallets/NonceManagerService';

// Initialize service
const nonceManager = new NonceManagerService();

// Request/Response Schemas
const ReserveNonceSchema = Type.Object({
  wallet_id: Type.String(),
  blockchain: Type.String(),
  specific_nonce: Type.Optional(Type.Number())
});

const ConfirmNonceSchema = Type.Object({
  wallet_id: Type.String(),
  blockchain: Type.String(),
  nonce: Type.Number()
});

const ReleaseNonceSchema = Type.Object({
  wallet_id: Type.String(),
  blockchain: Type.String(),
  nonce: Type.Number()
});

export default async function nonceRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/nonce/reserve
   * Reserve a nonce for a transaction
   */
  fastify.post('/api/nonce/reserve', {
    schema: {
      tags: ['Nonce Management'],
      description: 'Reserve a nonce for a blockchain transaction',
      body: ReserveNonceSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Optional(Type.Object({
            nonce: Type.Number(),
            expires_at: Type.String()
          })),
          error: Type.Optional(Type.String())
        })
      }
    }
  }, async (request: FastifyRequest<{
    Body: { wallet_id: string; blockchain: string; specific_nonce?: number }
  }>, reply: FastifyReply) => {
    try {
      const { wallet_id, blockchain, specific_nonce } = request.body;
      
      const result = await nonceManager.reserveNonce(
        wallet_id,
        blockchain as any,
        specific_nonce
      );
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error
        });
      }
      
      return reply.code(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Nonce reservation failed');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/nonce/confirm
   * Confirm that a nonce has been used
   */
  fastify.post('/api/nonce/confirm', {
    schema: {
      tags: ['Nonce Management'],
      description: 'Confirm that a nonce has been used in a transaction',
      body: ConfirmNonceSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          error: Type.Optional(Type.String())
        })
      }
    }
  }, async (request: FastifyRequest<{
    Body: { wallet_id: string; blockchain: string; nonce: number }
  }>, reply: FastifyReply) => {
    try {
      const { wallet_id, blockchain, nonce } = request.body;
      
      const result = await nonceManager.confirmNonce(
        wallet_id,
        blockchain as any,
        nonce
      );
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error
        });
      }
      
      return reply.code(200).send({
        success: true
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Nonce confirmation failed');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/nonce/release
   * Release a reserved nonce (transaction cancelled or failed)
   */
  fastify.post('/api/nonce/release', {
    schema: {
      tags: ['Nonce Management'],
      description: 'Release a reserved nonce',
      body: ReleaseNonceSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          error: Type.Optional(Type.String())
        })
      }
    }
  }, async (request: FastifyRequest<{
    Body: { wallet_id: string; blockchain: string; nonce: number }
  }>, reply: FastifyReply) => {
    try {
      const { wallet_id, blockchain, nonce } = request.body;
      
      const result = await nonceManager.releaseNonce(
        wallet_id,
        blockchain as any,
        nonce
      );
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error
        });
      }
      
      return reply.code(200).send({
        success: true
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Nonce release failed');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/nonce/info
   * Get current nonce information for a wallet
   */
  fastify.get('/api/nonce/info', {
    schema: {
      tags: ['Nonce Management'],
      description: 'Get current nonce information',
      querystring: Type.Object({
        wallet_id: Type.String(),
        blockchain: Type.String()
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Optional(Type.Object({
            wallet_id: Type.String(),
            blockchain: Type.String(),
            current_nonce: Type.Number(),
            pending_nonce: Type.Number(),
            last_updated: Type.String()
          })),
          error: Type.Optional(Type.String())
        })
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { wallet_id: string; blockchain: string }
  }>, reply: FastifyReply) => {
    try {
      const { wallet_id, blockchain } = request.query;
      
      const result = await nonceManager.getNonceInfo(
        wallet_id,
        blockchain as any
      );
      
      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: result.error
        });
      }
      
      return reply.code(200).send({
        success: true,
        data: result.data
      });
    } catch (error) {
      fastify.log.error({ err: error}, 'Get nonce info failed');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}
