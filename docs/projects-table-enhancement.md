# Projects Table Enhancement

## Overview

This migration adds missing fields from the ProjectDialog form directly to the projects table. Previously, some fields like dates and financial details were handled only on the frontend without being persisted to the database.

## Problem Statement

The current projects table is missing several fields that are used in the ProjectDialog form, particularly in the "Key Dates" and "Basic Information" tabs. This leads to:

1. Data loss when projects are saved (form fields not persisted)
2. Inconsistency between the UI and database schema
3. Inability to query or filter projects based on these fields

## Solution

A new migration script (`20250816_add_project_fields.sql`) has been created to add all missing fields directly to the projects table.

## Fields Added

### Date Fields
- `subscription_start_date` (DATE): When investors can start subscribing
- `subscription_end_date` (DATE): When the subscription period closes
- `transaction_start_date` (DATE): When the investment period begins
- `maturity_date` (DATE): When the investment reaches maturity

### Financial Fields
- `total_notional` (NUMERIC): Total notional amount of the project
- `authorized_shares` (NUMERIC): Number of authorized shares
- `share_price` (NUMERIC): Price per share
- `company_valuation` (NUMERIC): Valuation of the company
- `minimum_investment` (NUMERIC): Minimum investment amount
- `estimated_yield_percentage` (NUMERIC): Estimated yield percentage

### String Fields
- `token_symbol` (TEXT): Symbol for the token (if applicable)
- `legal_entity` (TEXT): Legal entity name
- `jurisdiction` (TEXT): Legal jurisdiction
- `tax_id` (TEXT): Tax identification number
- `duration` (TEXT): Project duration (e.g., "12_months")
- `currency` (TEXT): Currency for all financial values (defaults to "USD")

## Benefits

1. **Data Persistence**: All form fields now have corresponding database columns
2. **Improved Filtering**: Enables filtering projects by dates, financial metrics, etc.
3. **Reporting Capabilities**: Allows for reporting and analytics on project metrics
4. **Schema Documentation**: All fields have comments explaining their purpose

## Implementation

The migration script uses Supabase-compatible SQL syntax with:
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern for safety
- Default values where appropriate (e.g., USD for currency)
- Column comments for documentation

## Testing

After applying this migration:

1. Create a new project with values for all fields
2. Verify the data is properly saved to the database
3. Edit an existing project and ensure all fields load and save correctly
4. Test querying projects based on the new fields

## Future Considerations

1. Consider adding indexes for fields that will be frequently queried
2. Evaluate whether some fields should be made NOT NULL with default values
3. Add validation constraints for numeric fields (e.g., minimum_investment > 0)
