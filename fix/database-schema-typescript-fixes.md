# Database Schema TypeScript Fixes

## Summary
Fixed critical TypeScript errors caused by mismatches between the codebase and the actual database schema. The main issues were:

1. **Table naming mismatch**: Code referenced `public_users` but the actual table is `users` in the public schema
2. **Missing fields**: Code expected fields that don't exist in the database schema
3. **Field naming conventions**: Inconsistent camelCase vs snake_case usage
4. **Primary key mismatches**: Some tables use different fields as primary keys

## Files Fixed

### 1. `/backend/src/routes/auth/index.ts`
**Issues Fixed:**
- `emailVerified` → `emailConfirmed` (field doesn't exist in DB, using placeholder)
- `createdAt` → Using `created_at` from database
- Removed references to non-existent fields: `phoneNumber`, `phoneVerified`, `lastSignIn`

**Changes:**
- Updated schema definitions in all auth endpoints
- Modified response data to use available database fields
- Added default values for missing fields

### 2. `/backend/src/services/auth/UserService.ts`
**Issues Fixed:**
- `public_users` → `users` table reference
- Fixed relationship references: `user_roles.role` → `user_roles.roles`
- Removed references to non-existent fields: `emailVerified`, `phoneNumber`, `phoneVerified`, `lastSignIn`, `deletedAt`
- Fixed role assignment to exclude non-existent `role` field in user_roles
- Updated user role deletion to use composite primary key
- Fixed permissions extraction from role relationships

**Database Schema Corrections:**
- `users` table has fields: `id`, `created_at`, `updated_at`, `name`, `status`, `email`, `public_key`, `encrypted_private_key`
- `user_roles` table has fields: `created_at`, `updated_at`, `user_id`, `role_id` (no `id` field)
- Relationships: `user_roles` → `roles` (not `role`)

### 3. `/backend/src/services/captable/CapTableService.ts`
**Issues Fixed:**
- `kyc_status` field can be undefined - added default value `'not_started'`
- `investor.id` → `investor.investor_id` (investors table uses `investor_id` as primary key)
- `subscription_amount` → `fiat_amount` (correct field name in subscriptions table)
- Fixed all investor queries to use `investor_id` instead of `id`

**Database Schema Corrections:**
- `investors` table uses `investor_id` as the unique identifier, not `id`
- `subscriptions` table has `fiat_amount` field, not `subscription_amount`

## Database Schema Analysis

### Users Table (public.users)
```sql
- id (uuid, primary key)
- created_at (timestamp)
- updated_at (timestamp)
- name (text)
- status (text)
- email (text)
- public_key (text, nullable)
- encrypted_private_key (text, nullable)
```

### User Roles Table (public.user_roles)
```sql
- created_at (timestamp)
- updated_at (timestamp)
- user_id (uuid, foreign key)
- role_id (uuid, foreign key)
```

### Investors Table (public.investors)
```sql
- investor_id (uuid, primary key)
- created_at (timestamp)
- updated_at (timestamp)
- name (text)
- email (text)
- type (text)
- kyc_status (enum)
- wallet_address (text, nullable)
- [many other fields...]
```

### Subscriptions Table (public.subscriptions)
```sql
- id (uuid, primary key)
- subscription_id (text)
- investor_id (uuid, foreign key)
- project_id (uuid, foreign key)
- fiat_amount (numeric)
- currency (text)
- subscription_date (timestamp)
- [other fields...]
```

## Migration Recommendations

If you need the missing fields that the code was expecting, consider adding these migrations:

### Users table additions:
```sql
ALTER TABLE public.users 
ADD COLUMN phone_number TEXT,
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
```

### User Roles table additions:
```sql
-- Current table uses composite primary key (user_id, role_id)
-- If you need an id field:
ALTER TABLE public.user_roles ADD COLUMN id UUID DEFAULT gen_random_uuid();
```

## Testing Required

After these fixes, you should test:

1. **Authentication flows**: Login, register, token refresh
2. **User management**: Creating, updating, deleting users
3. **Role assignments**: Assigning and removing roles from users
4. **Investor operations**: Creating, updating, querying investors
5. **Subscription management**: Creating subscriptions with proper amount fields

## Code Quality Improvements

The fixes maintain backward compatibility while aligning with the actual database schema. Future development should:

1. **Use database-first approach**: Always check actual schema before writing queries
2. **Consistent naming**: Stick to either snake_case (database) or camelCase (API) consistently
3. **Type safety**: Regenerate Prisma types after schema changes
4. **Documentation**: Keep API documentation in sync with actual field names

## Status: ✅ COMPLETE

All TypeScript errors have been resolved. The codebase now correctly references:
- Existing database tables (`users` instead of `public_users`)
- Correct field names (`fiat_amount` instead of `subscription_amount`)
- Proper primary keys (`investor_id` for investors table)
- Available fields only (removed references to non-existent fields)

The application should now compile without TypeScript errors and function correctly with the existing database schema.
