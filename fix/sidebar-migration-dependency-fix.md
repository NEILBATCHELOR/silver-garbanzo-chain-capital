# Sidebar Configuration Migration - Database Dependency Fix

**Date:** August 28, 2025  
**Status:** ✅ **Migration Script V2 Ready**

## 🚨 **Issue Encountered**

The initial migration script to remove deprecated sidebar fields failed with:

```
ERROR: 2BP01: cannot drop column target_roles of table sidebar_configurations because other objects depend on it
DETAIL: view sidebar_configurations_with_names depends on column target_roles of table sidebar_configurations
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

## 🔍 **Root Cause Analysis**

1. **Database Dependency Found**: A view `sidebar_configurations_with_names` exists that depends on the deprecated columns
2. **View Purpose**: The view adds computed role names by joining with the `roles` table
3. **Migration Sequence**: Must handle view dependencies before dropping columns

## ✅ **Solution Implemented**

Created **V2 migration script** (`remove-deprecated-sidebar-fields-v2.sql`) that:

### **1. Handles View Dependencies**
- Drops `sidebar_configurations_with_names` view first
- Removes deprecated columns safely
- Recreates view with updated field references

### **2. Updated View Structure**
```sql
-- Old view referenced both old and new fields
SELECT target_roles, target_profile_types, target_role_ids, target_profile_type_enums

-- New view only uses new fields  
SELECT target_role_ids, target_profile_type_enums
```

### **3. Migration Steps**
1. **Verify Data Migration** - Ensure new fields are populated
2. **Drop Dependent View** - Remove `sidebar_configurations_with_names`
3. **Drop Constraints/Indexes** - Clean up old field references
4. **Drop Deprecated Columns** - Remove `target_roles` and `target_profile_types`
5. **Add New Constraints** - Create unique constraints with new field names
6. **Recreate View** - New view with `computed_role_names` from `target_role_ids`

## 📊 **View Enhancement**

The recreated view provides:
- **`computed_role_names`** - Array of role names from `target_role_ids`
- **`computed_profile_types`** - Direct access to `target_profile_type_enums`
- **Clean Interface** - No deprecated fields exposed

## 🚀 **Next Steps**

1. **Run V2 Migration Script**:
   ```bash
   # Execute the updated migration
   psql -f scripts/remove-deprecated-sidebar-fields-v2.sql
   ```

2. **Verify Results**:
   - Check table structure has only new fields
   - Verify view works correctly
   - Test that sidebar admin service functions properly

3. **Update TypeScript Types**:
   - Remove deprecated field references from types
   - Update any code that might reference the old view structure

## 🎯 **Expected Outcome**

After running V2 migration:
- ✅ Deprecated fields removed from `sidebar_configurations` table
- ✅ View recreated with clean interface using new fields
- ✅ All constraints and indexes updated
- ✅ No breaking changes to existing sidebar functionality

## 📝 **Lessons Learned**

- **Always Check Dependencies**: Query for dependent views before dropping columns
- **Handle Dependencies Manually**: Safer than using CASCADE which might drop unexpected objects
- **Document View Purposes**: Understanding what views do helps with migration planning
- **Test Migration Scripts**: Always test schema changes in non-production first

---

**Status:** Ready to execute V2 migration script for clean removal of deprecated sidebar fields.
