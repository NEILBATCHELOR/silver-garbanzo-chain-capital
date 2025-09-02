# Climate Receivables TypeScript Fixes

This document details the TypeScript errors fixed in the Climate Receivables module.

## 1. Fixed Property Naming Inconsistencies

The main issue was a mismatch between the database schema's naming conventions (snake_case) and the code's incorrect use of camelCase for database properties.

### Changes made in `carbon-offsets-list.tsx`:

- Changed properties from camelCase to snake_case to match the database schema:
  - `offsetId` → `offset_id`
  - `projectId` → `project_id`
  - `pricePerTon` → `price_per_ton`
  - `totalValue` → `total_value`
  - `verificationStandard` → `verification_standard`
  - `verificationDate` → `verification_date`

- Fixed incorrect enum reference:
  - `CarbonOffsetType.CARBON_CAPTURE` → `CarbonOffsetType.REFORESTATION`
  - This was necessary because `CARBON_CAPTURE` doesn't exist in the `CarbonOffsetType` enum.

## 2. Fixed Chart Component Interface Mismatches

The data format passed to chart components didn't match their expected prop types.

### Changes made in `climate-receivables-dashboard.tsx`:

- Fixed `BarChart` component:
  - Changed data format from a complex object with labels and datasets to the expected array of objects with label, value, and color properties:
  ```tsx
  <BarChart data={[
    { label: "Jan", value: 230000, color: "rgba(75, 192, 192, 0.8)" },
    { label: "Feb", value: 250000, color: "rgba(75, 192, 192, 0.8)" },
    // More data points...
  ]} />
  ```

- Fixed `LineChart` component:
  - Updated the props to match the expected `series` property instead of `data`:
  ```tsx
  <LineChart series={[
    {
      name: "Solar Output",
      color: "rgb(255, 159, 64)",
      data: [
        { x: "Jan", y: 420 },
        { x: "Feb", y: 380 },
        // More data points...
      ]
    },
    // More series...
  ]} />
  ```

## Lessons Learned

1. **Match Database Naming Conventions**: Always use snake_case for database properties in TypeScript code when the database schema uses snake_case.

2. **Check Component Interfaces**: Before passing data to UI components, verify the expected prop structure by checking the component's interface definition.

3. **Enum Validation**: When using enums, make sure to reference only existing enum values to avoid runtime errors.

4. **Interface Consistency**: Maintain consistent property naming between TypeScript interfaces and their database counterparts to avoid type mismatches.

## Testing

After applying these fixes, all TypeScript errors were resolved, and the module compiles successfully.