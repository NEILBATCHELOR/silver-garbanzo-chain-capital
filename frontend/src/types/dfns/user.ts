/**
 * DFNS User Management Types - Complete type definitions for user management
 * 
 * These types provide full TypeScript support for DFNS User Management API
 * including validation schemas and request/response interfaces.
 */

// ===== Core User Types =====

export interface DfnsUser {
  userId: string;
  kind: DfnsUserKind;
  username: string;
  name?: string;
  orgId: string;
  isActive: boolean;
  isRegistered: boolean;
  permissionAssignments: DfnsUserPermissionAssignment[];
  externalId?: string;
  dateCreated: string;
  dateUpdated: string;
  lastLoginAt?: string;
  email?: string;
  status: DfnsUserStatus;
}

export enum DfnsUserKind {
  CustomerEmployee = 'CustomerEmployee',
  EndUser = 'EndUser'
}

export enum DfnsUserStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Pending = 'Pending',
  Archived = 'Archived'
}

// ===== User Management Request/Response Types =====

export interface CreateUserRequest {
  email: string;
  kind: DfnsUserKind.CustomerEmployee;
  externalId?: string;
}

export interface CreateUserResponse extends DfnsUser {}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserResponse extends DfnsUser {}

export interface ListUsersRequest {
  limit?: number;
  paginationToken?: string;
}

export interface ListUsersResponse {
  items: DfnsUser[];
  nextPageToken?: string;
  totalCount?: number;
}

export interface ActivateUserRequest {
  userId: string;
}

export interface ActivateUserResponse extends DfnsUser {}

export interface DeactivateUserRequest {
  userId: string;
}

export interface DeactivateUserResponse extends DfnsUser {}

export interface ArchiveUserRequest {
  userId: string;
}

// ===== Permission Assignment Types =====

export interface DfnsUserPermissionAssignment {
  permissionId: string;
  assignedAt: string;
  assignedBy: string;
  status: DfnsPermissionAssignmentStatus;
  assignmentId?: string;
}

export enum DfnsPermissionAssignmentStatus {
  Active = 'Active',
  Revoked = 'Revoked'
}

// ===== User Search and Filter Types =====

export interface UserSearchCriteria {
  email?: string;
  username?: string;
  externalId?: string;
  status?: DfnsUserStatus;
  kind?: DfnsUserKind;
  isActive?: boolean;
  isRegistered?: boolean;
}

export interface UserFilterOptions {
  status?: DfnsUserStatus[];
  kind?: DfnsUserKind[];
  hasPermissions?: boolean;
  registeredAfter?: string;
  registeredBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

// ===== User Validation Types =====

export interface UserValidationResult {
  isValid: boolean;
  errors: UserValidationError[];
}

export interface UserValidationError {
  field: string;
  message: string;
  code: string;
}

// ===== User Management Service Interface =====

export interface DfnsUserManagementService {
  listUsers(request?: ListUsersRequest): Promise<ListUsersResponse>;
  createUser(request: CreateUserRequest): Promise<CreateUserResponse>;
  getUser(userId: string): Promise<GetUserResponse>;
  activateUser(userId: string): Promise<ActivateUserResponse>;
  deactivateUser(userId: string): Promise<DeactivateUserResponse>;
  archiveUser(userId: string): Promise<void>;
  userExists(userId: string): Promise<boolean>;
  findUserByEmail(email: string): Promise<DfnsUser | null>;
  searchUsers(criteria: UserSearchCriteria): Promise<DfnsUser[]>;
  validateUser(user: Partial<DfnsUser>): UserValidationResult;
}

// ===== User Management Configuration =====

export interface UserManagementConfig {
  autoActivateUsers: boolean;
  defaultPermissions: string[];
  emailNotifications: boolean;
  userExpirationDays?: number;
  maxUsersPerOrg?: number;
}

// ===== User Activity and Audit Types =====

export interface UserActivity {
  userId: string;
  activityType: UserActivityType;
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export enum UserActivityType {
  Created = 'Created',
  Activated = 'Activated',
  Deactivated = 'Deactivated',
  Archived = 'Archived',
  Login = 'Login',
  Logout = 'Logout',
  PermissionGranted = 'PermissionGranted',
  PermissionRevoked = 'PermissionRevoked',
  ProfileUpdated = 'ProfileUpdated'
}

// ===== Error Types =====

export interface UserManagementError {
  code: UserManagementErrorCode;
  message: string;
  userId?: string;
  details?: Record<string, any>;
}

export enum UserManagementErrorCode {
  UserNotFound = 'USER_NOT_FOUND',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  InvalidEmail = 'INVALID_EMAIL',
  PermissionDenied = 'PERMISSION_DENIED',
  UserAlreadyActive = 'USER_ALREADY_ACTIVE',
  UserAlreadyInactive = 'USER_ALREADY_INACTIVE',
  UserCannotBeArchived = 'USER_CANNOT_BE_ARCHIVED',
  InvalidUserKind = 'INVALID_USER_KIND',
  ExternalIdConflict = 'EXTERNAL_ID_CONFLICT',
  OrgUserLimitExceeded = 'ORG_USER_LIMIT_EXCEEDED'
}

// ===== Validation Utilities =====

export const UserValidationUtils = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidUserId: (userId: string): boolean => {
    return userId && userId.length > 0 && userId.trim() === userId;
  },
  
  isValidUserKind: (kind: string): kind is DfnsUserKind => {
    return Object.values(DfnsUserKind).includes(kind as DfnsUserKind);
  },
  
  validateCreateUserRequest: (request: CreateUserRequest): UserValidationResult => {
    const errors: UserValidationError[] = [];
    
    if (!request.email || !UserValidationUtils.isValidEmail(request.email)) {
      errors.push({
        field: 'email',
        message: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      });
    }
    
    if (!request.kind || !UserValidationUtils.isValidUserKind(request.kind)) {
      errors.push({
        field: 'kind',
        message: 'Valid user kind is required',
        code: 'INVALID_USER_KIND'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
