# Wallet Generation Role-Based Permission Check

## Issue

The wallet generation functionality was not properly checking user permissions before allowing the creation of wallet credentials. This led to potential security issues where users without the appropriate roles could generate wallets for projects.

## Solution

Implemented a comprehensive role-based permission check system that:

1. Verifies the user has both `project.create` and `project.edit` permissions before allowing wallet generation
2. Shows appropriate UI feedback when permissions are missing
3. Disables wallet generation functionality for unauthorized users
4. Adds explicit permission checks in both the UI component and service layer

## Implementation Details

### Backend Service Layer Check

Added a new method `checkWalletGenerationPermissions` to the `enhancedProjectWalletService` that:
- Queries the `user_permissions_view` to check for specific permissions
- Requires the user to have both `project.create` and `project.edit` permissions
- Returns a boolean indicating if the user has the required permissions

Modified the `generateWalletForProject` method to:
- Accept a user ID parameter
- Check permissions before proceeding with wallet generation
- Return a clear error message if permissions are missing

### Frontend Component Changes

Updated the `ProjectWalletGenerator` component to:
- Check permissions on component mount
- Show loading indicators while checking permissions
- Display a warning alert if permissions are missing
- Disable the generate button for unauthorized users
- Pass the user ID to the service for permission validation

## Files Modified

1. `/frontend/src/services/project/enhancedProjectWalletService.ts`
   - Added permission checking method
   - Updated wallet generation methods to validate permissions

2. `/frontend/src/components/projects/ProjectWalletGenerator.tsx`
   - Added permission checking and UI feedback
   - Updated wallet generation logic to handle permission errors
   - Added user authentication integration

## Testing

To test this fix:
1. Log in as a user with both `project.create` and `project.edit` permissions - wallet generation should work
2. Log in as a user with only one of the permissions - wallet generation should be disabled with a warning
3. Log in as a user with neither permission - wallet generation should be disabled with a warning

## Security Considerations

This implementation follows the principle of defense in depth by:
1. Validating permissions in the UI layer (for user feedback)
2. Double-checking permissions in the service layer (for security)
3. Using the existing user_permissions_view to enforce role-based access control
