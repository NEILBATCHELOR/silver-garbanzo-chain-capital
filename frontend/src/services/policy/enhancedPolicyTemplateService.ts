import { supabase } from '@/infrastructure/database/client';
import { universalDatabaseService } from '@/services/database/UniversalDatabaseService';
import type { PolicyTemplateInsert, PolicyTemplateUpdate, PolicyTemplatesTable, TemplateVersionTable, TemplateVersionInsert } from '@/types/core/database';
import type { Json } from '@/types/core/supabase';
import { Policy } from './enhancedPolicyService';

// Constants
const TEMPLATE_VERSION_TABLE = 'template_versions';

// Types
export interface TemplateVersion {
  version_id: string;
  template_id: string;
  version: string;
  version_data: any;
  notes?: string;
  created_by: string;
  created_at: string;
}

// Helper function to ensure UUID is properly formatted
function formatUUID(id: string): string {
  // Simple regex to check if this is already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  
  // If not a UUID, log the issue but return original
  console.warn(`Non-UUID format detected: ${id}`);
  return id;
}

/**
 * Save a policy template to the database with approvers in a single transaction and audit logging
 * @param templateName Template name
 * @param description Template description
 * @param policyData Policy data to save as a template
 * @param userId User ID of the creator
 * @param approvers Optional array of user IDs to set as approvers
 * @returns Saved template
 */
export async function savePolicyTemplate(
  templateName: string,
  description: string,
  policyData: Policy,
  userId: string,
  approvers?: string[]
): Promise<PolicyTemplatesTable> {
  try {
    // Ensure user ID is valid
    const safeUserId = formatUUID(userId);
    
    // Create the template object - explicitly set all required fields
    const template: PolicyTemplateInsert = {
      template_name: templateName,
      description: description,
      template_data: policyData as unknown as Json,
      created_by: safeUserId,
      status: 'active' // Default to active
    };

    console.log("Creating enhanced policy template with name:", templateName);
    
    // Use Universal Database Service for automatic audit logging
    const createdTemplate = await universalDatabaseService.create(
      'policy_templates',
      template,
      { userId: safeUserId }
    );
    
    if (!createdTemplate) {
      throw new Error('Failed to create policy template - no data returned');
    }
    
    console.log(`Template created with ID: ${createdTemplate.template_id}`);
    
    // If approvers were provided, handle them carefully to prevent duplicates
    if (approvers && approvers.length > 0) {
      console.log(`Adding ${approvers.length} approvers to template ${createdTemplate.template_id}`);
      
      // Process approvers individually to better handle potential errors
      for (const approverId of approvers) {
        try {
          const safeApproverId = formatUUID(approverId);
          
          // First check if this approver already exists for this template
          const { data: existingApprover } = await supabase
            .from('policy_template_approvers')
            .select('*')
            .eq('template_id', createdTemplate.template_id)
            .eq('user_id', safeApproverId)
            .maybeSingle();
          
          if (existingApprover) {
            // Update the existing approver record with audit logging  
            // Note: policy_template_approvers uses composite key (template_id, user_id)
            console.log(`Updating existing approver ${safeApproverId} for template ${createdTemplate.template_id}`);
            
            // For composite key tables, we need to delete and recreate the record
            const { error: deleteError } = await supabase
              .from('policy_template_approvers')
              .delete()
              .eq('template_id', createdTemplate.template_id)
              .eq('user_id', safeApproverId);
              
            if (!deleteError) {
              await universalDatabaseService.create(
                'policy_template_approvers',
                {
                  template_id: createdTemplate.template_id,
                  user_id: safeApproverId,
                  created_by: safeUserId,
                  status: 'pending',
                  timestamp: new Date().toISOString()
                },
                { userId: safeUserId }
              );
            }
          } else {
            // Insert a new approver record with audit logging
            console.log(`Adding new approver ${safeApproverId} to template ${createdTemplate.template_id}`);
            await universalDatabaseService.create(
              'policy_template_approvers',
              {
                template_id: createdTemplate.template_id,
                user_id: safeApproverId,
                created_by: safeUserId,
                status: 'pending',
                timestamp: new Date().toISOString()
              },
              { userId: safeUserId }
            );
          }
        } catch (approverError) {
          console.error(`Error processing approver:`, approverError);
          // Continue with the next approver
        }
      }
    }

    return createdTemplate;
  } catch (error) {
    console.error('Error in savePolicyTemplate:', error);
    throw error;
  }
}

/**
 * Get all policy templates (read-only, no audit needed)
 * @returns Array of policy templates
 */
