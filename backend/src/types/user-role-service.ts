/**
 * User and Role Service Types
 * Comprehensive type definitions for user management, roles, permissions, and related operations
 */

import { AuthUser } from './auth'
import { ApiResponse, PaginatedResponse, ServiceResult } from './api'

/**
 * User Status Enumeration
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'blocked' | 'invited'

/**
 * Core User Interface (extending database model)
 */
export interface User extends Omit<AuthUser, 'role' | 'permissions'> {
  id: string
  name: string
  email: string
  status: UserStatus
  publicKey?: string | null
  encryptedPrivateKey?: string | null
  createdAt: Date
  updatedAt: Date
  // Computed/joined fields
  role?: Role
  permissions?: Permission[]
}

/**
 * Role Interface
 */
export interface Role {
  id: string
  name: string
  description: string
  priority: number
  createdAt: Date
  updatedAt: Date
  // Computed/joined fields  
  permissions?: Permission[]
  userCount?: number
}

/**
 * Permission Interface
 */
export interface Permission {
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  // Computed fields
  roleCount?: number
}

/**
 * User-Role Assignment Interface
 */
export interface UserRole {
  userId: string
  roleId: string
  createdAt: Date
  updatedAt: Date
  user?: User
  role?: Role
}

/**
 * Role-Permission Assignment Interface
 */
