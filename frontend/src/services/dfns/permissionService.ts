/**
 * DFNS Permission Service
 * 
 * High-level service for DFNS permission management operations
 * Provides business logic layer over DFNS Permissions APIs
 */

import type {
  DfnsListPermissionsRequest,
  DfnsListPermissionsResponse,
  DfnsGetPermissionResponse,
  DfnsCreatePermissionRequest,
  DfnsCreatePermissionResponse,
  DfnsUpdatePermissionRequest,
  DfnsUpdatePermissionResponse,
  DfnsArchivePermissionResponse,
  DfnsAssignPermissionRequest,
  DfnsAssignPermissionResponse,
  DfnsRevokePermissionAssignmentResponse,
  DfnsListPermissionAssignmentsRequest,
  DfnsListPermissionAssignmentsResponse,
  DfnsListPermissionAssignmentsForPermissionRequest,
  DfnsListPermissionAssignmentsForPermissionResponse,
  DfnsPermissionOperation,
  DfnsPermissionResource,
  DfnsPermissionAssignment,
  DfnsPermissionAssignmentResponse,
} from '../../types/dfns';
import { DfnsClient } from '../../infrastructure/dfns/client';
import { DfnsAuthClient } from '../../infrastructure/dfns/auth/authClient';
import { DfnsUserActionService } from './userActionService';
import { DfnsAuthenticationError, DfnsValidationError, DfnsAuthorizationError } from '../../types/dfns/errors';

export interface PermissionServiceOptions {
  enableDatabaseSync?: boolean;
  enableAuditLogging?: boolean;
  validatePermissions?: boolean;
}

export interface PermissionListOptions {
  limit?: number;
  paginationToken?: string;
  includeInactive?: boolean;
  filterByCategory?: string;
  sortBy?: 'name' | 'dateCreated' | 'dateUpdated' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PermissionCreationOptions {
  autoActivate?: boolean;
  syncToDatabase?: boolean;
  validateOperations?: boolean;
}

export interface PermissionAssignmentOptions {
  validateIdentity?: boolean;
  syncToDatabase?: boolean;
  enableAuditLogging?: boolean;
}

export class DfnsPermissionService {
  private authClient: DfnsAuthClient;
  private userActionService: DfnsUserActionService;
  private options: PermissionServiceOptions;

  constructor(
    dfnsClient: DfnsClient,
    userActionService: DfnsUserActionService,
    options: PermissionServiceOptions = {}
  ) {
    this.authClient = new DfnsAuthClient(dfnsClient);
    this.userActionService = userActionService;
    this.options = {
      enableDatabaseSync: true,
      enableAuditLogging: true,
      validatePermissions: true,
      ...options
    };
  }

  // =============================================================================
  // CORE PERMISSION MANAGEMENT APIS
  // =============================================================================

  /**
   * List all permissions in the organization with enhanced filtering
   * High-level wrapper around DFNS listPermissions API
   */
  async listPermissions(options?: PermissionListOptions): Promise<DfnsListPermissionsResponse> {
    try {
      const request: DfnsListPermissionsRequest = {
        limit: options?.limit || 50,
        paginationToken: options?.paginationToken,
      };

      const response = await this.authClient.listPermissions(request);

      // Log for audit if enabled
      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Listed ${response.items.length} permissions`, {
          limit: request.limit,
          hasNextPage: Boolean(response.nextPageToken)
        });
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list permissions: ${error}`,
        { options }
      );
    }
  }

  /**
   * Get all permissions (handles pagination automatically)
   * Useful for admin dashboards and bulk operations
   */
  async getAllPermissions(): Promise<DfnsGetPermissionResponse[]> {
    const allPermissions: DfnsGetPermissionResponse[] = [];
    let paginationToken: string | undefined;

    try {
      do {
        const response = await this.listPermissions({
          limit: 100, // Max per page
          paginationToken
        });
        
        allPermissions.push(...response.items);
        paginationToken = response.nextPageToken;
        
      } while (paginationToken);

      console.log(`[DfnsPermissionService] Retrieved ${allPermissions.length} total permissions`);
      return allPermissions;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get all permissions: ${error}`
      );
    }
  }

  /**
   * Get a specific permission by ID with enhanced error handling
   */
  async getPermission(permissionId: string): Promise<DfnsGetPermissionResponse> {
    try {
      this.validatePermissionId(permissionId);
      
      const permission = await this.authClient.getPermission(permissionId);

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Retrieved permission: ${permission.name}`, {
          permissionId,
          isActive: permission.status === 'Active',
          operationCount: permission.operations.length
        });
      }

