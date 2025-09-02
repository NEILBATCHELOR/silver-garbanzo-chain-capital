# Fix for Stablecoin Product Form Submission Error

## Issue Description

When attempting to save a stablecoin product, the following error was occurring:

```
Error saving product: Error: Failed to update fiat_backed_stablecoin product: Could not find the 'project_type' column of 'stablecoin_products' in the schema cache
```

This error was caused by the form attempting to save a `project_type` field to the database, but this column doesn't exist in the `stablecoin_products` table schema.

## Root Cause Analysis

After examining the database schema and the form submission process, the issue was identified:

1. The `StablecoinProductForm` component was adding a `projectType` field to the form data in the `handleSubmit` function
2. When this data was passed to the `BaseProductService.updateProduct` method, it would convert camelCase to snake_case, resulting in a `project_type` field
3. The database tried to save this field, but it doesn't exist in the `stablecoin_products` table

## Solution

The fix involved modifying the `StablecoinProductForm.tsx` file to remove the `projectType` field from the form data, since it's not needed for database operations.

### Changes Made:

1. Removed the following line from the `handleSubmit` function in `StablecoinProductForm.tsx`:
   ```typescript
   // Removed this line:
   projectType: stablecoinType
   ```

2. Added a comment to explain why this field should not be included:
   ```typescript
   // IMPORTANT: Do not include projectType in the formData as it doesn't exist in the database schema
   ```

## Testing

After making these changes, the stablecoin product form submission works correctly:
- New stablecoin products can be created
- Existing stablecoin products can be updated
- No database schema errors occur during save operations

## Future Considerations

To prevent similar issues in the future:
1. Always check the database schema before adding fields to form submissions
2. Consider adding validation or schema checking for form fields against the database schema
3. Implement more detailed error handling in the service layer to provide clearer error messages
