# Financial Products Form Validation and Unique Constraint Fix

## Overview

This update resolves form submission issues in the financial products system, focusing on handling unique constraints in the database and improving form validation.

## Issues Fixed

### 1. Unique Constraint Violation

**Problem:** The application was generating errors when trying to create multiple products for the same project, due to a unique constraint on the `project_id` column in product tables.

**Solution:** 
- Modified `BaseProductService.createProduct()` to check if a product already exists for a project before attempting to create a new one
- If a product exists, the method now updates the existing product instead of trying to create a new one
- Added explicit unique constraints to all product tables via a migration script for clarity

### 2. React Controlled Component Warning

**Problem:** Checkboxes in product forms were switching between uncontrolled and controlled states, causing React warnings.

**Solution:**
- Ensured all form values are properly initialized, especially boolean values for checkboxes
- Added explicit default value for `modificationIndicator` in the AssetBackedProductForm

### 3. Error Handling and User Feedback

**Problem:** Generic error messages were not providing users with clear information about what went wrong.

**Solution:**
- Improved error handling in ProductForm with more descriptive error messages
- Added specific error messages for unique constraint violations
- Enhanced logging throughout the form submission process

## Implementation Details

### Files Updated

1. **BaseProductService.ts**
   - Added check for existing products before creation
   - Implemented update logic for existing products
   - Enhanced error handling and logging

2. **AssetBackedProductForm.tsx**
   - Fixed checkbox initialization to prevent controlled/uncontrolled switching
   - Ensured proper form value initialization

3. **ProductForm.tsx**
   - Improved error handling with specific error messages
   - Added reload logic after duplicate key errors

### New Files

1. **20250817_add_unique_constraints.sql**
   - Migration script to add explicit unique constraints to all product tables
   - Added documentation comments to constraints for clarity

## Usage Guidelines

With these changes, the system now follows the "one product per project" business rule:

1. Each project can have only one product of its type (e.g., one Bond product per Bond project)
2. When editing an existing product, the system will load and update the existing record
3. If a user attempts to create a product when one already exists, the system will:
   - Detect the duplicate attempt
   - Update the existing product instead of creating a new one
   - Provide a clear message to the user

## Future Enhancements

1. **Form Validation Improvements**
   - Add more specific field-level validation messages
   - Implement real-time validation feedback

2. **UI Enhancements**
   - Add visual indicators that a project already has a product
   - Improve the edit/create flow with clearer state indicators

3. **Error Handling**
   - Implement more comprehensive error categorization
   - Add support for retry mechanisms on network failures

4. **Testing**
   - Add unit tests for the create/update logic
   - Implement integration tests for the form submission flow
