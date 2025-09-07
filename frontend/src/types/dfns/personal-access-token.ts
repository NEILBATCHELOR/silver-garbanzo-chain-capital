/**
 * DFNS Personal Access Token Management Types
 * 
 * Enhanced type definitions for DFNS Personal Access Token management
 * following the DFNS API documentation specifications.
 */

import type { BaseModel } from '../core/centralModels';
import type { DfnsPermissionAssignment, DfnsPagination } from './core';

// ===== Enhanced PAT Types =====

/**
 * Enhanced Personal Access Token with all DFNS API fields
 */
export interface DfnsPersonalAccessTokenComplete extends BaseModel {
  tokenId: string;
  name: string;
  status: DfnsPersonalAccessTokenStatus;
  credId: string;
  linkedUserId: string;
  linkedAppId: string;
  orgId: string;
  publicKey: string;
  permissionAssignments: DfnsPermissionAssignment[];
  dateCreated: string;
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  kind: string;
}

/**
 * PAT status enum matching DFNS API
 */
export enum DfnsPersonalAccessTokenStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Expired = 'Expired'
}

// ===== Request/Response Interfaces =====

/**
 * Create Personal Access Token Request
 */
export interface CreatePersonalAccessTokenRequest {
  name: string;
  publicKey: string;
  secondsValid?: number;
  daysValid?: number;
  permissionId?: string;
  externalId?: string;
}

/**
 * Create Personal Access Token Response
 */
