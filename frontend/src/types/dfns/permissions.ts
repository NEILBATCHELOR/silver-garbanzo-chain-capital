/**
 * DFNS Permissions Types
 * 
 * Types for DFNS permissions and policy management, including DFNS API types
 */

import type { DfnsStatus } from './core';

// =============================================================================
// DFNS PERMISSIONS API TYPES (for DFNS SDK integration)
// =============================================================================

// DFNS Permission Operations (70+ available operations)
export type DfnsPermissionOperation = 
  // Auth Operations
  | 'Auth:Users:Create' | 'Auth:Users:Read' | 'Auth:Users:Update' | 'Auth:Users:Delete'
  | 'Auth:Users:Activate' | 'Auth:Users:Deactivate' | 'Auth:Users:Archive'
  | 'Auth:ServiceAccounts:Create' | 'Auth:ServiceAccounts:Read' | 'Auth:ServiceAccounts:Update' 
  | 'Auth:ServiceAccounts:Delete' | 'Auth:ServiceAccounts:Activate' | 'Auth:ServiceAccounts:Deactivate'
  | 'Auth:ServiceAccounts:Archive' | 'Auth:PersonalAccessTokens:Create' | 'Auth:PersonalAccessTokens:Read'
  | 'Auth:PersonalAccessTokens:Update' | 'Auth:PersonalAccessTokens:Delete' | 'Auth:PersonalAccessTokens:Activate'
  | 'Auth:PersonalAccessTokens:Deactivate' | 'Auth:PersonalAccessTokens:Archive'
  | 'Auth:Credentials:Create' | 'Auth:Credentials:Read' | 'Auth:Credentials:Update' | 'Auth:Credentials:Delete'
  | 'Auth:Credentials:Activate' | 'Auth:Credentials:Deactivate'
  // Wallet Operations
  | 'Wallets:Create' | 'Wallets:Read' | 'Wallets:Update' | 'Wallets:Delete'
  | 'Wallets:Transactions:Create' | 'Wallets:Transactions:Read' | 'Wallets:Transfers:Create' | 'Wallets:Transfers:Read'
  | 'Wallets:Assets:Read' | 'Wallets:History:Read' | 'Wallets:Nfts:Read'
  // Key Operations
  | 'Keys:Create' | 'Keys:Read' | 'Keys:Update' | 'Keys:Delete' | 'Keys:Signatures:Create' | 'Keys:Signatures:Read'
  | 'Keys:Export' | 'Keys:Import' | 'Keys:Delegate'
  // Permission Operations
  | 'Permissions:Create' | 'Permissions:Read' | 'Permissions:Update' | 'Permissions:Delete'
  | 'Permissions:Assign' | 'Permissions:Revoke' | 'Permissions:Assignments:Read'
  // Policy Operations
  | 'Policies:Create' | 'Policies:Read' | 'Policies:Update' | 'Policies:Delete' | 'Policies:Archive'
  | 'Policies:Approvals:Create' | 'Policies:Approvals:Read' | 'Policies:Approvals:Update'
  // Exchange Operations
  | 'Exchange:Read' | 'Exchange:Trade' | 'Exchange:Withdraw'
  // Fiat Operations
  | 'Fiat:OnRamp:Create' | 'Fiat:OffRamp:Create' | 'Fiat:Quotes:Read' | 'Fiat:Transactions:Read'
  // Organization Operations
  | 'Organization:Read' | 'Organization:Update'
  // Add more as needed based on DFNS documentation
  ;

// DFNS Permission Resource Types
export type DfnsPermissionResource = 
  | 'Auth:*' | 'Auth:Users' | 'Auth:ServiceAccounts' | 'Auth:PersonalAccessTokens' | 'Auth:Credentials'
  | 'Wallets:*' | 'Wallets' | 'Wallets:Transactions' | 'Wallets:Transfers' | 'Wallets:Assets'
  | 'Keys:*' | 'Keys' | 'Keys:Signatures'
  | 'Permissions:*' | 'Permissions' | 'Permissions:Assignments'
  | 'Policies:*' | 'Policies' | 'Policies:Approvals'
  | 'Exchange:*' | 'Exchange:Accounts' | 'Exchange:Balances'
  | 'Fiat:*' | 'Fiat:Transactions' | 'Fiat:Quotes'
  | 'Organization:*' | 'Organization'
  | '*' // Wildcard for all resources
  ;

// Permission Effect Types
export type DfnsPermissionEffect = 'Allow' | 'Deny';

// Base Permission Type
export interface DfnsPermission {
  id: string;
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect: DfnsPermissionEffect;
  condition?: Record<string, any>;
  status: 'Active' | 'Inactive';
  description?: string;
  category?: string;
  dateCreated: string;
  dateUpdated: string;
}

// Permission Response Type (alias for consistency)
export interface DfnsPermissionResponse extends DfnsPermission {}

// Core Permission Management APIs

// GET /permissions - List Permissions
export interface DfnsListPermissionsRequest {
  limit?: number;
  paginationToken?: string;
}

export interface DfnsListPermissionsResponse {
  items: DfnsPermissionResponse[];
  nextPageToken?: string;
}

