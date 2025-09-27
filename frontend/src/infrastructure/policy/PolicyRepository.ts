/**
 * PolicyRepository.ts
 * Database integration for policy management and retrieval
 */

import type { Policy } from '@/services/policy/enhancedPolicyService';
import type { OperationType } from './types';
import { supabase } from '@/infrastructure/database/client';

export interface PolicyFilter {
  operationType?: OperationType;
  chainId?: string;
  tokenStandard?: string;
  status?: 'active' | 'inactive' | 'draft';
  priority?: number;
}

export interface PolicyOperationMapping {
  id: string;
  policyId: string;
  operationType: OperationType;
  chainId?: string;
  tokenStandard?: string;
  conditions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class PolicyRepository {
  /**
   * Get active policies for a specific operation type
   */
  async getActivePolicies(
    operationType: string,
    chainId?: string
  ): Promise<Policy[]> {
    try {
      // Query policy operation mappings with joined policy data
      let query = supabase
        .from('policy_operation_mappings')
        .select(`
          *,
          policy:rules!policy_operation_mappings_policy_id_fkey(*)
        `)
        .eq('operation_type', operationType);

      // Add chain filter if provided
      if (chainId) {
        query = query.or(`chain_id.eq.${chainId},chain_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching active policies:', error);
        return [];
      }

      // Filter for active policies and map to Policy type
      const activePolicies = data?.filter(
        mapping => mapping.policy?.status === 'active'
      ) || [];

      return this.mapToPolicies(activePolicies);
    } catch (error) {
      console.error('PolicyRepository.getActivePolicies error:', error);
      return [];
    }
  }

  /**
   * Get all policies matching filters
   */
  async getPolicies(filters?: PolicyFilter): Promise<Policy[]> {
    try {
      let query = supabase
        .from('policy_operation_mappings')
        .select(`
          *,
          policy:rules!policy_operation_mappings_policy_id_fkey(*)
        `);

      // Apply filters
      if (filters?.operationType) {
        query = query.eq('operation_type', filters.operationType);
      }

      if (filters?.chainId) {
        query = query.or(`chain_id.eq.${filters.chainId},chain_id.is.null`);
      }

      if (filters?.tokenStandard) {
        query = query.eq('token_standard', filters.tokenStandard);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching policies:', error);
        return [];
      }

      // Apply status filter on the policy data
      let filteredData = data || [];
      if (filters?.status) {
        filteredData = filteredData.filter(
          mapping => mapping.policy?.status === filters.status
        );
      }

      if (filters?.priority !== undefined) {
        filteredData = filteredData.filter(
          mapping => mapping.policy?.priority === filters.priority
        );
      }

      return this.mapToPolicies(filteredData);
    } catch (error) {
      console.error('PolicyRepository.getPolicies error:', error);
      return [];
    }
  }

  /**
   * Get a single policy by ID
   */
  async getPolicy(policyId: string): Promise<Policy | null> {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('rule_id', policyId)
        .single();

      if (error) {
        console.error('Error fetching policy:', error);
        return null;
      }

      return this.mapToPolicy(data);
    } catch (error) {
      console.error('PolicyRepository.getPolicy error:', error);
      return null;
    }
  }

  /**
   * Create a new policy operation mapping
   */
  async createPolicyMapping(
    mapping: Omit<PolicyOperationMapping, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PolicyOperationMapping | null> {
    try {
      const { data, error } = await supabase
        .from('policy_operation_mappings')
        .insert({
          policy_id: mapping.policyId,
          operation_type: mapping.operationType,
          chain_id: mapping.chainId,
          token_standard: mapping.tokenStandard,
          conditions: mapping.conditions
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating policy mapping:', error);
        return null;
      }

      return this.mapToPolicyMapping(data);
    } catch (error) {
      console.error('PolicyRepository.createPolicyMapping error:', error);
      return null;
    }
  }

  /**
   * Update a policy operation mapping
   */
  async updatePolicyMapping(
    id: string,
    updates: Partial<Omit<PolicyOperationMapping, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('policy_operation_mappings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating policy mapping:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('PolicyRepository.updatePolicyMapping error:', error);
      return false;
    }
  }

  /**
   * Delete a policy operation mapping
   */
  async deletePolicyMapping(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('policy_operation_mappings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting policy mapping:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('PolicyRepository.deletePolicyMapping error:', error);
      return false;
    }
  }

  /**
   * Get policies by token address
   */
  async getPoliciesByToken(
    tokenAddress: string,
    operationType?: OperationType
  ): Promise<Policy[]> {
    try {
      let query = supabase
        .from('policy_operation_mappings')
        .select(`
          *,
          policy:rules!policy_operation_mappings_policy_id_fkey(*)
        `)
        .eq('conditions->tokenAddress', tokenAddress);

      if (operationType) {
        query = query.eq('operation_type', operationType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching policies by token:', error);
        return [];
      }

      return this.mapToPolicies(data || []);
    } catch (error) {
      console.error('PolicyRepository.getPoliciesByToken error:', error);
      return [];
    }
  }

  /**
   * Map database records to Policy type
   */
  private mapToPolicies(data: any[]): Policy[] {
    return data
      .filter(item => item.policy)
      .map(item => this.mapToPolicy(item.policy));
  }

  /**
   * Map single database record to Policy type
   */
  private mapToPolicy(data: any): Policy {
    return {
      id: data.rule_id,
      name: data.rule_name || data.name,
      description: data.description,
      type: data.rule_type || data.type || 'policy',
      status: data.status || 'active',
      createdBy: data.created_by,
      createdAt: data.created_at,
      modifiedAt: data.updated_at,
      rules: [], // Rules are loaded separately
      isTemplate: data.is_template || false
    };
  }

  /**
   * Map database record to PolicyOperationMapping type
   */
  private mapToPolicyMapping(data: any): PolicyOperationMapping {
    return {
      id: data.id,
      policyId: data.policy_id,
      operationType: data.operation_type,
      chainId: data.chain_id,
      tokenStandard: data.token_standard,
      conditions: data.conditions,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Check if a specific policy applies to an operation
   */
  async policyAppliesTo(
    policyId: string,
    operationType: OperationType,
    chainId?: string,
    tokenAddress?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('policy_operation_mappings')
        .select('id')
        .eq('policy_id', policyId)
        .eq('operation_type', operationType);

      if (chainId) {
        query = query.or(`chain_id.eq.${chainId},chain_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking policy application:', error);
        return false;
      }

      // Check if any mapping exists
      if (!data || data.length === 0) {
        return false;
      }

      // If token address is provided, check conditions
      if (tokenAddress) {
        const mapping = data[0];
        const { data: fullMapping } = await supabase
          .from('policy_operation_mappings')
          .select('conditions')
          .eq('id', mapping.id)
          .single();

        if (fullMapping?.conditions?.tokenAddresses) {
          return fullMapping.conditions.tokenAddresses.includes(tokenAddress);
        }
      }

      return true;
    } catch (error) {
      console.error('PolicyRepository.policyAppliesTo error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const policyRepository = new PolicyRepository();
