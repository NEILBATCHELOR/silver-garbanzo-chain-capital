# Backend Projects Service

## Overview

The Backend Projects Service provides comprehensive project management functionality for the Chain Capital platform. Built on top of the BaseService architecture using Fastify + Prisma + TypeScript, it offers robust CRUD operations, advanced analytics, validation, and compliance features.

## 🏗️ Architecture

### Service Structure
```
backend/src/services/projects/
├── ProjectService.ts              # Main CRUD operations
├── ProjectValidationService.ts    # Data validation & business rules
├── ProjectAnalyticsService.ts     # Analytics & reporting
├── types.ts                       # TypeScript interfaces
└── index.ts                       # Module exports
```

### Routes
```
backend/src/routes/
└── projects.ts                    # API endpoints with full OpenAPI/Swagger docs
```

## 🎯 Key Features

### ✅ Core Functionality
- **Full CRUD Operations** - Create, read, update, delete projects
- **Primary Project Management** - Set and manage primary project flag
- **Comprehensive Validation** - Business rule validation with detailed error reporting
- **Statistics & Analytics** - Real-time project metrics and insights
- **Bulk Operations** - Efficient bulk updates with batch processing
- **Cascade Deletion** - Safe project deletion with related data cleanup

### ✅ Advanced Features
- **Multi-Standard Support** - Traditional, Alternative, and Digital asset projects
- **Enhanced Search & Filtering** - Advanced query capabilities with pagination
- **Compliance Tracking** - ESG ratings, SFDR classification, completion tracking
- **Audit Trail** - Complete audit logging for all project operations
- **Export/Import** - CSV, Excel, PDF, JSON export formats
- **Performance Monitoring** - Built-in performance metrics and logging

### ✅ Project Categories

#### Traditional Assets
- **Structured Products** - Capital protection, underlying assets, payoff structures
- **Equity** - Voting rights, dividend policy, dilution protection
- **Bonds** - Credit ratings, coupon frequency, callable features

#### Alternative Assets
- **Private Equity** - Vintage year, investment stage, sector focus
- **Real Estate** - Property type, geographic location, development stage
- **Receivables** - Credit quality, collection periods, recovery rates
- **Energy** - Project capacity, power purchase agreements, regulatory approvals

#### Digital Assets
- **Stablecoins** - Collateral type, reserve management, audit frequency
- **Tokenized Funds** - Token economics, custody arrangements, smart contracts

## 📚 API Documentation

### Base URL
```
/api/v1/projects
```

### Core Endpoints

#### GET /projects
Get all projects with filtering and pagination
```typescript
// Query Parameters
interface ProjectQueryOptions {
  page?: number                    // Page number (default: 1)
  limit?: number                   // Items per page (default: 20, max: 100)
  search?: string                  // Search in name, description, legal_entity
  status?: ProjectStatus[]         // Filter by status
  project_type?: string[]          // Filter by project type
  is_primary?: boolean             // Filter primary projects
  sortBy?: string                  // Sort field (default: created_at)
  sortOrder?: 'asc' | 'desc'      // Sort direction (default: desc)
  include_statistics?: boolean     // Include computed stats (default: true)
  include_tokens?: boolean         // Include related tokens
  include_cap_table?: boolean      // Include cap table data
}

// Response
interface PaginatedResponse<ProjectWithStats> {
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

#### GET /projects/:id
Get specific project by ID
```typescript
// Query Parameters
{
  includeStats?: boolean          // Include statistics (default: true)
  includeRelated?: boolean        // Include related data (default: false)
}

// Response
{
  success: boolean
  data: ProjectWithStats
}
```

#### POST /projects
Create new project
```typescript
// Body
interface ProjectCreateRequest {
  name: string                    // Required
  project_type: string           // Required
  description?: string
  status?: ProjectStatus
  target_raise?: number
  minimum_investment?: number
  legal_entity?: string
  jurisdiction?: string
  // ... and 50+ additional fields for comprehensive project data
}

// Query Parameters
{
  createCapTable?: boolean        // Auto-create cap table (default: true)
}

