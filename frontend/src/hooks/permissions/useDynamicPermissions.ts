/**
 * =====================================================
 * USE DYNAMIC PERMISSIONS HOOK
 * React hook for dynamic permissions management
 * Date: August 28, 2025
 * =====================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { dynamicPermissionsService, type DynamicPermission, type PermissionCategory } from '@/services/permissions';
import { useToast } from '@/components/ui/use-toast';

export interface UseDynamicPermissionsReturn {
  // Data
  permissions: DynamicPermission[];
  categories: PermissionCategory[];
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Actions
  refreshPermissions: () => Promise<void>;
  updateRolePermissions: (roleId: string, permissionIds: string[]) => Promise<void>;
  getRolePermissions: (roleId: string) => Promise<string[]>;
  
  // Utils
  getMissingPermissions: () => Promise<string[]>;
  clearCache: () => void;
}

/**
 * Hook for managing dynamic permissions from database
 */
export const useDynamicPermissions = (): UseDynamicPermissionsReturn => {
  const [permissions, setPermissions] = useState<DynamicPermission[]>([]);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  /**
   * Load permissions from database
   */
  const loadPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [permissionsData, categoriesData] = await Promise.all([
        dynamicPermissionsService.getAllPermissions(),
        dynamicPermissionsService.getPermissionsByCategory()
      ]);

      setPermissions(permissionsData);
      setCategories(categoriesData);

      console.log(`Loaded ${permissionsData.length} permissions in ${categoriesData.length} categories`);
    } catch (error) {
      console.error('Error loading dynamic permissions:', error);
      toast({
        title: 'Error Loading Permissions',
        description: 'Failed to load permissions from database. Using fallback permissions.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Refresh permissions from database
   */
  const refreshPermissions = useCallback(async () => {
    dynamicPermissionsService.clearCache();
    await loadPermissions();
  }, [loadPermissions]);

  /**
   * Update permissions for a role
   */
  const updateRolePermissions = useCallback(async (roleId: string, permissionIds: string[]) => {
    setIsUpdating(true);
    try {
      await dynamicPermissionsService.updateRolePermissions(roleId, permissionIds);
      
      toast({
        title: 'Permissions Updated',
        description: 'Role permissions have been updated successfully.',
      });

      // Refresh permissions after update
      await refreshPermissions();
    } catch (error: any) {
      console.error('Error updating role permissions:', error);
      toast({
        title: 'Error Updating Permissions',
        description: error.message || 'Failed to update role permissions.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [toast, refreshPermissions]);

  /**
   * Get permissions for a specific role
   */
  const getRolePermissions = useCallback(async (roleId: string): Promise<string[]> => {
    try {
      return await dynamicPermissionsService.getPermissionsForRole(roleId);
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }, []);

  /**
   * Get missing permissions from sidebar configuration
   */
  const getMissingPermissions = useCallback(async (): Promise<string[]> => {
    try {
      return await dynamicPermissionsService.getMissingPermissions();
    } catch (error) {
      console.error('Error getting missing permissions:', error);
      return [];
    }
  }, []);

  /**
   * Clear permissions cache
   */
  const clearCache = useCallback(() => {
    dynamicPermissionsService.clearCache();
  }, []);

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    // Data
    permissions,
    categories,
    
    // Loading states
    isLoading,
    isUpdating,
    
    // Actions
    refreshPermissions,
    updateRolePermissions,
    getRolePermissions,
    
    // Utils
    getMissingPermissions,
    clearCache
  };
};

/**
 * Hook for managing permissions for a specific role
 */
export const useRolePermissions = (roleId: string | null) => {
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dynamicPermissions = useDynamicPermissions();

  // Extract stable references to avoid dependency issues
  const { 
    getRolePermissions, 
    updateRolePermissions: updateRolePermissionsService,
    isLoading: dynamicIsLoading,
    isUpdating,
    permissions,
    categories,
    refreshPermissions,
    getMissingPermissions,
    clearCache
  } = dynamicPermissions;

  const loadRolePermissions = useCallback(async () => {
    if (!roleId) {
      setRolePermissions([]);
      return;
    }

    setIsLoading(true);
    try {
      const permissions = await getRolePermissions(roleId);
      setRolePermissions(permissions);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      setRolePermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [roleId, getRolePermissions]);

  const updateRolePermissions = useCallback(async (permissionIds: string[]) => {
    if (!roleId) return;

    await updateRolePermissionsService(roleId, permissionIds);
    setRolePermissions(permissionIds);
  }, [roleId, updateRolePermissionsService]);

  // Load role permissions when roleId changes
  useEffect(() => {
    loadRolePermissions();
  }, [loadRolePermissions]);

  return {
    rolePermissions,
    isLoading: isLoading || dynamicIsLoading,
    isUpdating,
    updateRolePermissions,
    refreshRolePermissions: loadRolePermissions,
    // Spread specific functions from dynamicPermissions
    permissions,
    categories,
    refreshPermissions,
    getRolePermissions,
    getMissingPermissions,
    clearCache
  };
};
