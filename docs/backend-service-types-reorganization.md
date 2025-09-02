# Backend Service Types Reorganization

## Overview

Service-specific types have been moved from individual service directories to the centralized types directory, maintaining better organization and reducing duplication.

## Changes Made

### Files Moved

**From:**
- `/backend/src/services/projects/types.ts` 
- `/backend/src/services/captable/types.ts`

**To:**
- `/backend/src/types/project-service.ts`
- `/backend/src/types/captable-service.ts`

### Files Updated

**Service Index Files:**
- `/backend/src/services/projects/index.ts` - Updated type imports
- `/backend/src/services/captable/index.ts` - Updated type imports

**Service Implementation Files:**
- `/backend/src/services/projects/ProjectService.ts` - Updated import path
- `/backend/src/services/projects/ProjectValidationService.ts` - Updated import path
- `/backend/src/services/projects/ProjectAnalyticsService.ts` - Updated import path
- `/backend/src/services/captable/CapTableService.ts` - Updated import path
- `/backend/src/services/captable/CapTableValidationService.ts` - Updated import path
- `/backend/src/services/captable/CapTableAnalyticsService.ts` - Updated import path

**Route Files:**
- `/backend/src/routes/projects.ts` - Updated import path

**Types Index:**
- `/backend/src/types/index.ts` - Updated to export from new locations

## Import Pattern Changes

### Before
```typescript
// Service files
import { ProjectCreateRequest } from './types.js'

// Route files  
import { ProjectCreateRequest } from '../services/projects/types.js'

// Types index
export * from '@/services/captable/types.js'
export * from '@/services/projects/types.js'
```

### After
```typescript
// Service files
import { ProjectCreateRequest } from '@/types/project-service.js'

// Route files
import { ProjectCreateRequest } from '../types/project-service.js'

// Types index
export * from './captable-service.js'
export * from './project-service.js'
```

## Benefits

1. **Centralized Types** - All types in one location (`/backend/src/types/`)
2. **Better Organization** - Service types clearly named and located
3. **Reduced Duplication** - No duplicate type definitions
4. **Consistent Imports** - All types imported from centralized location
5. **Easier Maintenance** - Single location for all type definitions
6. **Clean Service Directories** - Services focus on implementation, not type definitions

## Current Types Structure

```
backend/src/types/
├── index.ts                 # Central exports
├── api.ts                   # API response types  
├── auth.ts                  # Authentication types
├── projects.ts              # Project domain types
├── investors.ts             # Investor domain types
├── tokens.ts                # Token domain types
├── blockchain.ts            # Blockchain/wallet types
├── compliance.ts            # Compliance/document types
├── analytics.ts             # Analytics/reporting types
├── files.ts                 # File handling types
├── system.ts                # System events/notifications
├── utils.ts                 # TypeScript utility types
├── captable-service.ts      # Captable service types (moved)
└── project-service.ts       # Project service types (moved)
```

## Service Type Files Content

### Project Service Types (`project-service.ts`)
- `ProjectCreateRequest` - Project creation interface
- `ProjectUpdateRequest` - Project update interface
- `ProjectWithStats` - Enhanced project with statistics
- `ProjectQueryOptions` - Query filtering options
- `ProjectValidationResult` - Validation results
- `BulkProjectUpdateRequest` - Bulk operations
- `ProjectAnalytics` - Analytics data structures
- All project-specific enums and interfaces

### Captable Service Types (`captable-service.ts`)
- `CapTableCreateRequest` - Cap table creation interface
- `InvestorCreateRequest` - Investor creation interface
- `SubscriptionCreateRequest` - Subscription creation interface
- `TokenAllocationCreateRequest` - Token allocation interface
- `DistributionCreateRequest` - Distribution interface
- Bulk operation interfaces
- Analytics and statistics interfaces
- Query option interfaces

## Usage Guidelines

1. **New Service Types** - Add to appropriate service type file or create new one
2. **Cross-Service Types** - Use domain-specific files (`projects.ts`, `tokens.ts`, etc.)
3. **General Types** - Use `api.ts`, `utils.ts`, etc.
4. **Imports** - Always import from `@/types/` path

## Migration Complete

All imports have been updated, and the reorganization maintains full backward compatibility through the centralized exports in `/backend/src/types/index.ts`.

The build system will automatically update compiled files in the `dist/` directory on next compilation.
