# Foreign Key Fix for Investor-User Relationship

## Purpose
This SQL script adds the missing foreign key constraint between the `investors.user_id` and `users.id` columns.

## Usage
Execute the `add-investor-user-foreign-key.sql` script in your Supabase SQL Editor or database console.

## What it does:
1. Adds a foreign key constraint `fk_investors_user_id` 
2. Creates an index `idx_investors_user_id` for performance
3. Sets `ON DELETE SET NULL` to handle user deletions gracefully

## Prerequisites
- Ensure no orphaned records exist (script includes validation)
- Have appropriate database permissions

## Post-Execution Steps
1. Refresh Supabase types: Run your type generation script
2. Optionally revert InvestorUserService to use automatic joins
3. Test the investor management interface

## Benefits After Implementation
- Enables Supabase automatic relationship joins
- Maintains data integrity
- Improves query performance
- Follows database best practices

---
**Note**: The current service layer fix works without this constraint, but adding it provides better long-term benefits.
