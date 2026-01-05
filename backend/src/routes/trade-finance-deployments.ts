/**
 * Trade Finance Deployment Routes
 * 
 * API endpoints for recording and querying contract deployments
 */

import { FastifyInstance } from 'fastify';
import { DeploymentRecordingService } from '../services/trade-finance/DeploymentRecordingService';

export async function tradeFinanceDeploymentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/trade-finance/deployments
   * Record a new contract deployment
   */
  fastify.post('/api/trade-finance/deployments', async (request, reply) => {
    const body = request.body as any;

    // Build complete deployment record with defaults
    const result = await DeploymentRecordingService.recordDeployment({
      network: body.network,
      environment: body.environment,
      contract_type: body.contract_type,
      contract_address: body.contract_address,
      proxy_address: body.proxy_address || null,
      implementation_address: body.implementation_address || null,
      version: body.version,
      abi: body.abi || [],
      abi_hash: body.abi_hash || '',
      deployed_by: body.deployed_by || 'unknown',
      deployment_tx_hash: body.deployment_tx_hash || '',
      deployed_at: body.deployed_at ? new Date(body.deployed_at) : new Date(),
      initial_owner: body.initial_owner || body.deployed_by || 'unknown',
      verification_status: body.verification_status,
      verification_url: body.verification_url,
      is_template: body.is_template,
      initialization_params: body.initialization_params || {},
      deployment_data: {
        compiler_version: body.deployment_data?.compiler_version || '0.8.20',
        optimization: body.deployment_data?.optimization ?? true,
        runs: body.deployment_data?.runs || 200,
        chain_id: body.deployment_data?.chain_id || 17000,
        deployment_block: body.deployment_data?.deployment_block,
        deployment_script: body.deployment_data?.deployment_script,
        deployment_timestamp: body.deployment_data?.deployment_timestamp || new Date().toISOString(),
      },
      contract_details: {
        features: body.contract_details?.features || [],
        upgrade_pattern: body.contract_details?.upgrade_pattern,
        category: body.contract_details?.category || 'infrastructure',
      },
      upgrade_history: body.upgrade_history,
    });

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
      data: result.data,
    });
  });

  /**
   * POST /api/trade-finance/deployments/upgradeable
   * Record a UUPS upgradeable contract deployment
   */
  fastify.post('/api/trade-finance/deployments/upgradeable', async (request, reply) => {
    const body = request.body as any;

    const result = await DeploymentRecordingService.recordUpgradeableDeployment({
      network: body.network,
      environment: body.environment,
      contract_type: body.contract_type,
      proxy_address: body.proxy_address,
      implementation_address: body.implementation_address,
      version: body.version,
      abi: body.abi,
      deployed_by: body.deployed_by,
      deployment_tx_hash: body.deployment_tx_hash,
      initialization_params: body.initialization_params,
      category: body.category,
    });

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
      data: result.data,
    });
  });

  /**
   * POST /api/trade-finance/deployments/upgrade
   * Record a contract upgrade
   */
  fastify.post('/api/trade-finance/deployments/upgrade', async (request, reply) => {
    const body = request.body as any;

    const result = await DeploymentRecordingService.recordUpgrade({
      proxy_address: body.proxy_address,
      network: body.network,
      environment: body.environment,
      new_implementation: body.new_implementation,
      new_version: body.new_version,
      upgraded_by: body.upgraded_by,
      reason: body.reason,
      tx_hash: body.tx_hash,
    });

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
    });
  });

  /**
   * PUT /api/trade-finance/deployments/verification
   * Update contract verification status
   */
  fastify.put('/api/trade-finance/deployments/verification', async (request, reply) => {
    const body = request.body as any;

    const result = await DeploymentRecordingService.updateVerificationStatus({
      contract_address: body.contract_address,
      network: body.network,
      environment: body.environment,
      verification_status: body.verification_status,
      verification_url: body.verification_url,
    });

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
    });
  });

  /**
   * POST /api/trade-finance/deployments/batch
   * Record multiple deployments at once
   */
  fastify.post('/api/trade-finance/deployments/batch', async (request, reply) => {
    const body = request.body as any;

    const result = await DeploymentRecordingService.recordBatchDeployments(
      body.deployments
    );

    return reply.send({
      success: result.success,
      results: result.results,
    });
  });

  /**
   * GET /api/trade-finance/deployments/:contractType
   * Get deployment by contract type
   */
  fastify.get<{
    Params: { contractType: string };
    Querystring: { network?: string; environment?: string };
  }>('/api/trade-finance/deployments/:contractType', async (request, reply) => {
    const { contractType } = request.params;
    const { network = 'hoodi', environment = 'testnet' } = request.query;

    const result = await DeploymentRecordingService.getDeployment(
      contractType,
      network,
      environment
    );

    if (!result.success) {
      return reply.code(404).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
      data: result.data,
    });
  });

  /**
   * GET /api/trade-finance/deployments/category/:category
   * Get all deployments for a category
   */
  fastify.get<{
    Params: { category: string };
    Querystring: { network?: string; environment?: string };
  }>('/api/trade-finance/deployments/category/:category', async (request, reply) => {
    const { category } = request.params;
    const { network = 'hoodi', environment = 'testnet' } = request.query;

    const result = await DeploymentRecordingService.getDeploymentsByCategory(
      category,
      network,
      environment
    );

    if (!result.success) {
      return reply.code(500).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
      data: result.data,
    });
  });

  /**
   * DELETE /api/trade-finance/deployments/deactivate
   * Deactivate a contract deployment
   */
  fastify.delete('/api/trade-finance/deployments/deactivate', async (request, reply) => {
    const body = request.body as any;

    const result = await DeploymentRecordingService.deactivateContract(
      body.contract_address,
      body.network,
      body.environment,
      body.reason
    );

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: result.error,
      });
    }

    return reply.send({
      success: true,
    });
  });
}