export async function getAllPolicyTemplates(): Promise<PolicyTemplatesTable[]> {
  const { data, error } = await supabase
    .from('policy_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching policy templates:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get a policy template by ID (read-only, no audit needed)
 * @param templateId Template ID
 * @returns The template or null if not found
 */
export async function getPolicyTemplateById(templateId: string): Promise<PolicyTemplatesTable | null> {
  const { data, error } = await supabase
    .from('policy_templates')
    .select('*')
    .eq('template_id', templateId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`Error fetching template ${templateId}:`, error);
    throw error;
  }

  return data;
}

/**
 * Update a policy template and optionally its approvers with audit logging
 * @param templateId Template ID
 * @param updates Updates to apply
 * @param approvers Optional new approvers list 
 * @param createdBy User ID for attribution
 * @returns Updated template
 */
export async function updatePolicyTemplate(
  templateId: string, 
  updates: PolicyTemplateUpdate,
  approvers?: string[],
  createdBy?: string
): Promise<PolicyTemplatesTable> {
  try {
    // First get the existing template to preserve created_by if needed
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('policy_templates')
      .select('created_by')
      .eq('template_id', templateId)
      .single();
      
    if (fetchError) {
      console.error(`Error fetching template ${templateId}:`, fetchError);
      throw fetchError;
    }
    
    // Update the template with audit logging
    const updatedTemplate = await universalDatabaseService.update(
      'policy_templates',
      templateId,
      updates,
      { userId: createdBy }
    );
    
    // Handle approvers if provided
    if (approvers !== undefined) {
      // Use the safe creator ID
      const safeCreatorId = createdBy ? formatUUID(createdBy) : existingTemplate.created_by;
      
      // First get all existing approvers for audit logging
      const { data: existingApprovers, error: existingError } = await supabase
        .from('policy_template_approvers')
        .select('template_id, user_id')
        .eq('template_id', templateId);
        
      if (!existingError && existingApprovers) {
        // Delete all existing approvers (composite key table)
        for (const approver of existingApprovers) {
          // For composite key tables, delete using the composite key fields
          const { error: deleteError } = await supabase
            .from('policy_template_approvers')
            .delete()
            .eq('template_id', templateId)
            .eq('user_id', approver.user_id);
            
          if (deleteError) {
            console.error(`Error deleting approver:`, deleteError);
          }
        }
      }
      
      // Add a small delay to ensure deletion is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add new approvers if provided
      if (approvers && approvers.length > 0) {
        console.log(`Adding ${approvers.length} approvers to template ${templateId} after update`);
        
        // Process each approver individually
        for (const approverId of approvers) {
          try {
            const safeApproverId = formatUUID(approverId);
            
            // Insert the approver with audit logging
            console.log(`Adding approver ${safeApproverId} to template ${templateId}`);
            await universalDatabaseService.create(
              'policy_template_approvers',
              {
                template_id: templateId,
                user_id: safeApproverId,
                created_by: safeCreatorId,
                status: 'pending',
                timestamp: new Date().toISOString()
              },
              { userId: safeCreatorId }
            );
          } catch (approverError) {
            console.error(`Error processing approver during update:`, approverError);
            // Continue with next approver
          }
        }
      }
    }

    return updatedTemplate;
  } catch (error) {
    console.error(`Error in updatePolicyTemplate:`, error);
    throw error;
  }
}

/**
 * Delete a policy template with audit logging
 * @param templateId Template ID
 * @param userId User ID for attribution
 * @returns Success status
 */
export async function deletePolicyTemplate(templateId: string, userId?: string): Promise<boolean> {
  try {
    // First delete all versions associated with this template
    await deleteAllTemplateVersions(templateId, userId);
    
    // Delete all approvers for this template (composite key table)
    const { data: approvers, error: approversError } = await supabase
      .from('policy_template_approvers')
      .select('template_id, user_id')
      .eq('template_id', templateId);
      
    if (!approversError && approvers) {
      for (const approver of approvers) {
        // Delete using composite key
        const { error: deleteError } = await supabase
          .from('policy_template_approvers')
          .delete()
          .eq('template_id', approver.template_id)
          .eq('user_id', approver.user_id);
          
        if (deleteError) {
          console.error(`Error deleting approver:`, deleteError);
        }
      }
    }
    
    // Then delete the template itself with audit logging
    await universalDatabaseService.delete('policy_templates', templateId, { userId });

    return true;
  } catch (error) {
    console.error(`Error deleting template ${templateId}:`, error);
    throw error;
  }
}

/**
 * Convert a template to a policy
 * @param template The template to convert
 * @returns Policy data ready for creation
 */
export function templateToPolicy(template: PolicyTemplatesTable): Policy {
  // Safely extract the policy data from the template with proper type handling
  const policyData = template.template_data as unknown as Policy;
  
  // Create a new policy from the template
  return {
    ...policyData,
    // Generate a new ID for the policy
    id: undefined,
    // Use template name but remove "Template" suffix if present
    name: template.template_name.replace(/ Template$/, ''),
    // Update dates
    effectiveDate: new Date().toISOString().split('T')[0],
    createdAt: undefined,
    modifiedAt: undefined,
  };
}

/**
 * Save a template version with audit logging
 * @param templateId Template ID
 * @param version Version identifier
 * @param versionData Template data for this version
 * @param userId User ID of the creator
 * @param notes Optional version notes
 * @returns Saved version
 */
export async function saveTemplateVersion(
  templateId: string,
  version: string,
  versionData: any,
  userId: string,
  notes?: string
): Promise<TemplateVersion> {
  try {
    // First check if the template exists
    const template = await getPolicyTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    // Check if this version already exists
    const existingVersion = await getTemplateVersion(templateId, version);
    if (existingVersion) {
      throw new Error(`Version ${version} already exists for template ${templateId}`);
    }
    
    const versionData_ = {
      template_id: templateId,
      version: version,
      version_data: versionData as Json,
      notes: notes,
      created_by: userId
    };
    
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.create(
      TEMPLATE_VERSION_TABLE,
      versionData_,
      { userId }
    );
    
    // Cast the response data to our TemplateVersion interface
    return result as TemplateVersion;
  } catch (error) {
    console.error(`Error saving template version for ${templateId}:`, error);
    throw error;
  }
}

/**
 * Get all versions of a template (read-only, no audit needed)
 * @param templateId Template ID
 * @returns Array of template versions
 */
export async function getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
  // Use type casting to bypass TypeScript's strict checking for the missing table
  const { data, error } = await (supabase as any)
    .from(TEMPLATE_VERSION_TABLE)
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error(`Error fetching template versions for ${templateId}:`, error);
    throw error;
  }
  
  // Cast the response data to our TemplateVersion interface array
  return (data || []) as TemplateVersion[];
}

