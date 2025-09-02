/**
 * Database Field Mappers
 * Handles conversion between database snake_case and API camelCase formats
 */

/**
 * Maps database user object to API response format
 */
export function mapUserToResponse(dbUser: any): any {
  if (!dbUser) return null;
  
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    status: dbUser.status,
    publicKey: dbUser.public_key,
    encryptedPrivateKey: dbUser.encrypted_private_key,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    // Map user_roles relation
    role: dbUser.user_roles && dbUser.user_roles[0] 
      ? mapRoleToResponse(dbUser.user_roles[0].role || dbUser.user_roles[0])
      : undefined,
    permissions: extractPermissionsFromUserRoles(dbUser.user_roles)
  };
}

/**
 * Maps database role object to API response format  
 */
export function mapRoleToResponse(dbRole: any): any {
  if (!dbRole) return null;
  
  return {
    id: dbRole.id,
    name: dbRole.name,
    description: dbRole.description,
    priority: dbRole.priority,
    createdAt: dbRole.created_at,
    updatedAt: dbRole.updated_at,
    userCount: dbRole._count?.user_roles || 0,
    permissionCount: dbRole.role_permissions?.length || 0,
    isSystemRole: isSystemRole(dbRole.name),
    permissions: dbRole.role_permissions?.map((rp: any) => ({
      name: rp.permission?.name || rp.permission_name,
      description: rp.permission?.description || '',
      createdAt: rp.permission?.created_at || new Date(),
      updatedAt: rp.permission?.updated_at || new Date()
    })) || []
  };
}

/**
 * Maps database permission to API response format
 */
export function mapPermissionToResponse(dbPermission: any): any {
  if (!dbPermission) return null;
  
  return {
    name: dbPermission.name,
    description: dbPermission.description,
    createdAt: dbPermission.created_at,
    updatedAt: dbPermission.updated_at
  };
}

/**
 * Extract permissions from user roles relationship
 */
function extractPermissionsFromUserRoles(userRoles: any[]): any[] {
  if (!Array.isArray(userRoles)) return [];
  
  const permissions: any[] = [];
  userRoles.forEach(ur => {
    if (ur.role?.role_permissions) {
      ur.role.role_permissions.forEach((rp: any) => {
        permissions.push(mapPermissionToResponse(rp.permission));
      });
    }
  });
  
  // Remove duplicates by name
  const uniquePermissions = permissions.filter((perm, index, self) => 
    index === self.findIndex(p => p.name === perm.name)
  );
  
  return uniquePermissions;
}

/**
 * Check if role is a system role
 */
function isSystemRole(roleName: string): boolean {
  const systemRoles = [
    'Super Admin', 'super_admin', 'superAdmin',
    'Owner', 'owner',
    'Compliance Manager', 'compliance_manager', 'complianceManager',
    'Compliance Officer', 'compliance_officer', 'complianceOfficer', 
    'Agent', 'agent',
    'Viewer', 'viewer'
  ];
  return systemRoles.includes(roleName);
}

/**
 * Maps user create request to database format
 */
export function mapUserCreateToDb(userData: any): any {
  return {
    name: userData.name,
    email: userData.email,
    status: userData.status || 'active',
    public_key: userData.publicKey,
    encrypted_private_key: userData.encryptedPrivateKey,
    created_at: new Date(),
    updated_at: new Date()
  };
}

/**
 * Maps user update request to database format
 */
export function mapUserUpdateToDb(userData: any): any {
  const mapped: any = {
    updated_at: new Date()
  };
  
  if (userData.name !== undefined) mapped.name = userData.name;
  if (userData.email !== undefined) mapped.email = userData.email;
  if (userData.status !== undefined) mapped.status = userData.status;
  if (userData.publicKey !== undefined) mapped.public_key = userData.publicKey;
  if (userData.encryptedPrivateKey !== undefined) mapped.encrypted_private_key = userData.encryptedPrivateKey;
  
  return mapped;
}

/**
 * Standard Prisma include for user queries
 */
export function getUserInclude(includeRole = true, includePermissions = false) {
  if (!includeRole) return {};
  
  return {
    user_roles: {
      include: {
        role: includePermissions ? {
          include: {
            role_permissions: {
              include: {
                permission: true
              }
            }
          }
        } : true
      }
    }
  };
}

/**
 * Standard Prisma include for role queries
 */
export function getRoleInclude(includePermissions = false, includeUserCount = true) {
  const include: any = {};
  
  if (includeUserCount) {
    include._count = {
      select: { user_roles: true }
    };
  }
  
  if (includePermissions) {
    include.role_permissions = {
      include: { permission: true }
    };
  }
  
  return include;
}

/**
 * Database table name mappings
 */
export const TABLE_NAMES = {
  USERS: 'users',
  ROLES: 'roles', 
  PERMISSIONS: 'permissions',
  USER_ROLES: 'user_roles',
  ROLE_PERMISSIONS: 'role_permissions',
  AUDIT_LOGS: 'audit_logs'
} as const;

/**
 * Database field name mappings for different tables
 */
export const FIELD_MAPPINGS = {
  users: {
    publicKey: 'public_key',
    encryptedPrivateKey: 'encrypted_private_key',
    createdAt: 'created_at', 
    updatedAt: 'updated_at'
  },
  roles: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  permissions: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  user_roles: {
    userId: 'user_id',
    roleId: 'role_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  role_permissions: {
    roleId: 'role_id', 
    permissionName: 'permission_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
} as const;
