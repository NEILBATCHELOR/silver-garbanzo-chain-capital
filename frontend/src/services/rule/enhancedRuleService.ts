import { supabase } from '@/infrastructure/database/client';
import { universalDatabaseService } from '@/services/database/UniversalDatabaseService';
import type { RuleTable, RuleInsert, RuleUpdate } from '@/types/core/database';
import type { Json } from '@/types/core/supabase';
import { ensureUUID, isValidUUID, generateUUID } from '@/utils/shared/formatting/uuidUtils';
import type { Policy } from '@/types/domain/policy/policy';
import { AuditLogService, AuditEventType } from '../audit/auditLogService';

// Types for frontend rule representation
export interface PolicyRule {
  id?: string;
  name: string;
  type: string;
  description?: string;
  conditions?: any[];
  actions?: any[];
  priority?: 'high' | 'medium' | 'low';
  critical?: boolean; // Added for rule evaluation pipeline
  isActive?: boolean;
  isTemplate?: boolean;
  policyId?: string;
  policyName?: string;
  policyType?: string;
  createdBy?: string;
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * Validate a rule object
 * @param rule Rule to validate
 * @returns True if valid
 */
export function validateRule(rule: PolicyRule): boolean {
  // Basic validation
  if (!rule.name || !rule.type) {
    console.error('Rule validation failed: Missing name or type');
    return false;
  }
  
  return true;
}

/**
 * Convert a frontend rule to database format
 * @param rule Frontend rule
 * @param userId User ID creating/updating the rule
 * @returns Database rule
 */
export function convertFrontendRuleToDatabase(rule: PolicyRule, userId: string): RuleInsert {
  return {
    rule_id: ensureUUID(rule.id),
    rule_name: rule.name,
    rule_type: rule.type,
    rule_details: {
      ...rule,
      id: ensureUUID(rule.id),
    } as unknown as Json,
    created_by: userId,
    status: rule.isActive === false ? 'inactive' : 'active',
    is_template: !!rule.isTemplate
  };
}

/**
 * Convert a database rule to frontend format
 * @param dbRule Database rule
 * @returns Frontend rule
 */
export function convertDatabaseRuleToFrontend(dbRule: RuleTable): PolicyRule {
  const details = dbRule.rule_details as any;
  
  return {
    ...details, // Spread all properties from rule_details first
    id: dbRule.rule_id, // Then override with standard fields
    name: dbRule.rule_name,
    type: dbRule.rule_type,
    isActive: dbRule.status === 'active',
    isTemplate: dbRule.is_template,
    createdBy: dbRule.created_by,
    createdAt: dbRule.created_at,
    modifiedAt: dbRule.updated_at
  };
}

/**
 * Create a new rule template with audit logging
 * @param rule The rule to save as a template
 * @param userId User ID of the creator
 * @returns The created template
 */
export async function createRuleTemplate(rule: PolicyRule, userId: string): Promise<PolicyRule> {
  try {
    // Validate the rule
    if (!validateRule(rule)) {
      throw new Error(`Invalid rule template: ${rule.type}`);
    }
    
    // Convert to database format and mark as template
    const ruleData: Omit<RuleTable, 'rule_id' | 'created_at' | 'updated_at'> = {
      rule_name: rule.name,
      rule_type: rule.type,
      rule_details: {
        ...rule,
        isTemplate: true,
      } as unknown as Json,
      created_by: userId,
      status: rule.isActive === false ? 'inactive' : 'active',
      is_template: true
    };
    
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.create<RuleTable>('rules', ruleData, { userId });
    
    return convertDatabaseRuleToFrontend(result);
  } catch (error) {
    console.error('Error creating rule template:', error);
    throw error;
  }
}

/**
 * Get all rule templates (read-only, no audit needed)
 * @returns Array of rule templates
 */
export async function getAllRuleTemplates(): Promise<PolicyRule[]> {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('is_template', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rule templates:', error);
    throw error;
  }
  
  return (data || []).map(convertDatabaseRuleToFrontend);
}

/**
 * Create a new rule with validation and audit logging
 * @param rule The rule to create
 * @param userId User ID of the creator
 * @returns The created rule
 */
export async function createRule(rule: PolicyRule, userId: string): Promise<PolicyRule> {
  try {
    // Validate the rule
    if (!validateRule(rule)) {
      throw new Error(`Invalid rule: ${rule.type}`);
    }
    
    // Convert to database format
    const ruleData: Omit<RuleTable, 'rule_id' | 'created_at' | 'updated_at'> = {
      rule_name: rule.name,
      rule_type: rule.type,
      rule_details: {
        ...rule,
      } as unknown as Json,
      created_by: userId,
      status: rule.isActive === false ? 'inactive' : 'active',
      is_template: !!rule.isTemplate
    };
    
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.create<RuleTable>('rules', ruleData, { userId });
    
    return convertDatabaseRuleToFrontend(result);
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
}

/**
 * Get a rule by ID (read-only, no audit needed)
 * @param ruleId Rule ID
 * @returns The rule or null if not found
 */
export async function getRuleById(ruleId: string): Promise<PolicyRule | null> {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('rule_id', ruleId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`Error fetching rule ${ruleId}:`, error);
    throw error;
  }
  
  return convertDatabaseRuleToFrontend(data);
}

/**
 * Get all rules (read-only, no audit needed)
 * @param includeTemplates Whether to include templates
 * @returns Array of rules
 */
export async function getAllRules(includeTemplates: boolean = false): Promise<PolicyRule[]> {
  let query = supabase.from('rules').select('*');
  
  if (!includeTemplates) {
    query = query.eq('is_template', false);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }
  
  return (data || []).map(convertDatabaseRuleToFrontend);
}

/**
 * Get rules by policy ID (read-only, no audit needed)
 * @param policyId Policy ID
 * @returns Array of rules
 */
export async function getRulesByPolicyId(policyId: string): Promise<PolicyRule[]> {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('is_template', false);
  
  if (error) {
    console.error(`Error fetching rules for policy ${policyId}:`, error);
    throw error;
  }
  
  // Filter out rules that don't belong to this policy
  // (We need to check in the rule_details.policyId field)
  const policyRules = (data || [])
    .map(convertDatabaseRuleToFrontend)
    .filter(rule => rule.policyId === policyId);
  
  return policyRules;
}

/**
 * Update a rule with audit logging
 * @param ruleId Rule ID
 * @param rule Updated rule data
 * @param userId User ID of the updater
 * @returns Updated rule
 */
export async function updateRule(
  ruleId: string, 
  rule: Partial<PolicyRule>, 
  userId: string
): Promise<PolicyRule> {
  try {
    // Get existing rule first
    const existingRule = await getRuleById(ruleId);
    if (!existingRule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    // Merge updates with existing rule
    const updatedRule: PolicyRule = {
      ...existingRule,
      ...rule,
      id: ruleId // Ensure ID is preserved
    };
    
    // Validate the updated rule
    if (!validateRule(updatedRule)) {
      throw new Error(`Invalid rule after update: ${updatedRule.type}`);
    }
    
    // Convert to database update format
    const updateData = {
      rule_name: updatedRule.name,
      rule_type: updatedRule.type,
      rule_details: updatedRule as unknown as Json,
      status: updatedRule.isActive === false ? 'inactive' : 'active',
      is_template: !!updatedRule.isTemplate
    };
    
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update<RuleTable>('rules', ruleId, updateData, { userId });
    
    return convertDatabaseRuleToFrontend(result);
  } catch (error) {
    console.error(`Error updating rule ${ruleId}:`, error);
    throw error;
  }
}

/**
 * Delete a rule with audit logging
 * @param ruleId Rule ID
 * @param userId User ID for attribution
 * @returns Success status
 */
export async function deleteRule(ruleId: string, userId?: string): Promise<boolean> {
  try {
    // Use Universal Database Service for automatic audit logging
    await universalDatabaseService.delete('rules', ruleId, { userId });
    
    return true;
  } catch (error) {
    console.error(`Error deleting rule ${ruleId}:`, error);
    throw error;
  }
}

/**
 * Batch create or update multiple rules with audit logging
 * @param rules Array of rules to save
 * @param userId User ID of the creator/updater
 * @param policyId Optional policy ID to associate with the rules
 * @returns Array of saved rules
 */
export async function batchSaveRules(
  rules: PolicyRule[], 
  userId: string,
  policyId?: string
): Promise<PolicyRule[]> {
  try {
    // Validate all rules first
    const invalidRules = rules.filter(rule => !validateRule(rule));
    if (invalidRules.length > 0) {
      throw new Error(`Invalid rules in batch: ${invalidRules.map(r => r.type).join(', ')}`);
    }

    // Ensure each rule has a valid ID
    const rulesWithIds = rules.map(rule => ({
      ...rule,
      id: rule.id ? ensureUUID(rule.id) : generateUUID()
    }));
    
    // If a policy ID is provided, associate all rules with it
    const rulesWithPolicy = policyId 
      ? rulesWithIds.map(rule => ({ ...rule, policyId: ensureUUID(policyId) }))
      : rulesWithIds;
    
    // Save rules individually for proper audit logging
    const savedRules: PolicyRule[] = [];
    for (const rule of rulesWithPolicy) {
      const ruleData: Omit<RuleTable, 'rule_id' | 'created_at' | 'updated_at'> = {
        rule_name: rule.name,
        rule_type: rule.type,
        rule_details: {
          ...rule,
          id: rule.id,
          policyId: rule.policyId,
        } as unknown as Json,
        created_by: userId,
        status: rule.isActive === false ? 'inactive' : 'active',
        is_template: !!rule.isTemplate
      };
      
      // Check if rule exists for update vs create
      const existingRule = await getRuleById(rule.id!);
      let result;
      
      if (existingRule) {
        result = await universalDatabaseService.update<RuleTable>('rules', rule.id!, ruleData, { userId });
      } else {
        // For create, let the database auto-generate the rule_id
        result = await universalDatabaseService.create<RuleTable>('rules', ruleData, { userId });
      }
      
      savedRules.push(convertDatabaseRuleToFrontend(result));
    }
    
    return savedRules;
  } catch (error) {
    console.error('Error in batchSaveRules:', error);
    throw error;
  }
}

/**
 * Save rule approvers with proper error handling, validation, and audit logging
 * @param ruleId Rule ID
 * @param approverIds Array of approver user IDs
 * @param userId User ID of the creator
 * @returns Success status
 */
export async function saveRuleApprovers(
  ruleId: string,
  approverIds: string[],
  userId: string
): Promise<boolean> {
  try {
    console.log(`Saving approvers for rule ${ruleId}, count: ${approverIds.length}`);
    
    // Ensure all IDs are valid UUIDs
    const safeRuleId = ensureUUID(ruleId);
    const safeUserId = ensureUUID(userId);
    
    // Verify rule exists first
    console.log(`Verifying rule ${safeRuleId} exists before adding approvers...`);
    const { data: ruleExists, error: ruleCheckError } = await supabase
      .from('rules')
      .select('rule_id')
      .eq('rule_id', safeRuleId)
      .single();
    
    if (ruleCheckError || !ruleExists) {
      console.error(`Rule ${safeRuleId} not found:`, ruleCheckError);
      throw new Error(`Rule ${safeRuleId} must exist before adding approvers`);
    }
    console.log(`Rule ${safeRuleId} exists, proceeding with approver operations`);

    // Delete existing approvers first with audit logging
    console.log(`Deleting existing approvers for rule ${safeRuleId}...`);
    const { data: existingApprovers, error: existingError } = await supabase
      .from('policy_rule_approvers')
      .select('id')
      .eq('policy_rule_id', safeRuleId);
      
    if (!existingError && existingApprovers) {
      for (const approver of existingApprovers) {
        await universalDatabaseService.delete('policy_rule_approvers', approver.id, { userId: safeUserId });
      }
    }
    
    // Skip if no approvers to add
    if (!approverIds || approverIds.length === 0) {
      console.log(`No approvers to add for rule ${safeRuleId}, operation complete`);
      return true;
    }
    
    // Convert all approver IDs to valid UUIDs
    const safeApproverIds = approverIds.map(id => {
      try {
        return ensureUUID(id);
      } catch (error) {
        console.error(`Invalid approver ID: ${id}`, error);
        throw new Error(`Invalid approver ID: ${id}`);
      }
    });
    
    // Insert new approvers with audit logging
    console.log(`Inserting ${safeApproverIds.length} approvers for rule ${safeRuleId}...`);
    for (const approverId of safeApproverIds) {
      const approverData = {
        policy_rule_id: safeRuleId,
        user_id: approverId,
        created_by: safeUserId,
        status: 'pending'
      };
      
      await universalDatabaseService.create('policy_rule_approvers', approverData, { userId: safeUserId });
    }
    
    console.log(`Successfully saved ${safeApproverIds.length} approvers for rule ${safeRuleId}`);
    return true;
  } catch (error) {
    console.error(`Error in saveRuleApprovers:`, error);
    throw error;
  }
}

/**
 * Get rule approvers (read-only, no audit needed)
 * @param ruleId Rule ID
 * @returns Array of approver user IDs
 */
export async function getRuleApprovers(ruleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('policy_rule_approvers')
    .select('user_id')
    .eq('policy_rule_id', ruleId);
  
  if (error) {
    console.error(`Error fetching approvers for rule ${ruleId}:`, error);
    throw error;
  }
  
  return (data || []).map(approver => approver.user_id);
}

// Add utility functions for retrying operations
async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw lastError;
}

async function verifyRuleExists(ruleId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('rules')
    .select('rule_id')
    .eq('rule_id', ruleId)
    .single();
  
  if (error || !data) {
    return false;
  }
  return true;
}

async function saveRuleWithVerification(
  rule: PolicyRule,
  userId: string,
  policyId?: string
): Promise<PolicyRule> {
  const ruleId = rule.id ? ensureUUID(rule.id) : generateUUID();
  const ruleData = {
    rule_name: rule.name || 'Unnamed Rule',
    rule_type: rule.type,
    rule_details: {
      ...rule,
      id: ruleId,
      policyId: policyId,
    } as unknown as Json,
    created_by: userId,
    status: rule.isActive === false ? 'inactive' : 'active',
    is_template: !!rule.isTemplate
  };

  // Check if rule exists for update vs create
  const existingRule = await getRuleById(ruleId);
  let result;
  
  if (existingRule) {
    result = await universalDatabaseService.update('rules', ruleId, ruleData, { userId });
  } else {
    result = await universalDatabaseService.create('rules', { ...ruleData, rule_id: ruleId }, { userId });
  }

  // Verify the rule exists
  const exists = await verifyRuleExists(ruleId);
  if (!exists) {
    throw new Error(`Rule ${ruleId} was not saved properly`);
  }

  return convertDatabaseRuleToFrontend(result);
}

async function saveApproversWithRetry(
  ruleId: string,
  approverIds: string[],
  userId: string
): Promise<boolean> {
  try {
    console.log(`saveApproversWithRetry: Starting for rule ${ruleId}, ${approverIds.length} approvers`);
    
    const safeRuleId = ensureUUID(ruleId);
    const safeUserId = ensureUUID(userId);

    // Verify rule exists first
    console.log(`saveApproversWithRetry: Verifying rule ${safeRuleId} exists...`);
    const exists = await verifyRuleExists(safeRuleId);
    if (!exists) {
      console.error(`saveApproversWithRetry: Rule ${safeRuleId} not found`);
      throw new Error(`Rule ${safeRuleId} not found`);
    }
    console.log(`saveApproversWithRetry: Rule ${safeRuleId} verified`);

    // Delete existing approvers with audit logging
    console.log(`saveApproversWithRetry: Deleting existing approvers for rule ${safeRuleId}...`);
    await retry(async () => {
      const { data: existingApprovers, error: fetchError } = await supabase
        .from('policy_rule_approvers')
        .select('id')
        .eq('policy_rule_id', safeRuleId);
        
      if (fetchError) throw fetchError;
      
      if (existingApprovers) {
        for (const approver of existingApprovers) {
          await universalDatabaseService.delete('policy_rule_approvers', approver.id, { userId: safeUserId });
        }
      }
    });
    console.log(`saveApproversWithRetry: Successfully deleted existing approvers`);

    if (!approverIds || approverIds.length === 0) {
      console.log(`saveApproversWithRetry: No approvers to add, operation complete`);
      return true;
    }

    // Prepare safe approver IDs
    const safeApproverIds = approverIds.map(id => {
      try {
        return ensureUUID(id);
      } catch (error) {
        console.error(`saveApproversWithRetry: Invalid approver ID ${id}:`, error);
        throw new Error(`Invalid approver ID: ${id}`);
      }
    });
    
    // Insert new approvers with audit logging
    console.log(`saveApproversWithRetry: Inserting ${safeApproverIds.length} approvers for rule ${safeRuleId}...`);
    await retry(async () => {
      for (const approverId of safeApproverIds) {
        const approverData = {
          policy_rule_id: safeRuleId,
          user_id: approverId,
          created_by: safeUserId,
          status: 'pending'
        };
        
        await universalDatabaseService.create('policy_rule_approvers', approverData, { userId: safeUserId });
      }
    });

    console.log(`saveApproversWithRetry: Successfully saved ${safeApproverIds.length} approvers for rule ${safeRuleId}`);
    return true;
  } catch (error) {
    console.error(`saveApproversWithRetry: Error:`, error);
    throw error;
  }
}

export async function savePolicy(policy: Policy, userId: string): Promise<Policy> {
  try {
    console.log(`Saving policy: ${policy.name} (${policy.id || 'new policy'})`);
    
    const validUserId = ensureUUID(userId);
    const policyId = policy.id ? ensureUUID(policy.id) : generateUUID();
    
    console.log(`Policy ID: ${policyId}, rules to save: ${policy.rules.length}`);

    // Save rules one by one with verification
    const savedRules: PolicyRule[] = [];
    for (const rule of policy.rules) {
      console.log(`Saving rule: ${rule.name} (${rule.id || 'new rule'})`);
      
      try {
        const savedRule = await retry(() => 
          saveRuleWithVerification(
            {
              ...rule,
              policyId,
              policyName: policy.name,
              policyType: policy.type,
              isTemplate: policy.isTemplate,
            },
            validUserId,
            policyId
          )
        );
        savedRules.push(savedRule);
        console.log(`Successfully saved rule: ${savedRule.name} with ID: ${savedRule.id}`);
      } catch (ruleError) {
        console.error(`Failed to save rule ${rule.name}:`, ruleError);
        throw ruleError;
      }
    }

    // Save policy metadata with audit logging
    console.log(`Saving policy metadata for policy ${policyId}...`);
    const policyMetadataData = {
      rule_name: policy.name,
      rule_type: policy.isTemplate ? 'template_metadata' : 'policy_metadata',
      rule_details: {
        ...policy,
        id: policyId,
        rules: savedRules,
      } as unknown as Json,
      created_by: validUserId,
      status: policy.isActive ? 'active' : 'inactive',
      is_template: policy.isTemplate
    };

    try {
      await retry(async () => {
        // Check if policy metadata exists for update vs create
        const existingPolicy = await getRuleById(policyId);
        
        if (existingPolicy) {
          await universalDatabaseService.update('rules', policyId, policyMetadataData, { userId: validUserId });
        } else {
          await universalDatabaseService.create('rules', { ...policyMetadataData, rule_id: policyId }, { userId: validUserId });
        }
      });
      console.log(`Successfully saved policy metadata for ${policyId}`);
    } catch (metadataError) {
      console.error(`Failed to save policy metadata for ${policyId}:`, metadataError);
      throw metadataError;
    }

    // Save approvers for each rule with retry logic
    if (policy.approvers && policy.approvers.length > 0) {
      const approverCount = policy.approvers.length;
      console.log(`Processing ${approverCount} approvers for ${savedRules.length} rules...`);
      
      try {
        const approverIds = policy.approvers.map(approver => ensureUUID(approver.id));
        
        for (const rule of savedRules) {
          if (!rule.id) {
            console.warn(`Rule has no ID, skipping approver assignment`);
            continue;
          }
          
          console.log(`Saving approvers for rule ${rule.id}...`);
          await saveApproversWithRetry(rule.id, approverIds, validUserId);
          console.log(`Successfully saved approvers for rule ${rule.id}`);
        }
      } catch (approverError) {
        console.error(`Failed to save rule approvers:`, approverError);
        throw approverError;
      }
    } else {
      console.log(`No approvers to save for this policy`);
    }

    // Create audit log
    console.log(`Creating audit log for policy ${policyId}...`);
    const auditService = new AuditLogService();
    await retry(() =>
      auditService.createLog(
        policy.id ? AuditEventType.POLICY_UPDATED : AuditEventType.POLICY_CREATED,
        validUserId,
        policyId,
        'policy',
        {
          policyName: policy.name,
          policyType: policy.type,
          version: policy.version || 1,
          isTemplate: policy.isTemplate,
        }
      )
    );

    console.log(`Successfully saved policy ${policyId} with ${savedRules.length} rules`);
    return {
      ...policy,
      id: policyId,
      rules: savedRules,
    };
  } catch (error) {
    console.error('Error in savePolicy:', error);
    throw error;
  }
}
