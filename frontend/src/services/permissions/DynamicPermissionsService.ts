/**
 * =====================================================
 * DYNAMIC PERMISSIONS SERVICE
 * Service to fetch permissions dynamically from database
 * Date: August 28, 2025
 * =====================================================
 */

import { supabase } from '@/infrastructure/database/client';

export interface DynamicPermission {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface PermissionCategory {
  name: string;
  displayName: string;
  permissions: DynamicPermission[];
  count: number;
}

class DynamicPermissionsService {
  private static instance: DynamicPermissionsService;
  private permissionsCache: DynamicPermission[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): DynamicPermissionsService {
    if (!DynamicPermissionsService.instance) {
      DynamicPermissionsService.instance = new DynamicPermissionsService();
    }
    return DynamicPermissionsService.instance;
  }

  /**
   * Get all permissions dynamically from database
   */
  public async getAllPermissions(): Promise<DynamicPermission[]> {
    // Check cache first
    if (this.permissionsCache && Date.now() < this.cacheExpiry) {
      return this.permissionsCache;
    }

    try {
      // Fetch unique permissions from role_permissions table
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_name')
        .order('permission_name');

      if (error) {
        console.error('Error fetching permissions:', error);
        return this.getFallbackPermissions();
      }

      if (!data) {
        return this.getFallbackPermissions();
      }

      // Get unique permission names with proper typing
      const uniquePermissions = Array.from(
        new Set(data.map((row: any) => row.permission_name as string).filter(name => typeof name === 'string'))
      );

      // Convert to DynamicPermission format
      const permissions: DynamicPermission[] = uniquePermissions.map((permissionName: string) => {
        const parts = permissionName.split('.');
        const category = parts[0] || 'other';
        const action = parts[1] || 'unknown';

        return {
          id: permissionName,
          name: this.formatPermissionName(action),
          category: this.formatCategoryName(category),
          description: `${this.formatCategoryName(category)} - ${this.formatPermissionName(action)}`
        };
      });

      // Cache the results
      this.permissionsCache = permissions;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      console.log(`Loaded ${permissions.length} permissions from database`);
      return permissions;

    } catch (error) {
      console.error('Error in getAllPermissions:', error);
      return this.getFallbackPermissions();
    }
  }

  /**
   * Get permissions grouped by category
   */
  public async getPermissionsByCategory(): Promise<PermissionCategory[]> {
    const permissions = await this.getAllPermissions();
    
    // Group permissions by category
    const categoryMap = new Map<string, DynamicPermission[]>();
    
    permissions.forEach(permission => {
      const category = permission.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(permission);
    });

    // Convert to PermissionCategory format
    const categories: PermissionCategory[] = Array.from(categoryMap.entries()).map(([categoryName, categoryPermissions]) => ({
      name: categoryName.toLowerCase().replace(/\s+/g, '_'),
      displayName: categoryName,
      permissions: categoryPermissions.sort((a, b) => a.name.localeCompare(b.name)),
      count: categoryPermissions.length
    }));

    // Sort categories by name
    return categories.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Get permissions for a specific role
   */
  public async getPermissionsForRole(roleId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_name')
        .eq('role_id', roleId);

      if (error) {
        console.error('Error fetching role permissions:', error);
        return [];
      }

      return data?.map((row: any) => row.permission_name as string).filter(name => typeof name === 'string') || [];
    } catch (error) {
      console.error('Error in getPermissionsForRole:', error);
      return [];
    }
  }

  /**
   * Add permissions to a role
   */
  public async addPermissionsToRole(roleId: string, permissionNames: string[]): Promise<void> {
    try {
      const insertData = permissionNames.map(permissionName => ({
        role_id: roleId,
        permission_name: permissionName
      }));

      const { error } = await supabase
        .from('role_permissions')
        .insert(insertData);

      if (error) {
        throw error;
      }

      // Clear cache to force refresh
      this.clearCache();
    } catch (error) {
      console.error('Error adding permissions to role:', error);
      throw error;
    }
  }

