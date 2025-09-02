# Product Form Type Variable Fix

## Issue
When attempting to save a Stablecoin product, the system was encountering the following error:

```
Error saving product: ReferenceError: productType is not defined
    at handleSubmit (ProductForm.tsx:78:54)
    at handleSubmit (StablecoinProductForm.tsx:176:13)
```

## Root Cause Analysis

The issue stemmed from an inconsistency in how product type information was being passed between components:

1. In `ProductForm.tsx`, the component receives a `projectType` prop and uses it throughout the component.
2. In the `StablecoinProductForm.tsx`, the form was setting `assetType: stablecoinType` in the form data without also setting the `projectType` property that other services expected.
3. This mismatch caused the `productType` reference in ProductForm's `handleSubmit` function to be undefined when trying to log/use it.

## Fix Applied

1. Updated `StablecoinProductForm.tsx` to include both `assetType` and `projectType` with the same value in the form data:

```typescript
// Prepare the data for submission
const formData = {
  ...data,
  depegRiskMitigation: depegRiskMitigationArray,
  collateralTypeEnum,
  assetType: stablecoinType,
  // Ensure projectType is set correctly for the service
  projectType: stablecoinType
};
```

## Verification

After applying this fix, the Stablecoin product form should successfully save data without the "productType is not defined" error.

## Additional Considerations

This fix ensures that the StablecoinProductForm correctly passes the project type information to the parent ProductForm component. The same pattern should be used in other specialized product forms to ensure consistency in how product type information is handled throughout the application.

For future development:
1. Consider standardizing the property name across all components (either `projectType` or `productType`, but not both)
2. Add TypeScript type checking to ensure required properties are always present
3. Consider creating a shared utility function for preparing form data to ensure consistent property naming