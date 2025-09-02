import { BaseService } from '../BaseService'
import { UserRoleValidationService } from './UserRoleValidationService'
import type { 
  UserCreateRequest, 
  UserUpdateRequest, 
  UserResponse, 
  UserServiceResult,
  UserListRequest,
  UserListResponse,
  UserCreationResult,
  UserBulkUpdateRequest,
  UserStatus,
  RoleCreateRequest,
  RoleUpdateRequest,
  RoleResponse,
  RoleListRequest,
  RoleListResponse,
  PermissionAssignmentRequest,
  PermissionAssignmentResult,
  Permission
} from '../../types/user-role-service'
import bcrypt from 'bcrypt'

/**
 * User and Role Service
 * Handles CRUD operations for users, roles, and permissions
 */
export class UserRoleService extends BaseService {
  
  private validationService: UserRoleValidationService

  constructor() {
    super('UserRole')
    this.validationService = new UserRoleValidationService()
  }
  
  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get users with filtering and pagination
   */
  async getUsers(params: UserListRequest = {}): Promise<UserServiceResult<UserListResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        roleId,
        includeRole = false,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params

      const offset = (page - 1) * limit
      const where: any = {}

      // Apply filters
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (status && status.length > 0) {
        where.status = { in: status }
      }

      if (roleId) {
        where.user_roles = {
          some: { role_id: roleId }
        }
      }

      // Get total count
      const total = await this.db.public_users.count({ where })

