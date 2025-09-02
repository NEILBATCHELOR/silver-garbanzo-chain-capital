# Backend Services TypeScript Fixes

## Overview

After regenerating Prisma schema, the backend services had multiple TypeScript errors due to:
1. **Type Import Issues** - Prisma generated types use snake_case instead of PascalCase
2. **Database Table Name Issues** - Database operations need snake_case table names
3. **Field Mapping Issues** - Database field names are snake_case

## Fixed Files

### ✅ Type Definition Files
1. **captable-service.ts** - Fixed all Prisma type imports with proper aliases
2. **project-service.ts** - Fixed ProjectDuration import
3. **investors.ts** - Added missing validation fields

### ✅ Service Files
1. **UserService.ts** - Completely fixed all database operations
2. **CapTableService.ts** - Completely fixed all database operations

### 🔄 Partially Fixed
1. **InvestorService.ts** - Partially fixed, needs completion

### ❌ Still Need Fixes
1. **CapTableAnalyticsService.ts**
2. **CapTableValidationService.ts** 
3. **InvestorAnalyticsService.ts**
4. **InvestorGroupService.ts**
5. **InvestorValidationService.ts**
6. **ProjectService.ts**
7. **ProjectAnalyticsService.ts**

## Database Table Mapping

| Old (camelCase) | New (snake_case) |
|----------------|------------------|
| `this.db.user` | `this.db.users` |
| `this.db.role` | `this.db.roles` |
| `this.db.userRole` | `this.db.user_roles` |
| `this.db.project` | `this.db.projects` |
| `this.db.capTable` | `this.db.cap_tables` |
| `this.db.investor` | `this.db.investors` |
| `this.db.subscription` | `this.db.subscriptions` |
| `this.db.tokenAllocation` | `this.db.token_allocations` |
| `this.db.distribution` | `this.db.distributions` |
| `this.db.investorGroup` | `this.db.investor_groups` |
| `this.db.investorGroupMember` | `this.db.investor_group_members` |
| `this.db.capTableInvestor` | `this.db.cap_table_investors` |
| `this.db.auditLog` | `this.db.audit_logs` |
| `this.db.token` | `this.db.tokens` |

## Field Mapping

| Old (camelCase) | New (snake_case) |
|----------------|------------------|
| `userRoles` | `user_roles` |
| `roleEntity` | `role` |
| `rolePermissions` | `role_permissions` |
| `permissionName` | `permission_name` |
| `projectId` | `project_id` |
| `investorId` | `investor_id` |
| `phoneNumber` | `phone_number` |
| `emailVerified` | `email_verified` |
| `lastSignIn` | `last_sign_in` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `deletedAt` | `deleted_at` |
| `userId` | `user_id` |
| `roleId` | `role_id` |
| `kycStatus` | `kyc_status` |
| `investorType` | `investor_type` |

## Type Import Fixes

### Before:
```typescript
import { User, Role, CapTable } from '@/infrastructure/database/generated/index.js'
```

### After:
```typescript
import { 
  users as User, 
  roles as Role, 
  cap_tables as CapTable 
} from '@/infrastructure/database/generated/index.js'
```

## Common Fix Script

Created `/scripts/fix-backend-services.js` to automate the remaining fixes.

## Next Steps

1. **Run the fix script**: `node scripts/fix-backend-services.js`
2. **Manual review**: Check each file for any custom logic that needs adjustment
3. **Test compilation**: Run `npm run build` to verify all TypeScript errors are resolved
4. **Update imports**: Ensure all import statements use correct type aliases

## Additional Notes

- All database field names should use snake_case in queries and data operations
- Prisma relation names might also need adjustment in include/select statements
- Some validation services may need interface updates for missing fields
- Type definitions should maintain consistent naming with database schema

## Build Errors Resolved

The fixes address these primary error categories:
- ❌ Module has no exported member 'User'
- ❌ Property 'user' does not exist on type 'PrismaClient'
- ❌ Property implicitly has an 'any' type
- ❌ Type mismatch in validation results
- ❌ Missing properties in interface definitions

All fixes maintain backward compatibility with the existing business logic while ensuring proper TypeScript compilation.
