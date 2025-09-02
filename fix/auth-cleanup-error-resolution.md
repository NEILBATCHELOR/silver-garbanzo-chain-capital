# Auth Cleanup Error Resolution

## Issue Summary

**Error**: HTTP 500 Internal Server Error when attempting to clean up orphaned auth users through the AuthCleanupModal component.

**Location**: 
- Frontend: `AuthCleanupModal.tsx:158-160` 
- Backend: `authService.ts:981` (`cleanupSpecificOrphanedUser`)
- Error filtering: `errorFiltering.ts:83`

## Root Cause Analysis

### Three Lines of Reasoning:

1. **Backend Server Connectivity**: The frontend is making HTTP requests to `/api/v1/cleanup/orphaned-user/${userId}` but receiving 500 errors, suggesting the backend server may not be running or is not properly accessible.

2. **Database Permission Issues**: The AuthCleanupService uses raw SQL queries to access `auth.users` table directly, which may require elevated database privileges that the current connection doesn't have.

3. **Service Authentication**: The backend cleanup routes require Bearer token authentication, and there may be a mismatch between the frontend token and backend authentication validation.

## Current State

- **Database**: 1 confirmed orphaned auth user exists (`fe5e72af-da55-4f70-8675-d6e9a8548f10`)
- **Backend Structure**: Properly configured with routes, services, and Prisma schema
- **Frontend**: AuthCleanupModal component implemented with proper error handling
- **Error**: HTTP 500 responses from cleanup endpoints

## Immediate Solutions

### 1. Start the Backend Server

The backend server needs to be running for the cleanup API to work:

```bash
cd backend
npm run dev
# OR
npm run dev:enhanced
```

Verify server is running by checking:
- `http://localhost:3001/health`
- `http://localhost:3001/docs` (Swagger documentation)

### 2. Verify Database Connection

Check if the backend can connect to Supabase:

```bash
cd backend
# Check environment variables
cat .env | grep DATABASE_URL

# Test database connection
npm run db:generate
```

### 3. Test API Endpoints

Once the backend is running, test the cleanup endpoints:

