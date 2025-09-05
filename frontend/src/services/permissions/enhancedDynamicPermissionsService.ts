/**
 * =====================================================
 * ENHANCED DYNAMIC PERMISSIONS SERVICE - NAV INTEGRATION
 * Updated to load permissions directly from permissions table
 * Date: September 05, 2025
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

class EnhancedDynamicPermissionsService {
  private static instance: EnhancedDynamicPermissionsService;
  private permissionsCache: DynamicPermission[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): EnhancedDynamicPermissionsService {
    if (!EnhancedDynamicPermissionsService.instance) {
      EnhancedDynamicPermissionsService.instance = new EnhancedDynamicPermissionsService();
    }
    return EnhancedDynamicPermissionsService.instance;
  }

  /**
   * 🆕 Enhanced: Get all permissions directly from permissions table
   */
  public async getAllPermissions(): Promise<DynamicPermission[]> {
    // Check cache first
    if (this.permissionsCache && Date.now() < this.cacheExpiry) {
      return this.permissionsCache;
    }

    try {
      // 🆕 Load directly from permissions table instead of role_permissions
      const { data, error } = await supabase
        .from('permissions')
        .select('name, description')
        .order('name');

      if (error) {
        console.error('Error fetching permissions from permissions table:', error);
        return this.getFallbackPermissions();
      }

      if (!data || data.length === 0) {
        console.warn('No permissions found in permissions table, using fallback');
        return this.getFallbackPermissions();
      }

      // Convert to DynamicPermission format
      const permissions: DynamicPermission[] = data.map((row: any) => {
        const permissionName = row.name as string;
        const description = row.description as string;
        
        // 🆕 Enhanced categorization logic for better NAV support
        const category = this.extractCategory(permissionName);

        return {
          id: permissionName,
          name: this.formatPermissionDisplayName(permissionName),
          category: this.formatCategoryName(category),
          description: description || `${this.formatCategoryName(category)} - ${this.formatPermissionDisplayName(permissionName)}`
        };
      });

      // Cache the results
      this.permissionsCache = permissions;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      console.log(`✅ Loaded ${permissions.length} permissions from permissions table`);
      console.log('📊 Categories found:', [...new Set(permissions.map(p => p.category))]);
      
      return permissions;

    } catch (error) {
      console.error('Error in getAllPermissions:', error);
      return this.getFallbackPermissions();
    }
  }

  /**
   * 🆕 Enhanced: Extract category from permission name with better NAV support
   */
  private extractCategory(permissionName: string): string {
    // Handle colon-separated permissions (preferred format)
    if (permissionName.includes(':')) {
      const parts = permissionName.split(':');
      return parts[0];
    }
    
    // Handle dot-separated permissions (legacy format)
    if (permissionName.includes('.')) {
      const parts = permissionName.split('.');
      return parts[0];
    }
    
    // Handle underscore-separated permissions
    if (permissionName.includes('_')) {
      const parts = permissionName.split('_');
      return parts[0];
    }
    
    // Default category
    return 'general';
  }

  /**
   * 🆕 Enhanced: Format permission display name with better readability
   */
  private formatPermissionDisplayName(permissionName: string): string {
    // Extract the action part after the category
    let actionPart = permissionName;
    
    if (permissionName.includes(':')) {
      actionPart = permissionName.split(':')[1] || permissionName;
    } else if (permissionName.includes('.')) {
      actionPart = permissionName.split('.')[1] || permissionName;
    }
    
    // Convert snake_case to Title Case
    return actionPart
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

    // Convert to PermissionCategory format with custom ordering
    const categories: PermissionCategory[] = Array.from(categoryMap.entries()).map(([categoryName, categoryPermissions]) => ({
      name: categoryName.toLowerCase().replace(/\s+/g, '_'),
      displayName: categoryName,
      permissions: categoryPermissions.sort((a, b) => a.name.localeCompare(b.name)),
      count: categoryPermissions.length
    }));

    // 🆕 Custom category ordering with NAV prominently placed
    const categoryOrder = [
      'Nav',           // 🆕 NAV first for visibility
      'Auth',
      'Compliance',
      'Tokens',
      'Captable',
      'Wallet',
      'Factoring',
      'Climate',
      'Redemption',
      'Reports',
      'Admin',
      'System'
    ];

    return categories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.displayName);
      const bIndex = categoryOrder.indexOf(b.displayName);
      
      // If both are in the order list, sort by index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // Otherwise, sort alphabetically
      return a.displayName.localeCompare(b.displayName);
    });
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

      console.log(`🔄 Updating permissions for role ${roleId}:`, {
        toAdd: toAdd.length,
        toRemove: toRemove.length,
        total: permissionNames.length
      });

      // Remove old permissions
      if (toRemove.length > 0) {
        await this.removePermissionsFromRole(roleId, toRemove);
      }

      // Add new permissions
      if (toAdd.length > 0) {
        await this.addPermissionsToRole(roleId, toAdd);
      }

      console.log(`✅ Successfully updated permissions for role ${roleId}`);

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
    console.log('🗑️ Permissions cache cleared');
  }

  /**
   * 🆕 Enhanced: Format category name with better NAV support
   */
  private formatCategoryName(category: string): string {
    // Handle special cases with proper capitalization
    const specialCases: Record<string, string> = {
      'nav': 'Nav',           // 🆕 NAV formatting
      'auth': 'Auth',
      'compliance': 'Compliance',
      'tokens': 'Tokens',
      'captable': 'Cap Table',
      'wallet': 'Wallet',
      'factoring': 'Factoring',
      'climate': 'Climate',
      'redemption': 'Redemption',
      'reports': 'Reports',
      'admin': 'Admin',
      'system': 'System',
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

    const lowerCategory = category.toLowerCase();
    if (specialCases[lowerCategory]) {
      return specialCases[lowerCategory];
    }

    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * 🆕 Enhanced: Fallback permissions including NAV
   */
  private getFallbackPermissions(): DynamicPermission[] {
    console.warn('🚨 Using fallback permissions due to database error');
    
    return [
      // NAV permissions
      { id: 'nav:view_dashboard', name: 'View Dashboard', category: 'Nav', description: 'View NAV dashboard and overview' },
      { id: 'nav:view_calculators', name: 'View Calculators', category: 'Nav', description: 'Browse available NAV calculators' },
      { id: 'nav:run_calculation', name: 'Run Calculation', category: 'Nav', description: 'Execute NAV calculations' },
      { id: 'nav:view_history', name: 'View History', category: 'Nav', description: 'View calculation history' },
      { id: 'nav:manage_valuations', name: 'Manage Valuations', category: 'Nav', description: 'Create, edit, and manage valuations' },
      { id: 'nav:view_audit', name: 'View Audit', category: 'Nav', description: 'View audit trail and compliance logs' },
      
      // System permissions
      { id: 'system:audit', name: 'Audit', category: 'System', description: 'System audit access' },
      { id: 'system:configure', name: 'Configure', category: 'System', description: 'System configuration' },
      
      // User management
      { id: 'user:view', name: 'View', category: 'User Management', description: 'View users' },
      { id: 'user:create', name: 'Create', category: 'User Management', description: 'Create users' },
      { id: 'user:edit', name: 'Edit', category: 'User Management', description: 'Edit users' },
      { id: 'user:assign_role', name: 'Assign Role', category: 'User Management', description: 'Assign roles to users' },
      
      // Projects
      { id: 'projects:view', name: 'View', category: 'Projects', description: 'View projects' },
      { id: 'projects:create', name: 'Create', category: 'Projects', description: 'Create projects' },
      
      // Tokens
      { id: 'tokens:view', name: 'View', category: 'Tokens', description: 'View token designs' },
      { id: 'tokens:create', name: 'Create', category: 'Tokens', description: 'Create tokens' },
      
      // Compliance
      { id: 'compliance:view', name: 'View', category: 'Compliance', description: 'View compliance data' },
      { id: 'compliance:manage', name: 'Manage', category: 'Compliance', description: 'Manage compliance' }
    ];
  }

  /**
   * 🆕 Enhanced: Check if NAV permissions exist in database
   */
  public async checkNavPermissions(): Promise<{exists: boolean, missing: string[]}> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('name')
        .like('name', 'nav:%');

      if (error) {
        console.error('Error checking NAV permissions:', error);
        return { exists: false, missing: [] };
      }

      const existingNavPerms = data?.map(row => row.name) || [];
      const expectedNavPerms = [
        'nav:view_dashboard',
        'nav:view_calculators', 
        'nav:run_calculation',
        'nav:view_history',
        'nav:manage_valuations',
        'nav:view_audit',
        'nav:create_valuation',
        'nav:delete_valuation',
        'nav:approve_valuation',
        'nav:export_data',
        'nav:manage_calculator_config'
      ];

      const missing = expectedNavPerms.filter(perm => !existingNavPerms.includes(perm));
      
      return {
        exists: missing.length === 0,
        missing
      };
    } catch (error) {
      console.error('Error in checkNavPermissions:', error);
      return { exists: false, missing: [] };
    }
  }

  /**
   * Get missing permissions from sidebar configuration
   */
  public async getMissingPermissions(): Promise<string[]> {
    const currentPermissions = await this.getAllPermissions();
    const currentPermissionIds = currentPermissions.map(p => p.id);
    
    // Expected permissions from sidebar configuration
    const expectedPermissions = [
      'invoice:view', 'invoice:create',
      'pool:view', 'tranche:view', 
      'tokenization:view', 'tokenization:create',
      'distribution:view',
      'energy_assets:view', 'energy_assets:create',
      'production_data:view',
      'receivables:view', 'receivables:create',
      'incentives:view', 
      'carbon_offsets:view',
      'recs:view',
      'dashboard:view',
      'analytics:view', 'reports:view',
      'custody:view',
      'user:bulk',
      'offerings:view',
      'investor_portal:view',
      'profile:view', 'documents:view',
      // 🆕 NAV permissions
      ...Object.values({
        VIEW_DASHBOARD: 'nav:view_dashboard',
        VIEW_CALCULATORS: 'nav:view_calculators',
        RUN_CALCULATION: 'nav:run_calculation',
        VIEW_HISTORY: 'nav:view_history',
        MANAGE_VALUATIONS: 'nav:manage_valuations',
        VIEW_AUDIT: 'nav:view_audit'
      })
    ];

    return expectedPermissions.filter(permission => !currentPermissionIds.includes(permission));
  }
}

export { EnhancedDynamicPermissionsService as DynamicPermissionsService };
export const dynamicPermissionsService = EnhancedDynamicPermissionsService.getInstance();
