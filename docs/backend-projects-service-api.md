# Backend Projects Service API Documentation

## Overview
The Backend Projects Service provides comprehensive project management functionality for the Chain Capital platform. Built with Fastify + Prisma + TypeScript.

## ✅ Fixed Issues
- **Table Name References**: Fixed `projects` → `project`, `cap_tables` → `capTable`, `audit_logs` → `auditLog` 
- **Field Name References**: Fixed `project_type` → `projectType`, `is_primary` → `isPrimary`
- **Type Annotations**: Added proper TypeScript type annotations for all parameters
- **Json Type**: Added Json type definition to resolve import errors
- **Missing Tables**: Commented out references to non-existent `project_credentials` table
- **Validation Methods**: Added `getProjectTypesByCategory` method to ProjectValidationService

## API Endpoints

### Core Endpoints

#### GET /api/v1/projects
Get all projects with filtering and pagination

**Query Parameters:**
```typescript
{
  page?: number                    // Page number (default: 1)
  limit?: number                   // Items per page (default: 20, max: 100)  
  search?: string                  // Search in name, description, legal_entity
  status?: ProjectStatus[]         // Filter by status
  projectType?: string[]           // Filter by project type
  isPrimary?: boolean              // Filter primary projects
  sortBy?: string                  // Sort field (default: createdAt)
  sortOrder?: 'asc' | 'desc'      // Sort direction (default: desc)
  include_statistics?: boolean     // Include computed stats (default: true)
  include_tokens?: boolean         // Include related tokens
  include_cap_table?: boolean      // Include cap table data
}
```

**Response:**
```typescript
{
  data: ProjectWithStats[]
  pagination: {
    total: number
    page: number  
    limit: number
    hasMore: boolean
    totalPages: number
  }
}
```

#### GET /api/v1/projects/:id
Get specific project by ID

**Query Parameters:**
```typescript
{
  includeStats?: boolean          // Include statistics (default: true)
  includeRelated?: boolean        // Include related data (default: false)
}
```

#### POST /api/v1/projects
Create new project

**Request Body:**
```typescript
{
  name: string                    // Required
  projectType: string            // Required  
  description?: string
  status?: ProjectStatus
  targetRaise?: number
  minimumInvestment?: number
  legalEntity?: string
  jurisdiction?: string
  // ... 50+ additional fields for comprehensive project data
}
```

**Query Parameters:**
```typescript
{
  createCapTable?: boolean        // Auto-create cap table (default: true)
}
```

**Response:**
```typescript
{
  success: boolean
  data: {
    project: ProjectWithStats
    capTable?: { id: string, name: string }
    validation: ProjectValidationResult
  }
}
```

#### PUT /api/v1/projects/:id
Update existing project

#### DELETE /api/v1/projects/:id  
Delete project (cascades to related data)

### Specialized Endpoints

#### GET /api/v1/projects/primary
Get the primary project

#### PUT /api/v1/projects/:id/primary
Set project as primary

#### GET /api/v1/projects/statistics/:id
Get detailed project statistics

#### PUT /api/v1/projects/bulk-update
Bulk update multiple projects

### Analytics Endpoints

#### GET /api/v1/projects/:id/analytics
Get comprehensive project analytics

**Response:**
```typescript
{
  projectId: string
  summary: {
    totalRaised: number
    totalInvestors: number
    averageInvestment: number
    targetCompletion: number
    timeToTarget: number
  }
  timeline: Array<{
    date: string
    cumulativeRaised: number
    newInvestors: number
    transactions: number
  }>
  geography: Array<{
    country: string
    investors: number
    amount: number
    percentage: number
  }>
  demographics: {
    investorTypes: Record<string, number>
    riskProfiles: Record<string, number>
    investmentSizes: Record<string, number>
  }
}
```

#### GET /api/v1/projects/:id/audit-trail
Get project audit trail

#### POST /api/v1/projects/export
Export projects in various formats (CSV, Excel, PDF, JSON)

#### POST /api/v1/projects/import
Import projects from data

## Project Types & Categories

### Traditional Assets
- **Structured Products**: Capital protection, underlying assets, payoff structures
- **Equity**: Voting rights, dividend policy, dilution protection  
- **Bonds**: Credit ratings, coupon frequency, callable features

