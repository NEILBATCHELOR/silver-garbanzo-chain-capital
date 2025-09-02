/**
 * User and Role Services Module
 * Centralized exports for all user and role-related services
 */

// Main services
export { UserRoleService } from './UserRoleService'
export { UserRoleValidationService } from './UserRoleValidationService'
export { UserRoleAnalyticsService } from './UserRoleAnalyticsService'

// Types - re-export from types directory
export type {
  // Core interfaces
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  UserStatus,
  
  // Request/Response types
  UserCreateRequest,
  UserUpdateRequest,
  RoleCreateRequest,
  RoleUpdateRequest,
  PermissionAssignmentRequest,
  PasswordResetRequest,
  BulkUserUpdateRequest,
  UserQueryOptions,
  RoleQueryOptions,
  
  // Response types
  UserResponse,
  RoleResponse,
  UserCreationResult,
  RoleAssignmentResult,
  PermissionAssignmentResult,
  
  // Analytics types
  UserStatistics,
  RoleStatistics,
  PermissionStatistics,
  UserAnalytics,
  
  // Validation types
  UserValidationResult,
  RoleValidationResult,
  PermissionMatrix,
  PermissionMatrixEntry,
  
  // Audit types
  UserAuditEntry,
  SecurityEvent,
  
  // Export types
  UserExportOptions,
  RoleExportOptions,
  
  // Service result types
  UserServiceResult,
  UserApiResponse,
  UserPaginatedResponse,
  UsersResponse,
  RolesResponse,
  PermissionsResponse
} from '@/types/user-role-service'

// Default exports for convenience
export { UserRoleService as default } from './UserRoleService'
