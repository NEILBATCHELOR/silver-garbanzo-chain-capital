/**
 * MPT Synchronization API Routes
 * 
 * These routes handle syncing blockchain state to database
 * ALWAYS query blockchain first, database is just a cache
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mptSyncService } from '../../services/xrpl/mpt-sync.service';
import { z } from 'zod';

// Request validation schemas
const ProcessTransactionSchema = z.object({
  project_id: z.string().uuid(),
  tx_hash: z.string().regex(/^[A-F0-9]{64}$/i, 'Invalid transaction hash'),
});

const SyncIssuanceSchema = z.object({
  project_id: z.string().uuid(),
  issuance_id: z.string().regex(/^[A-F0-9]{48}$/i, 'Invalid issuance ID'),
  ledger_index: z.number().int().positive().optional(),
});

const SyncHolderSchema = z.object({
  project_id: z.string().uuid(),
  issuance_id: z.string().regex(/^[A-F0-9]{48}$/i, 'Invalid issuance ID'),
  holder_address: z.string().regex(/^r[a-zA-Z0-9]{24,34}$/, 'Invalid XRPL address'),
  ledger_index: z.number().int().positive().optional(),
});

const VerifySyncSchema = z.object({
  issuance_id: z.string().regex(/^[A-F0-9]{48}$/i, 'Invalid issuance ID'),
});

export default async function mptSyncRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/xrpl/mpt/sync/transaction
   * Process a validated transaction and sync all affected state
   */
  fastify.post('/api/xrpl/mpt/sync/transaction', async (
    request: FastifyRequest<{ Body: z.infer<typeof ProcessTransactionSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const body = ProcessTransactionSchema.parse(request.body);

      await mptSyncService.processMPTTransaction(
        body.project_id,
        body.tx_hash
      );

      return reply.code(200).send({
        success: true,
        message: 'Transaction processed and state synced from blockchain',
        tx_hash: body.tx_hash
      });
    } catch (error: any) {
      fastify.log.error('Error processing transaction:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to process transaction'
      });
    }
  });

  /**
   * POST /api/xrpl/mpt/sync/issuance
   * Sync issuance state from blockchain to database
   */
  fastify.post('/api/xrpl/mpt/sync/issuance', async (
    request: FastifyRequest<{ Body: z.infer<typeof SyncIssuanceSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const body = SyncIssuanceSchema.parse(request.body);

      // Get current ledger if not provided
      let ledgerIndex: number;
      if (body.ledger_index) {
        ledgerIndex = body.ledger_index;
      } else {
        await mptSyncService.connect();
        const ledgerResponse = await (mptSyncService as any).client.request({
          command: 'ledger',
          ledger_index: 'validated'
        });
        ledgerIndex = ledgerResponse.result.ledger_index;
      }

      await mptSyncService.syncIssuanceToDatabase(
        body.project_id,
        body.issuance_id,
        ledgerIndex
      );

      return reply.code(200).send({
        success: true,
        message: 'Issuance state synced from blockchain',
        issuance_id: body.issuance_id,
        ledger_index: ledgerIndex
      });
    } catch (error: any) {
      fastify.log.error('Error syncing issuance:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to sync issuance'
      });
    }
  });

  /**
   * POST /api/xrpl/mpt/sync/holder
   * Sync holder balance from blockchain to database
   */
  fastify.post('/api/xrpl/mpt/sync/holder', async (
    request: FastifyRequest<{ Body: z.infer<typeof SyncHolderSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const body = SyncHolderSchema.parse(request.body);

      // Get current ledger if not provided
      let ledgerIndex: number;
      if (body.ledger_index) {
        ledgerIndex = body.ledger_index;
      } else {
        await mptSyncService.connect();
        const ledgerResponse = await (mptSyncService as any).client.request({
          command: 'ledger',
          ledger_index: 'validated'
        });
        ledgerIndex = ledgerResponse.result.ledger_index;
      }

      await mptSyncService.syncHolderToDatabase(
        body.project_id,
        body.issuance_id,
        body.holder_address,
        ledgerIndex
      );

      return reply.code(200).send({
        success: true,
        message: 'Holder balance synced from blockchain',
        holder_address: body.holder_address,
        ledger_index: ledgerIndex
      });
    } catch (error: any) {
      fastify.log.error('Error syncing holder:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to sync holder'
      });
    }
  });

  /**
   * POST /api/xrpl/mpt/verify-sync
   * Verify database state matches blockchain
   */
  fastify.post('/api/xrpl/mpt/verify-sync', async (
    request: FastifyRequest<{ Body: z.infer<typeof VerifySyncSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const body = VerifySyncSchema.parse(request.body);

      const verification = await mptSyncService.verifySync(body.issuance_id);

      if (!verification.inSync) {
        return reply.code(409).send({
          success: false,
          in_sync: false,
          message: 'Database state does not match blockchain',
          differences: verification.differences
        });
      }

      return reply.code(200).send({
        success: true,
        in_sync: true,
        message: 'Database state matches blockchain'
      });
    } catch (error: any) {
      fastify.log.error('Error verifying sync:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to verify sync'
      });
    }
  });

  /**
   * GET /api/xrpl/mpt/blockchain-state/:issuance_id
   * Query blockchain directly for current state (bypasses database)
   */
  fastify.get('/api/xrpl/mpt/blockchain-state/:issuance_id', async (
    request: FastifyRequest<{ Params: { issuance_id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { issuance_id } = request.params;

      if (!/^[A-F0-9]{48}$/i.test(issuance_id)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid issuance ID format'
        });
      }

      const state = await mptSyncService.getIssuanceFromBlockchain(issuance_id);

      if (!state) {
        return reply.code(404).send({
          success: false,
          error: 'Issuance not found on blockchain'
        });
      }

      return reply.code(200).send({
        success: true,
        source: 'blockchain',
        data: state
      });
    } catch (error: any) {
      fastify.log.error('Error querying blockchain:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to query blockchain'
      });
    }
  });

  /**
   * GET /api/xrpl/mpt/blockchain-holder/:issuance_id/:holder_address
   * Query blockchain directly for holder balance (bypasses database)
   */
  fastify.get('/api/xrpl/mpt/blockchain-holder/:issuance_id/:holder_address', async (
    request: FastifyRequest<{ Params: { issuance_id: string; holder_address: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { issuance_id, holder_address } = request.params;

      if (!/^[A-F0-9]{48}$/i.test(issuance_id)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid issuance ID format'
        });
      }

      if (!/^r[a-zA-Z0-9]{24,34}$/.test(holder_address)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid XRPL address'
        });
      }

      const state = await mptSyncService.getHolderFromBlockchain(issuance_id, holder_address);

      if (!state) {
        return reply.code(404).send({
          success: false,
          error: 'Holder not found on blockchain'
        });
      }

      return reply.code(200).send({
        success: true,
        source: 'blockchain',
        data: state
      });
    } catch (error: any) {
      fastify.log.error('Error querying blockchain:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to query blockchain'
      });
    }
  });
}