      // Get users
      const users = await this.db.public_users.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: includeRole ? {
          user_roles: {
            include: {
              roles: true
            }
          }
        } : undefined
      })

      const transformedUsers = users.map((user: any) => this.transformUserToResponse(user))

      return this.success({
        data: transformedUsers,
        pagination: {
          total,
          page,
          limit,
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to get users')
      return this.error('Failed to retrieve users', 'DATABASE_ERROR')
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string, includeRole = true): Promise<UserServiceResult<UserResponse>> {
    try {
      const user = await this.db.public_users.findUnique({
        where: { id },
        include: includeRole ? {
          user_roles: {
            include: {
              roles: {
                include: {
                  role_permissions: {
                    include: {
                      permissions: true
                    }
                  }
                }
              }
            }
          }
        } : undefined
      })

      if (!user) {
        return this.error('User not found', 'NOT_FOUND', 404)
      }

      return this.success(this.transformUserToResponse(user))
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to get user')
      return this.error('Failed to retrieve user', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new user
   */
  async createUser(data: UserCreateRequest, sendInvite = false): Promise<UserServiceResult<UserCreationResult>> {
    try {
      const validationResult = await this.validationService.validateUserCreate(data)
      if (!validationResult.isValid) {
        return this.error('Validation failed', 'VALIDATION_ERROR', 400)
      }

      // Generate password if auto-generate is enabled
      const generatedPassword = data.autoGeneratePassword ? this.generateSecurePassword() : undefined
      const passwordToUse = generatedPassword || data.password

      if (!passwordToUse) {
        return this.error('Password is required', 'VALIDATION_ERROR', 400)
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(passwordToUse, 12)

      // Create user and assign role in transaction
      const result = await this.db.$transaction(async (tx) => {
        // Generate UUID for the new user
        const uuidResult = await tx.$queryRaw`SELECT gen_random_uuid() as id`
        const userUuid = (uuidResult as any)[0].id

        // First create in auth.users (Supabase auth table)
        const authUser = await tx.auth_users.create({
          data: {
            id: userUuid,
            email: data.email,
            encrypted_password: hashedPassword,
            email_confirmed_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            is_super_admin: false,
            is_sso_user: false,
            is_anonymous: false
          }
        })

        // Then create the public.users record linked to auth.users
        const user = await tx.public_users.create({
          data: {
            id: authUser.id, // Link to auth_users.id
            name: data.name,
            email: data.email,
            status: data.status || 'pending',
            public_key: data.publicKey || null,
            encrypted_private_key: data.encryptedPrivateKey || null,
            created_at: new Date(),
            updated_at: new Date()
          }
        })

        // Assign role if provided
        if (data.roleId) {
          await tx.user_roles.create({
            data: {
              user_id: user.id,
              role_id: data.roleId
            }
          })
        }

        return user
      })

      // Get complete user with role
      const completeUser = await this.getUserById(result.id)
      if (!completeUser.success) {
        throw new Error('Failed to retrieve created user')
      }

      this.logger.info({ userId: result.id }, 'User created successfully')
      
      return this.success({
        user: completeUser.data!,
        invitationSent: sendInvite,
        validation: validationResult,
        generatedPassword: generatedPassword
      })
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create user')
      return this.error('Failed to create user', 'DATABASE_ERROR')
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UserUpdateRequest): Promise<UserServiceResult<UserResponse>> {
    try {
      // Check if user exists
      const existingUser = await this.db.public_users.findUnique({ where: { id } })
      if (!existingUser) {
        return this.error('User not found', 'NOT_FOUND', 404)
      }

      // Validate update data
      const validationResult = await this.validationService.validateUserUpdate(data, id)
      if (!validationResult.isValid) {
        return this.error('Validation failed', 'VALIDATION_ERROR', 400)
      }

      const result = await this.db.$transaction(async (tx) => {
        // Update user
        const updatedUser = await tx.public_users.update({
          where: { id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.status && { status: data.status }),
            ...(data.publicKey !== undefined && { public_key: data.publicKey }),
            ...(data.encryptedPrivateKey !== undefined && { encrypted_private_key: data.encryptedPrivateKey }),
            updated_at: new Date()
          }
        })

        // Update role if provided
        if (data.roleId) {
          // Remove existing role assignments
          await tx.user_roles.deleteMany({
            where: { user_id: id }
          })

          // Add new role assignment
          await tx.user_roles.create({
            data: {
              user_id: id,
              role_id: data.roleId
            }
          })
        }

        return updatedUser
      })

      // Get complete updated user
      const completeUser = await this.getUserById(id)
      if (!completeUser.success) {
        throw new Error('Failed to retrieve updated user')
      }

      this.logger.info({ userId: id }, 'User updated successfully')
      return this.success(completeUser.data!)
    } catch (error) {
      this.logger.error({ error, id, data }, 'Failed to update user')
      return this.error('Failed to update user', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<UserServiceResult<boolean>> {
    try {
      const user = await this.db.public_users.findUnique({ where: { id } })
      if (!user) {
        return this.error('User not found', 'NOT_FOUND', 404)
      }

      await this.db.$transaction(async (tx) => {
        // Delete user role assignments
        await tx.user_roles.deleteMany({
          where: { user_id: id }
        })

        // Delete from public.users first
        await tx.public_users.delete({
          where: { id }
        })

        // Delete from auth.users (cascade will handle relationships)
        await tx.auth_users.delete({
          where: { id }
        })
      })

      this.logger.info({ userId: id }, 'User deleted successfully')
      return this.success(true)
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to delete user')
      return this.error('Failed to delete user', 'DATABASE_ERROR')
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(id: string, autoGenerate = true): Promise<UserServiceResult<{ password?: string }>> {
    try {
      const user = await this.db.public_users.findUnique({ where: { id } })
      if (!user) {
        return this.error('User not found', 'NOT_FOUND', 404)
      }

      const newPassword = autoGenerate ? this.generateSecurePassword() : undefined
      if (!newPassword) {
        return this.error('Password generation failed', 'INTERNAL_ERROR')
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12)

      // Update password in auth.users table and timestamp in public.users
      await this.db.$transaction(async (tx) => {
        await tx.auth_users.update({
          where: { id },
          data: {
            encrypted_password: hashedPassword,
            updated_at: new Date()
          }
        })

        await tx.public_users.update({
          where: { id },
          data: {
            updated_at: new Date()
          }
        })
      })

      this.logger.info({ userId: id }, 'User password reset successfully')
      return this.success({ password: autoGenerate ? newPassword : undefined })
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to reset user password')
      return this.error('Failed to reset password', 'DATABASE_ERROR')
    }
  }

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  /**
   * Get roles with filtering and pagination
   */
  async getRoles(params: RoleListRequest = {}): Promise<UserServiceResult<RoleListResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        includePermissions = false,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params

      const offset = (page - 1) * limit
      const where: any = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      const total = await this.db.roles.count({ where })

      const roles = await this.db.roles.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { user_roles: true }
          },
          ...(includePermissions && {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          })
        }
      })

      const transformedRoles: RoleResponse[] = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        priority: role.priority,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
        userCount: role._count?.user_roles || 0,
        permissionCount: role.role_permissions?.length || 0,
        isSystemRole: this.isSystemRole(role.name),
        permissions: role.role_permissions?.map((rp: any) => rp.permissions) || []
      }))

      return this.success({
        data: transformedRoles,
        pagination: {
          total,
          page,
          limit,
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to get roles')
      return this.error('Failed to retrieve roles', 'DATABASE_ERROR')
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<UserServiceResult<RoleResponse>> {
    try {
      const role = await this.db.roles.findUnique({
        where: { id },
        include: {
          _count: {
            select: { user_roles: true }
          },
          role_permissions: {
            include: {
              permissions: true
            }
          }
        }
      })

      if (!role) {
        return this.error('Role not found', 'NOT_FOUND', 404)
      }

      const transformedRole: RoleResponse = {
        id: role.id,
        name: role.name,
        description: role.description,
        priority: role.priority,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
        userCount: role._count?.user_roles || 0,
        permissionCount: role.role_permissions?.length || 0,
        isSystemRole: this.isSystemRole(role.name),
        permissions: role.role_permissions?.map((rp: any) => rp.permissions) || []
      }

      return this.success(transformedRole)
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to get role')
      return this.error('Failed to retrieve role', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new role
   */
  async createRole(data: RoleCreateRequest): Promise<UserServiceResult<RoleResponse>> {
    try {
      const validationResult = await this.validationService.validateRoleCreate(data)
      if (!validationResult.isValid) {
        return this.error('Validation failed', 'VALIDATION_ERROR', 400)
      }

      const role = await this.db.roles.create({
        data: {
          name: data.name,
          description: data.description,
          priority: data.priority || 500
        },
        include: {
          _count: {
            select: { user_roles: true }
          }
        }
      })

      // Assign permissions if provided
      if (data.permissions && data.permissions.length > 0) {
        await this.assignPermissionsToRole({
          roleId: role.id,
          permissionNames: data.permissions
        })
      }

      const result = await this.getRoleById(role.id)
      if (!result.success) {
        throw new Error('Failed to retrieve created role')
      }

      this.logger.info({ roleId: role.id }, 'Role created successfully')
      return result
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create role')
      return this.error('Failed to create role', 'DATABASE_ERROR')
    }
  }

  /**
   * Update role
   */
  async updateRole(id: string, data: RoleUpdateRequest): Promise<UserServiceResult<RoleResponse>> {
    try {
      const existingRole = await this.db.roles.findUnique({ where: { id } })
      if (!existingRole) {
        return this.error('Role not found', 'NOT_FOUND', 404)
      }

      // Prevent modification of system roles
      if (this.isSystemRole(existingRole.name)) {
        return this.error('Cannot modify system role', 'FORBIDDEN', 403)
      }

      const validationResult = await this.validationService.validateRoleUpdate(data, id)
      if (!validationResult.isValid) {
        return this.error('Validation failed', 'VALIDATION_ERROR', 400)
      }

      await this.db.roles.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description && { description: data.description }),
          ...(data.priority !== undefined && { priority: data.priority }),
          updated_at: new Date()
        }
      })

      const result = await this.getRoleById(id)
      if (!result.success) {
        throw new Error('Failed to retrieve updated role')
      }

      this.logger.info({ roleId: id }, 'Role updated successfully')
      return result
    } catch (error) {
      this.logger.error({ error, id, data }, 'Failed to update role')
      return this.error('Failed to update role', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<UserServiceResult<boolean>> {
    try {
      const role = await this.db.roles.findUnique({
        where: { id },
        include: {
          _count: {
            select: { user_roles: true }
          }
        }
      })

      if (!role) {
        return this.error('Role not found', 'NOT_FOUND', 404)
      }

      if (this.isSystemRole(role.name)) {
        return this.error('Cannot delete system role', 'FORBIDDEN', 403)
      }

      if (role._count.user_roles > 0) {
        return this.error('Cannot delete role that is assigned to users', 'CONFLICT', 409)
      }

      await this.db.$transaction(async (tx) => {
        await tx.role_permissions.deleteMany({
          where: { role_id: id }
        })

        await tx.roles.delete({
          where: { id }
        })
      })

      this.logger.info({ roleId: id }, 'Role deleted successfully')
      return this.success(true)
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to delete role')
      return this.error('Failed to delete role', 'DATABASE_ERROR')
    }
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<UserServiceResult<Permission[]>> {
    try {
      const permissions = await this.db.permissions.findMany({
        orderBy: { name: 'asc' }
      })

      return this.success(permissions.map(p => ({
        name: p.name,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })))
    } catch (error) {
      this.logger.error({ error }, 'Failed to get permissions')
      return this.error('Failed to retrieve permissions', 'DATABASE_ERROR')
    }
  }

  /**
   * Assign permissions to role
   */
  async assignPermissionsToRole(data: PermissionAssignmentRequest): Promise<UserServiceResult<PermissionAssignmentResult>> {
    try {
      const { roleId, permissionNames } = data

      const role = await this.db.roles.findUnique({
        where: { id: roleId },
        include: {
          role_permissions: {
            include: {
              permissions: true
            }
          }
        }
      })

      if (!role) {
        return this.error('Role not found', 'NOT_FOUND', 404)
      }

      if (this.isSystemRole(role.name)) {
        return this.error('Cannot modify permissions for system role', 'FORBIDDEN', 403)
      }

      const currentPermissions = role.role_permissions?.map((rp: any) => rp.permissions.name) || []
      const addedPermissions = permissionNames.filter(p => !currentPermissions.includes(p))
      const removedPermissions = currentPermissions.filter(p => !permissionNames.includes(p))

      await this.db.$transaction(async (tx) => {
        // Remove old permissions
        await tx.role_permissions.deleteMany({
          where: { role_id: roleId }
        })

        // Add new permissions
        if (permissionNames.length > 0) {
          const permissionInserts = permissionNames.map(permissionName => ({
            role_id: roleId,
            permission_name: permissionName
          }))

          await tx.role_permissions.createMany({
            data: permissionInserts
          })
        }
      })

      const affectedUsers = await this.db.user_roles.count({
        where: { role_id: roleId }
      })

      const result: PermissionAssignmentResult = {
        roleId,
        addedPermissions,
        removedPermissions,
        totalPermissions: permissionNames.length,
        affectedUsers
      }

      this.logger.info({ roleId, result }, 'Permissions assigned to role successfully')
      return this.success(result)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to assign permissions to role')
      return this.error('Failed to assign permissions', 'DATABASE_ERROR')
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<UserServiceResult<Permission[]>> {
    try {
      const user = await this.db.public_users.findUnique({
        where: { id: userId },
        include: {
          user_roles: {
            include: {
              roles: {
                include: {
                  role_permissions: {
                    include: {
                      permissions: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!user) {
        return this.error('User not found', 'NOT_FOUND', 404)
      }

      const permissions: Permission[] = []
      if (user.user_roles && Array.isArray(user.user_roles)) {
        user.user_roles.forEach((userRole: any) => {
          if (userRole.roles?.role_permissions && Array.isArray(userRole.roles.role_permissions)) {
            userRole.roles.role_permissions.forEach((rp: any) => {
              if (!permissions.find(p => p.name === rp.permissions.name)) {
                permissions.push({
                  name: rp.permissions.name,
                  description: rp.permissions.description,
                  createdAt: rp.permissions.created_at,
                  updatedAt: rp.permissions.updated_at
                })
              }
            })
          }
        })
      }

      return this.success(permissions.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user permissions')
      return this.error('Failed to retrieve user permissions', 'DATABASE_ERROR')
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Transform user database object to response format
   */
  private transformUserToResponse(user: any): UserResponse {
    const userRole = user.user_roles?.[0]
    const role = userRole?.roles

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status as UserStatus,
      publicKey: user.public_key,
      encryptedPrivateKey: user.encrypted_private_key,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      ...(role && { role }),
      permissions: role?.role_permissions?.map((rp: any) => rp.permissions) || undefined
    }
  }

  /**
   * Check if a role is a system role
   */
  private isSystemRole(roleName: string): boolean {
    const systemRoles = [
      'Super Admin', 'super_admin', 'superAdmin',
      'Owner', 'owner',
      'Compliance Manager', 'compliance_manager', 'complianceManager',
      'Compliance Officer', 'compliance_officer', 'complianceOfficer',
      'Agent', 'agent',
      'Viewer', 'viewer'
    ]
    return systemRoles.includes(roleName)
  }

  /**
   * Generate secure password
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-='
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }
}
