/**
 * DFNS Service Account Types
 * 
 * Types for DFNS service account management APIs
 */

import type { DfnsPermissionAssignment } from './users';

// ===== DFNS Service Account Core Types =====

// Service Account User Info (from API responses)
export interface DfnsServiceAccountUserInfo {
  username: string;
  userId: string;
  kind: 'CustomerEmployee'; // Service accounts are always CustomerEmployee
  credentialUuid: string;
  orgId: string;
  permissions: string[];
  scopes: string[];
  isActive: boolean;
  isServiceAccount: true; // Always true for service accounts
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}

// Service Account Access Token
export interface DfnsServiceAccountAccessToken {
  accessToken?: string; // Only present in create response
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

// Complete Service Account Info (from API responses)
export interface DfnsServiceAccountInfo {
  userInfo: DfnsServiceAccountUserInfo;
  accessTokens: DfnsServiceAccountAccessToken[];
  // Add missing properties for compatibility
  userId: string;
  name: string;
  isActive: boolean;
  publicKey: string;
}

// Service Account Response Aliases for compatibility
export interface DfnsServiceAccountResponse extends DfnsServiceAccountInfo {}
export interface DfnsGetServiceAccountResponse extends DfnsServiceAccountInfo {}

// ===== DFNS Service Account Management APIs =====

// List Service Accounts API
export interface DfnsListServiceAccountsRequest {
  limit?: number;
  paginationToken?: string;
}

export interface DfnsListServiceAccountsResponse {
  items: DfnsServiceAccountInfo[];
  nextPageToken?: string;
}

// Create Service Account API
export interface DfnsCreateServiceAccountRequest {
  name: string;
  publicKey: string;
  daysValid?: number; // Optional, max 730 days
  permissionId?: string; // Optional, inherits caller permissions if not provided
  externalId?: string; // Optional, user-defined correlation value
}

export interface DfnsCreateServiceAccountResponse extends DfnsServiceAccountInfo {
  // Same as DfnsServiceAccountInfo but access tokens will include accessToken field
}

// Get Service Account API Response
export interface DfnsGetServiceAccountResponse extends DfnsServiceAccountInfo {
  // Same as DfnsServiceAccountInfo
}

// Update Service Account API
export interface DfnsUpdateServiceAccountRequest {
  name?: string; // Optional, must be unique within org
  externalId?: string; // Optional, user-defined correlation value
}

export interface DfnsUpdateServiceAccountResponse extends DfnsServiceAccountInfo {
  // Same as DfnsServiceAccountInfo
}

// Activate Service Account API Response
export interface DfnsActivateServiceAccountResponse extends DfnsServiceAccountInfo {
  // userInfo.isActive will be true after activation
}

// Deactivate Service Account API Response
export interface DfnsDeactivateServiceAccountResponse extends DfnsServiceAccountInfo {
  // userInfo.isActive will be false after deactivation
}

// Archive Service Account API Response
export interface DfnsArchiveServiceAccountResponse extends DfnsServiceAccountInfo {
  // userInfo.isActive will be false after archiving
}

// ===== Service Account Options and Validation =====

// Options for service account operations
export interface DfnsServiceAccountOptions {
  syncToDatabase?: boolean; // Whether to sync to local database
  validatePermissions?: boolean; // Whether to validate permission assignments
  autoActivate?: boolean; // Whether to auto-activate on creation
}

// Service Account validation constraints
export interface DfnsServiceAccountConstraints {
  maxNameLength: 255;
  minNameLength: 1;
  maxDaysValid: 730;
  minDaysValid: 1;
  maxExternalIdLength: 255;
}

// Service Account status type
export type DfnsServiceAccountStatus = 'Active' | 'Inactive';

// Service Account kind (always CustomerEmployee for service accounts)
export type DfnsServiceAccountKind = 'CustomerEmployee';

// ===== Helper Types =====

// Service Account creation parameters with validation
export interface DfnsValidatedServiceAccountParams {
  name: string;
  publicKey: string;
  daysValid: number; // Will be set to default if not provided
  permissionId?: string;
  externalId?: string;
}

// Service Account update parameters with validation
export interface DfnsValidatedUpdateParams {
  name?: string;
  externalId?: string;
}

// Service Account summary for lists and overviews
export interface DfnsServiceAccountSummary {
  userId: string;
  name: string;
  status: DfnsServiceAccountStatus;
  orgId: string;
  isActive: boolean;
  activeTokensCount: number;
  permissionCount: number;
  createdAt: string;
  lastActiveAt?: string;
}

// Service Account batch operation result
export interface DfnsServiceAccountBatchResult {
  successful: string[]; // Array of user IDs that succeeded
  failed: Array<{
    userId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}
