# Product Form TypeScript Error Fixes

## Overview

This document outlines the fixes for TypeScript errors in the various product form components. The errors fall into several categories:

1. **DatePicker Props Issues**: Components are incorrectly passing `setDate` directly to `DatePicker`
2. **Missing Properties**: Some properties being used aren't defined in the base interfaces
3. **Type Conversion Issues**: Inappropriate type conversions between numbers and strings
4. **Syntax Errors**: Mismatched brackets and other syntax issues

## Fix Approach

### 1. DatePicker Props Issues

All form components with errors like:
```
Type '{ date: Date; setDate: (...event: any[]) => void; }' is not assignable to type 'IntrinsicAttributes & DatePickerProps'
```

Need to be fixed by using the `DatePickerWithState` component instead of `DatePicker`:

```tsx
// BEFORE
<DatePicker
  date={field.value}
  setDate={field.onChange}
/>

// AFTER
<DatePickerWithState
  date={field.value}
  setDate={field.onChange}
/>
```

Also need to add the import:

```tsx
import DatePickerWithState from '@/components/ui/date-picker-with-state';
```

### 2. Missing Properties Issues

For interfaces that are missing properties like `diversificationMetrics` in `PrivateDebtProduct`, we need to:

1. Ensure we're importing enhanced interfaces where available:

```tsx
// BEFORE
import { PrivateDebtProduct } from '@/types/products';

// AFTER
import { PrivateDebtProduct } from '@/types/products';
import { EnhancedPrivateDebtProduct } from '@/types/products/enhancedProducts';
```

2. Update prop types to use the enhanced interfaces:

```tsx
// BEFORE
interface PrivateDebtProductFormProps {
  defaultValues?: Partial<PrivateDebtProduct>;
  // ...
}

// AFTER
interface PrivateDebtProductFormProps {
  defaultValues?: Partial<EnhancedPrivateDebtProduct>;
  // ...
}
```

### 3. Type Conversion Issues

Fix places where numbers are being directly assigned to string types:

```tsx
// BEFORE
<Input type="text" value={form.getValues().liquidationPenalty} />

// AFTER
<Input type="text" value={form.getValues().liquidationPenalty?.toString() || ''} />
```

### 4. Syntax Errors

Fix bracket matching and unexpected tokens in the StructuredProductForm.tsx file.

## Components to Fix

The following components need these fixes:

1. EnergyProductForm.tsx
2. EquityProductForm.tsx
3. FundProductForm.tsx
4. PrivateDebtProductForm.tsx
5. PrivateEquityProductForm.tsx
6. QuantitativeInvestmentStrategyProductForm.tsx
7. RealEstateProductForm.tsx
8. StablecoinProductForm.tsx
9. StructuredProductForm.tsx