// Response
{
  success: boolean
  data: {
    project: ProjectWithStats
    capTable?: { id: string, name: string }
    validation: ProjectValidationResult
  }
}
```

#### PUT /projects/:id
Update existing project
```typescript
// Body: Partial<ProjectCreateRequest>
// Response: { success: boolean, data: ProjectWithStats }
```

#### DELETE /projects/:id
Delete project (cascades to related data)
```typescript
// Response: { success: boolean, data: boolean }
```

### Specialized Endpoints

#### GET /projects/primary
Get the primary project
```typescript
// Response: { success: boolean, data: ProjectWithStats | null }
```

#### PUT /projects/:id/primary
Set project as primary
```typescript
// Response: { success: boolean, data: ProjectWithStats }
```

#### GET /projects/statistics/:id
Get detailed project statistics
```typescript
// Response
{
  success: boolean
  data: {
    investorCount: number
    totalAllocation: number
    raisedAmount: number
    subscriptionCount: number
    tokenCount: number
    deployedTokens: number
    complianceScore: number
    kycCompletionRate: number
  }
}
```

#### PUT /projects/bulk-update
Bulk update multiple projects
```typescript
// Body
{
  projectIds: string[]            // Array of project UUIDs
  updates: ProjectUpdateRequest   // Updates to apply to all
  options?: {
    validateBeforeUpdate?: boolean
    createAuditLog?: boolean
  }
}

