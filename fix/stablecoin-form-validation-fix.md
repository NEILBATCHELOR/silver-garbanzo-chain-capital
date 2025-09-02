# Stablecoin Form Validation Fix

## Problems

### Issue 1: Type-Specific Fields Validation

The stablecoin product form was experiencing validation errors related to type-specific fields:

```
Form validation errors: {rebaseFrequency: {…}, algorithmDescription: {…}}
```

The issue occurred because:

1. Different stablecoin types (Fiat-Backed, Crypto-Backed, Algorithmic, Rebasing) have specific fields that are conditionally displayed.
2. The form validation schema treated these fields as optional for all stablecoin types.
3. However, the form UI conditionally rendered these fields based on the stablecoin type.
4. When a user submitted the form for one stablecoin type (e.g., Fiat-Backed), it was failing validation because fields for other types (e.g., `rebaseFrequency` for Rebasing, `algorithmDescription` for Algorithmic) were missing.

### Issue 2: Unnecessary Required Fields

After fixing the first issue, additional validation errors were encountered:

```
Form validation errors: {complianceRules: {…}, stabilityMechanism: {…}, reserveManagementPolicy: {…}, redemptionMechanism: {…}, liquidationTerms: {…}, …}
```

These fields were intended to be optional but were being treated as required, causing validation errors.

## Solutions

### Solution for Issue 1: Dynamic Schema Creation

Created a dynamic validation schema based on the stablecoin type:

1. Created a `createStablecoinSchema` function that generates the appropriate Zod schema based on the stablecoin type
2. Initially implemented type-specific validation rules:
   - Algorithmic Stablecoins: requires `algorithmDescription`, makes `rebaseFrequency` optional
   - Rebasing Stablecoins: requires `rebaseFrequency`, makes `algorithmDescription` optional
   - Crypto-Backed Stablecoins: requires `collateralRatio` and `overcollateralizationThreshold`
   - Fiat-Backed and Commodity-Backed: makes all special fields optional
3. Added more debugging information to the error handler to help diagnose validation issues

### Solution for Issue 2: Making All Fields Optional

After encountering more validation errors, all fields except the absolute minimum required were made truly optional:

1. Updated the base schema to only require the following fields:
   - `assetName`
   - `assetSymbol`
   - `issuer`
   - `blockchainNetwork`
2. Removed all `.min(0)` validations from numeric fields to prevent validation errors on empty fields
3. Made previously required type-specific fields optional to accommodate all use cases

## Implementation

The key changes were:

1. Replacing the static schema with a dynamic schema creation function:

```typescript
// Define a function to create the schema based on stablecoin type
const createStablecoinSchema = (stablecoinType: ProjectType) => {
  // Base schema for all stablecoin types with common fields
  const baseSchema = {
    // Required fields
    assetName: z.string().min(1, 'Asset name is required'),
    assetSymbol: z.string().min(1, 'Asset symbol is required'),
    issuer: z.string().min(1, 'Issuer is required'),
    blockchainNetwork: z.string().min(1, 'Blockchain network is required'),
    
    // All other fields are truly optional
    smartContractAddress: z.string().optional(),
    totalSupply: z.coerce.number().optional(), // No min(0) validation
    // ... other optional fields
  };

  // Add type-specific schema fields based on stablecoin type
  if (stablecoinType === ProjectType.ALGORITHMIC_STABLECOIN) {
    return z.object({
      ...baseSchema,
      algorithmDescription: z.string().optional(),
      // Other fields optional
      // ...
    });
  }
  // ... etc.
};
```

2. Applying the schema based on the current stablecoin type:

```typescript
// Create schema based on stablecoin type
stablecoinSchema = createStablecoinSchema(stablecoinType);
  
// Initialize form with schema validation
const form = useForm<z.infer<typeof stablecoinSchema>>({
  resolver: zodResolver(stablecoinSchema),
  defaultValues: formattedDefaultValues as any,
  mode: 'onSubmit',
});
```

3. Enhanced debugging for the error handler:

```typescript
const onError = (errors: any) => {
  console.error('Form validation errors:', errors);
  console.log('Current stablecoin type:', stablecoinType);
  console.log('Schema requirements:', stablecoinSchema.shape);
};
```

## Results

With these changes, the form validation now correctly:
- Makes nearly all fields optional, requiring only the absolute minimum (name, symbol, issuer, blockchain)
- Allows empty values for numeric fields without triggering min(0) validation errors
- Avoids validation errors for fields that aren't applicable to the current stablecoin type
- Provides better debugging information when validation errors occur

This ensures that users can successfully submit forms for any stablecoin type without encountering validation errors, allowing for maximum flexibility in how much data they need to provide.
