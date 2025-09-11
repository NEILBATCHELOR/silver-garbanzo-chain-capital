/**
 * DFNS Service Account Types
 * 
 * Types for DFNS Service Account Management API endpoints
 * API Documentation: https://docs.dfns.co/d/api-docs/authentication/service-account-management
 */

import type { DfnsUserKind } from './core';
import type { DfnsPermissionAssignment } from './users';

// ===== Core Service Account Types =====

/**
 * Service Account User Info
 * Part of the service account response structure
 */
export interface DfnsServiceAccountUserInfo {
  username: string;
  userId: string;
  kind: DfnsUserKind; // Always 'CustomerEmployee' for service accounts
  credentialUuid: string;
  orgId: string;
  permissions: string[];
  scopes: string[];
  isActive: boolean;
  isServiceAccount: boolean; // Always true for service accounts
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}

/**
 * Service Account Access Token
 * Contains token information for service accounts
 */
export interface DfnsServiceAccountAccessToken {
  accessToken?: string; // Only returned during creation
  dateCreated: string;
  credId: string;
  isActive: boolean;
  kind: string;
  linkedUserId: string;
  linkedAppId: string;
  name: string;
  orgId: string;
  permissionAssignments: DfnsPermissionAssignment[];
  publicKey: string;
  tokenId: string;
}

/**
 * Complete Service Account Response
 * Used for all service account operations
 */
export interface DfnsServiceAccountResponse {
  userInfo: DfnsServiceAccountUserInfo;
  accessTokens: DfnsServiceAccountAccessToken[];
}

// ===== API Request/Response Types =====

/**
 * List Service Accounts API
 * GET /auth/service-accounts
 */
export interface DfnsListServiceAccountsRequest {
  limit?: number;
  paginationToken?: string;
}

export interface DfnsListServiceAccountsResponse {
  items: DfnsServiceAccountResponse[];
  nextPageToken?: string;
}

/**
 * Create Service Account API  
 * POST /auth/service-accounts
 */
export interface DfnsCreateServiceAccountRequest {
  name: string; // Must be unique within the organization
  publicKey: string; // Public key for request signing
  daysValid?: number; // Optional, max 730 days
  permissionId?: string; // Optional, defaults to caller's permissions
  externalId?: string; // Optional, for external system correlation
}

export interface DfnsCreateServiceAccountResponse extends DfnsServiceAccountResponse {
  // Note: accessToken is included in accessTokens[0].accessToken during creation
}

/**
 * Get Service Account API
 * GET /auth/service-accounts/{serviceAccountId}
 */
export interface DfnsGetServiceAccountResponse extends DfnsServiceAccountResponse {}

/**
 * Update Service Account API
 * PUT /auth/service-accounts/{serviceAccountId}
 */
export interface DfnsUpdateServiceAccountRequest {
  name?: string; // Must be unique within the organization
  externalId?: string; // User defined value for external system correlation
}

export interface DfnsUpdateServiceAccountResponse extends DfnsServiceAccountResponse {}

/**
 * Activate Service Account API
 * PUT /auth/service-accounts/{serviceAccountId}/activate
 */
export interface DfnsActivateServiceAccountResponse extends DfnsServiceAccountResponse {
  // userInfo.isActive will be true after activation
}

/**
 * Deactivate Service Account API
 * PUT /auth/service-accounts/{serviceAccountId}/deactivate
 */
export interface DfnsDeactivateServiceAccountResponse extends DfnsServiceAccountResponse {
  // userInfo.isActive will be false after deactivation
}

/**
 * Archive Service Account API
 * DELETE /auth/service-accounts/{serviceAccountId}
 */
export interface DfnsArchiveServiceAccountResponse extends DfnsServiceAccountResponse {
  // userInfo.isActive will be false after archiving
}

// ===== Service-Specific Interfaces =====

/**
 * Service Account List Filters
 * For client-side filtering of service accounts
 */
export interface ServiceAccountListFilters {
  isActive?: boolean;
  search?: string; // Search by name or username
  hasPermissions?: boolean;
  limit?: number;
  paginationToken?: string;
}

/**
 * Service Account Statistics
 * For analytics and dashboard displays
 */
export interface ServiceAccountStatistics {
  totalServiceAccounts: number;
  activeServiceAccounts: number;
  inactiveServiceAccounts: number;
  serviceAccountsWithPermissions: number;
  serviceAccountsWithTokens: number;
  totalAccessTokens: number;
  activeAccessTokens: number;
}

/**
 * Service Account Operation Result
 * Standard result wrapper for service operations
 */
export interface ServiceAccountOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  serviceAccountId?: string;
  requiresUserAction?: boolean;
  nextStep?: string;
}

/**
 * Create Service Account Options
 * Extended options for service account creation
 */
export interface CreateServiceAccountOptions {
  name: string;
  publicKey: string;
  daysValid?: number; // Default: 365, max: 730
  permissionId?: string; // If not provided, inherits caller's permissions
  externalId?: string;
  autoAssignPermissions?: string[]; // Additional permission IDs to assign
  description?: string; // For documentation purposes
}

/**
 * Service Account Summary
 * Lightweight representation for lists and summaries
 */
export interface ServiceAccountSummary {
  userId: string;
  username: string;
  isActive: boolean;
  hasActiveTokens: boolean;
  tokenCount: number;
  permissionCount: number;
  dateCreated: string;
  lastTokenCreated?: string;
  externalId?: string;
}

// ===== Validation Types =====

/**
 * Service Account Validation Result
 * For validating service account operations
 */
export interface ServiceAccountValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canCreate: boolean;
  canUpdate: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canArchive: boolean;
  missingPermissions: string[];
  recommendations: string[];
}
