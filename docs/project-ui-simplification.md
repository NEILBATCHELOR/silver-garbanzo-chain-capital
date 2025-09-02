# Project UI Simplification

This update simplifies the project management interface by removing unnecessary sections and tabs from the project details and creation/editing flows.

## Changes Made

### ProjectDetailsPage.tsx
1. Removed the "Project Details" section 
   - This section contained an extensive list of fields that were redundant with information available elsewhere
   - Removed unnecessary detail items to create a cleaner interface

2. Removed the "Valuation & Metrics" section
   - Removed financial overview card with valuation metrics
   - Simplified the overview tab to focus on essential information

### ProjectDialog.tsx (Create/Edit Project)
1. Removed the "Financial Details" tab
   - Moved the Currency field to the "Key Dates" tab 
   - Eliminated redundant financial fields

2. Removed the "Legal & Compliance" tab
   - Removed fields for legal entity, jurisdiction, and tax ID

## Benefits
- **Cleaner UI**: Reduced visual clutter and simplified the interface
- **Better UX**: Focused on the most essential information
- **Improved Performance**: Fewer elements to render and maintain
- **Simplified Workflow**: Reduced the number of steps in project creation/editing

## Note on ProjectWizard.tsx
- The `ProjectWizard.tsx` component appears to be unused in the application
- No imports or direct references to this component were found
- The component can be considered for removal in a future update if confirmed unused

## Next Steps
- Consider further simplification of the UI based on user feedback
- Evaluate if more fields can be removed or consolidated
- Monitor performance improvements from these changes