  /**
   * Remove permissions from a role
   */
  public async removePermissionsFromRole(roleId: string, permissionNames: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .in('permission_name', permissionNames);

      if (error) {
        throw error;
      }

      // Clear cache to force refresh
      this.clearCache();
    } catch (error) {
      console.error('Error removing permissions from role:', error);
      throw error;
    }
  }

  /**
   * Update role permissions (replace all)
   */
  public async updateRolePermissions(roleId: string, permissionNames: string[]): Promise<void> {
    try {
      // First, get current permissions
      const currentPermissions = await this.getPermissionsForRole(roleId);

      // Calculate what to add and remove
      const toAdd = permissionNames.filter(p => !currentPermissions.includes(p));
      const toRemove = currentPermissions.filter(p => !permissionNames.includes(p));

      // Remove old permissions
      if (toRemove.length > 0) {
        await this.removePermissionsFromRole(roleId, toRemove);
      }

      // Add new permissions
      if (toAdd.length > 0) {
        await this.addPermissionsToRole(roleId, toAdd);
      }

    } catch (error) {
      console.error('Error updating role permissions:', error);
      throw error;
    }
  }

  /**
   * Clear cache to force refresh
   */
  public clearCache(): void {
    this.permissionsCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Format permission action name for display
   */
  private formatPermissionName(action: string): string {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    // Handle special cases
    const specialCases: Record<string, string> = {
      'compliance_kyc_kyb': 'Compliance KYC/KYB',
      'token_allocations': 'Token Allocations',
      'token_design': 'Token Design', 
      'token_lifecycle': 'Token Lifecycle',
      'policy_rules': 'Policy Rules',
      'energy_assets': 'Energy Assets',
      'production_data': 'Production Data',
      'carbon_offsets': 'Carbon Offsets',
      'investor_portal': 'Investor Portal'
    };

    if (specialCases[category]) {
      return specialCases[category];
    }

    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Fallback permissions when database fails
   */
  private getFallbackPermissions(): DynamicPermission[] {
    console.warn('Using fallback permissions due to database error');
    
    return [
      { id: 'system.audit', name: 'Audit', category: 'System', description: 'System audit access' },
      { id: 'system.configure', name: 'Configure', category: 'System', description: 'System configuration' },
      { id: 'user.view', name: 'View', category: 'User Management', description: 'View users' },
      { id: 'user.create', name: 'Create', category: 'User Management', description: 'Create users' },
      { id: 'user.edit', name: 'Edit', category: 'User Management', description: 'Edit users' },
      { id: 'user.assign_role', name: 'Assign Role', category: 'User Management', description: 'Assign roles to users' },
      { id: 'projects.view', name: 'View', category: 'Projects', description: 'View projects' },
      { id: 'projects.create', name: 'Create', category: 'Projects', description: 'Create projects' },
      { id: 'token_design.view', name: 'View', category: 'Token Design', description: 'View token designs' },
      { id: 'token_lifecycle.view', name: 'View', category: 'Token Lifecycle', description: 'View token lifecycle' },
      { id: 'compliance_kyc_kyb.view', name: 'View', category: 'Compliance KYC/KYB', description: 'View compliance data' }
    ];
  }

  /**
   * Get missing permissions from sidebar configuration
   */
  public async getMissingPermissions(): Promise<string[]> {
    const currentPermissions = await this.getAllPermissions();
    const currentPermissionIds = currentPermissions.map(p => p.id);
    
    // Expected permissions from sidebar configuration
    const expectedPermissions = [
      'invoice.view', 'invoice.create',
      'pool.view', 'tranche.view', 
      'tokenization.view', 'tokenization.create',
      'distribution.view',
      'energy_assets.view', 'energy_assets.create',
      'production_data.view',
      'receivables.view', 'receivables.create',
      'incentives.view', 
      'carbon_offsets.view',
      'recs.view',
      'dashboard.view',
      'analytics.view', 'reports.view',
      'custody.view',
      'user.bulk',
      'offerings.view',
      'investor_portal.view',
      'profile.view', 'documents.view'
    ];

    return expectedPermissions.filter(permission => !currentPermissionIds.includes(permission));
  }
}

export { DynamicPermissionsService };
export const dynamicPermissionsService = DynamicPermissionsService.getInstance();
