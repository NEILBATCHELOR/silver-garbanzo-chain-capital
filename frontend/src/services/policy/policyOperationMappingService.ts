import { supabase } from '@/infrastructure/database/client';

/**
 * Interface for Policy Operation Mapping
 * Maps policies to specific operation types with conditions
 */
export interface PolicyOperationMapping {
  id?: string;
  policy_id: string;
  operation_type: string;
  chain_id?: string | null;
  token_standard?: string | null;
  conditions?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new policy operation mapping
 * Links a policy to specific operations with optional conditions
 */
export async function createPolicyOperationMapping(
  mapping: Omit<PolicyOperationMapping, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: PolicyOperationMapping; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('policy_operation_mappings')
      .insert({
        policy_id: mapping.policy_id,
        operation_type: mapping.operation_type,
        chain_id: mapping.chain_id || null,
        token_standard: mapping.token_standard || null,
        conditions: mapping.conditions || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create policy operation mapping:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Exception creating policy operation mapping:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all operation mappings for a specific policy
 * Used when policy is deleted or needs to be remapped
 */
export async function deletePolicyOperationMappings(
  policyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('policy_operation_mappings')
      .delete()
      .eq('policy_id', policyId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update operation mappings for a policy
 * Deletes existing mappings and creates new ones
 */
export async function updatePolicyOperationMappings(
  policyId: string,
  operations: string[],
  conditions?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing mappings
    const deleteResult = await deletePolicyOperationMappings(policyId);
    if (!deleteResult.success) {
      return deleteResult;
    }
    
    // Create new mappings for each operation
    const mappings = operations.map(op => ({
      policy_id: policyId,
      operation_type: op,
      chain_id: null,
      token_standard: null,
      conditions: conditions || null,
    }));
    
    const { error } = await supabase
      .from('policy_operation_mappings')
      .insert(mappings);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all operation mappings for a specific policy
 */
export async function getPolicyOperationMappings(
  policyId: string
): Promise<{ success: boolean; data?: PolicyOperationMapping[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('policy_operation_mappings')
      .select('*')
      .eq('policy_id', policyId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all mappings for a specific operation type
 */
export async function getOperationMappings(
  operationType: string,
  chainId?: string
): Promise<{ success: boolean; data?: PolicyOperationMapping[]; error?: string }> {
  try {
    let query = supabase
      .from('policy_operation_mappings')
      .select('*')
      .eq('operation_type', operationType);
    
    if (chainId) {
      query = query.or(`chain_id.eq.${chainId},chain_id.is.null`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
