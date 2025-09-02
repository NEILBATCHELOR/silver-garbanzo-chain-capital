# Dynamic Sidebar Configuration Guide

**Date:** August 28, 2025  
**Status:** 🟢 Phase 2 Integration Complete  
**Next Phase:** Testing & Verification

## ✅ **Completed Integration Steps**

### **1. Fixed TypeScript Error**
- **File:** `frontend/src/hooks/auth/useUserContext.ts`
- **Issue:** Line 125 - Type 'unknown[]' not assignable to 'string[]'
- **Solution:** Added type-safe mapping for Supabase permission queries

### **2. Integrated Dynamic Sidebar**
- **File:** `frontend/src/components/layout/MainLayout.tsx`
- **Changes:** 
  - Replaced `import Sidebar` with `import DynamicSidebar`
  - Updated component usage from `<Sidebar />` to `<DynamicSidebar />`

## 🎯 **How Dynamic Sidebar Works**

The dynamic sidebar automatically filters navigation based on:

### **User Context Detection**
- **Roles:** Fetched from `user_roles` and `user_organization_roles` tables
- **Permissions:** Retrieved from `role_permissions` based on user's roles
- **Profile Type:** From `profiles.profile_type` field
- **Role Priority:** Calculated from highest priority role (higher = more access)

### **Permission-Based Filtering**
Navigation items are shown/hidden based on:

| **Filter Type** | **How It Works** |
|----------------|------------------|
| **Permissions** | "Any of" matching - user needs at least one required permission |
| **Role Priority** | User's highest priority must meet minimum requirement |
| **Profile Type** | Must match allowed profile types (investor, issuer, admin, etc.) |
| **Project Context** | Dynamic URL replacement for project-specific navigation |

### **Navigation Mappings**
Based on `services/sidebar/sidebarMappings.ts`:

| **Section** | **Required Permissions** | **Min Role Priority** |
|-------------|-------------------------|----------------------|
| **Dashboard** | None (always visible) | 50+ |
| **Onboarding** | `compliance_kyc_kyb.view`, `investor.create` | 60+ |
| **Overview** | `projects.view`, `project.view` | 60+ |
| **Issuance** | `token_design.view`, `token_lifecycle.view` | 70+ |
| **Compliance** | `compliance_kyc_kyb.view`, `investor.view` | 70+ |
| **Wallet Management** | `wallet.view`, `wallet.create` | 60+ |
| **Administration** | `system.audit`, `user.assign_role` | 90+ |

## 🧪 **Testing the Dynamic Sidebar**

### **Test Different User Roles:**

#### **1. Viewer (Priority 50+)**
- Should see: Dashboard, basic navigation
- Should NOT see: Administration, advanced features

#### **2. Agent (Priority 60+)**  
- Should see: Dashboard, Onboarding, Overview, Wallet Management
- Should NOT see: Administration, advanced Compliance

#### **3. Operations (Priority 70+)**
- Should see: All except Administration
- Full access to Issuance and Compliance

#### **4. Owner/Investor (Priority 90+)**
- Should see: Everything including Administration
- Full system access

### **Test Commands:**
```bash
# Start development server
cd frontend && npm run dev

# Check for TypeScript errors
npm run type-check

# Check for linting issues
npm run lint
```

### **Testing Scenarios:**
1. **Login with different user accounts** with varying roles
2. **Check navigation appears/disappears** based on permissions
3. **Verify project-specific URLs** work correctly
4. **Test loading states** during permission fetching
5. **Verify error handling** when permissions fail to load

## 🔧 **Customizing Navigation**

### **Adding New Navigation Items:**

1. **Update Permission Mappings** in `services/sidebar/sidebarMappings.ts`:
```typescript
{
  id: "new-feature",
  label: "New Feature",
  href: "/new-feature",
  icon: NewFeatureIcon,
  permissions: ["new_feature.view"],
  minRolePriority: 70
}
```

2. **Ensure Database Permissions Exist** in `role_permissions` table:
```sql
INSERT INTO role_permissions (role_id, permission_name) 
VALUES ('role-uuid', 'new_feature.view');
```

### **Modifying Access Rules:**

Edit `services/sidebar/sidebarConfigService.ts` to adjust filtering logic:

```typescript
// Example: Add organization-specific filtering
if (item.organizationId && userContext.organizationId !== item.organizationId) {
  return { isVisible: false, reason: 'Wrong organization' };
}
```

## 🛠 **Configuration Files**

### **Key Files Modified:**
- ✅ `hooks/auth/useUserContext.ts` - Fixed TypeScript error
- ✅ `components/layout/MainLayout.tsx` - Integrated DynamicSidebar
- ✅ `components/layout/DynamicSidebar.tsx` - Ready and functional
- ✅ `hooks/sidebar/useSidebarConfig.ts` - Configuration hook
- ✅ `services/sidebar/*` - All service files ready

### **Configuration Flow:**
```
User Login → useUserContext() → Fetch Roles & Permissions → 
useSidebarConfig() → sidebarConfigService.getFilteredSidebarConfig() → 
DynamicSidebar renders filtered navigation
```

## 🚨 **Troubleshooting**

### **Navigation Not Showing:**
1. Check user has required permissions in database
2. Verify role priority meets minimum requirements
3. Check browser console for permission fetch errors
4. Ensure user profile type matches navigation requirements

### **TypeScript Errors:**
1. Run `npm run type-check` to identify issues
2. Check import paths use relative imports without `.js` extensions
3. Verify all types are properly exported from `types/sidebar/`

### **Performance Issues:**
1. Check caching is working (5-minute TTL)
2. Monitor re-render frequency in React DevTools
3. Verify `useMemo` optimizations are effective

## ✅ **Verification Checklist**

- ✅ TypeScript compilation passes without errors
- ✅ Dynamic sidebar integrated in MainLayout
- ✅ User context hook fetching roles and permissions
- ✅ Permission-based filtering working
- ✅ Loading states and error handling implemented
- ⏳ **TESTING:** Different user roles and permissions
- ⏳ **TESTING:** Project-specific navigation
- ⏳ **TESTING:** Performance and caching behavior

## 🎉 **Ready for Testing!**

The dynamic sidebar is now fully integrated and ready for comprehensive testing. Try logging in with different user accounts that have various roles and permissions to see the navigation adapt dynamically.

**Next Steps:**
1. Test with multiple user accounts
2. Verify all permission mappings work correctly
3. Check performance under different load scenarios
4. Gather user feedback on navigation experience
