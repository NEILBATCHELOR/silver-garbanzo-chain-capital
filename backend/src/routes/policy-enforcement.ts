/**
 * Policy Enforcement API Routes
 * Handles policy validation and enforcement for token operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseClient } from '../infrastructure/database/supabase';

// Request body types
interface ValidateOperationRequest {
  operation_type: string;
  token_address: string;
  from_address: string;
  to_address?: string;
  amount?: string;
  chain_id: number;
  metadata?: Record<string, any>;
}

interface PolicyViolation {
  policyId: string;
  policyName: string;
  violation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PolicyWarning {
  policyId: string;
  policyName: string;
  warning: string;
}

interface ValidationResponse {
  success: boolean;
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  policiesEvaluated: number;
  timestamp: string;
  error?: string;
}

interface PoliciesResponse {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
}

/**
 * Register policy enforcement routes
 */
export default async function policyEnforcementRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/v1/policy-enforcement/validate-operation
   * Validate an operation against all applicable policies
   */
  fastify.post<{ Body: ValidateOperationRequest }>(
    '/validate-operation',
    async (request: FastifyRequest<{ Body: ValidateOperationRequest }>, reply: FastifyReply) => {
      try {
        const {
          operation_type,
          token_address,
          from_address,
          to_address,
          amount,
          chain_id,
          metadata
        } = request.body;

        fastify.log.info({ operation_type, from_address, amount }, 'Validating operation');

        // Get Supabase client (throws if not configured)
        const supabase = getSupabaseClient();

        // Get applicable policy mappings
        const { data: mappings, error: mappingsError } = await supabase
          .from('policy_operation_mappings')
          .select(`
            *,
            policy:rules!policy_operation_mappings_policy_id_fkey(*)
          `)
          .eq('operation_type', operation_type)
          .or(`chain_id.eq.${chain_id},chain_id.is.null`);

        if (mappingsError) {
          fastify.log.error({ error: mappingsError }, 'Failed to fetch policy mappings');
          return reply.code(500).send({
            success: false,
            allowed: false,
            violations: [],
            warnings: [],
            policiesEvaluated: 0,
            timestamp: new Date().toISOString(),
            error: 'Failed to fetch policies'
          } as ValidationResponse);
        }

        // Filter to active policies only
        const activeMappings = (mappings || []).filter(
          (m: any) => m.policy && m.policy.status === 'active'
        );

        // No policies = allowed (unless strict mode)
        if (activeMappings.length === 0) {
          return reply.send({
            success: true,
            allowed: true,
            violations: [],
            warnings: [],
            policiesEvaluated: 0,
            timestamp: new Date().toISOString()
          } as ValidationResponse);
        }

        // Evaluate each policy
        const violations: PolicyViolation[] = [];
        const warnings: PolicyWarning[] = [];

        for (const mapping of activeMappings) {
          const policy = mapping.policy;
          const conditions = mapping.conditions || {};

          // Check amount limits
          if (amount && conditions.maxAmount) {
            try {
              const amountBigInt = BigInt(amount);
              const maxAmountBigInt = BigInt(conditions.maxAmount);

              if (amountBigInt > maxAmountBigInt) {
                violations.push({
                  policyId: policy.rule_id,
                  policyName: policy.rule_name,
                  violation: `Amount ${amount} exceeds maximum ${conditions.maxAmount}`,
                  severity: 'high'
                });
              }
            } catch (error) {
              fastify.log.error({ error }, 'Error comparing amounts');
            }
          }

          if (amount && conditions.minAmount) {
            try {
              const amountBigInt = BigInt(amount);
              const minAmountBigInt = BigInt(conditions.minAmount);

              if (amountBigInt < minAmountBigInt) {
                violations.push({
                  policyId: policy.rule_id,
                  policyName: policy.rule_name,
                  violation: `Amount ${amount} is below minimum ${conditions.minAmount}`,
                  severity: 'medium'
                });
              }
            } catch (error) {
              fastify.log.error({ error }, 'Error comparing amounts');
            }
          }

          // Check time-based conditions
          const now = Date.now();

          if (conditions.effectiveFrom) {
            const effectiveFrom = new Date(conditions.effectiveFrom).getTime();
            if (now < effectiveFrom) {
              violations.push({
                policyId: policy.rule_id,
                policyName: policy.rule_name,
                violation: `Policy not yet effective until ${conditions.effectiveFrom}`,
                severity: 'high'
              });
            }
          }

          if (conditions.effectiveTo) {
            const effectiveTo = new Date(conditions.effectiveTo).getTime();
            if (now > effectiveTo) {
              warnings.push({
                policyId: policy.rule_id,
                policyName: policy.rule_name,
                warning: `Policy expired on ${conditions.effectiveTo}`
              });
            }
          }

          // Check token standard if specified
          if (conditions.tokenStandard && metadata?.standard) {
            if (conditions.tokenStandard !== metadata.standard) {
              violations.push({
                policyId: policy.rule_id,
                policyName: policy.rule_name,
                violation: `Token standard ${metadata.standard} does not match required ${conditions.tokenStandard}`,
                severity: 'high'
              });
            }
          }
        }

        // Log validation to database
        try {
          await supabase
            .from('operation_validations')
            .insert({
              operation_type,
              token_address,
              from_address,
              to_address: to_address || null,
              amount: amount || '0',
              chain_id,
              result: violations.length === 0 ? 'approved' : 'rejected',
              policies_evaluated: activeMappings.map((m: any) => m.policy_id),
              violations: violations.length > 0 ? violations : null,
              warnings: warnings.length > 0 ? warnings : null,
              metadata,
              created_at: new Date().toISOString()
            });
        } catch (logError) {
          fastify.log.error({ error: logError }, 'Failed to log validation');
          // Don't fail the validation due to logging error
        }

        const response: ValidationResponse = {
          success: true,
          allowed: violations.length === 0,
          violations,
          warnings,
          policiesEvaluated: activeMappings.length,
          timestamp: new Date().toISOString()
        };

        return reply.send(response);

      } catch (error: any) {
        fastify.log.error({ error }, 'Policy validation error');
        return reply.code(500).send({
          success: false,
          allowed: false,
          violations: [],
          warnings: [],
          policiesEvaluated: 0,
          timestamp: new Date().toISOString(),
          error: error.message
        } as ValidationResponse);
      }
    }
  );

  /**
   * GET /api/v1/policy-enforcement/policies/:operation_type
   * Get all policies for a specific operation type
   */
  fastify.get<{ Params: { operation_type: string }; Querystring: { chain_id?: string } }>(
    '/policies/:operation_type',
    async (request: FastifyRequest<{ Params: { operation_type: string }; Querystring: { chain_id?: string } }>, reply: FastifyReply) => {
      try {
        const { operation_type } = request.params;
        const { chain_id } = request.query;

        fastify.log.info({ operation_type, chain_id }, 'Fetching policies');

        // Get Supabase client (throws if not configured)
        const supabase = getSupabaseClient();

        let query = supabase
          .from('policy_operation_mappings')
          .select(`
            *,
            policy:rules!policy_operation_mappings_policy_id_fkey(*)
          `)
          .eq('operation_type', operation_type);

        if (chain_id) {
          query = query.or(`chain_id.eq.${chain_id},chain_id.is.null`);
        }

        const { data: mappings, error } = await query;

        if (error) {
          fastify.log.error({ error }, 'Failed to fetch policies');
          return reply.code(500).send({
            success: false,
            error: error.message
          } as PoliciesResponse);
        }

        // Filter to active policies
        const policies = (mappings || [])
          .filter((m: any) => m.policy && m.policy.status === 'active')
          .map((m: any) => ({
            ...m.policy,
            conditions: m.conditions
          }));

        const response: PoliciesResponse = {
          success: true,
          data: policies,
          count: policies.length
        };

        return reply.send(response);

      } catch (error: any) {
        fastify.log.error({ error }, 'Error fetching policies');
        return reply.code(500).send({
          success: false,
          error: error.message
        } as PoliciesResponse);
      }
    }
  );

  /**
   * GET /api/v1/policy-enforcement/policies
   * Get all active policy mappings
   */
  fastify.get(
    '/policies',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        fastify.log.info('Fetching all active policies');

        // Get Supabase client (throws if not configured)
        const supabase = getSupabaseClient();

        const { data: mappings, error } = await supabase
          .from('policy_operation_mappings')
          .select(`
            *,
            policy:rules!policy_operation_mappings_policy_id_fkey(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          fastify.log.error({ error }, 'Failed to fetch all policies');
          return reply.code(500).send({
            success: false,
            error: error.message
          } as PoliciesResponse);
        }

        const policies = (mappings || [])
          .filter((m: any) => m.policy && m.policy.status === 'active')
          .map((m: any) => ({
            ...m.policy,
            operation_type: m.operation_type,
            conditions: m.conditions,
            chain_id: m.chain_id
          }));

        const response: PoliciesResponse = {
          success: true,
          data: policies,
          count: policies.length
        };

        return reply.send(response);

      } catch (error: any) {
        fastify.log.error({ error }, 'Error fetching all policies');
        return reply.code(500).send({
          success: false,
          error: error.message
        } as PoliciesResponse);
      }
    }
  );

  fastify.log.info('Policy enforcement routes registered');
}
