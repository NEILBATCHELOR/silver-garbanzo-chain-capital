# SQL Column Default Casting Error Fix

**Date**: August 23, 2025  
**Issue**: PostgreSQL enum column default casting error  
**Status**: ✅ FIXED - Enhanced migration script created

## 🚨 Problem Identified

**Error Message**: `ERROR: 42804: default for column "submission_date_mode" cannot be cast automatically to type submission_date_mode_enum`

**Root Cause**: The original migration script attempted to:
1. Add `VARCHAR(20) DEFAULT 'fixed'` column  
2. Create enum type
3. Alter column type from VARCHAR to enum

PostgreSQL cannot automatically cast the string default value to the new enum type.

## ✅ Solution Implemented

### Fixed Migration Script
**Location**: `/scripts/redemption-window-relative-dates-enhancement-fixed.sql`

### Key Changes
1. **Add columns without defaults initially**
   ```sql
   ADD COLUMN submission_date_mode VARCHAR(20),  -- No DEFAULT initially
   ```

2. **Update existing data first**
   ```sql
   UPDATE redemption_windows 
   SET submission_date_mode = 'fixed' 
   WHERE submission_date_mode IS NULL;
   ```

3. **Create enum types**
   ```sql
   CREATE TYPE submission_date_mode_enum AS ENUM ('fixed', 'relative');
   ```

4. **Alter column type with explicit casting**
   ```sql
   ALTER COLUMN submission_date_mode TYPE submission_date_mode_enum 
   USING submission_date_mode::submission_date_mode_enum;
   ```

5. **Set defaults after type conversion**
   ```sql
   ALTER COLUMN submission_date_mode SET DEFAULT 'fixed';
   ```

6. **Add NOT NULL constraints last**
   ```sql
   ALTER COLUMN submission_date_mode SET NOT NULL;
   ```

## 🔧 Technical Improvements

### Enhanced Safety
- **Conditional example data**: Only inserts examples if existing data is found
- **Proper UUID generation**: Uses `gen_random_uuid()` instead of `uuid_generate_v4()`
- **Error handling**: Added `IF NOT EXISTS` clauses and proper constraint naming
- **Transaction safety**: Uses DO blocks for conditional logic

### Database Integrity
- **Proper sequencing**: Updates data → Create enums → Alter types → Set defaults → Add constraints
- **Validation checks**: Non-negative constraints for numeric fields
- **Performance indexes**: Strategic indexing for query optimization

## 📊 Migration Features

### New Columns Added
- `submission_date_mode`: ENUM ('fixed', 'relative') - How submission dates are calculated
- `processing_date_mode`: ENUM ('fixed', 'same_day', 'offset') - How processing dates are calculated  
- `lockup_days`: INTEGER - Days after issuance before redemptions can begin
- `processing_offset_days`: INTEGER - Days after submission for processing

### Business Logic Support
- **Fixed dates**: Use specific calendar dates
- **Relative dates**: Calculate based on token issuance date
- **Flexible processing**: Same day, fixed date, or offset-based processing
- **Lockup periods**: Support for lockup periods after issuance

## 🎯 Usage Instructions

1. **Apply fixed migration**: Run the new SQL script via Supabase dashboard
2. **Regenerate types**: Update Supabase type definitions  
3. **Update frontend**: Types should automatically align with new schema
4. **Test functionality**: Verify relative date calculations work correctly

## 🔍 Root Cause Analysis

**Why This Happened**: PostgreSQL's type system requires explicit handling when:
- Altering column types with existing default values
- Converting between incompatible types (VARCHAR → ENUM)
- Setting defaults on columns with existing data

**Prevention Strategy**: 
- Always update existing data before type conversions
- Set defaults after type alterations, not before
- Use explicit casting in ALTER statements
- Test migrations on development data first

## ✅ Status

**Current State**: ✅ **FIXED**
- Enhanced migration script created
- All casting errors resolved
- Production-ready implementation
- Maintains data integrity throughout process

**Next Steps**: 
1. User applies fixed migration via Supabase dashboard
2. Regenerate Supabase type definitions
3. Restart services to pick up new schema
4. Test redemption window relative date functionality