export interface CreatePersonalAccessTokenResponse {
  accessToken: string;
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
 * Get Personal Access Token Request
 */
export interface GetPersonalAccessTokenRequest {
  tokenId: string;
}

/**
 * Get Personal Access Token Response
 */
export interface GetPersonalAccessTokenResponse {
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
  expiresAt?: string;
  lastUsedAt?: string;
}

/**
 * List Personal Access Tokens Request
 */
export interface ListPersonalAccessTokensRequest {
  limit?: number;
  paginationToken?: string;
  status?: DfnsPersonalAccessTokenStatus;
  name?: string;
}

/**
 * List Personal Access Tokens Response
 */
export interface ListPersonalAccessTokensResponse {
  items: PersonalAccessTokenResponse[];
  nextPageToken?: string;
}

/**
 * Update Personal Access Token Request
 */
export interface UpdatePersonalAccessTokenRequest {
  name?: string;
  externalId?: string;
}

/**
 * Update Personal Access Token Response
 */
export interface UpdatePersonalAccessTokenResponse {
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
  dateUpdated: string;
}

/**
 * Activate Personal Access Token Request
 */
export interface ActivatePersonalAccessTokenRequest {
  tokenId: string;
}

/**
 * Activate Personal Access Token Response
 */
export interface ActivatePersonalAccessTokenResponse {
  tokenId: string;
  status: DfnsPersonalAccessTokenStatus;
  dateActivated: string;
}

/**
 * Deactivate Personal Access Token Request
 */
export interface DeactivatePersonalAccessTokenRequest {
  tokenId: string;
}

/**
 * Deactivate Personal Access Token Response
 */
export interface DeactivatePersonalAccessTokenResponse {
  tokenId: string;
  status: DfnsPersonalAccessTokenStatus;
  dateDeactivated: string;
}

/**
 * Archive Personal Access Token Request
 */
export interface ArchivePersonalAccessTokenRequest {
  tokenId: string;
}

/**
 * Personal Access Token Response
 */
export interface PersonalAccessTokenResponse {
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
  expiresAt?: string;
  lastUsedAt?: string;
}

// ===== Search and Filter Types =====

/**
 * Personal Access Token Search Criteria
 */
export interface PersonalAccessTokenSearchCriteria {
  name?: string;
  status?: DfnsPersonalAccessTokenStatus;
  linkedUserId?: string;
  linkedAppId?: string;
  createdAfter?: string;
  createdBefore?: string;
  expiresAfter?: string;
  expiresBefore?: string;
}

/**
 * Personal Access Token Filter Options
 */
export interface PersonalAccessTokenFilterOptions {
  includeExpired?: boolean;
  includeInactive?: boolean;
  sortBy?: 'name' | 'dateCreated' | 'lastUsedAt' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ===== Validation Types =====

/**
 * Personal Access Token Validation Result
 */
export interface PersonalAccessTokenValidationResult {
  isValid: boolean;
  errors: PersonalAccessTokenValidationError[];
  warnings: string[];
}

/**
 * Personal Access Token Validation Error
 */
export interface PersonalAccessTokenValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

// ===== Service Types =====

/**
 * DFNS Personal Access Token Management Service
 */
export interface DfnsPersonalAccessTokenManagementService {
  createPersonalAccessToken(request: CreatePersonalAccessTokenRequest): Promise<CreatePersonalAccessTokenResponse>;
  getPersonalAccessToken(request: GetPersonalAccessTokenRequest): Promise<GetPersonalAccessTokenResponse>;
  listPersonalAccessTokens(request?: ListPersonalAccessTokensRequest): Promise<ListPersonalAccessTokensResponse>;
  updatePersonalAccessToken(tokenId: string, request: UpdatePersonalAccessTokenRequest): Promise<UpdatePersonalAccessTokenResponse>;
  activatePersonalAccessToken(request: ActivatePersonalAccessTokenRequest): Promise<ActivatePersonalAccessTokenResponse>;
  deactivatePersonalAccessToken(request: DeactivatePersonalAccessTokenRequest): Promise<DeactivatePersonalAccessTokenResponse>;
  archivePersonalAccessToken(request: ArchivePersonalAccessTokenRequest): Promise<void>;
  validatePersonalAccessToken(token: Partial<DfnsPersonalAccessTokenComplete>): PersonalAccessTokenValidationResult;
}

/**
 * Personal Access Token Management Configuration
 */
export interface PersonalAccessTokenManagementConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  defaultExpirationDays: number;
  maxTokensPerUser: number;
  enableAutoCleanup: boolean;
  cleanupIntervalHours: number;
}

// ===== Activity and Audit Types =====

/**
 * Personal Access Token Activity
 */
export interface PersonalAccessTokenActivity {
  id: string;
  tokenId: string;
  activityType: PersonalAccessTokenActivityType;
  timestamp: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Personal Access Token Activity Type
 */
export enum PersonalAccessTokenActivityType {
  Created = 'created',
  Updated = 'updated',
  Activated = 'activated',
  Deactivated = 'deactivated',
  Archived = 'archived',
  Used = 'used',
  Expired = 'expired',
  Failed = 'failed'
}

// ===== Error Types =====

/**
 * Personal Access Token Management Error
 */
export interface PersonalAccessTokenManagementError {
  code: PersonalAccessTokenManagementErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Personal Access Token Management Error Code
 */
export enum PersonalAccessTokenManagementErrorCode {
  TokenNotFound = 'TOKEN_NOT_FOUND',
  TokenExpired = 'TOKEN_EXPIRED',
  TokenInactive = 'TOKEN_INACTIVE',
  InvalidToken = 'INVALID_TOKEN',
  PermissionDenied = 'PERMISSION_DENIED',
  DuplicateTokenName = 'DUPLICATE_TOKEN_NAME',
  MaxTokensExceeded = 'MAX_TOKENS_EXCEEDED',
  InvalidExpirationDate = 'INVALID_EXPIRATION_DATE',
  ValidationFailed = 'VALIDATION_FAILED',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE'
}

// ===== Utility Types =====

/**
 * PAT creation form data
 */
export interface PatCreationFormData {
  name: string;
  expirationDays?: number;
  permissionId?: string;
  description?: string;
}

/**
 * PAT management action types
 */
export enum PatActionType {
  Create = 'create',
  Update = 'update',
  Activate = 'activate',
  Deactivate = 'deactivate',
  Archive = 'archive',
  View = 'view'
}

/**
 * PAT table row data for UI
 */
export interface PatTableRow {
  id: string;
  tokenId: string;
  name: string;
  status: DfnsPersonalAccessTokenStatus;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  permissions: string[];
  actions: PatActionType[];
}

/**
 * Key pair for PAT creation
 */
export interface PatKeyPair {
  privateKey: string;
  publicKey: string;
  algorithm: string;
}
