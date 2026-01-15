import { FastifyPluginAsync } from 'fastify';
import { RiskScoringService } from '../../services/oracle/RiskScoringService';

const riskRoutes: FastifyPluginAsync = async (fastify) => {
  const riskService = new RiskScoringService();
  
  /**
   * POST /api/oracle/risk/assess
   * Perform risk assessment for user
   * 
   * Body: {
   *   user_id: string,
   *   wallet_address: string
   * }
   */
  fastify.post('/assess', async (request, reply) => {
    try {
      const { user_id, wallet_address, assessment_type, trigger_event } = request.body as any;
      
      // Validation
      if (!user_id || !wallet_address) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: user_id, wallet_address'
        });
      }
      
      // Perform risk assessment
      const result = await riskService.assessRisk({
        user_id,
        wallet_address,
        assessment_type: assessment_type || 'initial',
        trigger_event
      });
      
      return reply.send(result);
      
    } catch (error: any) {
      fastify.log.error('Risk assessment error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/risk/score/:walletAddress
   * Get current risk score for wallet address
   * 
   * Returns: {
   *   success: boolean,
   *   risk_score: number,
   *   risk_level: 'low' | 'medium' | 'high' | 'critical'
   * }
   */
  fastify.get('/score/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const score = await riskService.getRiskScore(walletAddress);
      
      // Determine risk level
      let risk_level: 'low' | 'medium' | 'high' | 'critical';
      if (score <= 30) risk_level = 'low';
      else if (score <= 50) risk_level = 'medium';
      else if (score <= 75) risk_level = 'high';
      else risk_level = 'critical';
      
      return reply.send({
        success: true,
        risk_score: score,
        risk_level
      });
      
    } catch (error: any) {
      fastify.log.error('Risk score error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/risk/history/:walletAddress
   * Get risk assessment history for wallet address
   * 
   * Query params:
   *   limit?: number (default: 10)
   * 
   * Returns: {
   *   success: boolean,
   *   assessments: RiskAssessment[]
   * }
   */
  fastify.get('/history/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      const { limit = '10' } = request.query as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const history = await riskService.getAssessmentHistory(
        walletAddress,
        parseInt(limit)
      );
      
      return reply.send({
        success: true,
        assessments: history
      });
      
    } catch (error: any) {
      fastify.log.error('Risk history error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/risk/factors/:walletAddress
   * Get detailed risk factor breakdown
   * 
   * Returns: {
   *   success: boolean,
   *   factors: {
   *     account_age: number,
   *     transaction_history: number,
   *     geographic: number,
   *     compliance_history: number,
   *     behavioral: number
   *   },
   *   total_score: number,
   *   risk_level: string
   * }
   */
  fastify.get('/factors/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const factors = await riskService.getRiskFactors(walletAddress);
      
      return reply.send({
        success: true,
        ...factors
      });
      
    } catch (error: any) {
      fastify.log.error('Risk factors error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/risk/recalculate
   * Force recalculation of risk score (admin only)
   * 
   * Body: {
   *   wallet_address: string
   * }
   */
  fastify.post('/recalculate', async (request, reply) => {
    try {
      const { wallet_address } = request.body as any;
      
      if (!wallet_address) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const result = await riskService.recalculateRisk(wallet_address);
      
      return reply.send({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      fastify.log.error('Risk recalculation error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
};

export default riskRoutes;