// Response
{
  success: boolean
  data: {
    successful: ProjectWithStats[]
    failed: Array<{ item: string, error: string, index: number }>
    summary: { total: number, success: number, failed: number }
  }
}
```

### Analytics Endpoints

#### GET /projects/:id/analytics
Get comprehensive project analytics
```typescript
// Response
{
  success: boolean
  data: {
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
}
```

#### GET /projects/:id/audit-trail
Get project audit trail
```typescript
// Query Parameters
{
  limit?: number                  // Max entries (default: 100, max: 1000)
  offset?: number                 // Pagination offset (default: 0)
}

// Response
{
  success: boolean
  data: Array<{
    id: string
    projectId: string
    action: string
    userId: string
    userName: string
    timestamp: string
    details: Json
    ipAddress?: string
    userAgent?: string
  }>
}
```

#### POST /projects/export
Export projects in various formats
```typescript
// Body
{
  format: 'csv' | 'excel' | 'pdf' | 'json'
  fields: string[]                // Fields to include
  includeStatistics: boolean
  includeCompliance: boolean
  dateRange?: {
    start: string                 // ISO date
    end: string                   // ISO date
  }
}

// Response: Binary file download
```

#### POST /projects/import
Import projects from data
```typescript
// Body
{
  projects: ProjectCreateRequest[]
  options: {
    skipValidation?: boolean
    createCapTables?: boolean
    setAsPrimary?: string         // Project name to set as primary
  }
}

// Response
{
  success: boolean
  data: {
    imported: number
    failed: number
    errors: string[]
  }
}
```

## 🔧 Usage Examples

### Basic Project Creation
```typescript
import { ProjectService } from '@/services/projects'

const projectService = new ProjectService()

// Create a traditional equity project
const result = await projectService.createProject({
  name: "TechCorp Series A",
  project_type: "equity",
  target_raise: 5000000,
  authorized_shares: 1000000,
  share_price: 5.00,
  legal_entity: "TechCorp Inc.",
  jurisdiction: "Delaware",
  voting_rights: "common",
  dividend_policy: "discretionary"
}, true) // createCapTable = true

if (result.success) {
  console.log('Project created:', result.data.project.id)
  console.log('Cap table created:', result.data.capTable?.id)
}
```

### Advanced Filtering
```typescript
// Get all digital asset projects with high completion rates
const digitalProjects = await projectService.getProjects({
  project_type: ['stablecoins', 'tokenized_funds'],
  include_statistics: true,
  sortBy: 'completion_percentage',
  sortOrder: 'desc',
  limit: 50
})

digitalProjects.data.forEach(project => {
  if (project.completion_percentage > 80) {
    console.log(`${project.name}: ${project.completion_percentage}% complete`)
  }
})
```

### Bulk Operations
```typescript
// Update multiple projects' status
await projectService.bulkUpdateProjects({
  projectIds: ['uuid1', 'uuid2', 'uuid3'],
  updates: {
    status: 'active',
    investment_status: 'open'
  },
  options: {
    validateBeforeUpdate: true,
    createAuditLog: true
  }
})
```

### Analytics Integration
```typescript
import { ProjectAnalyticsService } from '@/services/projects'

const analyticsService = new ProjectAnalyticsService()

// Get comprehensive analytics
const analytics = await analyticsService.getProjectAnalytics(projectId)
if (analytics.success) {
  console.log('Total raised:', analytics.data.summary.totalRaised)
  console.log('Target completion:', analytics.data.summary.targetCompletion)
  console.log('Geography breakdown:', analytics.data.geography)
}

// Export project data
const exportResult = await analyticsService.exportProjects({
  format: 'excel',
  fields: ['name', 'project_type', 'target_raise', 'status'],
  includeStatistics: true,
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
})
```

## 🛡️ Validation System

### Project Type Validation
Each project type has specific mandatory fields and business rules:

```typescript
// Example: Structured Products validation
{
  mandatoryFields: [
    'name', 'project_type', 'target_raise', 'minimum_investment',
    'capital_protection_level', 'underlying_assets', 'payoff_structure',
    'legal_entity', 'jurisdiction'
  ],
  validationRules: [
    {
      field: 'capital_protection_level',
      rule: 'min',
      value: 0,
      message: 'Capital protection level must be non-negative'
    },
    {
      field: 'capital_protection_level', 
      rule: 'max',
      value: 100,
      message: 'Capital protection level cannot exceed 100%'
    }
  ]
}
```

### Status Transition Validation
```typescript
// Valid status transitions
const validTransitions = {
  'draft': ['under_review', 'cancelled'],
  'under_review': ['approved', 'draft', 'cancelled'],
  'approved': ['active', 'cancelled'],
  'active': ['paused', 'completed', 'cancelled'],
  'paused': ['active', 'cancelled'],
  'completed': [], // Terminal state
  'cancelled': []  // Terminal state
}
```

## 📊 Statistics & Metrics

### Computed Fields
Each project automatically gets enhanced with:
- **completion_percentage** - Based on mandatory fields for project type
- **missing_fields** - Array of missing mandatory fields
- **wallet_required** - Boolean based on project category
- **has_wallet** - Boolean indicating wallet credential existence
- **investor_count** - Unique investors from subscriptions/cap tables
- **raised_amount** - Total amount raised
- **compliance_score** - Computed compliance rating

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

## 🔐 Security & Compliance

### Data Protection
- **Input Validation** - Comprehensive validation using TypeBox schemas
- **SQL Injection Protection** - Prisma ORM provides automatic protection
- **Rate Limiting** - API endpoints protected by rate limiting
- **Authentication** - JWT-based authentication required
- **Audit Logging** - All operations logged for compliance

### Compliance Features
- **ESG Risk Rating** - Environmental, Social, Governance scoring
- **SFDR Classification** - Sustainable Finance Disclosure Regulation
- **Regulatory Permissions** - Track required regulatory approvals
- **Tax Reporting** - Track tax reporting obligations
- **Cross-border Compliance** - International compliance tracking

## ⚡ Performance

### Optimization Features
- **Database Indexes** - Optimized queries with proper indexing
- **Pagination** - Efficient pagination for large datasets
- **Selective Loading** - Include only needed related data
- **Batch Operations** - Efficient bulk operations
- **Caching** - Smart caching for frequently accessed data
- **Connection Pooling** - Optimized database connections

### Monitoring
- **Request Logging** - Detailed request/response logging
- **Error Tracking** - Comprehensive error tracking and reporting
- **Performance Metrics** - Query execution time monitoring
- **Health Checks** - Built-in health and readiness endpoints

## 🔄 Integration

### Frontend Integration
The service is designed to seamlessly integrate with the existing frontend project services:

```typescript
// Frontend compatibility
import { mapDbProjectToProject } from '@/utils/shared/formatting/typeMappers'

// Backend provides the same data structure expected by frontend
const enhancedProject = await this.enhanceProjectWithStats(project)
```

### Database Integration
- **Prisma ORM** - Type-safe database access
- **Supabase PostgreSQL** - Production-ready database
- **Migration Support** - Database schema versioning
- **Transaction Support** - ACID compliance for critical operations

## 🚀 Deployment

### Environment Variables
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

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "start"]
```

## 📈 Future Enhancements

### Planned Features
- **GraphQL Support** - GraphQL endpoint for complex queries
- **Real-time Updates** - WebSocket support for live updates
- **Advanced Analytics** - Machine learning-powered insights
- **Mobile SDK** - React Native SDK for mobile apps
- **Blockchain Integration** - Direct smart contract interaction
- **Advanced Reporting** - Custom report builder

### Performance Improvements
- **Redis Caching** - Advanced caching layer
- **ElasticSearch** - Full-text search capabilities
- **CDN Integration** - Static asset optimization
- **Microservices** - Service decomposition for scale

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev

# Run tests
npm run test
```

### Code Standards
- **TypeScript Strict** - Full type safety
- **ESLint + Prettier** - Code formatting and linting
- **Domain-driven Design** - Organized by business domains
- **Test Coverage** - Comprehensive test suite
- **Documentation** - Inline docs and README files

---

**Chain Capital Backend Projects Service** - Building the future of investment tokenization 🚀
