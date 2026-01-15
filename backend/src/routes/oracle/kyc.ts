import { FastifyPluginAsync } from 'fastify';
import { KYCVerificationService } from '../../services/oracle/KYCVerificationService';

const kycRoutes: FastifyPluginAsync = async (fastify) => {
  const kycService = new KYCVerificationService();
  
  /**
   * POST /api/oracle/kyc/submit
   * Submit KYC verification request
   * 
   * Body: {
   *   user_id: string,
   *   wallet_address: string,
   *   documents: [{ type: string, file: string }]
   * }
   */
  fastify.post('/submit', async (request, reply) => {
    try {
      const { user_id, wallet_address, documents } = request.body as any;
      
      // Validation
      if (!user_id || !wallet_address || !documents || !Array.isArray(documents)) {
        return reply.code(400).send({
          success: false,
          error: 'Missing or invalid required fields: user_id, wallet_address, documents'
        });
      }
      
      // Validate documents array
      if (documents.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'At least one document is required'
        });
      }
      
      // Submit verification
      const result = await kycService.submitVerification({
        user_id,
        wallet_address,
        documents
      });
      
      return reply.send(result);
      
    } catch (error: any) {
      fastify.log.error('KYC submission error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/kyc/status/:userId
   * Get KYC verification status for user
   * 
   * Returns: {
   *   success: boolean,
   *   data: KYCVerification | null
   * }
   */
  fastify.get('/status/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;
      
      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const status = await kycService.getVerificationStatus(userId);
      
      return reply.send({
        success: true,
        data: status
      });
      
    } catch (error: any) {
      fastify.log.error('KYC status error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/kyc/is-verified/:walletAddress
   * Check if wallet address is KYC verified
   * 
   * Returns: {
   *   success: boolean,
   *   verified: boolean
   * }
   */
  fastify.get('/is-verified/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const isVerified = await kycService.isVerified(walletAddress);
      
      return reply.send({
        success: true,
        verified: isVerified
      });
      
    } catch (error: any) {
      fastify.log.error('KYC verification check error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/kyc/documents/:verificationId
   * Get documents for a KYC verification
   * 
   * Returns: {
   *   success: boolean,
   *   documents: KYCDocument[]
   * }
   */
  fastify.get('/documents/:verificationId', async (request, reply) => {
    try {
      const { verificationId } = request.params as any;
      
      if (!verificationId) {
        return reply.code(400).send({
          success: false,
          error: 'Verification ID is required'
        });
      }
      
      const documents = await kycService.getDocuments(verificationId);
      
      return reply.send({
        success: true,
        documents
      });
      
    } catch (error: any) {
      fastify.log.error('KYC documents error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
};

export default kycRoutes;
