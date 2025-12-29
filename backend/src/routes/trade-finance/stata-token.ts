/**
 * Trade Finance - StataToken Routes
 * API routes for ERC4626 wrapped commodity tokens
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  StataTokenService, 
  DeployStataTokenInput, 
  RecordOperationInput, 
  UpdateTotalsInput 
} from '../../services/trade-finance/StataTokenService';

// ============ Request Types ============

interface DeployStataTokenBody {
  Body: DeployStataTokenInput;
}

interface GetStataTokenParams {
  Params: { address: string };
}

interface GetByCTokenParams {
  Params: { ctoken: string };
}

interface RecordOperationBody {
  Body: RecordOperationInput;
}

interface UpdateTotalsBody {
  Body: UpdateTotalsInput;
}

interface TogglePauseBody {
  Body: {
    stataTokenAddress: string;
    isPaused: boolean;
  };
}

interface GetOperationsParams {
  Params: { address: string };
  Querystring: {
    limit?: string;
    offset?: string;
  };
}

interface GetUserOperationsParams {
  Params: { user: string };
  Querystring: {
    limit?: string;
    offset?: string;
  };
}

interface ChainIdQuery {
  Querystring: { chain_id?: string };
}

interface CommodityTypeParams {
  Params: { type: string };
}

// ============ Routes ============

export async function stataTokenRoutes(fastify: FastifyInstance) {
  const stataTokenService = new StataTokenService();

  // ============ Deployment & Registry ============

  /**
   * POST /api/trade-finance/stata-tokens/deploy
   * Register a newly deployed StataToken
   */
  fastify.post<DeployStataTokenBody>(
    '/api/trade-finance/stata-tokens/deploy',
    async (request: FastifyRequest<DeployStataTokenBody>, reply: FastifyReply) => {
      try {
        const stataToken = await stataTokenService.deployStataToken(request.body);
        return reply.status(201).send({ data: stataToken });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to deploy StataToken' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens
   * Get all StataTokens (optionally filtered by chain)
   */
  fastify.get<ChainIdQuery>(
    '/api/trade-finance/stata-tokens',
    async (request: FastifyRequest<ChainIdQuery>, reply: FastifyReply) => {
      try {
        const chainId = request.query.chain_id ? parseInt(request.query.chain_id) : undefined;
        const stataTokens = await stataTokenService.getAllStataTokens(chainId);
        return reply.send({ data: stataTokens });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch StataTokens' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens/:address
   * Get StataToken by address
   */
  fastify.get<GetStataTokenParams>(
    '/api/trade-finance/stata-tokens/:address',
    async (request: FastifyRequest<GetStataTokenParams>, reply: FastifyReply) => {
      try {
        const { address } = request.params;
        const stataToken = await stataTokenService.getStataTokenByAddress(address);
        
        if (!stataToken) {
          return reply.status(404).send({
            error: { message: 'StataToken not found' }
          });
        }

        return reply.send({ data: stataToken });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch StataToken' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens/by-ctoken/:ctoken
   * Get StataToken by underlying cToken address
   */
  fastify.get<GetByCTokenParams>(
    '/api/trade-finance/stata-tokens/by-ctoken/:ctoken',
    async (request: FastifyRequest<GetByCTokenParams>, reply: FastifyReply) => {
      try {
        const { ctoken } = request.params;
        const stataToken = await stataTokenService.getStataTokenByCToken(ctoken);
        
        if (!stataToken) {
          return reply.status(404).send({
            error: { message: 'StataToken not found for cToken' }
          });
        }

        return reply.send({ data: stataToken });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch StataToken' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens/commodity/:type
   * Get all StataTokens for a commodity type
   */
  fastify.get<CommodityTypeParams>(
    '/api/trade-finance/stata-tokens/commodity/:type',
    async (request: FastifyRequest<CommodityTypeParams>, reply: FastifyReply) => {
      try {
        const { type } = request.params;
        const stataTokens = await stataTokenService.getStataTokensByCommodity(type);
        return reply.send({ data: stataTokens });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch StataTokens' }
        });
      }
    }
  );

  // ============ Operations ============

  /**
   * POST /api/trade-finance/stata-tokens/operation
   * Record a wrap/unwrap operation
   */
  fastify.post<RecordOperationBody>(
    '/api/trade-finance/stata-tokens/operation',
    async (request: FastifyRequest<RecordOperationBody>, reply: FastifyReply) => {
      try {
        const operation = await stataTokenService.recordOperation(request.body);
        return reply.status(201).send({ data: operation });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to record operation' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens/:address/operations
   * Get operations for a specific StataToken
   */
  fastify.get<GetOperationsParams>(
    '/api/trade-finance/stata-tokens/:address/operations',
    async (request: FastifyRequest<GetOperationsParams>, reply: FastifyReply) => {
      try {
        const { address } = request.params;
        const limit = request.query.limit ? parseInt(request.query.limit) : 50;
        const offset = request.query.offset ? parseInt(request.query.offset) : 0;

        const operations = await stataTokenService.getOperationsByToken(address, limit, offset);
        return reply.send({ data: operations });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch operations' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens/user/:user/operations
   * Get operations for a specific user
   */
  fastify.get<GetUserOperationsParams>(
    '/api/trade-finance/stata-tokens/user/:user/operations',
    async (request: FastifyRequest<GetUserOperationsParams>, reply: FastifyReply) => {
      try {
        const { user } = request.params;
        const limit = request.query.limit ? parseInt(request.query.limit) : 50;
        const offset = request.query.offset ? parseInt(request.query.offset) : 0;

        const operations = await stataTokenService.getOperationsByUser(user, limit, offset);
        return reply.send({ data: operations });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch user operations' }
        });
      }
    }
  );

  // ============ Management ============

  /**
   * PUT /api/trade-finance/stata-tokens/totals
   * Update StataToken total assets and shares
   */
  fastify.put<UpdateTotalsBody>(
    '/api/trade-finance/stata-tokens/totals',
    async (request: FastifyRequest<UpdateTotalsBody>, reply: FastifyReply) => {
      try {
        const stataToken = await stataTokenService.updateTotals(request.body);
        return reply.send({ data: stataToken });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to update totals' }
        });
      }
    }
  );

  /**
   * PUT /api/trade-finance/stata-tokens/pause
   * Toggle pause state of a StataToken
   */
  fastify.put<TogglePauseBody>(
    '/api/trade-finance/stata-tokens/pause',
    async (request: FastifyRequest<TogglePauseBody>, reply: FastifyReply) => {
      try {
        const { stataTokenAddress, isPaused } = request.body;
        const stataToken = await stataTokenService.togglePause(stataTokenAddress, isPaused);
        return reply.send({ data: stataToken });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to toggle pause' }
        });
      }
    }
  );

  // ============ Analytics ============

  /**
   * GET /api/trade-finance/stata-tokens/:address/apr
   * Calculate APR for a StataToken
   */
  fastify.get<GetStataTokenParams>(
    '/api/trade-finance/stata-tokens/:address/apr',
    async (request: FastifyRequest<GetStataTokenParams>, reply: FastifyReply) => {
      try {
        const { address } = request.params;
        const apr = await stataTokenService.calculateAPR(address);
        return reply.send({ data: { apr } });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to calculate APR' }
        });
      }
    }
  );

  /**
   * GET /api/trade-finance/stata-tokens/:address/stats
   * Get comprehensive statistics for a StataToken
   */
  fastify.get<GetStataTokenParams>(
    '/api/trade-finance/stata-tokens/:address/stats',
    async (request: FastifyRequest<GetStataTokenParams>, reply: FastifyReply) => {
      try {
        const { address } = request.params;
        const stats = await stataTokenService.getStataTokenStats(address);
        return reply.send({ data: stats });
      } catch (error) {
        return reply.status(500).send({
          error: { message: error instanceof Error ? error.message : 'Failed to fetch stats' }
        });
      }
    }
  );
}

export default stataTokenRoutes;