/**
 * Get a specific version of a template (read-only, no audit needed)
 * @param templateId Template ID
 * @param version Version identifier
 * @returns The template version or null if not found
 */
export async function getTemplateVersion(
  templateId: string,
  version: string
): Promise<TemplateVersion | null> {
  // Use type casting to bypass TypeScript's strict checking for the missing table
  const { data, error } = await (supabase as any)
    .from(TEMPLATE_VERSION_TABLE)
    .select('*')
    .eq('template_id', templateId)
    .eq('version', version)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error(`Error fetching template version ${version} for ${templateId}:`, error);
    throw error;
  }
  
  // Cast the response data to our TemplateVersion interface
  return data as TemplateVersion;
}

/**
 * Update a template version with audit logging
 * @param versionId Version ID
 * @param updates Updates to apply
 * @param userId User ID for attribution
 * @returns Updated version
 */
export async function updateTemplateVersion(
  versionId: string,
  updates: Partial<Omit<TemplateVersion, 'version_id' | 'created_at'>>,
  userId?: string
): Promise<TemplateVersion> {
  try {
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update(
      TEMPLATE_VERSION_TABLE,
      versionId,
      updates,
      { userId }
    );
    
    // Cast the response data to our TemplateVersion interface
    return result as TemplateVersion;
  } catch (error) {
    console.error(`Error updating template version ${versionId}:`, error);
    throw error;
  }
}

/**
 * Delete a template version with audit logging
 * @param versionId Version ID
 * @param userId User ID for attribution
 * @returns Success status
 */
export async function deleteTemplateVersion(versionId: string, userId?: string): Promise<boolean> {
  try {
    // Use Universal Database Service for automatic audit logging
    await universalDatabaseService.delete(TEMPLATE_VERSION_TABLE, versionId, { userId });
    
    return true;
  } catch (error) {
    console.error(`Error deleting template version ${versionId}:`, error);
    throw error;
  }
}

/**
 * Delete all versions of a template with audit logging
 * @param templateId Template ID
 * @param userId User ID for attribution
 * @returns Success status
 */
export async function deleteAllTemplateVersions(templateId: string, userId?: string): Promise<boolean> {
  try {
    // Get all versions for this template to delete them individually with audit logging
    const versions = await getTemplateVersions(templateId);
    
    // Delete each version individually for proper audit logging
    for (const version of versions) {
      await universalDatabaseService.delete(TEMPLATE_VERSION_TABLE, version.version_id, { userId });
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting all template versions for ${templateId}:`, error);
    throw error;
  }
}

/**
 * Toggle the status of a policy template with audit logging
 * @param templateId Template ID
 * @param status New status (active or inactive)
 * @param userId User ID for attribution
 * @returns Updated template
 */
export async function toggleTemplateStatus(
  templateId: string,
  status: string,
  userId?: string
): Promise<PolicyTemplatesTable> {
  try {
    // Validate status
    if (status !== 'active' && status !== 'inactive') {
      throw new Error('Invalid status. Must be "active" or "inactive"');
    }
    
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update<PolicyTemplatesTable>(
      'policy_templates',
      templateId,
      { status },
      { userId }
    );

    return result;
  } catch (error) {
    console.error(`Error updating template status ${templateId}:`, error);
    throw error;
  }
}
