// =====================================================
// SIDEBAR ADMIN CONFIGURATION TYPES
// For Super Admin management of role-based sidebar layouts
// Updated: August 28, 2025 - Using UUID role IDs and profile type enums
// =====================================================

import type { Database } from '@/types/core/database';

// Database table types
export type SidebarConfigurationRow = Database['public']['Tables']['sidebar_configurations']['Row'];
export type SidebarSectionRow = Database['public']['Tables']['sidebar_sections']['Row'];
export type SidebarItemRow = Database['public']['Tables']['sidebar_items']['Row'];
export type UserSidebarPreferencesRow = Database['public']['Tables']['user_sidebar_preferences']['Row'];

export type SidebarConfigurationInsert = Database['public']['Tables']['sidebar_configurations']['Insert'];
export type SidebarSectionInsert = Database['public']['Tables']['sidebar_sections']['Insert'];
export type SidebarItemInsert = Database['public']['Tables']['sidebar_items']['Insert'];
export type UserSidebarPreferencesInsert = Database['public']['Tables']['user_sidebar_preferences']['Insert'];

export type SidebarConfigurationUpdate = Database['public']['Tables']['sidebar_configurations']['Update'];
export type SidebarSectionUpdate = Database['public']['Tables']['sidebar_sections']['Update'];
export type SidebarItemUpdate = Database['public']['Tables']['sidebar_items']['Update'];
export type UserSidebarPreferencesUpdateDb = Database['public']['Tables']['user_sidebar_preferences']['Update'];

// Profile type enum from database
export type ProfileTypeEnum = Database['public']['Enums']['profile_type'];

// =====================================================
// ADMIN CONFIGURATION INTERFACES
// =====================================================

export interface AdminSidebarConfiguration {
  id: string;
  name: string;
  description?: string;
  targetRoleIds: string[];
  targetProfileTypeEnums: ProfileTypeEnum[];
  minRolePriority?: number;
  organizationId?: string;
  configurationData: AdminSidebarData;
  isActive: boolean;
  isDefault: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSidebarData {
  sections: AdminSidebarSection[];
  globalSettings?: AdminSidebarGlobalSettings;
  [key: string]: any; // Allow additional properties for Json compatibility
}

export interface AdminSidebarSection {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  displayOrder: number;
  requiredPermissions?: string[];
  requiredRoleIds?: string[];
  minRolePriority?: number;
  profileTypes?: ProfileTypeEnum[];
  isActive: boolean;
  items: AdminSidebarItem[];
}

export interface AdminSidebarItem {
  id: string;
  itemId: string;
  sectionId: string;
  label: string;
  href: string;
  icon?: string;
  iconName?: string; // Added for icon picker compatibility
  description?: string;
  displayOrder: number;
  requiredPermissions?: string[];
  requiredRoleIds?: string[];
  minRolePriority?: number;
  profileTypes?: ProfileTypeEnum[];
  isVisible: boolean;
  isActive: boolean;
}

export interface AdminSidebarGlobalSettings {
  defaultCollapsed?: boolean;
  allowUserCustomization?: boolean;
  theme?: 'light' | 'dark' | 'system';
  compactMode?: boolean;
}

// =====================================================
// CONFIGURATION MANAGEMENT INTERFACES
// =====================================================

export interface SidebarConfigurationFilter {
  roleIds?: string[];
  profileTypes?: ProfileTypeEnum[];
  organizationId?: string;
  isActive?: boolean;
  isDefault?: boolean;
  minRolePriority?: number;
}

export interface SidebarConfigurationCreateRequest {
  name: string;
  description?: string;
  targetRoleIds: string[];
  targetProfileTypeEnums: ProfileTypeEnum[];
  minRolePriority?: number;
  organizationId?: string;
  configurationData: AdminSidebarData;
  isDefault?: boolean;
}

export interface SidebarConfigurationUpdateRequest {
  name?: string;
  description?: string;
  targetRoleIds?: string[];
  targetProfileTypeEnums?: ProfileTypeEnum[];
  minRolePriority?: number;
  organizationId?: string;
  configurationData?: AdminSidebarData;
  isActive?: boolean;
  isDefault?: boolean;
}

// =====================================================
// PERMISSION AND ROLE MANAGEMENT
// =====================================================

export interface PermissionOption {
  name: string;
  description: string;
  category?: string;
}

export interface RoleOption {
  id: string;
  name: string;
  priority: number;
  description?: string;
}

export interface ProfileTypeOption {
  value: ProfileTypeEnum;
  label: string;
  description?: string;
}

// =====================================================
// USER PREFERENCES
// =====================================================

export interface UserSidebarPreferences {
  id: string;
  userId: string;
  organizationId: string;
  collapsedSections: string[];
  hiddenItems: string[];
  customOrder?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface UserSidebarPreferencesUpdate {
  collapsedSections?: string[];
  hiddenItems?: string[];
  customOrder?: Record<string, number>;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface SidebarConfigurationResponse {
  configuration: AdminSidebarConfiguration;
  permissions: PermissionOption[];
  roles: RoleOption[];
  profileTypes: ProfileTypeOption[];
  availableIcons: string[];
}

export interface SidebarConfigurationsListResponse {
  configurations: AdminSidebarConfiguration[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SidebarAdminMetadata {
  permissions: PermissionOption[];
  roles: RoleOption[];
  profileTypes: ProfileTypeOption[];
  availableIcons: string[];
}

// =====================================================
// VALIDATION TYPES
// =====================================================

export interface SidebarConfigurationValidation {
  isValid: boolean;
  errors: SidebarValidationError[];
  warnings: SidebarValidationWarning[];
}

export interface SidebarValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SidebarValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// =====================================================
// IMPORT/EXPORT TYPES
// =====================================================

export interface SidebarConfigurationExport {
  version: string;
  exportedAt: string;
  exportedBy: string;
  configurations: AdminSidebarConfiguration[];
  metadata: SidebarAdminMetadata;
}

export interface SidebarConfigurationImportRequest {
  configurations: Omit<AdminSidebarConfiguration, 'id' | 'createdAt' | 'updatedAt'>[];
  replaceExisting?: boolean;
  organizationId?: string;
}

export interface SidebarConfigurationImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    configurationName: string;
    error: string;
  }>;
}

// =====================================================
// CONSTANTS
// =====================================================

export const SIDEBAR_PROFILE_TYPES: ProfileTypeOption[] = [
  { 
    value: 'investor', 
    label: 'Investor', 
    description: 'Investment clients and individual investors' 
  },
  { 
    value: 'issuer', 
    label: 'Issuer', 
    description: 'Token issuers and asset creators' 
  },
  { 
    value: 'service provider', 
    label: 'Service Provider', 
    description: 'External service providers and consultants' 
  },
  { 
    value: 'super admin', 
    label: 'Super Administrator', 
    description: 'System administrators and operators' 
  }
] as const;

export const SIDEBAR_DEFAULT_ROLE_PRIORITIES = {
  VIEWER: 50,
  AGENT: 60,
  OPERATIONS: 70,
  COMPLIANCE_OFFICER: 80,
  OWNER: 90,
  SUPER_ADMIN: 100
} as const;

export const SIDEBAR_VALIDATION_RULES = {
  MAX_SECTIONS: 20,
  MAX_ITEMS_PER_SECTION: 50,
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_ROLE_PRIORITY: 10,
  MAX_ROLE_PRIORITY: 100
} as const;
