# Organization Selector Implementation Guide

## Overview

This implementation provides a comprehensive organization selector system that:

1. **Only shows for users with multiple organizations** - Users with ≤1 organization see no selector
2. **Filters projects automatically** - Project selectors respect the selected organization context
3. **Minimal new components** - Integrates seamlessly with existing project selectors
4. **Consistent across the app** - Organization context is available everywhere via React Context

## Architecture

### Database Relationships
```
users → user_organization_roles → organizations → project_organization_assignments → projects
```

### Components Created

1. **OrganizationContext.tsx** - React Context provider for organization state management
2. **OrganizationSelector.tsx** - Dropdown selector (only shows if user has >1 org)
3. **EnhancedProjectSelector.tsx** - Project selector with organization filtering
4. **CombinedOrgProjectSelector.tsx** - Combined component showing both selectors
5. **organizationProjectFilterService.ts** - Service for organization-based project filtering

### Key Features

- **Automatic visibility**: Organization selector only appears for users with multiple organizations
- **Context-driven filtering**: Projects are filtered based on selected organization
- **Backward compatibility**: Maintains existing project selector behavior for single-org users
- **Performance optimized**: Caches organization data and minimizes database queries

## Usage Examples

### Basic Usage - Individual Components

```tsx
import { 
  OrganizationSelector, 
  EnhancedProjectSelector, 
  useOrganizationContext 
} from '@/components/organizations';

// Organization selector only (shows if user has >1 org)
<OrganizationSelector compact={true} />

// Enhanced project selector (respects organization context)
<EnhancedProjectSelector 
  currentProjectId={projectId}
  onProjectChange={handleProjectChange}
/>
```

### Combined Usage - Both Selectors

```tsx
import { CombinedOrgProjectSelector } from '@/components/organizations';

// Shows organization selector only if needed, always shows project selector
<CombinedOrgProjectSelector 
  currentProjectId={currentProjectId}
  onProjectChange={handleProjectChange}
  layout="horizontal"
  compact={false}
/>
```

### Accessing Organization Context

```tsx
import { useOrganizationContext } from '@/components/organizations';

function MyComponent() {
  const {
    selectedOrganization,      // Currently selected org (null if none)
    userOrganizations,         // All orgs user has access to
    shouldShowSelector,        // true if user has >1 organization
    setSelectedOrganization,   // Function to change selection
    isLoading,                 // Loading state
  } = useOrganizationContext();
  
  if (shouldShowSelector) {
    return <div>User has multiple organizations</div>;
  }
  
  return <div>User has single organization: {selectedOrganization?.name}</div>;
}
```

## Integration Examples

### Example 1: Header Navigation
```tsx
// In your header component
import { CombinedOrgProjectSelector } from '@/components/organizations';

function PageHeader() {
  return (
    <div className="flex items-center justify-between p-4">
      <h1>Cap Table Management</h1>
      <CombinedOrgProjectSelector 
        currentProjectId={projectId}
        onProjectChange={navigateToProject}
        layout="horizontal"
        compact={true}
      />
    </div>
  );
}
```

### Example 2: Replacing Existing ProjectSelector
```tsx
// Before
import ProjectSelector from '@/components/captable/ProjectSelector';
<ProjectSelector currentProjectId={projectId} onProjectChange={onChange} />

// After  
import { EnhancedProjectSelector } from '@/components/organizations';
<EnhancedProjectSelector currentProjectId={projectId} onProjectChange={onChange} />
```

### Example 3: Custom Layout
```tsx
import { OrganizationSelector, EnhancedProjectSelector, useOrganizationContext } from '@/components/organizations';

function CustomSelector() {
  const { shouldShowSelector } = useOrganizationContext();
  
  return (
    <div className="space-y-2">
      {shouldShowSelector && (
        <div>
          <label className="text-sm font-medium">Organization</label>
          <OrganizationSelector compact={false} />
        </div>
      )}
      <div>
        <label className="text-sm font-medium">Project</label>
        <EnhancedProjectSelector onProjectChange={handleChange} />
      </div>
    </div>
  );
}
```

## How Projects Are Filtered