      return permission;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get permission: ${error}`,
        { permissionId }
      );
    }
  }

  /**
   * Get permission by name (searches through all permissions)
   */
  async getPermissionByName(permissionName: string): Promise<DfnsGetPermissionResponse | null> {
    try {
      const allPermissions = await this.getAllPermissions();
      
      const permission = allPermissions.find(p => 
        p.name.toLowerCase() === permissionName.toLowerCase()
      );

      if (this.options.enableAuditLogging && permission) {
        console.log(`[DfnsPermissionService] Found permission by name: ${permissionName}`, {
          permissionId: permission.id,
          operationCount: permission.operations.length
        });
      }

      return permission || null;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get permission by name: ${error}`,
        { permissionName }
      );
    }
  }

  /**
   * Create a new permission with User Action Signing
   * High-level wrapper around DFNS createPermission API
   */
  async createPermission(
    request: DfnsCreatePermissionRequest,
    options?: PermissionCreationOptions
  ): Promise<DfnsCreatePermissionResponse> {
    try {
      // Validate permission request
      this.validateCreatePermissionRequest(request);

      // Validate operations if enabled
      if (options?.validateOperations) {
        this.validatePermissionOperations(request.operations);
      }

      // Permission creation requires User Action Signing
      const userActionToken = await this.userActionService.signUserAction(
        'Permissions:Create',
        request,
        {
          persistToDb: options?.syncToDatabase,
        }
      );

      const permission = await this.authClient.createPermission(request, userActionToken);

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncPermissionToDatabase(permission);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Created permission: ${permission.name}`, {
          permissionId: permission.id,
          operationCount: permission.operations.length,
          effect: permission.effect
        });
      }

      return permission;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to create permission: ${error}`,
        { request }
      );
    }
  }

  /**
   * Update an existing permission with User Action Signing
   */
  async updatePermission(
    permissionId: string,
    request: DfnsUpdatePermissionRequest,
    options?: PermissionCreationOptions
  ): Promise<DfnsUpdatePermissionResponse> {
    try {
      this.validatePermissionId(permissionId);

      // Validate operations if provided and validation enabled
      if (request.operations && options?.validateOperations) {
        this.validatePermissionOperations(request.operations);
      }

      // Permission updates require User Action Signing
      const userActionToken = await this.userActionService.signUserAction(
        'Permissions:Update',
        { permissionId, ...request },
        {
          persistToDb: options?.syncToDatabase,
        }
      );

      const permission = await this.authClient.updatePermission(permissionId, request, userActionToken);

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncPermissionToDatabase(permission);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Updated permission: ${permission.name}`, {
          permissionId: permission.id,
          operationCount: permission.operations.length
        });
      }

      return permission;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to update permission: ${error}`,
        { permissionId, request }
      );
    }
  }

  /**
   * Archive (soft delete) a permission with User Action Signing
   */
  async archivePermission(
    permissionId: string,
    options?: PermissionCreationOptions
  ): Promise<DfnsArchivePermissionResponse> {
    try {
      this.validatePermissionId(permissionId);

      // Permission archival requires User Action Signing
      const userActionToken = await this.userActionService.signUserAction(
        'Permissions:Delete',
        { permissionId },
        {
          persistToDb: options?.syncToDatabase,
        }
      );

      const permission = await this.authClient.archivePermission(permissionId, userActionToken);

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncPermissionToDatabase(permission);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Archived permission: ${permission.name}`, {
          permissionId: permission.id,
          dateArchived: permission.dateArchived
        });
      }

      return permission;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to archive permission: ${error}`,
        { permissionId }
      );
    }
  }

  // =============================================================================
  // PERMISSION ASSIGNMENT MANAGEMENT APIS
  // =============================================================================

  /**
   * Assign a permission to a user, service account, or personal access token
   */
  async assignPermission(
    request: DfnsAssignPermissionRequest,
    options?: PermissionAssignmentOptions
  ): Promise<DfnsAssignPermissionResponse> {
    try {
      // Validate assignment request
      this.validateAssignPermissionRequest(request);

      // Validate identity if enabled
      if (options?.validateIdentity) {
        await this.validateIdentityExists(request.identityId, request.identityKind);
      }

      // Permission assignment requires User Action Signing
      const userActionToken = await this.userActionService.signUserAction(
        'Permissions:Assign',
        request,
        {
          persistToDb: options?.syncToDatabase,
        }
      );

      const assignment = await this.authClient.assignPermission(request, userActionToken);

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncPermissionAssignmentToDatabase(assignment);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Assigned permission`, {
          assignmentId: assignment.id,
          permissionId: assignment.permissionId,
          identityId: assignment.identityId,
          identityKind: assignment.identityKind
        });
      }

      return assignment;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to assign permission: ${error}`,
        { request }
      );
    }
  }

  /**
   * Revoke a permission assignment
   */
  async revokePermissionAssignment(
    assignmentId: string,
    options?: PermissionAssignmentOptions
  ): Promise<DfnsRevokePermissionAssignmentResponse> {
    try {
      this.validateAssignmentId(assignmentId);

      // Permission revocation requires User Action Signing
      const userActionToken = await this.userActionService.signUserAction(
        'Permissions:Revoke',
        { assignmentId },
        {
          persistToDb: options?.syncToDatabase,
        }
      );

      const assignment = await this.authClient.revokePermissionAssignment(assignmentId, userActionToken);

      // Sync to database if enabled
      if (options?.syncToDatabase && this.options.enableDatabaseSync) {
        await this.syncPermissionAssignmentToDatabase(assignment);
      }

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Revoked permission assignment`, {
          assignmentId: assignment.id,
          permissionId: assignment.permissionId,
          revokedBy: assignment.revokedBy,
          dateRevoked: assignment.dateRevoked
        });
      }

      return assignment;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to revoke permission assignment: ${error}`,
        { assignmentId }
      );
    }
  }

  /**
   * List all permission assignments with filtering
   */
  async listPermissionAssignments(
    request?: DfnsListPermissionAssignmentsRequest
  ): Promise<DfnsListPermissionAssignmentsResponse> {
    try {
      const response = await this.authClient.listPermissionAssignments(request || {});

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Listed ${response.items.length} permission assignments`, {
          hasNextPage: !!response.nextPageToken,
          filterBy: request
        });
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list permission assignments: ${error}`,
        { request }
      );
    }
  }

  /**
   * List assignments for a specific permission
   */
  async listPermissionAssignmentsForPermission(
    permissionId: string,
    request?: DfnsListPermissionAssignmentsForPermissionRequest
  ): Promise<DfnsListPermissionAssignmentsForPermissionResponse> {
    try {
      this.validatePermissionId(permissionId);

      const response = await this.authClient.listPermissionAssignmentsForPermission(
        permissionId, 
        request || {}
      );

      if (this.options.enableAuditLogging) {
        console.log(`[DfnsPermissionService] Listed ${response.items.length} assignments for permission`, {
          permissionId,
          hasNextPage: Boolean(response.nextPageToken)
        });
      }

      return response;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to list permission assignments for permission: ${error}`,
        { permissionId, request }
      );
    }
  }

  /**
   * Get all permission assignments (handles pagination automatically)
   */
  async getAllPermissionAssignments(): Promise<DfnsPermissionAssignmentResponse[]> {
    const allAssignments: DfnsPermissionAssignmentResponse[] = [];
    let paginationToken: string | undefined;

    try {
      do {
        const response = await this.listPermissionAssignments({
          limit: 100,
          paginationToken
        });
        
        allAssignments.push(...response.items);
        paginationToken = response.nextPageToken;
        
      } while (paginationToken);

      console.log(`[DfnsPermissionService] Retrieved ${allAssignments.length} total permission assignments`);
      return allAssignments;
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get all permission assignments: ${error}`
      );
    }
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  /**
   * Assign multiple permissions to the same identity
   */
  async assignMultiplePermissions(
    identityId: string,
    identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken',
    permissionIds: string[],
    options?: PermissionAssignmentOptions
  ): Promise<{ successful: DfnsAssignPermissionResponse[], failed: Array<{ permissionId: string, error: string }> }> {
    const successful: DfnsAssignPermissionResponse[] = [];
    const failed: Array<{ permissionId: string, error: string }> = [];

    for (const permissionId of permissionIds) {
      try {
        const assignment = await this.assignPermission({
          permissionId,
          identityId,
          identityKind
        }, options);
        successful.push(assignment);
      } catch (error) {
        failed.push({
          permissionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log(`[DfnsPermissionService] Batch assign results: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  /**
   * Archive multiple permissions
   */
  async archiveMultiplePermissions(
    permissionIds: string[],
    options?: PermissionCreationOptions
  ): Promise<{ successful: DfnsArchivePermissionResponse[], failed: Array<{ permissionId: string, error: string }> }> {
    const successful: DfnsArchivePermissionResponse[] = [];
    const failed: Array<{ permissionId: string, error: string }> = [];

    for (const permissionId of permissionIds) {
      try {
        const permission = await this.archivePermission(permissionId, options);
        successful.push(permission);
      } catch (error) {
        failed.push({
          permissionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log(`[DfnsPermissionService] Batch archive results: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  // =============================================================================
  // DASHBOARD AND ANALYTICS
  // =============================================================================

  /**
   * Get permissions summary for dashboards
   */
  async getPermissionsSummary() {
    try {
      const permissions = await this.getAllPermissions();
      
      return permissions.map(permission => ({
        permissionId: permission.id,
        name: permission.name,
        isActive: permission.status === 'Active',
        operationCount: permission.operations.length,
        effect: permission.effect,
        category: permission.category || 'Uncategorized',
        dateCreated: permission.dateCreated,
        dateUpdated: permission.dateUpdated,
      }));
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get permissions summary: ${error}`
      );
    }
  }

  /**
   * Get permission assignments summary for dashboards
   */
  async getPermissionAssignmentsSummary() {
    try {
      const assignments = await this.getAllPermissionAssignments();
      
      return assignments.map(assignment => ({
        assignmentId: assignment.id,
        permissionId: assignment.permissionId,
        identityId: assignment.identityId,
        identityKind: assignment.identityKind,
        isActive: assignment.status === 'Active',
        assignedBy: assignment.assignedBy,
        dateAssigned: assignment.dateAssigned,
        revokedBy: assignment.revokedBy,
        dateRevoked: assignment.dateRevoked,
      }));
    } catch (error) {
      throw new DfnsAuthenticationError(
        `Failed to get permission assignments summary: ${error}`
      );
    }
  }

  // =============================================================================
  // VALIDATION HELPERS
  // =============================================================================

  private validatePermissionId(permissionId: string): void {
    if (!permissionId || typeof permissionId !== 'string') {
      throw new DfnsValidationError('Permission ID is required and must be a string');
    }
    
    if (!permissionId.match(/^pm-[a-zA-Z0-9-]+$/)) {
      throw new DfnsValidationError('Invalid permission ID format');
    }
  }

  private validateAssignmentId(assignmentId: string): void {
    if (!assignmentId || typeof assignmentId !== 'string') {
      throw new DfnsValidationError('Assignment ID is required and must be a string');
    }
    
    if (!assignmentId.match(/^pa-[a-zA-Z0-9-]+$/)) {
      throw new DfnsValidationError('Invalid assignment ID format');
    }
  }

  private validateCreatePermissionRequest(request: DfnsCreatePermissionRequest): void {
    if (!request.name || typeof request.name !== 'string') {
      throw new DfnsValidationError('Permission name is required and must be a string');
    }

    if (!request.operations || !Array.isArray(request.operations) || request.operations.length === 0) {
      throw new DfnsValidationError('At least one operation is required');
    }

    if (request.effect && !['Allow', 'Deny'].includes(request.effect)) {
      throw new DfnsValidationError('Effect must be "Allow" or "Deny"');
    }
  }

  private validateAssignPermissionRequest(request: DfnsAssignPermissionRequest): void {
    if (!request.permissionId || typeof request.permissionId !== 'string') {
      throw new DfnsValidationError('Permission ID is required and must be a string');
    }

    if (!request.identityId || typeof request.identityId !== 'string') {
      throw new DfnsValidationError('Identity ID is required and must be a string');
    }

    if (!['User', 'ServiceAccount', 'PersonalAccessToken'].includes(request.identityKind)) {
      throw new DfnsValidationError('Identity kind must be User, ServiceAccount, or PersonalAccessToken');
    }
  }

  private validatePermissionOperations(operations: DfnsPermissionOperation[]): void {
    // Add custom validation for operations if needed
    // This could check against a whitelist of allowed operations
    console.log(`[DfnsPermissionService] Validating ${operations.length} operations`);
  }

  private async validateIdentityExists(
    identityId: string, 
    identityKind: 'User' | 'ServiceAccount' | 'PersonalAccessToken'
  ): Promise<void> {
    // Add identity existence validation if needed
    console.log(`[DfnsPermissionService] Validating identity: ${identityKind}/${identityId}`);
  }

  // =============================================================================
  // DATABASE SYNCHRONIZATION HELPERS
  // =============================================================================

  private async syncPermissionToDatabase(permission: DfnsGetPermissionResponse): Promise<void> {
    // Database sync logic would go here
    console.log(`[DfnsPermissionService] Syncing permission to database: ${permission.id}`);
  }

  private async syncPermissionAssignmentToDatabase(assignment: DfnsPermissionAssignmentResponse): Promise<void> {
    // Database sync logic would go here
    console.log(`[DfnsPermissionService] Syncing permission assignment to database: ${assignment.id}`);
  }
}
