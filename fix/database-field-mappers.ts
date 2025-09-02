// TypeScript Database Mapping Utilities
// Provides proper type mapping between database snake_case and API camelCase

/**
 * Maps database user object to API response format
 */
export function mapDatabaseUserToResponse(dbUser: any): any {
  if (!dbUser) return null;
  
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    status: dbUser.status,
    publicKey: dbUser.publicKey || dbUser.public_key,
    encryptedPrivateKey: dbUser.encryptedPrivateKey || dbUser.encrypted_private_key,
    createdAt: dbUser.createdAt || dbUser.created_at,
    updatedAt: dbUser.updatedAt || dbUser.updated_at,
    // Map user_roles to role
    ...(dbUser.user_roles && dbUser.user_roles[0] && {
      role: mapDatabaseRoleToResponse(dbUser.user_roles[0].role)
    }),
    // Map permissions from role
    permissions: dbUser.user_roles?.[0]?.role?.role_permissions?.map((rp: any) => ({
      name: rp.permission.name,
      description: rp.permission.description,
      createdAt: rp.permission.created_at,
      updatedAt: rp.permission.updated_at
    }))
  };
}

/**
 * Maps database role object to API response format
 */
export function mapDatabaseRoleToResponse(dbRole: any): any {
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
      name: rp.permission.name,
      description: rp.permission.description,
      createdAt: rp.permission.created_at,
      updatedAt: rp.permission.updated_at
    }))
  };
}

/**
 * Maps database permission object to API response format  
 */
export function mapDatabasePermissionToResponse(dbPermission: any): any {
  if (!dbPermission) return null;
  
  return {
    name: dbPermission.name,
    description: dbPermission.description,
    createdAt: dbPermission.created_at,
    updatedAt: dbPermission.updated_at
  };
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
 * Type-safe field mapping for database operations
 */
export const DatabaseFieldMappings = {
  users: {
    // API -> Database field mappings
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    publicKey: 'public_key', 
    encryptedPrivateKey: 'encrypted_private_key'
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
};

/**
 * Convert API data to database format
 */
export function mapApiDataToDatabase(tableName: keyof typeof DatabaseFieldMappings, data: any): any {
  if (!data) return data;
  
  const fieldMap = DatabaseFieldMappings[tableName];
  if (!fieldMap) return data;
  
  const mapped: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    const dbFieldName = (fieldMap as any)[key] || key;
    mapped[dbFieldName] = value;
  }
  
  return mapped;
}
