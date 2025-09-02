# SelectItem Empty Value Fix

## Issue
Radix UI Select components were throwing errors:
```
Error: A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
```

## Root Cause
Several components were using `<SelectItem value="">` which is not allowed by Radix UI.

## Files Fixed
1. **EditUserModal.tsx** - Profile type selection
2. **AddUserModal.tsx** - Profile type selection  
3. **rec-form.tsx** - Asset and Receivable selection fields (2 instances)

## Solution Applied

### Before
```tsx
<SelectItem value="">
  <span className="text-muted-foreground">No profile type</span>
</SelectItem>
```

### After
```tsx
<SelectItem value="none">
  <span className="text-muted-foreground">No profile type</span>
</SelectItem>
```

## Form Logic Updates
Updated form submission logic to handle "none" values:

### Before
```tsx
profileType: values.profileType || undefined
```

### After
```tsx
profileType: values.profileType === "none" ? undefined : values.profileType
```

## Additional Changes
- Updated default values in form schemas from `""` to `"none"`
- Updated form reset logic to use `"none"` instead of empty strings
- Added proper null/undefined conversion in database operations

## Files Modified
- `/frontend/src/components/UserManagement/users/EditUserModal.tsx`
- `/frontend/src/components/UserManagement/users/AddUserModal.tsx`
- `/frontend/src/components/climateReceivables/components/entities/recs/rec-form.tsx`

## Testing
The fix ensures:
- ✅ No more Radix UI SelectItem errors
- ✅ Form submissions handle optional values correctly
- ✅ Database receives proper null values instead of empty strings
- ✅ User experience remains unchanged

## Status
✅ **COMPLETED** - All SelectItem empty value errors resolved
