// =====================================================
// DYNAMIC SIDEBAR SERVICE
// Reads sidebar configurations from database dynamically
// Removes requiresProject (P flag) concept
// Date: August 28, 2025
// =====================================================

import { supabase } from '@/infrastructure/database/client';
import type { 
  SidebarSection, 
  SidebarItem, 
  UserContext, 
  SidebarConfiguration,
  SidebarFilterCriteria,
  SidebarItemAccess
} from '@/types/sidebar';
import type {
  AdminSidebarConfiguration,
  AdminSidebarSection,
  AdminSidebarItem,
  SidebarConfigurationFilter,
  ProfileTypeEnum
} from '@/types/sidebar/adminTypes';

// Icon mapping for string to component conversion
import {
  BarChart3,
  Users,
  Layers,
  Home,
  PieChart,
  ShieldCheck,
  UserRoundCog,
  Scale,
  WalletCards,
  FileStackIcon,
  UserRoundPlus,
  Landmark,
  Activity,
  Wallet,
  KeyRound,
  Coins,
  LayoutDashboard,
  Fingerprint,
  CreditCard,
  Shield,
  FileText,
  Plus,
  CheckCircle,
  LogOut,
  FileCog,
  Building,
  Layout,
  CheckSquare,
  ShieldAlert,
  History,
  Settings,
  BarChart,
  Menu,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  DollarSign,
  UserCircle,
  Grid2x2Check,
  Combine,
  Blocks,
  User,
  ChartCandlestick,
  Factory,
  Zap,
  Gauge,
  Trophy,
  Leaf,
  TrendingUp,
  BarChart2,
  PanelLeftDashed
} from 'lucide-react';
import type { ComponentType } from 'react';

// Icon mapping for dynamic resolution
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  'BarChart3': BarChart3,
  'Users': Users,
  'Layers': Layers,
  'Home': Home,
  'PieChart': PieChart,
  'ShieldCheck': ShieldCheck,
  'UserRoundCog': UserRoundCog,
  'Scale': Scale,
  'WalletCards': WalletCards,
  'FileStackIcon': FileStackIcon,
  'UserRoundPlus': UserRoundPlus,
  'Landmark': Landmark,
  'Activity': Activity,
  'Wallet': Wallet,
  'KeyRound': KeyRound,
  'Coins': Coins,
  'LayoutDashboard': LayoutDashboard,
  'Fingerprint': Fingerprint,
  'CreditCard': CreditCard,
  'Shield': Shield,
  'FileText': FileText,
  'Plus': Plus,
  'CheckCircle': CheckCircle,
  'LogOut': LogOut,
  'FileCog': FileCog,
  'Building': Building,
  'Layout': Layout,
  'CheckSquare': CheckSquare,
  'ShieldAlert': ShieldAlert,
  'History': History,
  'Settings': Settings,
  'BarChart': BarChart,
  'Menu': Menu,
  'Package': Package,
  'ShoppingCart': ShoppingCart,
  'ArrowLeftRight': ArrowLeftRight,
  'DollarSign': DollarSign,
  'UserCircle': UserCircle,
  'Grid2x2Check': Grid2x2Check,
  'Combine': Combine,
  'Blocks': Blocks,
  'User': User,
  'ChartCandlestick': ChartCandlestick,
  'Factory': Factory,
  'Zap': Zap,
  'Gauge': Gauge,
  'Trophy': Trophy,
  'Leaf': Leaf,
  'TrendingUp': TrendingUp,
  'BarChart2': BarChart2,
  'PanelLeftDashed': PanelLeftDashed
};