export interface RolePermission {
  roleId: string
  permissionName: string
  createdAt: Date
  role?: Role
  permission?: Permission
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * User Creation Request
 */
export interface UserCreateRequest {
  name: string
  email: string
  roleId: string
  password?: string
  status?: UserStatus
  publicKey?: string | null
  encryptedPrivateKey?: string | null
  sendInvite?: boolean
  autoGeneratePassword?: boolean
}

/**
 * User Update Request
 */
export interface UserUpdateRequest {
  name?: string
  email?: string
  roleId?: string
  status?: UserStatus
  publicKey?: string | null
  encryptedPrivateKey?: string | null
}

/**
 * Role Creation Request
 */
export interface RoleCreateRequest {
  name: string
  description: string
  priority: number
  permissions?: string[]
}

/**
 * Role Update Request
 */
export interface RoleUpdateRequest {
  name?: string
  description?: string
  priority?: number
  permissions?: string[]
}

/**
 * Permission Assignment Request
 */
export interface PermissionAssignmentRequest {
  roleId: string
  permissionNames: string[]
}

/**
 * Password Reset Request
 */
export interface PasswordResetRequest {
  userId: string
  newPassword?: string
  sendEmail?: boolean
  autoGenerate?: boolean
}

/**
 * Bulk User Update Request
 */
export interface BulkUserUpdateRequest {
  userIds: string[]
  updates: Partial<UserUpdateRequest>
}

/**
 * User Query Options
 */
export interface UserQueryOptions {
  page?: number
  limit?: number
  search?: string
  status?: UserStatus[]
  roleId?: string
  roleName?: string
  includeRole?: boolean
  includePermissions?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

/**
 * Role Query Options
 */
export interface RoleQueryOptions {
  page?: number
  limit?: number
  search?: string
  includePermissions?: boolean
  includeUserCount?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// ANALYTICS & STATISTICS
// ============================================================================

/**
 * User Statistics
 */
export interface UserStatistics {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  pendingUsers: number
  blockedUsers: number
  usersWithMFA: number
  averageSessionTime: number
  newUsersThisMonth: number
  growthRate: number
  usersByRole: Record<string, number>
  usersByStatus: Record<string, number>
  recentSignups: User[]
  recentlyCreated: User[]
  topActiveUsers: User[]
}

/**
 * Role Statistics
 */
export interface RoleStatistics {
  totalRoles: number
  systemRoles: number
  customRoles: number
  rolesWithUsers: number
  unusedRoles: number
  averagePermissionsPerRole: number
  roleDistribution: Array<{
    roleName: string
    userCount: number
    percentage: number
  }>
  roleUsageDistribution: Record<string, number>
  permissionUsage: Array<{
    permissionName: string
    roleCount: number
    userCount: number
  }>
}

/**
 * Permission Statistics  
 */
export interface PermissionStatistics {
  totalPermissions: number
  assignedPermissions: number
  unassignedPermissions: number
  mostUsedPermissions: Array<{
    name: string
    roleCount: number
    userCount: number
  }>
  leastUsedPermissions: Array<{
    name: string
    roleCount: number
    userCount: number
  }>
}

/**
 * User Analytics
 */
export interface UserAnalytics {
  overview: UserStatistics
  timeline: Array<{
    date: string
    newUsers: number
    activeUsers: number
    totalUsers: number
  }>
  demographics: {
    statusDistribution: Record<string, number>
    roleDistribution: Record<string, number>
    activityLevels: Record<string, number>
  }
  security: {
    mfaAdoption: number
    passwordStrength: Record<string, number>
    recentLogins: number
    suspiciousActivity: number
  }
}

// ============================================================================
// VALIDATION & BUSINESS LOGIC
// ============================================================================

/**
 * User Validation Result
 */
export interface UserValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  completionPercentage: number
  missingFields: string[]
}

/**
 * Role Validation Result
 */
export interface RoleValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  permissionConflicts: string[]
  securityConcerns: string[]
}

/**
 * Permission Matrix Entry
 */
export interface PermissionMatrixEntry {
  roleId: string
  roleName: string
  permissionName: string
  permissionDescription: string
  hasPermission: boolean
  inherited?: boolean
}

/**
 * Permission Matrix
 */
export interface PermissionMatrix {
  roles: Role[]
  permissions: Permission[]
  assignments: PermissionMatrixEntry[]
}

// ============================================================================
// AUDIT & SECURITY
// ============================================================================

/**
 * User Audit Entry
 */
export interface UserAuditEntry {
  id: string
  userId: string
  action: string
  details: Record<string, any>
  performedBy: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * Security Event
 */
export interface SecurityEvent {
  id: string
  userId: string
  eventType: 'login' | 'logout' | 'password_change' | 'role_change' | 'permission_change' | 'suspicious_activity'
  details: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  resolved: boolean
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * User Response (with computed fields)
 */
export interface UserResponse extends User {
  roleCount?: number
  permissionCount?: number
  lastLoginAt?: Date
  loginCount?: number
  mfaEnabled?: boolean
}

/**
 * User Creation Response
 */
export interface UserCreationResult {
  user: UserResponse
  temporaryPassword?: string
  invitationSent: boolean
  validation: UserValidationResult
}

/**
 * Role Response (with computed fields)
 */
export interface RoleResponse extends Role {
  userCount: number
  permissionCount: number
  isSystemRole: boolean
}

/**
 * Role Assignment Response
 */
export interface RoleAssignmentResult {
  userId: string
  oldRoleId?: string
  newRoleId: string
  permissionsChanged: string[]
  effectiveDate: Date
}

/**
 * Permission Assignment Response
 */
export interface PermissionAssignmentResult {
  roleId: string
  addedPermissions: string[]
  removedPermissions: string[]
  totalPermissions: number
  affectedUsers: number
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

/**
 * User Export Options
 */
export interface UserExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  fields?: string[]
  includeRoles?: boolean
  includePermissions?: boolean
  includeAuditTrail?: boolean
  dateRange?: {
    from: string
    to: string
  }
  filters?: UserQueryOptions
}

/**
 * Role Export Options
 */
export interface RoleExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  includePermissions?: boolean
  includeUserCount?: boolean
  includeUsers?: boolean
}

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

export type UserServiceResult<T = any> = ServiceResult<T>
export type UserApiResponse<T = any> = ApiResponse<T>
export type UserPaginatedResponse<T = any> = PaginatedResponse<T>

// Standard response types
export type UsersResponse = UserPaginatedResponse<UserResponse>
export type RolesResponse = UserPaginatedResponse<RoleResponse>
export type PermissionsResponse = UserPaginatedResponse<Permission>

// ============================================================================
// ADDITIONAL TYPES FOR SERVICES
// ============================================================================

/**
 * Generic validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  completionPercentage: number
  missingFields: string[]
}

/**
 * Date range interface
 */
export interface DateRange {
  from: string
  to: string
}

/**
 * User list request parameters
 */
export interface UserListRequest {
  page?: number
  limit?: number
  search?: string
  status?: UserStatus[]
  roleId?: string
  includeRole?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * User list response
 */
export interface UserListResponse {
  data: UserResponse[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
  }
}

/**
 * Role list request parameters
 */
export interface RoleListRequest {
  page?: number
  limit?: number
  search?: string
  includePermissions?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Role list response
 */
export interface RoleListResponse {
  data: RoleResponse[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
  }
}

/**
 * User timeline data
 */
export interface UserTimelineData {
  date: string
  newUsers: number
  activeUsers: number
  totalUsers: number
  cumulativeUsers: number
}

/**
 * User demographics
 */
export interface UserDemographics {
  statusDistribution: Record<string, number>
  roleDistribution: Record<string, number>
  activityLevels: Record<string, number>
  byStatus: Record<string, number>
  byRole: Record<string, number>
}

/**
 * Security metrics
 */
export interface SecurityMetrics {
  mfaAdoption: number
  passwordStrength: Record<string, number>
  suspiciousActivity: number
  usersWithoutMFA: number
  recentLogins: number
  failedLoginAttempts: number
  accountsAtRisk: number
}

/**
 * User bulk update request
 */
export interface UserBulkUpdateRequest {
  userIds: string[]
  updates: Partial<UserUpdateRequest>
}

/**
 * Security assessment
 */
export interface SecurityAssessment {
  riskLevel: 'low' | 'medium' | 'high'
  issues: string[]
  recommendations: string[]
}
