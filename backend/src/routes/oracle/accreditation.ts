import { FastifyPluginAsync } from 'fastify';
import { AccreditationService } from '../../services/oracle/AccreditationService';

const accreditationRoutes: FastifyPluginAsync = async (fastify) => {
  const accreditationService = new AccreditationService();
  
  /**
   * POST /api/oracle/accreditation/submit
   * Submit accreditation verification request
   * 
   * Body: {
   *   user_id: string,
   *   wallet_address: string,
   *   accreditation_type: 'income_individual' | 'income_joint' | 'net_worth' | 'professional_certification',
   *   verification_method?: 'self_certification' | 'document_upload' | 'third_party' | 'attorney_letter',
   *   supporting_data: {
   *     income?: number,
   *     joint_income?: number,
   *     net_worth?: number,
   *     net_worth_excluding_residence?: number,
   *     certification_type?: string,
   *     certification_number?: string
   *   },
   *   documents?: [{ type: string, file: string | Buffer }]
   * }
   */
  fastify.post('/submit', async (request, reply) => {
    try {
      const {
        user_id,
        wallet_address,
        accreditation_type,
        verification_method,
        supporting_data,
        documents
      } = request.body as any;
      
      // Validation
      if (!user_id || !wallet_address || !accreditation_type) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: user_id, wallet_address, accreditation_type'
        });
      }
      
      // Validate accreditation type
      const validTypes = ['income_individual', 'income_joint', 'net_worth', 'professional_certification'];
      if (!validTypes.includes(accreditation_type)) {
        return reply.code(400).send({
          success: false,
          error: `Invalid accreditation_type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      
      // Validate verification method if provided
      if (verification_method) {
        const validMethods = ['self_certification', 'document_upload', 'third_party', 'attorney_letter'];
        if (!validMethods.includes(verification_method)) {
          return reply.code(400).send({
            success: false,
            error: `Invalid verification_method. Must be one of: ${validMethods.join(', ')}`
          });
        }
      }
      
      // Submit accreditation verification
      const result = await accreditationService.submitVerification({
        user_id,
        wallet_address,
        accreditation_type,
        verification_method,
        supporting_data: supporting_data || {},
        documents: documents || []
      });
      
      return reply.send(result);
      
    } catch (error: any) {
      fastify.log.error('Accreditation submission error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/accreditation/status/:userId
   * Get accreditation verification status for user
   * 
   * Returns: {
   *   success: boolean,
   *   data: AccreditationVerification | null
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
      
      const status = await accreditationService.getVerificationStatus(userId);
      
      return reply.send({
        success: true,
        data: status
      });
      
    } catch (error: any) {
      fastify.log.error('Accreditation status error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/accreditation/is-accredited/:walletAddress
   * Check if wallet address is accredited investor
   * 
   * Returns: {
   *   success: boolean,
   *   accredited: boolean
   * }
   */
  fastify.get('/is-accredited/:walletAddress', async (request, reply) => {
    try {
      const { walletAddress } = request.params as any;
      
      if (!walletAddress) {
        return reply.code(400).send({
          success: false,
          error: 'Wallet address is required'
        });
      }
      
      const isAccredited = await accreditationService.isAccredited(walletAddress);
      
      return reply.send({
        success: true,
        accredited: isAccredited
      });
      
    } catch (error: any) {
      fastify.log.error('Accreditation check error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/oracle/accreditation/documents/:verificationId
   * Get documents for an accreditation verification
   * 
   * Returns: {
   *   success: boolean,
   *   documents: AccreditationDocument[]
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
      
      const documents = await accreditationService.getDocuments(verificationId);
      
      return reply.send({
        success: true,
        documents
      });
      
    } catch (error: any) {
      fastify.log.error('Accreditation documents error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
  
  /**
   * POST /api/oracle/accreditation/renew
   * Renew accreditation verification
   * 
   * Body: {
   *   user_id: string,
   *   wallet_address: string,
   *   previous_verification_id?: string
   * }
   */
  fastify.post('/renew', async (request, reply) => {
    try {
      const { user_id, wallet_address, previous_verification_id } = request.body as any;
      
      if (!user_id || !wallet_address) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required fields: user_id, wallet_address'
        });
      }
      
      const result = await accreditationService.renewVerification({
        user_id,
        wallet_address,
        previous_verification_id
      });
      
      return reply.send(result);
      
    } catch (error: any) {
      fastify.log.error('Accreditation renewal error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
};

export default accreditationRoutes;
