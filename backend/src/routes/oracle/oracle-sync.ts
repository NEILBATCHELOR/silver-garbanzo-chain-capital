import { FastifyPluginAsync } from 'fastify';
import { ComplianceOracleService } from '../../services/oracle/ComplianceOracleService';

const oracleSyncRoutes: FastifyPluginAsync = async (fastify) => {
  const oracleService = new ComplianceOracleService();
  
  /**
   * POST /api/oracle/sync/update-compliance
   * Sync compliance data to blockchain oracle contract
   * 
   * Body: {
   *   wallet_address: string,
   *   chain_id?: number,
   *   force?: boolean
   * }
   */
  fastify.post('/update-compliance', async (request, reply) => {
    try {
      const { wallet_address, chain_id, force = false } = request.body as any;
      
      // Validation
      if (!wallet_address) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required field: wallet_address'
        });
      }
      
      // Sync to blockchain
      const result = await oracleService.syncToBlockchain({
        wallet_address,
        chain_id,
        force
      });
      
      return reply.send(result);
      
    } catch (error: any) {
      fastify.log.error('Oracle sync error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/sync/batch-update
   * Batch sync multiple addresses to blockchain
   * 
   * Body: {
   *   wallet_addresses: string[],
   *   chain_id?: number,
   *   force?: boolean
   * }
   */
  fastify.post('/batch-update', async (request, reply) => {
    try {
      const { wallet_addresses, chain_id, force = false } = request.body as any;
      
      // Validation
      if (!wallet_addresses || !Array.isArray(wallet_addresses) || wallet_addresses.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid wallet_addresses. Must be non-empty array'
        });
      }
      
      // Limit batch size
      if (wallet_addresses.length > 50) {
        return reply.code(400).send({
          success: false,
          error: 'Batch size exceeds maximum of 50 addresses'
        });
      }
      
      // Process batch
      const results = [];
      for (const address of wallet_addresses) {
        try {
          const result = await oracleService.syncToBlockchain({
            wallet_address: address,
            chain_id,
            force
          });
          results.push({
            wallet_address: address,
            success: result.success,
            transaction_hash: result.transaction_hash
          });
        } catch (error: any) {
          results.push({
            wallet_address: address,
            success: false,
            error: error.message
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return reply.send({
        success: true,
        total: wallet_addresses.length,
        successful: successCount,
        failed: wallet_addresses.length - successCount,
        results
      });
      
    } catch (error: any) {
      fastify.log.error('Batch sync error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/sync/status/:walletAddress/:chainId
   * Get blockchain sync status for wallet
   * 
   * Returns: {
   *   success: boolean,
   *   synced: boolean,
   *   last_sync_at: string,
   *   on_chain_data: ComplianceData,
   *   off_chain_data: ComplianceData,
   *   needs_update: boolean
   * }
   */
  fastify.get('/status/:walletAddress/:chainId', async (request, reply) => {
    try {
      const { walletAddress, chainId } = request.params as any;
      
      if (!walletAddress || !chainId) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address and chain ID are required'
        });
      }
      
      const status = await oracleService.getSyncStatus({
        wallet_address: walletAddress,
        chain_id: parseInt(chainId)
      });
      
      return reply.send({
        success: true,
        ...status
      });
      
    } catch (error: any) {
      fastify.log.error('Sync status error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/sync/pending
   * Get list of addresses that need blockchain sync
   * 
   * Query params:
   *   chain_id?: number
   *   limit?: number (default: 50)
   * 
   * Returns: {
   *   success: boolean,
   *   pending: Array<{
   *     wallet_address: string,
   *     last_updated: string,
   *     needs_sync_reason: string
   *   }>
   * }
   */
  fastify.get('/pending', async (request, reply) => {
    try {
      const { chain_id, limit = '50' } = request.query as any;
      
      const pending = await oracleService.getPendingSync({
        chain_id: chain_id ? parseInt(chain_id) : undefined,
        limit: parseInt(limit)
      });
      
      return reply.send({
        success: true,
        count: pending.length,
        pending
      });
      
    } catch (error: any) {
      fastify.log.error('Pending sync error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/sync/verify
   * Verify on-chain data matches off-chain data
   * 
   * Body: {
   *   wallet_address: string,
   *   transaction_hash: string
   * }
   * 
   * Returns: {
   *   success: boolean,
   *   verified: boolean,
   *   details?: any
   * }
   */
  fastify.post('/verify', async (request, reply) => {
    try {
      const { wallet_address, transaction_hash } = request.body as any;
      
      if (!wallet_address || !transaction_hash) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: wallet_address, transaction_hash'
        });
      }
      
      const verification = await oracleService.verifySync({
        wallet_address,
        transaction_hash
      });
      
      return reply.send({
        success: true,
        ...verification
      });
      
    } catch (error: any) {
      fastify.log.error('Sync verification error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/sync/force-sync
   * Force immediate sync to blockchain (admin only)
   * 
   * Body: {
   *   wallet_address: string,
   *   chain_id: number,
   *   oracle_type?: 'chainlink' | 'bespoke' | 'custom'
   * }
   */
  fastify.post('/force-sync', async (request, reply) => {
    try {
      const { 
        wallet_address, 
        chain_id,
        oracle_type
      } = request.body as {
        wallet_address: string;
        chain_id: number;
        oracle_type?: 'chainlink' | 'bespoke' | 'custom';
      };
      
      if (!wallet_address || !chain_id) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: wallet_address, chain_id'
        });
      }
      
      // Force sync (bypasses cache, re-fetches everything)
      const result = await oracleService.forceSync({
        wallet_address,
        chain_id,
        oracle_type
      });
      
      return reply.send({
        message: 'Force sync completed',
        ...result  // Let result.success determine the success status
      });
      
    } catch (error: any) {
      fastify.log.error('Force sync error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
};

export default oracleSyncRoutes;