export class DynamicSidebarService {
  private static instance: DynamicSidebarService;
  private cache = new Map<string, SidebarConfiguration>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): DynamicSidebarService {
    if (!DynamicSidebarService.instance) {
      DynamicSidebarService.instance = new DynamicSidebarService();
    }
    return DynamicSidebarService.instance;
  }

  /**
   * Get the appropriate sidebar configuration for a user
   * Reads from database configurations dynamically
   */
  public async getSidebarConfiguration(
    userContext: UserContext,
    criteria?: Partial<SidebarFilterCriteria>
  ): Promise<SidebarConfiguration> {
    const cacheKey = this.generateCacheKey(userContext, criteria);
    const cached = this.getCachedConfig(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Get the best matching configuration from database
      const adminConfig = await this.findBestMatchingConfiguration(userContext);
      
      if (!adminConfig) {
        // Fallback to empty configuration if no match found
        console.warn('No matching sidebar configuration found, using empty fallback');
        return {
          sections: [],
          profileType: userContext.profileType || undefined,
          lastUpdated: new Date().toISOString()
        };
      }

      // Convert admin configuration to user-facing configuration
      const sidebarConfig = await this.convertAdminToUserConfig(adminConfig, userContext, criteria);
      
      this.setCachedConfig(cacheKey, sidebarConfig);
      return sidebarConfig;

    } catch (error) {
      console.error('Error loading sidebar configuration:', error);
      
      // Return empty configuration as fallback
      return {
        sections: [],
        profileType: userContext.profileType || undefined,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Find the best matching configuration for a user
   */
  private async findBestMatchingConfiguration(
    userContext: UserContext
  ): Promise<AdminSidebarConfiguration | null> {
    try {
      const userRoleIds = userContext.roles.map(role => role.id);
      const userProfileType = userContext.profileType as ProfileTypeEnum;

      // Query configurations that match user's roles and profile type
      let query = supabase
        .from('sidebar_configurations')
        .select('*')
        .eq('is_active', true);

      // Filter by role IDs (user must have at least one matching role)
      if (userRoleIds.length > 0) {
        query = query.overlaps('target_role_ids', userRoleIds);
      }

      // Filter by profile type
      if (userProfileType) {
        query = query.contains('target_profile_type_enums', [userProfileType]);
      }

      // Filter by role priority
      if (userContext.highestRolePriority) {
        query = query.lte('min_role_priority', userContext.highestRolePriority);
      }

      // Order by priority (higher priority first, then by default flag, then by updated date)
      query = query.order('min_role_priority', { ascending: false })
                   .order('is_default', { ascending: false })
                   .order('updated_at', { ascending: false });

      const { data, error } = await query.limit(1).single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is expected, return null
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return this.mapDatabaseToAdminConfig(data);
    } catch (error) {
      console.error('Error finding matching configuration:', error);
      return null;
    }
  }

  /**
   * Convert admin configuration to user-facing configuration
   */
  private async convertAdminToUserConfig(
    adminConfig: AdminSidebarConfiguration,
    userContext: UserContext,
    criteria?: Partial<SidebarFilterCriteria>
  ): Promise<SidebarConfiguration> {
    const filterCriteria: SidebarFilterCriteria = {
      userContext,
      includeHidden: false,
      contextualFiltering: true,
      ...criteria
    };

    const sections = await this.filterSectionsByAccess(
      adminConfig.configurationData.sections,
      filterCriteria
    );

    return {
      sections,
      profileType: userContext.profileType || undefined,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Filter sections based on user access (without requiresProject concept)
   */
  private async filterSectionsByAccess(
    adminSections: AdminSidebarSection[],
    criteria: SidebarFilterCriteria
  ): Promise<SidebarSection[]> {
    const filteredSections: SidebarSection[] = [];

    for (const section of adminSections) {
      if (!section.isActive) {
        continue;
      }

      // Check section-level access
      if (!this.checkSectionAccess(section, criteria.userContext)) {
        continue;
      }

      // Filter items within the section
      const filteredItems = await this.filterItemsByAccess(section.items, criteria);
      
      // Only include section if it has accessible items
      if (filteredItems.length === 0) {
        continue;
      }

      const sidebarSection: SidebarSection = {
        id: section.sectionId,
        title: section.title,
        items: filteredItems,
        permissions: section.requiredPermissions,
        minRolePriority: section.minRolePriority
      };

      filteredSections.push(sidebarSection);
    }

    // Sort sections by display order
    return filteredSections.sort((a, b) => {
      const sectionA = adminSections.find(s => s.sectionId === a.id);
      const sectionB = adminSections.find(s => s.sectionId === b.id);
      return (sectionA?.displayOrder || 0) - (sectionB?.displayOrder || 0);
    });
  }

  /**
   * Filter items based on user access (without requiresProject concept)
   */
  private async filterItemsByAccess(
    adminItems: AdminSidebarItem[],
    criteria: SidebarFilterCriteria
  ): Promise<SidebarItem[]> {
    const { userContext, contextualFiltering = true } = criteria;
    const filteredItems: SidebarItem[] = [];

    for (const item of adminItems) {
      if (!item.isActive || !item.isVisible) {
        continue;
      }

      const access = this.checkItemAccess(item, userContext);
      
      if (!access.isVisible) {
        continue;
      }

      // Apply contextual filtering (e.g., project-specific items)
      let href = item.href;
      if (contextualFiltering && userContext.currentProjectId) {
        href = href.replace('{projectId}', userContext.currentProjectId);
        href = href.replace(':projectId', userContext.currentProjectId);
      }

      // Get icon component
      const icon = ICON_MAP[item.icon || 'Layout'] || Layout;

      const sidebarItem: SidebarItem = {
        id: item.itemId,
        label: item.label,
        href,
        icon,
        permissions: item.requiredPermissions,
        minRolePriority: item.minRolePriority
      };

      filteredItems.push(sidebarItem);
    }

    // Sort items by display order
    return filteredItems.sort((a, b) => {
      const itemA = adminItems.find(i => i.itemId === a.id);
      const itemB = adminItems.find(i => i.itemId === b.id);
      return (itemA?.displayOrder || 0) - (itemB?.displayOrder || 0);
    });
  }

  /**
   * Check if user has access to a section
   */
  private checkSectionAccess(section: AdminSidebarSection, userContext: UserContext): boolean {
    // Check role priority
    if (section.minRolePriority && userContext.highestRolePriority < section.minRolePriority) {
      return false;
    }

    // Check specific role IDs
    if (section.requiredRoleIds && section.requiredRoleIds.length > 0) {
      const userRoleIds = userContext.roles.map(role => role.id);
      const hasRequiredRole = section.requiredRoleIds.some(roleId =>
        userRoleIds.includes(roleId)
      );
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check profile types
    if (section.profileTypes && section.profileTypes.length > 0) {
      if (!userContext.profileType || !section.profileTypes.includes(userContext.profileType as ProfileTypeEnum)) {
        return false;
      }
    }

    // Check permissions (any of the listed permissions)
    if (section.requiredPermissions && section.requiredPermissions.length > 0) {
      const hasRequiredPermission = section.requiredPermissions.some(permission =>
        userContext.permissions.includes(permission)
      );
      if (!hasRequiredPermission) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user has access to an item (without requiresProject concept)
   */
  public checkItemAccess(item: AdminSidebarItem, userContext: UserContext): SidebarItemAccess {
    const reasons: string[] = [];
    
    // Check if user is authenticated
    if (!userContext.userId) {
      return { 
        isVisible: false, 
        reason: 'User not authenticated' 
      };
    }

    // Check role priority
    if (item.minRolePriority && userContext.highestRolePriority < item.minRolePriority) {
      reasons.push(`Requires minimum role priority ${item.minRolePriority}`);
    }

    // Check specific role IDs
    if (item.requiredRoleIds && item.requiredRoleIds.length > 0) {
      const userRoleIds = userContext.roles.map(role => role.id);
      const hasRequiredRole = item.requiredRoleIds.some(roleId =>
        userRoleIds.includes(roleId)
      );
      if (!hasRequiredRole) {
        reasons.push(`Requires specific role access`);
      }
    }

    // Check profile types
    if (item.profileTypes && item.profileTypes.length > 0) {
      if (!userContext.profileType || !item.profileTypes.includes(userContext.profileType as ProfileTypeEnum)) {
        reasons.push(`Requires profile type: ${item.profileTypes.join(', ')}`);
      }
    }

    // Check permissions (any of the listed permissions)
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasRequiredPermission = item.requiredPermissions.some(permission =>
        userContext.permissions.includes(permission)
      );
      
      if (!hasRequiredPermission) {
        const missingPermissions = item.requiredPermissions.filter(permission =>
          !userContext.permissions.includes(permission)
        );
        reasons.push(`Missing permissions: ${missingPermissions.join(', ')}`);
        
        return {
          isVisible: false,
          reason: reasons.join('; '),
          requiredPermissions: item.requiredPermissions,
          missingPermissions
        };
      }
    }

    if (reasons.length > 0) {
      return { 
        isVisible: false, 
        reason: reasons.join('; ') 
      };
    }

    return { isVisible: true };
  }

  /**
   * Map database row to AdminSidebarConfiguration
   */
  private mapDatabaseToAdminConfig(data: any): AdminSidebarConfiguration {
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      targetRoleIds: data.target_role_ids || [],
      targetProfileTypeEnums: data.target_profile_type_enums || [],
      minRolePriority: data.min_role_priority || undefined,
      organizationId: data.organization_id || undefined,
      configurationData: data.configuration_data,
      isActive: data.is_active ?? true,
      isDefault: data.is_default ?? false,
      createdBy: data.created_by || undefined,
      updatedBy: data.updated_by || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    };
  }

  /**
   * Generate cache key for user context
   */
  private generateCacheKey(
    userContext: UserContext, 
    criteria?: Partial<SidebarFilterCriteria>
  ): string {
    const keyParts = [
      userContext.userId,
      userContext.profileType,
      userContext.currentProjectId,
      userContext.roles.map(r => r.id).sort().join(','),
      userContext.permissions.sort().join(','),
      criteria?.includeHidden ? 'hidden' : 'visible',
      criteria?.contextualFiltering ? 'contextual' : 'static'
    ];
    return keyParts.filter(Boolean).join('|');
  }

  /**
   * Get cached configuration
   */
  private getCachedConfig(key: string): SidebarConfiguration | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const lastUpdated = new Date(cached.lastUpdated!).getTime();
    const now = Date.now();
    
    if (now - lastUpdated > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Cache configuration
   */
  private setCachedConfig(key: string, config: SidebarConfiguration): void {
    this.cache.set(key, config);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for specific user context
   */
  public invalidateUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith(userId));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all cache when configurations are updated
   * Called when admin saves/updates sidebar configurations
   */
  public invalidateConfigurationCache(): void {
    this.cache.clear();
    // Emit event for live sidebar updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarConfigurationUpdated'));
    }
  }
}

// Export singleton instance
export const dynamicSidebarService = DynamicSidebarService.getInstance();
