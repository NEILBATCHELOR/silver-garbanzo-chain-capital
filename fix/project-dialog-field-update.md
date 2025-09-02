# ProjectDialog Component Update

## Changes Made

1. **Removed Fields**:
   - **Authorized Shares**: Removed from schema and UI
   - **Share Price**: Removed from schema and UI
   - **Company Valuation**: Removed from schema and UI
   - **Organization ID**: Removed from UI to prevent foreign key constraint errors

2. **Schema Updates**:
   - Updated Zod validation schema to remove the deleted fields
   - Updated default values in form initialization
   - Updated form reset logic to reflect the removed fields

## Reasons for Changes

1. **Field Removal**:
   - The specified fields were removed as requested to simplify the form
   - These fields may not be relevant for all project types

2. **Organization ID Removal**:
   - The organization_id field was causing foreign key constraint errors
   - When a user attempted to update a project, the system was trying to associate it with an organization that didn't exist in the database
   - Removing this field allows projects to be created/updated without requiring an organization association

## Impact

- Projects can now be created and updated without organization_id foreign key constraint errors
- The form is now simpler with fewer fields to fill out
- The financial tab now focuses only on essential financial information like target raise, total notional, minimum investment, and estimated yield

## Future Considerations

For a more robust solution in the future, consider:

1. Implementing a dynamic organization selector that fetches actual organizations from the database
2. Making the organization selection optional (nullable in the database)
3. Adding conditional field display based on project type (showing different fields for equity vs debt projects)
