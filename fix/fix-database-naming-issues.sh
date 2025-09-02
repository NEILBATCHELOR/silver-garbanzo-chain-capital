#!/bin/bash

# Fix Database Naming Issues in Backend Services
# This script fixes the TypeScript compilation errors related to database table name mismatches

echo "🔧 Fixing database naming issues in backend services..."

# Base directory for backend services
BACKEND_DIR="/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src"

# Fix table name references (Prisma client uses exact database table names)
echo "📊 Fixing table name references..."

# Fix userRoles -> user_roles (keeping camelCase property names in results)
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.create(/\.user_roles\.create(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.findMany(/\.user_roles\.findMany(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.findUnique(/\.user_roles\.findUnique(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.findFirst(/\.user_roles\.findFirst(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.update(/\.user_roles\.update(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.delete(/\.user_roles\.delete(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.deleteMany(/\.user_roles\.deleteMany(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userRoles\.count(/\.user_roles\.count(/g' {} \;

# Fix rolePermissions -> role_permissions
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.create(/\.role_permissions\.create(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.findMany(/\.role_permissions\.findMany(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.findUnique(/\.role_permissions\.findUnique(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.findFirst(/\.role_permissions\.findFirst(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.update(/\.role_permissions\.update(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.delete(/\.role_permissions\.delete(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.deleteMany(/\.role_permissions\.deleteMany(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.count(/\.role_permissions\.count(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.rolePermissions\.createMany(/\.role_permissions\.createMany(/g' {} \;

# Fix userPermissionsView -> user_permissions_view
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userPermissionsView\.findMany(/\.user_permissions_view\.findMany(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userPermissionsView\.findUnique(/\.user_permissions_view\.findUnique(/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/\.userPermissionsView\.findFirst(/\.user_permissions_view\.findFirst(/g' {} \;

# Fix field names in data objects for user_roles table (needs snake_case for database)
echo "🏗️ Fixing field names in data objects..."

# Fix userId -> user_id and roleId -> role_id in user_roles operations
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/userId: user\.id,/user_id: user.id,/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/roleId: data\.roleId/role_id: data.roleId/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/userId: id,/user_id: id,/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/roleId: data\.roleId/role_id: data.roleId/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/where: { userId: id }/where: { user_id: id }/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/where: { userId:/where: { user_id:/g' {} \;

# Fix include/select field names in queries (database returns snake_case, we access with snake_case)
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/userRoles: {/user_roles: {/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/rolePermissions: {/role_permissions: {/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/select: { userRoles:/select: { user_roles:/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/{ userRoles: true }/{ user_roles: true }/g' {} \;

echo "🎨 Fixing property access in result objects..."

# These need to be handled differently as they access properties on returned objects
# The database returns snake_case field names, so we need to access them as such
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/role\._count\.userRoles/role._count.user_roles/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/role\.rolePermissions/role.role_permissions/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/user\.userRoles/user.user_roles/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/dbUser\.userRoles/dbUser.user_roles/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/existingRole\.rolePermissions/existingRole.role_permissions/g' {} \;

echo "📅 Fixing date field mappings..."

# Fix date field access (database uses snake_case)
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/createdAt: role\.createdAt/createdAt: role.created_at/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/updatedAt: role\.updatedAt/updatedAt: role.updated_at/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/createdAt: user\.createdAt/createdAt: user.created_at/g' {} \;
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/updatedAt: user\.updatedAt/updatedAt: user.updated_at/g' {} \;

# Fix update operations that use camelCase field names (should be snake_case for database)
find "$BACKEND_DIR" -name "*.ts" -exec sed -i '' 's/updatedAt: new Date()/updated_at: new Date()/g' {} \;

echo "✅ Database naming fixes applied!"

# Run TypeScript check to see remaining errors
echo "🔍 Checking for remaining TypeScript errors..."
cd "$BACKEND_DIR/../.." 
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(error|Error)" | head -20

echo "🎯 Fix script completed. Manual review may be needed for complex cases."
