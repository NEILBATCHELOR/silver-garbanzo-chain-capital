/**
 * Bond Token Links Routes
 * API routes for managing bond-token link relationships
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { BondTokenLinksService } from '../services/bond-token-links.service'
import {
  CreateBondTokenLinkRequest,
  CreateBondTokenLinkFrontendRequest,
  UpdateBondTokenLinkRequest,
  UpdateBondTokenLinkFrontendRequest,
  BondTokenLinkFilters,
} from '../types/bond-token-links'

interface GetLinksParams {
  bondId: string
}

interface GetLinkByIdParams {
  linkId: string
}

interface CreateLinkBody extends CreateBondTokenLinkFrontendRequest {
  projectId: string
}

interface UpdateLinkBody extends UpdateBondTokenLinkFrontendRequest {
  projectId: string
}

export async function bondTokenLinksRoutes(fastify: FastifyInstance) {
  const service = new BondTokenLinksService(fastify.supabase)

  /**
   * GET /api/v1/nav/bonds/:bondId/token-links
   * Get all token links for a bond
   */
  fastify.get<{
    Params: GetLinksParams
    Querystring: { project_id: string }
  }>(
    '/api/v1/nav/bonds/:bondId/token-links',
    async (
      request: FastifyRequest<{
        Params: GetLinksParams
        Querystring: { project_id: string }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { bondId } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' },
          })
        }

        const links = await service.getBondTokenLinks(bondId, project_id)
        return reply.send({ data: links })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        })
      }
    }
  )

  /**
   * GET /api/v1/nav/token-links
   * Get all token links with optional filters
   */
  fastify.get<{
    Querystring: BondTokenLinkFilters
  }>(
    '/api/v1/nav/token-links',
    async (
      request: FastifyRequest<{ Querystring: BondTokenLinkFilters }>,
      reply: FastifyReply
    ) => {
      try {
        const filters = request.query
        const links = await service.getTokenLinks(filters)
        return reply.send({ data: links })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        })
      }
    }
  )

  /**
   * GET /api/v1/nav/token-links/:linkId
   * Get a specific token link by ID
   */
  fastify.get<{
    Params: GetLinkByIdParams
    Querystring: { project_id: string }
  }>(
    '/api/v1/nav/token-links/:linkId',
    async (
      request: FastifyRequest<{
        Params: GetLinkByIdParams
        Querystring: { project_id: string }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { linkId } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' },
          })
        }

        const link = await service.getTokenLinkById(linkId, project_id)
        
        if (!link) {
          return reply.status(404).send({
            error: { message: 'Token link not found' },
          })
        }

        return reply.send({ data: link })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        })
      }
    }
  )

  /**
   * POST /api/v1/nav/bonds/:bondId/token-links
   * Create a new token link
   */
  fastify.post<{
    Params: GetLinksParams
    Body: CreateLinkBody
  }>(
    '/api/v1/nav/bonds/:bondId/token-links',
    async (
      request: FastifyRequest<{
        Params: GetLinksParams
        Body: CreateLinkBody
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { bondId } = request.params
        const { projectId, tokenId, parityRatio, collateralizationPercentage, effectiveDate, status } = request.body

        if (!projectId) {
          return reply.status(400).send({
            error: { message: 'projectId is required' },
          })
        }

        // Map frontend field names to database columns
        const linkData: CreateBondTokenLinkRequest = {
          bond_id: bondId,
          token_id: tokenId,
          parity: parityRatio,
          ratio: collateralizationPercentage / 100, // Convert percentage to decimal (e.g., 100% -> 1.0)
          ...(effectiveDate && { effective_date: effectiveDate }),
          ...(status && { status }),
        }

        const userId = (request as any).user?.id || 'system'

        const link = await service.createTokenLink(projectId, userId, linkData)
        return reply.status(201).send({ data: link })
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          return reply.status(409).send({
            error: { message: error.message },
          })
        }
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        })
      }
    }
  )

  /**
   * PUT /api/v1/nav/bonds/:bondId/token-links/:linkId
   * Update an existing token link
   */
  fastify.put<{
    Params: GetLinksParams & GetLinkByIdParams
    Body: UpdateLinkBody
  }>(
    '/api/v1/nav/bonds/:bondId/token-links/:linkId',
    async (
      request: FastifyRequest<{
        Params: GetLinksParams & GetLinkByIdParams
        Body: UpdateLinkBody
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { linkId } = request.params
        const { projectId, parityRatio, collateralizationPercentage, effectiveDate, status } = request.body

        if (!projectId) {
          return reply.status(400).send({
            error: { message: 'projectId is required' },
          })
        }

        // Map frontend field names to database columns
        const updateData: UpdateBondTokenLinkRequest = {}
        
        if (parityRatio !== undefined) {
          updateData.parity = parityRatio
        }
        if (collateralizationPercentage !== undefined) {
          updateData.ratio = collateralizationPercentage / 100
        }
        if (effectiveDate !== undefined) {
          updateData.effective_date = effectiveDate
        }
        if (status !== undefined) {
          updateData.status = status
        }

        const userId = (request as any).user?.id || 'system'
        const link = await service.updateTokenLink(linkId, projectId, userId, updateData)
        return reply.send({ data: link })
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        })
      }
    }
  )

  /**
   * DELETE /api/v1/nav/bonds/:bondId/token-links/:linkId
   * Delete a token link
   */
  fastify.delete<{
    Params: GetLinksParams & GetLinkByIdParams
    Querystring: { project_id: string }
  }>(
    '/api/v1/nav/bonds/:bondId/token-links/:linkId',
    async (
      request: FastifyRequest<{
        Params: GetLinksParams & GetLinkByIdParams
        Querystring: { project_id: string }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { linkId } = request.params
        const { project_id } = request.query

        if (!project_id) {
          return reply.status(400).send({
            error: { message: 'project_id is required' },
          })
        }

        await service.deleteTokenLink(linkId, project_id)
        return reply.status(204).send()
      } catch (error) {
        return reply.status(500).send({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        })
      }
    }
  )
}
