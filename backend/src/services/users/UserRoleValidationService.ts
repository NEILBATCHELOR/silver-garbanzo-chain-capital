import { BaseService } from '../BaseService'
import type { 
  ValidationResult,
  UserCreateRequest,
  UserUpdateRequest,
  RoleCreateRequest,
  RoleUpdateRequest,
  PermissionMatrix,
  PermissionMatrixEntry,
  SecurityAssessment
} from '../../types/user-role-service'

/**
 * User and Role Validation Service
 * Handles validation logic for users, roles, and permissions
 */
export class UserRoleValidationService extends BaseService {

  constructor() {
    super('UserRoleValidation')
  }

  // ============================================================================
  // USER VALIDATION
  // ============================================================================

  /**
   * Validate user creation data
   */
  async validateUserCreate(data: UserCreateRequest): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      completionPercentage: 0,
      missingFields: []
    }

    try {
      // Required field validation
      const requiredFields = ['name', 'email']
      const missingFields = requiredFields.filter(field => !data[field as keyof UserCreateRequest])
      
      if (missingFields.length > 0) {
        result.isValid = false
        result.errors.push(`Missing required fields: ${missingFields.join(', ')}`)
      }

      // Email validation
      if (data.email && !this.isValidEmail(data.email)) {
        result.isValid = false
        result.errors.push('Invalid email format')
      }

      // Check email uniqueness
      if (data.email) {
        const existingUser = await this.db.public_users.findUnique({
          where: { email: data.email }
        })
        
        if (existingUser) {
          result.isValid = false
          result.errors.push('Email address already exists')
        }
      }

      // Password validation (if provided)
      if (data.password) {
        const passwordValidation = this.validatePassword(data.password)
        result.errors.push(...passwordValidation.errors)
        result.warnings.push(...passwordValidation.warnings)
        
        if (!passwordValidation.isValid) {
          result.isValid = false
        }
      }

      // Role validation (if provided)
      if (data.roleId) {
        const role = await this.db.roles.findUnique({
          where: { id: data.roleId }
        })
        
        if (!role) {
          result.isValid = false
          result.errors.push('Invalid role specified')
        }
      }

      // Calculate completion percentage
      result.completionPercentage = this.calculateUserCompletionPercentage(data)

      return result
    } catch (error) {
      this.logError('Failed to validate user creation', { error, data })
      result.isValid = false
      result.errors.push('Validation failed due to system error')
      return result
    }
  }

  /**
   * Validate user update data
   */
  async validateUserUpdate(data: UserUpdateRequest, userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      completionPercentage: 0,
      missingFields: []
    }

    try {
      // Email validation and uniqueness check
      if (data.email) {
        if (!this.isValidEmail(data.email)) {
          result.isValid = false
          result.errors.push('Invalid email format')
        }

        // Check if email is already taken by another user
        const existingUser = await this.db.public_users.findUnique({
          where: { email: data.email }
        })
        
        if (existingUser && existingUser.id !== userId) {
          result.isValid = false
          result.errors.push('Email address already exists')
        }
      }

      // Role validation (if provided)
      if (data.roleId) {
        const role = await this.db.roles.findUnique({
          where: { id: data.roleId }
        })
        
        if (!role) {
          result.isValid = false
          result.errors.push('Invalid role specified')
        }
      }

      // Status transition validation
      if (data.status) {
        const isValidTransition = await this.validateStatusTransition(userId, data.status)
        if (!isValidTransition.isValid) {
          result.isValid = false
          result.errors.push(...isValidTransition.errors)
        }
        result.warnings.push(...isValidTransition.warnings)
      }

      // Get current user data for completion calculation
      const currentUser = await this.db.public_users.findUnique({
        where: { id: userId }
      })
      
      if (currentUser) {
        const mergedData = { ...currentUser, ...data }
        result.completionPercentage = this.calculateUserCompletionPercentage(mergedData)
      }

      return result
    } catch (error) {
      this.logError('Failed to validate user update', { error, userId, data })
      result.isValid = false
      result.errors.push('Validation failed due to system error')
      return result
    }
  }

  // ============================================================================
  // ROLE VALIDATION
  // ============================================================================

  /**
   * Validate role creation data
   */
  async validateRoleCreate(data: RoleCreateRequest): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      completionPercentage: 0,
      missingFields: []
    }

    try {
      // Required field validation
      if (!data.name || data.name.trim().length === 0) {
        result.isValid = false
        result.errors.push('Role name is required')
      }

      // Name uniqueness check
      if (data.name) {
        const existingRole = await this.db.roles.findUnique({
          where: { name: data.name }
        })
        
        if (existingRole) {
          result.isValid = false
          result.errors.push('Role name already exists')
        }
      }

      // Validate permissions (if provided)
      if (data.permissions && data.permissions.length > 0) {
        const permissionValidation = await this.validatePermissions(data.permissions)
        result.errors.push(...permissionValidation.errors)
        result.warnings.push(...permissionValidation.warnings)
        
        if (!permissionValidation.isValid) {
          result.isValid = false
        }
      }

      // Calculate completion percentage
      result.completionPercentage = this.calculateRoleCompletionPercentage(data)

      return result
    } catch (error) {
      this.logError('Failed to validate role creation', { error, data })
      result.isValid = false
      result.errors.push('Validation failed due to system error')
      return result
    }
  }

  /**
   * Validate role update data
   */
  async validateRoleUpdate(data: RoleUpdateRequest, roleId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      completionPercentage: 0,
      missingFields: []
    }

    try {
      // Get existing role
      const existingRole = await this.db.roles.findUnique({
        where: { id: roleId },
        include: {
          _count: {
            select: { user_roles: true }
          }
        }
      })

      if (!existingRole) {
        result.isValid = false
        result.errors.push('Role not found')
        return result
      }

      // Name uniqueness check (if changing name)
      if (data.name && data.name !== existingRole.name) {
        const duplicateRole = await this.db.roles.findUnique({
          where: { name: data.name }
        })
        
        if (duplicateRole) {
          result.isValid = false
          result.errors.push('Role name already exists')
        }
      }

      // Validate permissions (if provided)
      if (data.permissions && data.permissions.length > 0) {
        const permissionValidation = await this.validatePermissions(data.permissions)
        result.errors.push(...permissionValidation.errors)
        result.warnings.push(...permissionValidation.warnings)
        
        if (!permissionValidation.isValid) {
          result.isValid = false
        }

        // Warn about permission changes affecting users
        if (existingRole._count.user_roles > 0) {
          result.warnings.push(`Changing permissions will affect ${existingRole._count.user_roles} user(s)`)
        }
      }

      return result
    } catch (error) {
      this.logError('Failed to validate role update', { error, roleId, data })
      result.isValid = false
      result.errors.push('Validation failed due to system error')
      return result
    }
  }

  // ============================================================================
  // PERMISSION VALIDATION
  // ============================================================================

  /**
   * Validate permissions array
   */
  private async validatePermissions(permissions: string[]): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    conflicts: string[]
    securityConcerns: string[]
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      conflicts: [] as string[],
      securityConcerns: [] as string[]
    }

    if (!permissions || permissions.length === 0) {
      return result
    }

    try {
      // Check if all permissions exist
      const existingPermissions = await this.db.permissions.findMany({
        where: { name: { in: permissions } }
      })

      const existingPermissionNames = existingPermissions.map(p => p.name)
      const invalidPermissions = permissions.filter(p => !existingPermissionNames.includes(p))

      if (invalidPermissions.length > 0) {
        result.errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`)
      }

      // Check for conflicting permissions
      const conflicts = this.findPermissionConflicts(permissions)
      result.conflicts.push(...conflicts)

      // Check for security concerns
      const securityConcerns = this.identifySecurityConcerns(permissions)
      result.securityConcerns.push(...securityConcerns)

      // Check for excessive permissions
      if (permissions.length > 20) {
        result.warnings.push('Role has many permissions - consider if all are necessary')
      }

      if (!result.isValid) {
        result.errors.push('Permission validation failed')
      }

      return result
    } catch (error) {
      result.isValid = false
      result.errors.push('Permission validation failed')
      return result
    }
  }

  /**
   * Get permission matrix for role-permission assignments
   */
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    try {
      // Get all roles and permissions
      const [roles, permissions] = await Promise.all([
        this.db.roles.findMany({
          include: {
            role_permissions: {
              include: { permissions: true }
            }
          },
          orderBy: { priority: 'asc' }
        }),
        this.db.permissions.findMany({
          orderBy: { name: 'asc' }
        })
      ])

      // Build matrix entries
      const assignments: PermissionMatrixEntry[] = []
      
      for (const role of roles) {
        for (const permission of permissions) {
          const hasPermission = role.role_permissions.some(rp => rp.permission_name === permission.name)
          
          assignments.push({
            roleId: role.id,
            roleName: role.name,
            permissionName: permission.name,
            permissionDescription: permission.description,
            hasPermission
          })
        }
      }

      return {
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          priority: r.priority,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        permissions: permissions.map(p => ({
          name: p.name,
          description: p.description,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        assignments
      }
    } catch (error) {
      this.logError('Failed to get permission matrix', { error })
      return { roles: [], permissions: [], assignments: [] }
    }
  }

  // ============================================================================
  // SECURITY VALIDATION
  // ============================================================================

  /**
   * Validate password strength
   */
  private validatePassword(password: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      completionPercentage: 100,
      missingFields: []
    }

    // Length checks
    if (password.length < 8) {
      result.isValid = false
      result.errors.push('Password must be at least 8 characters long')
    }

    if (password.length > 128) {
      result.isValid = false
      result.errors.push('Password is too long (max 128 characters)')
    }

    // Complexity checks
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    const complexityCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length

    if (complexityCount < 3) {
      result.isValid = false
      result.errors.push('Password must contain at least 3 of: uppercase, lowercase, numbers, special characters')
    }

    // Check for common passwords (simplified check)
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty']
    if (commonPasswords.includes(password.toLowerCase())) {
      result.warnings.push('Password appears to be commonly used - consider a more unique password')
    }

    return result
  }

  /**
   * Validate status transition
   */
  private async validateStatusTransition(userId: string, newStatus: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      completionPercentage: 100,
      missingFields: []
    }

    try {
      const user = await this.db.public_users.findUnique({
        where: { id: userId },
        select: { status: true, name: true }
      })

      if (!user) {
        result.isValid = false
        result.errors.push('User not found')
        return result
      }

      // Add warnings for certain status changes
      if (newStatus === 'blocked') {
        result.warnings.push('Blocking user will prevent them from accessing the system')
      }

      return result
    } catch (error) {
      result.isValid = false
      result.errors.push('Status validation failed')
      return result
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Calculate user completion percentage
   */
  private calculateUserCompletionPercentage(data: any): number {
    const fields = ['name', 'email', 'status', 'public_key', 'encrypted_private_key']
    const completedFields = fields.filter(field => data[field] && data[field].toString().trim().length > 0)
    return Math.round((completedFields.length / fields.length) * 100)
  }

  /**
   * Calculate role completion percentage
   */
  private calculateRoleCompletionPercentage(data: any): number {
    const fields = ['name', 'description', 'priority']
    const completedFields = fields.filter(field => data[field] !== undefined && data[field] !== null)
    return Math.round((completedFields.length / fields.length) * 100)
  }

  /**
   * Find permission conflicts
   */
  private findPermissionConflicts(permissions: string[]): string[] {
    const conflicts: string[] = []
    
    // Example conflict detection - customize based on your permission structure
    if (permissions.includes('users.delete') && permissions.includes('users.create')) {
      conflicts.push('Having both create and delete permissions may pose security risks')
    }
    
    return conflicts
  }

  /**
   * Identify security concerns
   */
  private identifySecurityConcerns(permissions: string[]): string[] {
    const concerns: string[] = []
    
    // Example security concern detection
    const adminPermissions = permissions.filter(p => p.includes('admin') || p.includes('delete') || p.includes('manage'))
    
    if (adminPermissions.length > 5) {
      concerns.push('Role has many administrative permissions - ensure this is intentional')
    }
    
    return concerns
  }
}