// GET /permissions/{permissionId} - Get Permission
export interface DfnsGetPermissionResponse {
  id: string;
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  status: 'Active' | 'Inactive';
  isActive?: boolean; // Computed property for compatibility
  description?: string;
  category?: string;
  dateCreated: string;
  dateUpdated: string;
}

// POST /permissions - Create Permission
export interface DfnsCreatePermissionRequest {
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect?: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  description?: string;
  category?: string;
}

export interface DfnsCreatePermissionResponse {
  id: string;
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  status: 'Active';
  description?: string;
  category?: string;
  dateCreated: string;
  dateUpdated: string;
}

// PUT /permissions/{permissionId} - Update Permission
export interface DfnsUpdatePermissionRequest {
  name?: string;
  operations?: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect?: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  description?: string;
  category?: string;
}

export interface DfnsUpdatePermissionResponse {
  id: string;
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  status: 'Active' | 'Inactive';
  description?: string;
  category?: string;
  dateCreated: string;
  dateUpdated: string;
}

// DELETE /permissions/{permissionId} - Archive Permission
export interface DfnsArchivePermissionResponse {
  id: string;
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  status: 'Inactive';
  description?: string;
  category?: string;
  dateCreated: string;
  dateUpdated: string;
  dateArchived: string;
}

// Permission Assignment Management APIs

// POST /permissions/assignments - Assign Permission
export interface DfnsAssignPermissionRequest {
  permissionId: string;
  identityId: string;
  identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
}

// Alias for compatibility
export interface DfnsCreatePermissionAssignmentRequest extends DfnsAssignPermissionRequest {}

export interface DfnsAssignPermissionResponse {
  id: string;
  permissionId: string;
  identityId: string;
  identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
  assignedBy: string;
  dateAssigned: string;
  status: 'Active';
}

// DELETE /permissions/assignments/{assignmentId} - Revoke Permission Assignment
export interface DfnsRevokePermissionAssignmentResponse {
  id: string;
  permissionId: string;
  identityId: string;
  identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
  assignedBy: string;
  dateAssigned: string;
  revokedBy: string;
  dateRevoked: string;
  status: 'Revoked';
}

// GET /permissions/assignments - List Permission Assignments
export interface DfnsListPermissionAssignmentsRequest {
  limit?: number;
  paginationToken?: string;
  permissionId?: string;
  identityId?: string;
  identityKind?: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
}

export interface DfnsListPermissionAssignmentsResponse {
  items: DfnsPermissionAssignmentResponse[];
  nextPageToken?: string;
}

// GET /permissions/{permissionId}/assignments - List Assignments for Permission
export interface DfnsListPermissionAssignmentsForPermissionRequest {
  limit?: number;
  paginationToken?: string;
}

export interface DfnsListPermissionAssignmentsForPermissionResponse {
  items: DfnsPermissionAssignmentResponse[];
  nextPageToken?: string;
}

// Common Response Types
export interface DfnsPermissionResponse {
  id: string;
  name: string;
  operations: DfnsPermissionOperation[];
  resources?: DfnsPermissionResource[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  status: 'Active' | 'Inactive';
  isActive?: boolean; // Computed property for compatibility
  description?: string;
  category?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface DfnsPermissionAssignmentResponse {
  id: string;
  permissionId: string;
  identityId: string;
  identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
  assignedBy: string;
  dateAssigned: string;
  status: 'Active' | 'Revoked';
  revokedBy?: string;
  dateRevoked?: string;
}

// =============================================================================
// INTERNAL CHAIN CAPITAL PERMISSIONS TYPES (existing)
// =============================================================================

// Permission Assignment
export interface DfnsPermissionAssignment {
  id: string;
  permission_id?: string;
  identity_id: string;
  identity_kind: 'User' | 'ServiceAccount' | 'PersonalAccessToken';
  assigned_by: string;
  assigned_at: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// Policy Approval
export interface DfnsPolicyApproval {
  id: string;
  approval_id: string;
  activity_id: string;
  policy_id?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Failed';
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  metadata?: Record<string, any>;
  organization_id?: string;
  dfns_approval_id?: string;
  created_at: string;
  updated_at: string;
}

// Permission Request
export interface DfnsPermissionRequest {
  resources: string[];
  operations: string[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  description?: string;
}

// Policy Rule
export interface DfnsPolicyRule {
  kind: string;
  configuration: Record<string, any>;
  filters?: {
    users?: string[];
    wallets?: string[];
    networks?: string[];
    amounts?: {
      min?: string;
      max?: string;
      currency?: string;
    };
  };
}

// Activity that requires approval
export interface DfnsActivity {
  id: string;
  kind: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Executed' | 'Failed';
  initiator: string;
  resource: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Permission Context
export interface DfnsPermissionContext {
  user_id: string;
  organization_id: string;
  resource_type: string;
  resource_id: string;
  operation: string;
  additional_context?: Record<string, any>;
}

// Authorization Result
export interface DfnsAuthorizationResult {
  allowed: boolean;
  reason?: string;
  required_approvals?: DfnsPolicyApproval[];
  policies_applied?: string[];
}
