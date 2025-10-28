/**
 * PSP Market Rates and Spreads API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PSPMarketRatesService } from '../services/psp/PSPMarketRatesService';
import { PSPSpreadsService } from '../services/psp/PSPSpreadsService';
import { PSPRatesWithSpreadsService } from '../services/psp/PSPRatesWithSpreadsService';
import { logger } from '@/utils/logger';
import {
  GetMarketRatesRequest,
  GetRatesWithSpreadsRequest,
  UpdateSpreadRequest,
  BulkUpdateSpreadsRequest,
  CopySpreadRequest
} from '@/types/psp-market-rates';

export async function pspMarketRatesRoutes(fastify: FastifyInstance) {
  const marketRatesService = new PSPMarketRatesService();
  const spreadsService = new PSPSpreadsService();
  const ratesWithSpreadsService = new PSPRatesWithSpreadsService();

  /**
   * GET /api/psp/market-rates
   * Get current market rates from CoinGecko
   */
  fastify.get('/api/psp/market-rates', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { assets, vsCurrency } = request.query as { 
        assets: string; 
        vsCurrency?: string; 
      };

      if (!assets) {
        return reply.code(400).send({ error: 'Assets parameter required' });
      }

      const assetArray = assets.split(',');
      const response = await marketRatesService.getMarketRates({
        assets: assetArray as any,
        vsCurrency
      });

      return reply.send(response);
    } catch (error) {
      logger.error({ error }, 'Failed to get market rates');
      return reply.code(500).send({ error: 'Failed to fetch market rates' });
    }
  });

  /**
   * POST /api/psp/rates-with-spreads
   * Get market rates with project-specific spreads applied
   */
  fastify.post('/api/psp/rates-with-spreads', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as GetRatesWithSpreadsRequest;

      if (!body.assets || !body.projectId || !body.transactionAmount) {
        return reply.code(400).send({ error: 'Missing required parameters' });
      }

      const response = await ratesWithSpreadsService.getRatesWithSpreads(body);
      return reply.send(response);
    } catch (error) {
      logger.error({ error }, 'Failed to get rates with spreads');
      return reply.code(500).send({ error: 'Failed to fetch rates with spreads' });
    }
  });

  /**
   * GET /api/psp/spreads/matrix
   * Get spread configuration matrix for a project
   */
  fastify.get('/api/psp/spreads/matrix', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId } = request.query as { projectId: string };

      if (!projectId) {
        return reply.code(400).send({ error: 'Project ID required' });
      }

      const matrix = await spreadsService.getSpreadMatrix(projectId);
      return reply.send({
        success: true,
        matrix
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get spread matrix');
      return reply.code(500).send({ error: 'Failed to fetch spread matrix' });
    }
  });

  /**
   * PUT /api/psp/spreads
   * Update a single spread configuration
   */
  fastify.put('/api/psp/spreads', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as UpdateSpreadRequest;
      const userId = (request as any).user?.id;

      const config = await spreadsService.updateSpread(body, userId);
      return reply.send({
        success: true,
        config
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update spread');
      return reply.code(500).send({ error: 'Failed to update spread' });
    }
  });

  /**
   * PUT /api/psp/spreads/bulk
   * Bulk update spread configurations
   */
  fastify.put('/api/psp/spreads/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as BulkUpdateSpreadsRequest;
      const userId = (request as any).user?.id;

      const configs = await spreadsService.bulkUpdateSpreads(body, userId);
      return reply.send({
        success: true,
        updated: configs.length,
        configs
      });
    } catch (error) {
      logger.error({ error }, 'Failed to bulk update spreads');
      return reply.code(500).send({ error: 'Failed to bulk update spreads' });
    }
  });

  /**
   * POST /api/psp/spreads/copy
   * Copy spreads across rows or columns
   */
  fastify.post('/api/psp/spreads/copy', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as CopySpreadRequest;
      const userId = (request as any).user?.id;

      const copiedCount = await spreadsService.copySpreads(body, userId);
      return reply.send({
        success: true,
        copiedCount
      });
    } catch (error) {
      logger.error({ error }, 'Failed to copy spreads');
      return reply.code(500).send({ error: 'Failed to copy spreads' });
    }
  });

  /**
   * POST /api/psp/spreads/initialize
   * Initialize default spreads for a project
   */
  fastify.post('/api/psp/spreads/initialize', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId } = request.body as { projectId: string };
      const userId = (request as any).user?.id;

      if (!projectId) {
        return reply.code(400).send({ error: 'Project ID required' });
      }

      await spreadsService.initializeDefaultSpreads(projectId, userId);
      return reply.send({
        success: true,
        message: 'Default spreads initialized'
      });
    } catch (error) {
      logger.error({ error }, 'Failed to initialize spreads');
      return reply.code(500).send({ error: 'Failed to initialize spreads' });
    }
  });

  /**
   * POST /api/psp/quotes/buy-crypto
   * Get quote for buying crypto with fiat
   */
  fastify.post('/api/psp/quotes/buy-crypto', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId, fiatAmount, cryptoAsset, network } = request.body as {
        projectId: string;
        fiatAmount: number;
        cryptoAsset: string;
        network?: string;
      };

      if (!projectId || !fiatAmount || !cryptoAsset) {
        return reply.code(400).send({ error: 'Missing required parameters' });
      }

      const quote = await ratesWithSpreadsService.getQuoteForBuyCrypto(
        projectId,
        fiatAmount,
        cryptoAsset as any,
        network as any
      );

      return reply.send({
        success: true,
        quote
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get buy crypto quote');
      return reply.code(500).send({ error: 'Failed to get quote' });
    }
  });

  /**
   * POST /api/psp/quotes/sell-crypto
   * Get quote for selling crypto for fiat
   */
  fastify.post('/api/psp/quotes/sell-crypto', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId, cryptoAmount, cryptoAsset, network } = request.body as {
        projectId: string;
        cryptoAmount: number;
        cryptoAsset: string;
        network?: string;
      };

      if (!projectId || !cryptoAmount || !cryptoAsset) {
        return reply.code(400).send({ error: 'Missing required parameters' });
      }

      const quote = await ratesWithSpreadsService.getQuoteForSellCrypto(
        projectId,
        cryptoAmount,
        cryptoAsset as any,
        network as any
      );

      return reply.send({
        success: true,
        quote
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get sell crypto quote');
      return reply.code(500).send({ error: 'Failed to get quote' });
    }
  });
}
