import { FastifyPluginAsync } from 'fastify';
import { AMLScreeningService } from '../../services/oracle/AMLScreeningService';

const amlRoutes: FastifyPluginAsync = async (fastify) => {
  const amlService = new AMLScreeningService();
  
  /**
   * POST /api/oracle/aml/screen
   * Perform AML screening for user
   * 
   * Body: {
   *   user_id: string,
   *   wallet_address: string,
   *   user_name: string,
   *   date_of_birth?: string,
   *   nationality?: string,
   *   address?: string
   * }
   */
  fastify.post('/screen', async (request, reply) => {
    try {
      const { 
        user_id, 
        wallet_address, 
        name,  // Changed from user_name to match service interface
        date_of_birth, 
        nationality, 
        address 
      } = request.body as any;
      
      // Validation
      if (!user_id || !wallet_address || !name) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: user_id, wallet_address, name'
        });
      }
      
      // Perform screening
      const result = await amlService.performScreening({
        user_id,
        wallet_address,
        name,
        date_of_birth,
        nationality,
        address
      });
      
      return reply.send(result);
      
    } catch (error: any) {
      fastify.log.error('AML screening error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/aml/is-cleared/:walletAddress
   * Check if wallet address is AML cleared
   * 
   * Returns: {
   *   success: boolean,
   *   cleared: boolean
   * }
   */
  fastify.get('/is-cleared/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const isCleared = await amlService.isCleared(walletAddress);
      
      return reply.send({
        success: true,
        cleared: isCleared
      });
      
    } catch (error: any) {
      fastify.log.error('AML clearance check error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/aml/status/:walletAddress
   * Get detailed AML screening status
   * 
   * Returns: {
   *   success: boolean,
   *   data: AMLScreening | null
   * }
   */
  fastify.get('/status/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const status = await amlService.getScreeningStatus(walletAddress);
      
      return reply.send({
        success: true,
        data: status
      });
      
    } catch (error: any) {
      fastify.log.error('AML status error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/aml/matches/:screeningId
   * Get sanctions matches for a screening
   * 
   * Returns: {
   *   success: boolean,
   *   matches: SanctionsMatch[]
   * }
   */
  fastify.get('/matches/:screeningId', async (request, reply) => {
    try {
      const { screeningId } = request.params as any;
      
      if (!screeningId) {
        return reply.code(400).send({
          success: false,
          error: 'Screening ID is required'
        });
      }
      
      const matches = await amlService.getSanctionsMatches(screeningId);
      
      return reply.send({
        success: true,
        matches
      });
      
    } catch (error: any) {
      fastify.log.error('AML matches error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/aml/review-match
   * Review a sanctions match (mark as false positive or confirmed)
   * 
   * Body: {
   *   match_id: string,
   *   review_decision: 'false_positive' | 'true_positive' | 'needs_investigation',
   *   reviewed_by: string,
   *   review_notes?: string
   * }
   */
  fastify.post('/review-match', async (request, reply) => {
    try {
      const { match_id, review_decision, reviewed_by, review_notes } = request.body as any;
      
      // Validation
      if (!match_id || !review_decision || !reviewed_by) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: match_id, review_decision, reviewed_by'
        });
      }
      
      if (!['false_positive', 'true_positive', 'needs_investigation'].includes(review_decision)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid review_decision. Must be "false_positive", "true_positive", or "needs_investigation"'
        });
      }
      
      const result = await amlService.reviewMatch({
        match_id,
        reviewer_id: reviewed_by,
        review_decision,
        review_notes
      });
      
      return reply.send({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      fastify.log.error('AML review error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
};

export default amlRoutes;
