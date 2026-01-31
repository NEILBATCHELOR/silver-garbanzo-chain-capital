/**
 * MPT Monitor API Routes
 * 
 * Control automatic blockchain monitoring for MPT transactions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mptMonitorService } from '../../services/xrpl/mpt-monitor.service';
import { z } from 'zod';

const StartMonitoringSchema = z.object({
  project_id: z.string().uuid(),
  addresses: z.array(z.string().regex(/^r[a-zA-Z0-9]{24,34}$/)),
  issuance_ids: z.array(z.string().regex(/^[A-F0-9]{48}$/i))
});

const StopMonitoringSchema = z.object({
  project_id: z.string().uuid()
});

export default async function mptMonitorRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/xrpl/mpt/monitor/start
   * Start automatic monitoring for a project
   */
  fastify.post('/api/xrpl/mpt/monitor/start', async (
    request: FastifyRequest<{ Body: z.infer<typeof StartMonitoringSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const body = StartMonitoringSchema.parse(request.body);

      await mptMonitorService.startMonitoring(
        body.project_id,
        body.addresses,
        body.issuance_ids
      );

      const status = mptMonitorService.getStatus();

      return reply.code(200).send({
        success: true,
        message: 'Monitoring started',
        project_id: body.project_id,
        status
      });
    } catch (error: any) {
      fastify.log.error('Error starting monitoring:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to start monitoring'
      });
    }
  });

  /**
   * POST /api/xrpl/mpt/monitor/stop
   * Stop automatic monitoring for a project
   */
  fastify.post('/api/xrpl/mpt/monitor/stop', async (
    request: FastifyRequest<{ Body: z.infer<typeof StopMonitoringSchema> }>,
    reply: FastifyReply
  ) => {
    try {
      const body = StopMonitoringSchema.parse(request.body);

      await mptMonitorService.stopMonitoring(body.project_id);

      const status = mptMonitorService.getStatus();

      return reply.code(200).send({
        success: true,
        message: 'Monitoring stopped',
        project_id: body.project_id,
        status
      });
    } catch (error: any) {
      fastify.log.error('Error stopping monitoring:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to stop monitoring'
      });
    }
  });

  /**
   * GET /api/xrpl/mpt/monitor/status
   * Get current monitoring status
   */
  fastify.get('/api/xrpl/mpt/monitor/status', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const status = mptMonitorService.getStatus();

      return reply.code(200).send({
        success: true,
        status
      });
    } catch (error: any) {
      fastify.log.error('Error getting monitor status:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get status'
      });
    }
  });
}
