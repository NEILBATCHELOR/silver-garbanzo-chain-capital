# Backend Types Organization

## Overview

The backend types are now organized following a domain-specific architecture that separates concerns and eliminates duplication. Each domain has its own types file, and services import only what they need.

## Current Structure

```
backend/src/types/
├── index.ts           # Central exports (25 lines)
├── api.ts            # API response types (105 lines)
├── auth.ts           # Authentication types (45 lines)
├── projects.ts       # Project domain types (35 lines)
├── investors.ts      # Investor domain types (40 lines)
├── tokens.ts         # Token domain types (41 lines)
├── blockchain.ts     # Blockchain/wallet types (64 lines)
├── compliance.ts     # Compliance/document types (52 lines)
├── analytics.ts      # Analytics/reporting types (33 lines)
├── files.ts          # File handling types (27 lines)
├── system.ts         # System events/notifications (28 lines)
└── utils.ts          # TypeScript utility types (37 lines)
```

## Domain-Specific Organization

### API Types (`api.ts`)
- `ApiResponse<T>` - Standard API response wrapper
- `ApiErrorResponse` - Error response structure
- `PaginatedResponse<T>` - Paginated response structure
- `ServiceResult<T>` - Service operation result
- `BatchResult<T>` - Bulk operation result
- Query and filtering interfaces

### Authentication Types (`auth.ts`)
- `AuthUser` - Authenticated user interface
- `LoginCredentials` - Login request structure
- `LoginResponse` - Login response with tokens
- `DatabaseTransaction` - Transaction wrapper

### Project Types (`projects.ts`)
- `ProjectCreationData` - Project creation interface
- `ProjectDuration` - Duration enumeration
- `ProjectStatus` - Status enumeration
- `InvestmentStatus` - Investment status enumeration

### Investor Types (`investors.ts`)
- `InvestorOnboardingData` - Onboarding structure
- `KycSubmissionData` - KYC submission structure

### Token Types (`tokens.ts`)
- `TokenCreationData` - Token creation structure
- `TokenDeploymentData` - Token deployment structure
- `TokenOperationData` - Token operation structure

### Blockchain Types (`blockchain.ts`)
- `WalletCreationData` - Wallet creation structure
- `TransactionData` - Transaction structure
- `TransactionStatus` - Transaction status tracking
- Integration types (MoonPay, Ripple)

### Compliance Types (`compliance.ts`)
- `ComplianceCheckResult` - Compliance check results
- `DocumentVerificationResult` - Document verification
- `DocumentUploadData` - Document upload structure
- `DocumentMetadata` - Document metadata

### Analytics Types (`analytics.ts`)
- `AnalyticsQuery` - Analytics query structure
- `AnalyticsResult` - Analytics result structure

### File Types (`files.ts`)
- `FileUpload` - File upload interface
- `ProcessedFile` - Processed file result

### System Types (`system.ts`)
- `SystemEvent` - System event structure
- `NotificationData` - Notification structure

### Utility Types (`utils.ts`)
- `Json` - JSON type alias (matches Prisma)
- `DeepPartial<T>` - Deep partial utility
- `RequiredFields<T, K>` - Make fields required
- `OptionalFields<T, K>` - Make fields optional
- `CreateInput<T>` - Create input type
- `UpdateInput<T>` - Update input type

## Service Types Integration

### Service-Specific Types
Services maintain their own `types.ts` files for service-specific interfaces that extend the domain types:

```
backend/src/services/
├── captable/types.ts    # Captable-specific extensions
└── projects/types.ts    # Project-specific extensions
```

### Import Pattern
Services import domain types and extend them as needed:

```typescript
// projects/types.ts
import { ProjectDuration, ProjectStatus } from '@/types/projects.js'
import { ServiceResult, BatchResult } from '@/types/api.js'
import { Json } from '@/types/utils.js'

export interface ProjectCreateRequest {
  // Service-specific project creation interface
  // that uses the domain types
}
```

## Benefits

1. **Domain Separation** - Each domain has its own types file
2. **No Duplication** - Common types are defined once in domain files
3. **Clear Dependencies** - Services import only what they need
4. **Maintainable** - Each file is focused and reasonably sized
5. **Extensible** - Easy to add new domains or extend existing ones
6. **Type Safety** - Strong typing throughout the application

## Migration Summary

### Before
- Single `types/index.ts` with 380+ lines mixing general and domain types
- Service types duplicating common concepts
- Circular dependency risks
- Unclear type ownership

### After
- 12 focused domain-specific type files
- Clean separation of concerns
- Services import from specific domains
- No circular dependencies
- Clear type ownership and organization

## Usage Guidelines

1. **New Types** - Add to appropriate domain file, or create new domain if needed
2. **Service Extensions** - Use service types files to extend domain types
3. **Imports** - Import from specific domain files, not the main index
4. **Common Types** - Add truly common types to `api.ts` or `utils.ts`

This organization follows the project's domain-specific philosophy and eliminates the issues with central type files.