### For Users with Single Organization
- No organization selector is shown
- Projects are filtered to only show those assigned to the user's organization
- Behavior is transparent to the user

### For Users with Multiple Organizations  
- Organization selector appears in the header
- Projects are filtered based on the selected organization
- User can switch between organizations to see different project sets
- Selected organization persists during the session

### Database Queries
```sql
-- Get user's organizations
SELECT DISTINCT o.* FROM organizations o
JOIN user_organization_roles uor ON o.id = uor.organization_id  
WHERE uor.user_id = ?

-- Get projects for selected organization
SELECT DISTINCT p.* FROM projects p
JOIN project_organization_assignments poa ON p.id = poa.project_id
WHERE poa.organization_id = ? AND poa.is_active = true
```

## Migration Path

### Phase 1: Add Context (✅ Complete)
- App.tsx wrapped with OrganizationProvider
- Organization context available throughout app

### Phase 2: Update Key Pages
```tsx
// Update pages that use ProjectSelector:
// 1. /projects/:projectId/captable (CapTableManagerNew.tsx)
// 2. /projects (Projects list page)  
// 3. Token pages (TokenPageLayout.tsx)
// 4. Factoring pages (FactoringManager.tsx)

// Replace ProjectSelector with EnhancedProjectSelector:
import { EnhancedProjectSelector } from '@/components/organizations';
// Or use combined selector:
import { CombinedOrgProjectSelector } from '@/components/organizations';
```

### Phase 3: Add Organization Selector to Headers
```tsx
// Add to page headers where project selection occurs
<CombinedOrgProjectSelector 
  currentProjectId={currentProjectId}
  onProjectChange={handleProjectChange}
  layout="horizontal" 
  compact={true}
/>
```

## TypeScript Types

```typescript
interface OrganizationContextData {
  id: string;
  name: string;
  legalName: string | null;
  status: string | null;
}

interface OrganizationContextValue {
  selectedOrganization: OrganizationContextData | null;
  setSelectedOrganization: (org: OrganizationContextData | null) => void;
  userOrganizations: OrganizationContextData[];
  isLoading: boolean;
  shouldShowSelector: boolean;
  refreshUserOrganizations: () => Promise<void>;
  getFilteredProjects: (allProjects: any[]) => any[];
}
```

## Testing

### Test Scenarios
1. **Single Organization User**: No selector appears, projects filtered correctly
2. **Multiple Organization User**: Selector appears, projects switch when organization changes  
3. **No Organizations**: Graceful fallback to all projects (legacy behavior)
4. **Organization Switching**: Projects update when switching organizations
5. **Project Selection**: Selected project respects organization context

### Test Data Setup
```sql
-- User with multiple organizations
INSERT INTO user_organization_roles (user_id, organization_id, role_id) VALUES
('user1', 'org1', 'role1'),
('user1', 'org2', 'role1');

-- Projects assigned to different organizations  
INSERT INTO project_organization_assignments (project_id, organization_id, relationship_type) VALUES
('project1', 'org1', 'issuer'),
('project2', 'org2', 'issuer');
```

## Performance Considerations

- **Caching**: Organization data is cached in React state and sessionStorage
- **Lazy Loading**: Projects are only fetched when organization is selected
- **Minimal Queries**: Uses joins to reduce database round trips
- **Context Optimization**: Organization context only updates when necessary

## Security

- **RLS Policies**: All queries respect Row Level Security policies
- **User Verification**: Organization access is verified via user_organization_roles table
- **Project Access**: Projects are filtered based on organization assignments
- **Fallback Behavior**: Graceful degradation if organization data is unavailable

## Next Steps

1. **Update Key Pages**: Replace ProjectSelector with EnhancedProjectSelector in:
   - CapTableManagerNew.tsx  
   - Home.tsx (projects list)
   - TokenPageLayout.tsx
   - FactoringManager.tsx

2. **Add to Headers**: Integrate CombinedOrgProjectSelector in page headers

3. **Test Integration**: Verify organization filtering works correctly

4. **Performance Monitoring**: Monitor query performance with organization filtering

5. **User Training**: Update documentation for users with multiple organizations