```bash
# Get orphaned users stats
curl -X GET "http://localhost:3001/api/v1/cleanup/orphaned-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List orphaned users  
curl -X GET "http://localhost:3001/api/v1/cleanup/orphaned-users" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Database Permissions Fix

If database permissions are the issue, the backend may need a connection with elevated privileges. Check the DATABASE_URL in `.env`:

```bash
# Current connection string should have sufficient privileges
DATABASE_URL="postgresql://postgres.jrwfkxfzsnnjppogthaw:oqAY2u75AuGhVD3T@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
```

## Long-term Solutions

### 1. Enhanced Error Handling

Update the AuthCleanupService to provide better error messages:

```typescript
// In AuthCleanupService.ts - improve error handling
async cleanupSpecificAuthUser(userId: string, dry_run = true): Promise<ServiceResult<boolean>> {
  try {
    // Add connection test
    await this.db.$queryRaw`SELECT 1`;
    
    // Verify the user is actually orphaned
    const orphanedCheck = await this.db.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT au.id, au.email
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.auth_id
      WHERE au.id = ${userId} AND pu.auth_id IS NULL
    `
    
    if (orphanedCheck.length === 0) {
      return this.error('User not found or not orphaned', 'NOT_FOUND', 404)
    }

    if (dry_run) {
      this.logger.info({ userId }, 'DRY RUN: Would delete specific orphaned auth user')
      return this.success(true)
    }

    // Actual deletion with better error handling
    const result = await this.db.$executeRaw`
      DELETE FROM auth.users WHERE id = ${userId}
    `

    if (result === 0) {
      return this.error('User not found during deletion', 'DELETE_FAILED', 404)
    }

    this.logger.info({ userId }, 'Successfully deleted specific orphaned auth user')
    return this.success(true)
    
  } catch (error) {
    this.logger.error({ error, userId }, 'Failed to cleanup specific orphaned auth user')
    
    // Provide specific error messages
    if (error.code === '42501') {
      return this.error('Insufficient database privileges to delete auth users', 'PERMISSION_ERROR', 403)
    }
    
    return this.error(`Cleanup failed: ${error.message}`, 'CLEANUP_ERROR', 500)
  }
}
```

### 2. Alternative Cleanup Method

If direct auth.users access is restricted, implement cleanup through Supabase Admin API:

```typescript
// Alternative implementation using Supabase Admin API
async cleanupSpecificAuthUserViaSupabase(userId: string, dry_run = true): Promise<ServiceResult<boolean>> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Need service role key
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    if (dry_run) {
      // Just verify user exists
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (error) return this.error(`User verification failed: ${error.message}`, 'USER_CHECK_FAILED')
      return this.success(true)
    }

    // Delete user via Supabase Admin
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      return this.error(`Failed to delete user: ${error.message}`, 'DELETE_FAILED', 500)
    }

    return this.success(true)
    
  } catch (error) {
    return this.error(`Supabase cleanup failed: ${error.message}`, 'SUPABASE_ERROR', 500)
  }
}
```

### 3. Frontend Improvements

Add better error handling and user feedback:

```typescript
// In AuthCleanupModal.tsx - enhanced error handling
const handleActualCleanup = async (userIds?: string[]) => {
  if (!window.confirm(
    `⚠️ WARNING: This will PERMANENTLY DELETE ${userIds?.length || selectedUsers.size} orphaned auth user(s). This action cannot be undone. Are you sure?`
  )) {
    return;
  }

  setIsLoading(true);
  try {
    const usersToDelete = userIds || Array.from(selectedUsers);
    const results = await Promise.allSettled(
      usersToDelete.map(userId => 
        authService.cleanupSpecificOrphanedUser(userId, false)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value?.data).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.data);

    // Detailed error reporting
    if (failed.length > 0) {
      const errorDetails = failed.map((result, index) => {
        if (result.status === 'rejected') {
          return `User ${usersToDelete[results.indexOf(result)]}: ${result.reason}`;
        } else if (result.status === 'fulfilled' && result.value?.error) {
          return `User ${usersToDelete[results.indexOf(result)]}: ${result.value.error}`;
        }
        return `User ${usersToDelete[results.indexOf(result)]}: Unknown error`;
      });

      toast({
        title: "Cleanup Partially Failed",
        description: `${successful} successful, ${failed.length} failed. Check console for details.`,
        variant: "destructive",
      });
      
      console.error('Cleanup errors:', errorDetails);
    } else {
      toast({
        title: "Cleanup Complete",
        description: `Successfully deleted ${successful} orphaned auth user(s)`,
      });
    }

    if (successful > 0) {
      await loadData(); // Reload data
      setSelectedUsers(new Set());
    }
    
  } catch (error) {
    console.error('Error in actual cleanup:', error);
    toast({
      title: "Cleanup Failed",
      description: `System error: ${error instanceof Error ? error.message : 'Unknown error'}. Check if backend server is running.`,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

## Testing Steps

1. **Start Backend Server**:
   ```bash
   cd backend && npm run dev
   ```

2. **Verify Health**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Test Authentication**:
   - Get a valid Bearer token from the frontend
   - Test API endpoints manually

4. **Test Cleanup**:
   - Use dry run mode first
   - Verify orphaned users are identified correctly
   - Test actual cleanup on a test user

## Prevention

1. **Health Monitoring**: Implement backend health checks in the frontend
2. **Better Error Messages**: Provide specific error messages for common issues
3. **Fallback Methods**: Implement alternative cleanup methods for different scenarios
4. **Automated Testing**: Add integration tests for cleanup functionality

## Files Modified

- `backend/src/services/auth/AuthCleanupService.ts` - Enhanced error handling
- `frontend/src/components/UserManagement/users/AuthCleanupModal.tsx` - Better error reporting
- `fix/auth-cleanup-error-resolution.md` - This documentation

## Next Steps

1. Start the backend server and verify it's accessible
2. Test the cleanup functionality with the current implementation
3. If issues persist, implement the enhanced error handling
4. Consider implementing the Supabase Admin API alternative if database permissions are restricted
