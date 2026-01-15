import { FastifyPluginAsync } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const chainlinkApiRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * GET /api/oracle/chainlink/compliance/:walletAddress
   * Chainlink Functions calls this endpoint to fetch compliance data
   * 
   * IMPORTANT: This endpoint must be publicly accessible (with API key)
   * 
   * Returns: {
   *   success: boolean,
   *   compliance: {
   *     kyc_verified: boolean,
   *     aml_cleared: boolean,
   *     accredited_investor: boolean,
   *     risk_score: number,
   *     last_updated: string
   *   }
   * }
   */
  fastify.get('/compliance/:walletAddress', {
    preHandler: async (request, reply) => {
      // Verify API key
      const apiKey = request.headers['x-api-key'];
      
      if (!apiKey || apiKey !== process.env.CHAINLINK_API_KEY) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized: Invalid or missing API key'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      // Log request for monitoring
      fastify.log.info(`Chainlink compliance request for: ${walletAddress}`);
      
      // Query compliance data cache
      const { data: compliance, error } = await supabase
        .from('compliance_data_cache')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();
      
      if (error || !compliance) {
        // No data found - return default (all false, max risk)
        fastify.log.warn(`No compliance data found for: ${walletAddress}`);
        return reply.send({
          success: true,
          compliance: {
            kyc_verified: false,
            aml_cleared: false,
            accredited_investor: false,
            risk_score: 100,
            last_updated: null
          }
        });
      }
      
      // Check if data expired
      const expired = compliance.expires_at && new Date(compliance.expires_at) < new Date();
      
      if (expired) {
        fastify.log.warn(`Expired compliance data for: ${walletAddress}`);
      }
      
      // Return compliance data
      return reply.send({
        success: true,
        compliance: {
          kyc_verified: !expired && compliance.kyc_verified,
          aml_cleared: !expired && compliance.aml_cleared,
          accredited_investor: !expired && compliance.accredited_investor,
          risk_score: expired ? 100 : compliance.risk_score,
          last_updated: compliance.last_updated
        }
      });
      
    } catch (error: any) {
      fastify.log.error('Chainlink API error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/chainlink/request-update
   * Trigger Chainlink Functions request to update on-chain data
   * 
   * Body: {
   *   wallet_address: string,
   *   chain_id: number
   * }
   */
  fastify.post('/request-update', async (request, reply) => {
    try {
      const { wallet_address, chain_id } = request.body as any;
      
      if (!wallet_address || !chain_id) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: wallet_address, chain_id'
        });
      }
      
      // Log request
      fastify.log.info(`Chainlink update requested for: ${wallet_address} on chain ${chain_id}`);
      
      // NOTE: Actual Chainlink Functions request would be triggered here
      // This would call the ChainlinkComplianceOracle.requestComplianceUpdate()
      // For now, just acknowledge the request
      
      return reply.send({
        success: true,
        message: 'Chainlink update request queued',
        wallet_address,
        chain_id,
        estimated_completion: '2-5 minutes'
      });
      
    } catch (error: any) {
      fastify.log.error('Chainlink request error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/chainlink/status/:requestId
   * Check status of Chainlink Functions request
   * 
   * Returns: {
   *   success: boolean,
   *   status: 'pending' | 'fulfilled' | 'failed',
   *   result?: any,
   *   error?: string
   * }
   */
  fastify.get('/status/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as any;
      
      // NOTE: Would query Chainlink Functions status
      // For now, return mock status
      
      return reply.send({
        success: true,
        status: 'pending',
        request_id: requestId,
        message: 'Request is being processed by Chainlink Functions network'
      });
      
    } catch (error: any) {
      fastify.log.error('Chainlink status error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/chainlink/webhook
   * Webhook for Chainlink Functions callbacks
   * 
   * Body: {
   *   request_id: string,
   *   status: 'fulfilled' | 'failed',
   *   result?: any,
   *   error?: string
   * }
   */
  fastify.post('/webhook', {
    preHandler: async (request, reply) => {
      // Verify webhook signature (if Chainlink provides one)
      const signature = request.headers['x-chainlink-signature'];
      
      // TODO: Implement signature verification
      
      if (!signature) {
        fastify.log.warn('Webhook received without signature');
      }
    }
  }, async (request, reply) => {
    try {
      const { request_id, status, result, error } = request.body as any;
      
      fastify.log.info(`Chainlink webhook received: ${request_id} - ${status}`);
      
      // Process webhook data
      // Update database, trigger notifications, etc.
      
      return reply.send({
        success: true,
        message: 'Webhook processed'
      });
      
    } catch (error: any) {
      fastify.log.error('Chainlink webhook error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
};

export default chainlinkApiRoutes;
