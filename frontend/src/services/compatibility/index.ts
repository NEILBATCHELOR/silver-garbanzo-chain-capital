// ========================================
// COMPATIBILITY SERVICES MODULE EXPORTS
// ========================================

export * from './ProjectCompatibilityBridge';

// Re-export service instance for convenience
export { projectCompatibilityBridge } from './ProjectCompatibilityBridge';

// Re-export types for compatibility
export type { LegacyProject } from './ProjectCompatibilityBridge';

// ========================================
// COMPATIBILITY LAYER UTILITIES  
// ========================================

/**
 * Quick access functions for common compatibility operations
 */

import { projectCompatibilityBridge } from './ProjectCompatibilityBridge';

/**
 * Get a project in legacy format - drop-in replacement for old project queries
 */
export const getLegacyProject = (projectId: string) => 
  projectCompatibilityBridge.getLegacyProject(projectId);

/**
 * Get projects list in legacy format - drop-in replacement for old project lists
 */
export const getLegacyProjects = (filters?: {
  organizationId?: string;
  projectType?: string;
  limit?: number;
  offset?: number;
}) => projectCompatibilityBridge.getLegacyProjects(filters || {});

/**
 * Create project using legacy format - maintains backward compatibility
 */
export const createLegacyProject = (projectData: any) =>
  projectCompatibilityBridge.createLegacyProject(projectData);

/**
 * Update project using legacy format - maintains backward compatibility  
 */
export const updateLegacyProject = (projectId: string, updates: any) =>
  projectCompatibilityBridge.updateLegacyProject(projectId, updates);

// ========================================
// MIGRATION HELPERS
// ========================================

/**
 * Check if the new project structure is available
 */
export const isNewProjectStructureAvailable = async (): Promise<boolean> => {
  try {
    // Try to query the new simplified projects table
    const { data, error } = await (await import('@/infrastructure/database/client')).supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
};

/**
 * Check if product tables are available
 */
export const areProductTablesAvailable = async (): Promise<boolean> => {
  try {
    const { data, error } = await (await import('@/infrastructure/database/client')).supabase
      .from('structured_products')
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
};

/**
 * Get migration status
 */
export const getMigrationStatus = async (): Promise<{
  projectsTableMigrated: boolean;
  productTablesCreated: boolean;
  backupExists: boolean;
  recommendedAction: string;
}> => {
  const projectsTableMigrated = await isNewProjectStructureAvailable();
  const productTablesCreated = await areProductTablesAvailable();
  
  // Check if backup exists (simplified check)
  let backupExists = false;
  try {
    const { data, error } = await (await import('@/infrastructure/database/client')).supabase
      .from('projects_backup')
      .select('id')
      .limit(1);
    backupExists = !error;
  } catch {
    backupExists = false;
  }

  let recommendedAction = '';
  if (!projectsTableMigrated && !productTablesCreated) {
    recommendedAction = 'Run database migration script first';
  } else if (projectsTableMigrated && !productTablesCreated) {
    recommendedAction = 'Complete product tables creation';
  } else if (projectsTableMigrated && productTablesCreated) {
    recommendedAction = 'Migration complete - update frontend components';
  } else {
    recommendedAction = 'Check migration script execution';
  }

  return {
    projectsTableMigrated,
    productTablesCreated,
    backupExists,
    recommendedAction
  };
};

// ========================================
// USAGE EXAMPLES
// ========================================

/*
// Example: Drop-in replacement for existing components

// OLD CODE:
const projects = await supabase
  .from('projects')
  .select('*')
  .eq('organization_id', orgId);

// NEW CODE (using compatibility layer):
const projects = await getLegacyProjects({ organizationId: orgId });

// ----

// OLD CODE:  
const project = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

// NEW CODE (using compatibility layer):
const project = await getLegacyProject(projectId);

// ----

// OLD CODE:
await supabase
  .from('projects')  
  .update({ target_raise: 1000000 })
  .eq('id', projectId);

// NEW CODE (using compatibility layer):
await updateLegacyProject(projectId, { target_raise: 1000000 });

*/
