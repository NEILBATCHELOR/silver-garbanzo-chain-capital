# Product Form Enhancement Plan

## Overview

This document outlines the plan for enhancing all product form components to ensure they support complete CRUD operations for all fields in the database. Currently, many forms only include a small subset of available fields, limiting the ability to edit all aspects of a product.

## Forms Completed

1. ✅ **EquityProductForm** - Enhanced with all fields from the database schema
2. ✅ **CommoditiesProductForm** - Already quite comprehensive
3. ✅ **FundProductForm** - Enhanced with all fields from the database schema
4. ✅ **StructuredProductForm** - Already quite comprehensive

## Forms To Update

Each form needs to be updated following this consistent pattern:

1. Create a comprehensive form schema with all database fields
2. Handle complex fields (arrays, dates, JSON) properly in both directions
3. Organize fields into logical groups with appropriate UI components
4. Ensure consistent error handling and debugging tools
5. Maintain the same form submission pattern across all forms

### 5. BondProductForm

- Add all financial fields (faceValue, yieldToMaturity, etc.)
- Add proper date handling for issueDate, maturityDate, callDate
- Implement proper handling for callPutDates array
- Add coupon payment history as a JSON field

### 6. QuantitativeInvestmentStrategyProductForm

- Add comprehensive schema with all fields from QuantitativeInvestmentStrategyProduct interface
- Implement proper handling for dataSources array and complex JSON fields
- Add proper handling for backtestHistory and adjustmentHistory

### 7. PrivateEquityProductForm

- Add comprehensive form with all fields from the database
- Add sections for financial metrics, dates, and investment details
- Implement proper handling for arrays and complex fields

### 8. PrivateDebtProductForm

- Add comprehensive form with all fields from the database
- Add financial metrics, deal structure, and monitoring sections
- Implement proper handling for JSON fields like financialMetrics

### 9. RealEstateProductForm

- Add all property details, lease information, and financial fields
- Add handling for lease dates and billing information
- Implement proper validation for financial fields

### 10. EnergyProductForm

- Add comprehensive form with all energy project fields
- Implement proper handling for performance metrics JSON field
- Add proper date handling for all relevant dates

### 11. InfrastructureProductForm

- Add comprehensive form with all infrastructure asset fields
- Implement proper handling for performanceMetrics JSON field
- Add proper validation for condition scores and metrics

### 12. CollectiblesProductForm

- Add comprehensive form with all collectible asset fields
- Add proper date handling for acquisition and appraisal dates
- Implement validation for financial values

### 13. AssetBackedProductForm

- Add comprehensive form with all asset-backed product fields
- Add proper date handling for all relevant dates
- Implement validation for financial fields and payment information

### 14. DigitalTokenizedFundProductForm

- Add comprehensive form with all tokenized fund fields
- Implement proper handling for blockchain-specific fields
- Add validation for token-related information

### 15. StablecoinProductForm

- Add comprehensive form with all stablecoin fields
- Add handling for collateral-specific fields based on stablecoin type
- Implement proper validation for blockchain and token-related fields

## Implementation Guidelines

For each form, follow these guidelines:

1. **Form Schema**:
   - Create comprehensive Zod schema with all fields from the database
   - Add proper validation with helpful error messages
   - Group related fields for better organization

2. **Default Values Handling**:
   - Format dates from string to Date objects
   - Convert arrays to comma-separated strings for form display
   - Format JSON objects to strings with proper indentation

3. **Form Submission**:
   - Convert form values back to the appropriate types for database storage
   - Parse JSON strings to objects
   - Convert comma-separated strings back to arrays

4. **UI Organization**:
   - Group related fields into Cards with descriptive headings
   - Use grid layouts for responsive design
   - Implement appropriate field types (Select, DatePicker, etc.)

5. **Error Handling**:
   - Add debug tools to help troubleshoot issues
   - Add proper error messages for validation
   - Include try/catch blocks for error handling

## Testing Plan

After updating each form:

1. Test creating a new product with all fields
2. Test editing an existing product with changes to all fields
3. Verify proper saving and display of all fields
4. Test validation by submitting invalid data
5. Test cancellation of edits

## Completion Criteria

A form is considered complete when:

1. All fields from the database schema are represented in the form
2. All fields can be properly edited and saved
3. All validation works correctly
4. The form follows the consistent pattern and styling
5. The form handles errors gracefully

## Timeline

Update all remaining forms (9 forms) with an estimated completion time of 2-3 hours total.
