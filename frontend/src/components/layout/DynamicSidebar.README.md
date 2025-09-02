# Dynamic Sidebar Configuration

**Status:** ✅ Phase 1 Foundation Complete  
**Last Updated:** August 28, 2025

## Quick Start

Replace the static sidebar with dynamic sidebar in your layout:

```tsx
// Replace in MainLayout.tsx
import { DynamicSidebar } from '@/components/layout';

// Use instead of static Sidebar
<DynamicSidebar />
```

## Features

### ✅ **Role-Based Navigation**
- Navigation items filtered by user role priority
- Supports 10 role levels (Viewer → Super Admin)
- Automatic permission checking

### ✅ **Profile Type Filtering**  
- Different navigation for Investors vs Issuers vs Service Providers
- Profile-specific sections (e.g., Investor Portal)
- Contextual navigation based on user type

### ✅ **Permission Integration**
- Integrates with existing `authService.hasPermission()` 
- Maps 200+ permissions to navigation items
- Real-time permission validation

### ✅ **Smart Performance**
- 5-minute intelligent caching
- Optimized re-rendering
- Loading states and error handling

## Components

### Core Hook
```tsx
import { useSidebarConfig } from '@/hooks/sidebar';

const { sidebarConfig, isLoading, userContext } = useSidebarConfig({
  contextualFiltering: true,
  autoRefresh: false
});
```

### Item Access Check
```tsx
import { useSidebarItemAccess } from '@/hooks/sidebar';

const { isVisible, reason } = useSidebarItemAccess({ item });
```

### Service Layer
```tsx
import { sidebarConfigService } from '@/services/sidebar';

const config = sidebarConfigService.getFilteredSidebarConfig(userContext);
```

## Permission Mapping

Navigation sections are mapped to database permissions:

- **Onboarding**: `compliance_kyc_kyb.view`, `investor.create`
- **Issuance**: `token_design.view`, `token_allocations.view`  
- **Compliance**: `compliance_kyc_kyb.view`, `policy_rules.view`
- **Administration**: `system.audit`, `user.assign_role`

## Role Priority System

| Priority | Role Level | Access |
|----------|------------|---------|
| 50+ | Viewer | Dashboard, basic navigation |
| 60+ | Agent | Wallet operations, basic issuance |
| 70+ | Operations | Advanced features, compliance |
| 80+ | Compliance Officer | Full compliance access |
| 90+ | Owner/Investor | Full feature access |
| 100+ | Super Admin | System administration |

## Integration Testing

### Test Different User Roles
1. Create test users with different roles
2. Verify navigation appears/disappears correctly  
3. Check permission filtering works
4. Test project context handling

### Performance Testing
1. Monitor caching behavior
2. Check loading states
3. Verify error handling
4. Test with slow network

## File Structure

```
/types/sidebar/          # TypeScript interfaces
/services/sidebar/       # Core logic and filtering
/hooks/sidebar/          # React integration hooks
/hooks/auth/             # Enhanced user context
/components/layout/      # DynamicSidebar component
/docs/sidebar/           # Documentation
```

## Next Steps

1. **Integration** - Replace Sidebar with DynamicSidebar
2. **Testing** - Test with different user roles
3. **Refinement** - Adjust permission mappings as needed
4. **Enhancement** - Add admin configuration interface

## Support

See `/docs/sidebar/dynamic-sidebar-implementation-phase1.md` for detailed documentation.
