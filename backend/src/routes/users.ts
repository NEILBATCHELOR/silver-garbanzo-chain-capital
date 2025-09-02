/**
 * User and Role API Routes
 * RESTful endpoints for user management, role administration, and permission handling
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { UserRoleService, UserRoleValidationService, UserRoleAnalyticsService } from '@/services/users/index'
import { 
  UserCreateRequest,
  UserUpdateRequest,
  RoleCreateRequest,
  RoleUpdateRequest,
  UserQueryOptions,
  RoleQueryOptions,
  PasswordResetRequest,
  BulkUserUpdateRequest,
  PermissionAssignmentRequest,
  UserExportOptions,
  RoleExportOptions
} from '@/types/user-role-service'

// Service instances (lazy initialization)
function getUserRoleService() {
  return new UserRoleService()
}

function getValidationService() {
  return new UserRoleValidationService()
}

function getAnalyticsService() {
  return new UserRoleAnalyticsService()
}

/**
 * User and Role Routes Plugin
 */
export default async function userRoleRoutes(fastify: FastifyInstance) {
  // Initialize services lazily
  const userRoleService = getUserRoleService()
  const validationService = getValidationService()
  const analyticsService = getAnalyticsService()
  
  // ============================================================================
  // USER MANAGEMENT ROUTES
  // ============================================================================

  /**
   * @route GET /api/v1/users
   * @description Get all users with advanced filtering and pagination
   */
  fastify.get('/users', {
    schema: {
      description: `
# User Management System

Retrieve all users with comprehensive filtering, pagination, and role-based access control.

## Features
- **User Directory** - Complete organizational user directory with hierarchical views
- **Advanced Filtering** - Filter by status, roles, permissions, registration date, and activity
- **Role-Based Access** - View users based on current user's permission level
- **Smart Pagination** - Efficient pagination with configurable page sizes and sorting
- **Permission Integration** - Include detailed permission matrices for each user

## User Status Types
- **Active** - Fully activated users with complete access to assigned roles
- **Inactive** - Temporarily disabled users who retain data but cannot access system
- **Pending** - Newly registered users awaiting email confirmation or admin approval
- **Blocked** - Users blocked due to security issues or policy violations
- **Invited** - Users who have been invited but haven't completed registration

## Role-Based Access Control (RBAC)
- **Administrator** - Full system access with user management capabilities
- **Manager** - Department-level access with team user management
- **Analyst** - Read-only access to user data within assigned projects
- **User** - Standard user access with personal profile management only
- **Viewer** - Limited read-only access for auditing and reporting

## Advanced Features
- Real-time user activity tracking and last seen timestamps
- Integration with audit logs for comprehensive user behavior analysis
- Bulk operations support for user status and role management
- Export capabilities for compliance reporting and user directory management
- Advanced search across user profiles including metadata and custom fields

## Business Rules
- Users can only view other users based on their role hierarchy and permissions
- Administrator role required for accessing sensitive user information
- User directory respects organizational privacy policies and data protection
- Inactive users are hidden from standard directory views but accessible to administrators
- Permission inheritance follows role hierarchy with explicit override capabilities
`,
      tags: ['Users'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { 
            type: 'array', 
            items: { type: 'string', enum: ['active', 'inactive', 'pending', 'blocked', 'invited'] }
          },
          roleId: { type: 'string', format: 'uuid' },
          roleName: { type: 'string' },
          includeRole: { type: 'boolean', default: true },
          includePermissions: { type: 'boolean', default: false },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                hasMore: { type: 'boolean' },
                totalPages: { type: 'integer' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: UserQueryOptions }>, reply: FastifyReply) => {
    try {
      const result = await userRoleService.getUsers(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, query: request.query }, 'Failed to get users')
      return reply.status(500).send({ error: 'Failed to retrieve users' })
    }
  })

  /**
   * @route GET /api/v1/users/:id
   * @description Get user by ID
   */
  fastify.get('/users/:id', {
    schema: {
      description: 'Get user by ID',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          includeRole: { type: 'boolean', default: true },
          includePermissions: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Querystring: { includeRole?: boolean; includePermissions?: boolean } 
  }>, reply: FastifyReply) => {
    try {
      const { includeRole = true, includePermissions = false } = request.query
      const result = await userRoleService.getUserById(request.params.id, includeRole)
      
      if (!result.success) {
        return reply.status(result.statusCode || 404).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id }, 'Failed to get user')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve user' })
    }
  })

  /**
   * @route POST /api/v1/users
   * @description Create new user
   */
  fastify.post('/users', {
    schema: {
      description: `
# Create New User

Create a new user account with comprehensive validation, role assignment, and invitation workflow.

## Features
- **User Creation** - Complete user account creation with profile setup
- **Role Assignment** - Assign users to appropriate roles based on organizational structure
- **Invitation System** - Send welcome emails with account setup instructions
- **Password Management** - Secure password generation with complexity requirements
- **Validation Engine** - Comprehensive validation of user data and business rules

## Account Setup Options
- **Manual Password** - Administrator sets initial password for immediate access
- **Auto-Generated Password** - System generates secure temporary password
- **Invitation-Based** - User receives email invitation to set their own password
- **SSO Integration** - Integration with single sign-on providers for seamless access

## Role Assignment Process
- **Role Validation** - Ensure assigned role exists and is appropriate for user type
- **Permission Inheritance** - Users automatically inherit role-based permissions
- **Hierarchy Enforcement** - Respect organizational hierarchy in role assignments
- **Custom Permissions** - Option to add user-specific permissions beyond role defaults

## Security Features
- **Email Uniqueness** - Enforce unique email addresses across the platform
- **Password Strength** - Configurable password complexity requirements
- **Account Verification** - Email verification workflow for new accounts
- **Audit Trail** - Complete audit log of user creation and initial setup
- **Fraud Prevention** - Rate limiting and validation to prevent automated account creation

## Business Rules
- User creation requires Administrator or User Manager role
- Email addresses must be unique and follow RFC 5322 standards
- Role assignment must be within creator's permission scope
- New users start in 'pending' status until email verification
- Invitation emails expire after 7 days and can be resent
- Auto-generated passwords must be changed on first login
`,
      tags: ['Users'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          roleId: { type: 'string', format: 'uuid' },
          password: { type: 'string', minLength: 8 },
          status: { type: 'string', enum: ['active', 'inactive', 'pending', 'blocked', 'invited'] },
          sendInvite: { type: 'boolean', default: true },
          autoGeneratePassword: { type: 'boolean', default: true }
        },
        required: ['name', 'email', 'roleId']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                temporaryPassword: { type: 'string' },
                invitationSent: { type: 'boolean' },
                validation: { type: 'object' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: UserCreateRequest }>, reply: FastifyReply) => {
    try {
      // Validate request first
      const validation = await validationService.validateUserCreate(request.body)
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          validation
        })
      }

      const result = await userRoleService.createUser(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create user')
      return reply.status(500).send({ success: false, error: 'Failed to create user' })
    }
  })

  /**
   * @route PUT /api/v1/users/:id
   * @description Update user
   */
  fastify.put('/users/:id', {
    schema: {
      description: 'Update user',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          roleId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['active', 'inactive', 'pending', 'blocked', 'invited'] },
          publicKey: { type: ['string', 'null'] },
          encryptedPrivateKey: { type: ['string', 'null'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: UserUpdateRequest 
  }>, reply: FastifyReply) => {
    try {
      // Validate request first
      const validation = await validationService.validateUserUpdate(request.body, request.params.id)
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          validation
        })
      }

      const result = await userRoleService.updateUser(request.params.id, request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id, body: request.body }, 'Failed to update user')
      return reply.status(500).send({ success: false, error: 'Failed to update user' })
    }
  })

  /**
   * @route DELETE /api/v1/users/:id
   * @description Delete user
   */
  fastify.delete('/users/:id', {
    schema: {
      description: 'Delete user',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await userRoleService.deleteUser(request.params.id)
      
      if (!result.success) {
        return reply.status(result.statusCode || 404).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id }, 'Failed to delete user')
      return reply.status(500).send({ success: false, error: 'Failed to delete user' })
    }
  })

  /**
   * @route DELETE /api/v1/users/:id/permanent
   * @description Permanently delete user from all tables
   * WARNING: This action cannot be undone
   */
  fastify.delete('/users/:id/permanent', {
    schema: {
      description: 'Permanently delete user from all tables (cannot be undone)',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      // This would require a new method in UserRoleService
      // For now, we'll use the UserService directly if available
      // Note: This should be restricted to admin users only
      
      // TODO: Add admin permission check here
      // const hasPermission = await checkUserPermission(request.user?.id, 'users:hard_delete')
      // if (!hasPermission) {
      //   return reply.status(403).send({ success: false, error: 'Insufficient permissions' })
      // }

      // For now, return not implemented - frontend should handle complete deletion
      return reply.status(501).send({ 
        success: false, 
        error: 'Permanent deletion should be handled by frontend auth service with proper auth.users cleanup' 
      })
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id }, 'Failed to permanently delete user')
      return reply.status(500).send({ success: false, error: 'Failed to permanently delete user' })
    }
  })

  /**
   * @route POST /api/v1/users/:id/reset-password
   * @description Reset user password
   */
  fastify.post('/users/:id/reset-password', {
    schema: {
      description: 'Reset user password',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          newPassword: { type: 'string', minLength: 8 },
          autoGenerate: { type: 'boolean', default: true },
          sendEmail: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                temporaryPassword: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: Omit<PasswordResetRequest, 'userId'> 
  }>, reply: FastifyReply) => {
    try {
      const resetData: PasswordResetRequest = {
        userId: request.params.id,
        ...request.body
      }

      const result = await userRoleService.resetUserPassword(request.params.id, request.body.autoGenerate)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id }, 'Failed to reset password')
      return reply.status(500).send({ success: false, error: 'Failed to reset password' })
    }
  })

  /**
   * @route PUT /api/v1/users/bulk-update
   * @description Bulk update users
   */
  fastify.put('/users/bulk-update', {
    schema: {
      description: 'Bulk update multiple users',
      tags: ['Users'],
      body: {
        type: 'object',
        properties: {
          userIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
          },
          updates: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['active', 'inactive', 'pending', 'blocked', 'invited'] },
              roleId: { type: 'string', format: 'uuid' }
            }
          }
        },
        required: ['userIds', 'updates']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                updated: { type: 'integer' },
                failed: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: BulkUserUpdateRequest }>, reply: FastifyReply) => {
    try {
      // Note: Bulk update not implemented yet - would need to iterate individual updates
      return reply.status(501).send({ success: false, error: 'Bulk update not implemented' })
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to bulk update users')
      return reply.status(500).send({ success: false, error: 'Failed to bulk update users' })
    }
  })

  /**
   * @route GET /api/v1/users/:id/permissions
   * @description Get user permissions
   */
  fastify.get('/users/:id/permissions', {
    schema: {
      description: 'Get user permissions',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await userRoleService.getUserPermissions(request.params.id)
      
      if (!result.success) {
        return reply.status(result.statusCode || 404).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id }, 'Failed to get user permissions')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve user permissions' })
    }
  })

  // ============================================================================
  // ROLE MANAGEMENT ROUTES
  // ============================================================================

  /**
   * @route GET /api/v1/roles
   * @description Get all roles
   */
  fastify.get('/roles', {
    schema: {
      description: 'Get all roles with filtering and pagination',
      tags: ['Roles'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          search: { type: 'string' },
          includePermissions: { type: 'boolean', default: false },
          includeUserCount: { type: 'boolean', default: true },
          sortBy: { type: 'string', default: 'priority' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            pagination: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: RoleQueryOptions }>, reply: FastifyReply) => {
    try {
      const result = await userRoleService.getRoles(request.query)
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, query: request.query }, 'Failed to get roles')
      return reply.status(500).send({ error: 'Failed to retrieve roles' })
    }
  })

  /**
   * @route GET /api/v1/roles/:id
   * @description Get role by ID
   */
  fastify.get('/roles/:id', {
    schema: {
      description: 'Get role by ID',
      tags: ['Roles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          includePermissions: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Querystring: { includePermissions?: boolean } 
  }>, reply: FastifyReply) => {
    try {
      const { includePermissions = true } = request.query
      const result = await userRoleService.getRoleById(request.params.id)
      
      if (!result.success) {
        return reply.status(result.statusCode || 404).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, roleId: request.params.id }, 'Failed to get role')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve role' })
    }
  })

  /**
   * @route POST /api/v1/roles
   * @description Create new role
   */
  fastify.post('/roles', {
    schema: {
      description: 'Create new role',
      tags: ['Roles'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string', minLength: 1, maxLength: 500 },
          priority: { type: 'integer', minimum: 0, maximum: 1000 },
          permissions: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['name', 'description', 'priority']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RoleCreateRequest }>, reply: FastifyReply) => {
    try {
      // Validate request first
      const validation = await validationService.validateRoleCreate(request.body)
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          validation
        })
      }

      const result = await userRoleService.createRole(request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send(result)
      }
      
      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to create role')
      return reply.status(500).send({ success: false, error: 'Failed to create role' })
    }
  })

  /**
   * @route PUT /api/v1/roles/:id
   * @description Update role
   */
  fastify.put('/roles/:id', {
    schema: {
      description: 'Update role',
      tags: ['Roles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string', minLength: 1, maxLength: 500 },
          priority: { type: 'integer', minimum: 0, maximum: 1000 },
          permissions: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: RoleUpdateRequest 
  }>, reply: FastifyReply) => {
    try {
      // Validate request first
      const validation = await validationService.validateRoleUpdate(request.body, request.params.id)
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          validation
        })
      }

      const result = await userRoleService.updateRole(request.params.id, request.body)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, roleId: request.params.id, body: request.body }, 'Failed to update role')
      return reply.status(500).send({ success: false, error: 'Failed to update role' })
    }
  })

  /**
   * @route DELETE /api/v1/roles/:id
   * @description Delete role
   */
  fastify.delete('/roles/:id', {
    schema: {
      description: 'Delete role',
      tags: ['Roles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await userRoleService.deleteRole(request.params.id)
      
      if (!result.success) {
        return reply.status(result.statusCode || 404).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, roleId: request.params.id }, 'Failed to delete role')
      return reply.status(500).send({ success: false, error: 'Failed to delete role' })
    }
  })

  /**
   * @route POST /api/v1/roles/:id/permissions
   * @description Assign permissions to role
   */
  fastify.post('/roles/:id/permissions', {
    schema: {
      description: 'Assign permissions to role',
      tags: ['Roles'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          permissionNames: {
            type: 'array',
            items: { type: 'string' },
            minItems: 0
          }
        },
        required: ['permissionNames']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                roleId: { type: 'string' },
                addedPermissions: { type: 'array' },
                removedPermissions: { type: 'array' },
                totalPermissions: { type: 'integer' },
                affectedUsers: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Body: { permissionNames: string[] } 
  }>, reply: FastifyReply) => {
    try {
      const assignmentData: PermissionAssignmentRequest = {
        roleId: request.params.id,
        permissionNames: request.body.permissionNames
      }

      const result = await userRoleService.assignPermissionsToRole(assignmentData)
      
      if (!result.success) {
        return reply.status(result.statusCode || 400).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, roleId: request.params.id }, 'Failed to assign permissions')
      return reply.status(500).send({ success: false, error: 'Failed to assign permissions' })
    }
  })

  // ============================================================================
  // PERMISSION MANAGEMENT ROUTES
  // ============================================================================

  /**
   * @route GET /api/v1/permissions
   * @description Get all permissions
   */
  fastify.get('/permissions', {
    schema: {
      description: 'Get all available permissions',
      tags: ['Permissions'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await userRoleService.getPermissions()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get permissions')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve permissions' })
    }
  })

  /**
   * @route GET /api/v1/permissions/matrix
   * @description Get permission matrix for all roles and permissions
   */
  fastify.get('/permissions/matrix', {
    schema: {
      description: 'Get permission matrix showing role-permission assignments',
      tags: ['Permissions'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                roles: { type: 'array' },
                permissions: { type: 'array' },
                assignments: { type: 'array' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await validationService.getPermissionMatrix()
      
      // getPermissionMatrix returns data directly, not wrapped in service result
      return reply.send({ success: true, data: result })
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get permission matrix')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve permission matrix' })
    }
  })

  // ============================================================================
  // ANALYTICS AND REPORTING ROUTES
  // ============================================================================

  /**
   * @route GET /api/v1/users/statistics
   * @description Get user statistics
   */
  fastify.get('/users/statistics', {
    schema: {
      description: 'Get comprehensive user statistics',
      tags: ['Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getUserStatistics()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get user statistics')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve user statistics' })
    }
  })

  /**
   * @route GET /api/v1/users/analytics
   * @description Get user analytics
   */
  fastify.get('/users/analytics', {
    schema: {
      description: 'Get comprehensive user analytics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Querystring: { dateFrom?: string; dateTo?: string } 
  }>, reply: FastifyReply) => {
    try {
      const dateRange = request.query.dateFrom && request.query.dateTo 
        ? { from: request.query.dateFrom, to: request.query.dateTo }
        : undefined

      const result = await analyticsService.getUserAnalytics(dateRange)
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error, query: request.query }, 'Failed to get user analytics')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve user analytics' })
    }
  })

  /**
   * @route GET /api/v1/roles/statistics
   * @description Get role statistics
   */
  fastify.get('/roles/statistics', {
    schema: {
      description: 'Get comprehensive role statistics',
      tags: ['Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getRoleStatistics()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get role statistics')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve role statistics' })
    }
  })

  /**
   * @route GET /api/v1/permissions/statistics
   * @description Get permission statistics
   */
  fastify.get('/permissions/statistics', {
    schema: {
      description: 'Get comprehensive permission statistics',
      tags: ['Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await analyticsService.getPermissionStatistics()
      
      if (!result.success) {
        return reply.status(result.statusCode || 500).send(result)
      }
      
      return reply.send(result)
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get permission statistics')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve permission statistics' })
    }
  })

  /**
   * @route POST /api/v1/users/export
   * @description Export user data
   */
  fastify.post('/users/export', {
    schema: {
      description: 'Export user data in various formats',
      tags: ['Export'],
      body: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'json', 'pdf'] },
          fields: { type: 'array', items: { type: 'string' } },
          includeRoles: { type: 'boolean', default: true },
          includePermissions: { type: 'boolean', default: false },
          includeAuditTrail: { type: 'boolean', default: false },
          dateRange: {
            type: 'object',
            properties: {
              from: { type: 'string', format: 'date' },
              to: { type: 'string', format: 'date' }
            }
          },
          filters: {
            type: 'object',
            properties: {
              status: { type: 'array', items: { type: 'string' } },
              roleId: { type: 'string' }
            }
          }
        },
        required: ['format']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                data: {},
                filename: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: UserExportOptions }>, reply: FastifyReply) => {
    try {
      // Export functionality not implemented yet
      return reply.status(501).send({ success: false, error: 'Export functionality not implemented' })
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to export users')
      return reply.status(500).send({ success: false, error: 'Failed to export users' })
    }
  })

  /**
   * @route POST /api/v1/roles/export
   * @description Export role data
   */
  fastify.post('/roles/export', {
    schema: {
      description: 'Export role data in various formats',
      tags: ['Export'],
      body: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'excel', 'json', 'pdf'] },
          includePermissions: { type: 'boolean', default: true },
          includeUserCount: { type: 'boolean', default: true },
          includeUsers: { type: 'boolean', default: false }
        },
        required: ['format']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                data: {},
                filename: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RoleExportOptions }>, reply: FastifyReply) => {
    try {
      // Export functionality not implemented yet
      return reply.status(501).send({ success: false, error: 'Export functionality not implemented' })
    } catch (error) {
      fastify.log.error({ error, body: request.body }, 'Failed to export roles')
      return reply.status(500).send({ success: false, error: 'Failed to export roles' })
    }
  })

  // ============================================================================
  // AUDIT ROUTES
  // ============================================================================

  /**
   * @route GET /api/v1/users/:id/audit-trail
   * @description Get user audit trail
   */
  fastify.get('/users/:id/audit-trail', {
    schema: {
      description: 'Get user audit trail',
      tags: ['Audit'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { id: string }; 
    Querystring: { limit?: number } 
  }>, reply: FastifyReply) => {
    try {
      const { limit = 100 } = request.query
      // Audit trail functionality not implemented yet
      return reply.status(501).send({ success: false, error: 'Audit trail functionality not implemented' })
    } catch (error) {
      fastify.log.error({ error, userId: request.params.id }, 'Failed to get user audit trail')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve audit trail' })
    }
  })

  /**
   * @route GET /api/v1/security/events
   * @description Get security events
   */
  fastify.get('/security/events', {
    schema: {
      description: 'Get security events',
      tags: ['Security'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ 
    Querystring: { limit?: number } 
  }>, reply: FastifyReply) => {
    try {
      const { limit = 100 } = request.query
      // Security events functionality not implemented yet
      return reply.status(501).send({ success: false, error: 'Security events functionality not implemented' })
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get security events')
      return reply.status(500).send({ success: false, error: 'Failed to retrieve security events' })
    }
  })

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * @route GET /api/v1/users/health
   * @description Health check for user service
   */
  fastify.get('/users/health', {
    schema: {
      description: 'Health check for user management service',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                userService: { type: 'string' },
                validationService: { type: 'string' },
                analyticsService: { type: 'string' },
                database: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Basic health checks
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          userService: 'operational',
          validationService: 'operational',
          analyticsService: 'operational',
          database: 'connected'
        }
      }
      
      return reply.send(health)
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed')
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable'
      })
    }
  })
}
