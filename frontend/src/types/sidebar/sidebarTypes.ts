import { ComponentType } from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permissions?: string[];      // Required permissions (any of these)
  roles?: string[];           // Required roles (any of these)
  profileTypes?: string[];    // Required profile types (any of these)
  minRolePriority?: number;   // Minimum role priority required
  requiresProject?: boolean;  // Whether item requires a project context
  isVisible?: boolean;        // Manual override for visibility
}

export interface SidebarSection {
  id: string;
  title: string;
  permissions?: string[];      // Section-level permissions
  roles?: string[];           // Section-level roles
  profileTypes?: string[];    // Section-level profile types
  minRolePriority?: number;   // Section-level minimum role priority
  items: SidebarItem[];
  isCollapsible?: boolean;    // Can section be collapsed
  defaultExpanded?: boolean;  // Default expansion state
}

export interface SidebarConfiguration {
  sections: SidebarSection[];
  profileType?: string;       // Configuration specific to profile type
  lastUpdated?: string;       // Cache invalidation
}

export interface UserContext {
  userId: string;
  roles: UserRole[];
  profileType: string | null;
  permissions: string[];
  organizationRoles?: OrganizationRole[];
  highestRolePriority: number;
  currentProjectId?: string;
  isLoading: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  priority: number;
  organizationId?: string;    // For organization-specific roles
}

export interface OrganizationRole {
  organizationId: string;
  roleId: string;
  roleName: string;
  rolePriority: number;
}

export interface SidebarFilterCriteria {
  userContext: UserContext;
  includeHidden?: boolean;
  contextualFiltering?: boolean;  // Apply contextual filters (e.g., project-specific)
}

export interface SidebarItemAccess {
  isVisible: boolean;
  reason?: string;            // Reason for visibility/invisibility
  requiredPermissions?: string[];
  missingPermissions?: string[];
}

// Predefined profile-specific sidebar configurations
export type ProfileSidebarConfig = 
  | 'super_admin'
  | 'issuer' 
  | 'investor'
  | 'service_provider'
  | 'compliance_officer'
  | 'operations'
  | 'agent'
  | 'viewer'
  | 'default';

export interface SidebarConfigMapping {
  profileType: string;
  rolePriorities: number[];
  configType: ProfileSidebarConfig;
  customizations?: Partial<SidebarConfiguration>;
}