### Alternative Assets
- **Private Equity**: Vintage year, investment stage, sector focus
- **Real Estate**: Property type, geographic location, development stage
- **Receivables**: Credit quality, collection periods, recovery rates
- **Energy**: Project capacity, power purchase agreements, regulatory approvals

### Digital Assets
- **Stablecoins**: Collateral type, reserve management, audit frequency
- **Tokenized Funds**: Token economics, custody arrangements, smart contracts

## Validation System

Each project type has specific mandatory fields and business rules:

```typescript
// Example: Structured Products validation
{
  mandatoryFields: [
    'name', 'projectType', 'targetRaise', 'minimumInvestment',
    'capitalProtectionLevel', 'underlyingAssets', 'payoffStructure',
    'legalEntity', 'jurisdiction'
  ],
  validationRules: [
    {
      field: 'capitalProtectionLevel',
      rule: 'min',
      value: 0,
      message: 'Capital protection level must be non-negative'
    }
  ]
}
```

## Statistics & Metrics

### Computed Fields
Each project automatically gets enhanced with:
- **completionPercentage**: Based on mandatory fields for project type
- **missingFields**: Array of missing mandatory fields
- **walletRequired**: Boolean based on project category
- **hasWallet**: Boolean indicating wallet credential existence
- **investorCount**: Unique investors from subscriptions/cap tables
- **raisedAmount**: Total amount raised
- **complianceScore**: Computed compliance rating

### Real-time Statistics
```typescript
interface ProjectStatistics {
  investorCount: number           // Unique investors
  totalAllocation: number         // Total allocated funds
  raisedAmount: number           // Amount actually raised
  subscriptionCount: number       // Total subscriptions
  tokenCount: number             // Related tokens
  deployedTokens: number         // Successfully deployed tokens
  complianceScore: number        // 0-100 compliance rating
  kycCompletionRate: number      // 0-100 KYC completion rate
  capTableInvestorCount: number  // Cap table entries
}
```

## Usage Examples

### Basic Project Creation
```typescript
import { ProjectService } from '@/services/projects'

const projectService = new ProjectService()

const result = await projectService.createProject({
  name: "TechCorp Series A",
  projectType: "equity",
  targetRaise: 5000000,
  authorizedShares: 1000000,
  sharePrice: 5.00,
  legalEntity: "TechCorp Inc.",
  jurisdiction: "Delaware"
}, true) // createCapTable = true

if (result.success) {
  console.log('Project created:', result.data.project.id)
  console.log('Cap table created:', result.data.capTable?.id)
}
```

### Advanced Filtering
```typescript
const digitalProjects = await projectService.getProjects({
  projectType: ['stablecoins', 'tokenized_funds'],
  include_statistics: true,
  sortBy: 'completionPercentage',
  sortOrder: 'desc',
  limit: 50
})
```

### Analytics Integration
```typescript
import { ProjectAnalyticsService } from '@/services/projects'

const analyticsService = new ProjectAnalyticsService()

const analytics = await analyticsService.getProjectAnalytics(projectId)
if (analytics.success) {
  console.log('Total raised:', analytics.data.summary.totalRaised)
  console.log('Target completion:', analytics.data.summary.targetCompletion)
}
```

## Environment Setup

```bash
# Database
DATABASE_URL=postgresql://...

# Server Configuration  
PORT=3002
HOST=0.0.0.0
NODE_ENV=production

# Authentication
JWT_SECRET=your-jwt-secret

# Features
ENABLE_SWAGGER=true
LOG_LEVEL=info
```

## Testing

Run the test script to verify everything is working:

```bash
cd backend
npx tsx test-projects-service.ts
```

Expected output:
```
✅ Services instantiated successfully
✅ ProjectService loaded
✅ ProjectAnalyticsService loaded
✅ ProjectValidationService loaded
✅ Validation service methods work
Found X traditional project types
```

## Next Steps

1. **Database Migration**: Apply any necessary schema changes to match the fixed field references
2. **Integration Testing**: Test the API endpoints with real database connections
3. **Frontend Integration**: Update frontend to use the corrected field names
4. **Performance Testing**: Verify query performance with the updated database calls
5. **Documentation**: Update any additional API documentation as needed

---

**Status**: ✅ TypeScript compilation errors resolved  
**Last Updated**: July 21, 2025
