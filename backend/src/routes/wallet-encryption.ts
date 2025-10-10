/**
 * Wallet Encryption API Routes
 * 
 * SECURITY CRITICAL: These routes handle private key encryption/decryption
 * Should be protected with proper authentication in production
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { WalletEncryptionService } from '../services/security/walletEncryptionService';

// Request/Response Schemas
const EncryptRequestSchema = Type.Object({
  plaintext: Type.String({ minLength: 1 })
});

const DecryptRequestSchema = Type.Object({
  encrypted: Type.String({ minLength: 1 })
});

const EncryptResponseSchema = Type.Object({
  encrypted: Type.String()
});

const DecryptResponseSchema = Type.Object({
  plaintext: Type.String()
});

const StatusResponseSchema = Type.Object({
  configured: Type.Boolean(),
  provider: Type.String()
});

export default async function walletEncryptionRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/wallet/encrypt
   * Encrypt a private key or mnemonic
   */
  fastify.post('/api/wallet/encrypt', {
    schema: {
      tags: ['Wallet Encryption'],
      description: 'Encrypt sensitive wallet data',
      body: EncryptRequestSchema,
      response: {
        200: EncryptResponseSchema,
        500: Type.Object({
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{
    Body: { plaintext: string }
  }>, reply: FastifyReply) => {
    try {
      const { plaintext } = request.body;
      
      // Encrypt the plaintext
      const encrypted = await WalletEncryptionService.encrypt(plaintext);
      
      return reply.code(200).send({ encrypted });
    } catch (error) {
      fastify.log.error({ err: error }, 'Encryption failed');
      return reply.code(500).send({
        error: 'EncryptionError',
        message: error instanceof Error ? error.message : 'Failed to encrypt data'
      });
    }
  });

  /**
   * POST /api/wallet/decrypt
   * Decrypt an encrypted private key or mnemonic
   */
  fastify.post('/api/wallet/decrypt', {
    schema: {
      tags: ['Wallet Encryption'],
      description: 'Decrypt sensitive wallet data',
      body: DecryptRequestSchema,
      response: {
        200: DecryptResponseSchema,
        500: Type.Object({
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{
    Body: { encrypted: string }
  }>, reply: FastifyReply) => {
    try {
      const { encrypted } = request.body;
      
      // Decrypt the data
      const plaintext = await WalletEncryptionService.decrypt(encrypted);
      
      return reply.code(200).send({ plaintext });
    } catch (error) {
      fastify.log.error({ err: error }, 'Decryption failed');
      return reply.code(500).send({
        error: 'DecryptionError',
        message: error instanceof Error ? error.message : 'Failed to decrypt data'
      });
    }
  });

  /**
   * GET /api/wallet/encryption-status
   * Check if encryption is properly configured
   */
  fastify.get('/api/wallet/encryption-status', {
    schema: {
      tags: ['Wallet Encryption'],
      description: 'Check encryption configuration status',
      response: {
        200: StatusResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const configured = WalletEncryptionService.isMasterPasswordConfigured();
    
    return reply.code(200).send({
      configured,
      provider: 'aes-256-gcm'
    });
  });
}
