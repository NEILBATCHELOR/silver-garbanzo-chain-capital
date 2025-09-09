/**
 * DFNS Users Types
 * 
 * Types for DFNS users and credentials management
 */

import type { DfnsStatus, DfnsCredentialKind, DfnsUserKind } from './core';

// DFNS User
export interface DfnsUser {
  id: string;
  username: string;
  email?: string;
  status: DfnsStatus;
  kind: DfnsUserKind;
  external_id?: string;
  public_key?: string;
  recovery_setup: boolean;
  mfa_enabled: boolean;
  last_login_at?: string;
  registered_at: string;
  organization_id?: string;
  dfns_user_id?: string;
  created_at: string;
  updated_at: string;
}

// User Creation Request (Generic)
export interface DfnsGenericUserCreationRequest {
  username: string;
  email?: string;
  kind: DfnsUserKind;
  external_id?: string;
}

// DFNS Credential
export interface DfnsCredential {
  id: string;
  credential_id: string;
  user_id?: string;
  name?: string;
  kind: DfnsCredentialKind;
  status: DfnsStatus;
  public_key: string;
  algorithm: string;
  attestation_type?: string;
  authenticator_info?: Record<string, any>;
  enrolled_at: string;
  last_used_at?: string;
  lastUsed?: string; // Alias for analytics components
  dfns_credential_id?: string;
  created_at: string;
  updated_at: string;
}

// Credential Registration Request
export interface DfnsCredentialRegistrationRequest {
  kind: DfnsCredentialKind;
  name?: string;
  credentialInfo?: {
    credId: string;
    clientData: string;
    attestationData: string;
    algorithm: string;
  };
}

// User Session
export interface DfnsUserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token?: string;
  expires_at: string;
  created_at: string;
  last_activity_at?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  organization_id?: string;
}

// User Profile Update
export interface DfnsUserProfileUpdate {
  username?: string;
  email?: string;
  external_id?: string;
}

// User Status Update
export interface DfnsUserStatusUpdate {
  status: DfnsStatus;
  reason?: string;
}

// User Recovery Setup
export interface DfnsUserRecoverySetup {
  recoveryMethod: 'email' | 'phone' | 'backup_key';
  contact?: string; // email or phone
  backupKey?: string;
}

// User MFA Setup
export interface DfnsUserMfaSetup {
  method: 'authenticator' | 'sms' | 'email';
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
}

// User Activity Log
export interface DfnsUserActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ===== DFNS User Management APIs =====

// List Users API
export interface DfnsListUsersRequest {
  limit?: number;
  paginationToken?: string;
}

export interface DfnsListUsersResponse {
  items: DfnsUserResponse[];
  nextPageToken?: string;
}

// Create User API
export interface DfnsCreateUserRequest {
  email: string;
  kind: 'CustomerEmployee'; // Only CustomerEmployee allowed in this endpoint
  externalId?: string;
}

export interface DfnsCreateUserResponse {
  username: string;
  userId: string;
  kind: 'CustomerEmployee';
  credentialUuid: string;
  orgId: string;
  permissions: string[];
  scopes: string[];
  isActive: boolean;
  isServiceAccount: boolean;
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}

// Get User API Response
export interface DfnsGetUserResponse {
  userId: string;
  kind: DfnsUserKind;
  username: string;
  name?: string;
  orgId: string;
  isActive: boolean;
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}

// User Response (used in lists and individual gets)
export interface DfnsUserResponse {
  userId: string;
  kind: DfnsUserKind;
  username: string;
  name?: string;
  orgId: string;
  isActive: boolean;
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
  // Additional properties for analytics
  lastLoginAt?: string;
  dateCreated?: string;
}

// Permission Assignment (used in user responses)
export interface DfnsPermissionAssignment {
  permissionId: string;
  permissionName: string;
  assignmentId: string;
  operations: string[];
}

// Activate User API Response
export interface DfnsActivateUserResponse {
  userId: string;
  kind: DfnsUserKind;
  username: string;
  name?: string;
  orgId: string;
  isActive: true; // Always true after activation
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}

// Deactivate User API Response
export interface DfnsDeactivateUserResponse {
  userId: string;
  kind: DfnsUserKind;
  username: string;
  name?: string;
  orgId: string;
  isActive: false; // Always false after deactivation
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}

// Archive User API Response
export interface DfnsArchiveUserResponse {
  userId: string;
  kind: DfnsUserKind;
  username: string;
  name?: string;
  orgId: string;
  isActive: false; // Always false after archiving
  isRegistered: boolean;
  permissionAssignments: DfnsPermissionAssignment[];
}
