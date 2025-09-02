# Project Dialog Enhancement

## Overview

This enhancement adds comprehensive support for all fields in the `projects` database table through an organized tabbed interface in the project creation and editing dialog.

## Implementation Details

The ProjectDialog component has been enhanced to support all fields from the `projects` table, organized into four logical tabs:

### 1. Basic Info Tab
- **name**: Project name input
- **description**: Detailed project description textarea
- **project_type**: Selection from categorized asset classes
- **organization_id**: Organization selection dropdown
- **is_primary**: Toggle to set as primary project
- **status**: Project status selection (draft, active, completed, cancelled)
- **investment_status**: Investment status selection (Open, Closed)

### 2. Financial Tab
- **currency**: Currency selection with search functionality
- **target_raise**: Target amount to raise (numeric input)
- **total_notional**: Total notional value (numeric input)
- **authorized_shares**: Number of authorized shares for equity projects (numeric input)
- **share_price**: Price per share (numeric input)
- **company_valuation**: Estimated company valuation (numeric input)
- **minimum_investment**: Minimum investment amount (numeric input)
- **estimated_yield_percentage**: Expected yield percentage (numeric input)
- **token_symbol**: Symbol for tokenized projects (text input)

### 3. Dates Tab
- **subscription_start_date**: When investors can start subscribing (date picker)
- **subscription_end_date**: When subscription period closes (date picker)
- **transaction_start_date**: When investment period begins (date picker)
- **maturity_date**: When investment reaches maturity (date picker)
- **duration**: Expected project duration (selection)

### 4. Legal Tab
- **legal_entity**: Legal entity name (text input)
- **jurisdiction**: Legal jurisdiction selection
- **tax_id**: Tax identification number (text input)

### 5. Documents Tab (for existing projects only)
- Organized document upload interface (remains unchanged)
- Categorized by document types

## Technical Improvements

1. **Enhanced Form Validation**:
   - Organized Zod validation schema by logical field groupings
   - Added field descriptions for better user guidance

2. **Improved Data Type Handling**:
   - Added proper numeric input fields with appropriate step values
   - Added date handling for all date fields
   - Added support for estimated_yield_percentage to be stored as a number

3. **Logical Field Organization**:
   - Fields grouped by purpose and relationship
   - Tabs named for easy navigation and conceptual organization

4. **UI Enhancements**:
   - Added descriptive form labels and descriptions
   - Used appropriate input types for different data types
   - Added searchable dropdown for currencies
   - Added jurisdiction selection with common options

## Usage

The enhanced dialog supports both creating new projects and editing existing ones. When editing an existing project, all fields are populated with current values. The Documents tab is only shown for existing projects (those with an ID).

## Notes for Future Enhancement

Potential future improvements could include:

1. Dynamic loading of organizations from the database
2. Field conditionally showing/hiding based on project type
3. More advanced validation rules based on business logic
4. Multi-step form wizard for complex projects
5. Field-level permissions based on user role
