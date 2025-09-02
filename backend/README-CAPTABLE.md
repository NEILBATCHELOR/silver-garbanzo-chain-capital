# Captable API and Backend Service

## Overview

The Captable API and Backend Service provides comprehensive cap table management functionality for the Chain Capital platform. Built on top of the BaseService architecture using Fastify + Prisma + TypeScript, it offers robust CRUD operations, advanced analytics, validation, and compliance features.

## 🏗️ Architecture

### Service Structure
```
backend/src/services/captable/
├── CapTableService.ts              # Main CRUD operations
├── CapTableValidationService.ts    # Data validation & business rules  
├── CapTableAnalyticsService.ts     # Analytics & reporting
├── types.ts                        # TypeScript interfaces
└── index.ts                        # Module exports & service manager
```

### Routes
```
backend/src/routes/
└── captable.ts                     # API endpoints with full OpenAPI/Swagger docs
```

## 🎯 Key Features

### ✅ Core Functionality
- **Full CRUD Operations** - Create, read, update, delete cap tables, investors, subscriptions
- **Comprehensive Validation** - Business rule validation with detailed error reporting
- **Statistics & Analytics** - Real-time cap table metrics and insights
- **Bulk Operations** - Efficient bulk updates with batch processing
- **Cascade Deletion** - Safe deletion with related data cleanup
- **Auto-failover** - Automatic fallback handling for enhanced reliability

### ✅ Advanced Features
- **Multi-Asset Support** - Traditional, Alternative, and Digital asset cap tables
- **Enhanced Search & Filtering** - Advanced query capabilities with pagination
- **Compliance Tracking** - KYC status, investor accreditation, completion tracking
- **Audit Trail** - Complete audit logging for all cap table operations
- **Export/Import** - CSV, Excel, PDF, JSON export formats
- **Performance Monitoring** - Built-in performance metrics and logging

### ✅ Entity Management

#### Cap Tables
- **Creation & Management** - Project-specific cap table creation with auto-generation
- **Statistics** - Total investors, raised amounts, token allocations, distributions
- **Completion Tracking** - Real-time completion percentages and KYC rates

#### Investors
- **Comprehensive Profiles** - Personal information, KYC status, accreditation
- **Financial Data** - Annual income, net worth, risk tolerance, investment experience
- **Compliance Tracking** - KYC status, approval workflows, expiry management
- **Geographic Distribution** - Country-based analytics and compliance

#### Subscriptions
- **Investment Tracking** - Subscription amounts, payment status, allocation tracking
- **Multi-Currency Support** - Flexible currency handling
- **Status Management** - Pending, confirmed, allocated, distributed states
- **Date Tracking** - Subscription dates with trend analysis

#### Token Allocations
- **Multi-Standard Support** - ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626
- **Allocation Management** - Token amounts, types, distribution tracking
- **Distribution Status** - Track distributed vs pending allocations
- **Blockchain Integration** - Preparation for on-chain operations

#### Distributions
- **Token Distribution** - Track actual token distributions to investors
- **Blockchain Recording** - Transaction hashes, block numbers, addresses
- **Redemption Tracking** - Full redemption status and remaining amounts
- **Multi-Blockchain Support** - Support for various blockchain networks

## 📚 API Documentation

### Base URL
```
/api/v1/captable
```

### Core Endpoints

#### POST /captable
Create new cap table
```typescript
// Body
{
  projectId: string     // Required - Project UUID
  name: string         // Required - Cap table name
  description?: string // Optional description
}

// Response 201
{
  success: true,
  data: CapTableWithStats,
  message: "Cap table created successfully"
}
```

#### GET /captable/project/:projectId
Get cap table by project ID
```typescript
// Query Parameters
{
  includeStats?: boolean    // Include computed statistics (default: true)
  includeRelated?: boolean  // Include related data (default: false)
}

// Response 200
{
  success: true,
  data: CapTableWithStats
}
```

#### PUT /captable/:id
Update cap table
```typescript
// Body
{
  name?: string
  description?: string
}

// Response 200
{
  success: true,
  data: CapTableWithStats,
  message: "Cap table updated successfully"
}
```

#### DELETE /captable/:id
Delete cap table
```typescript
// Response 200
{
  success: true,
  data: true,
  message: "Cap table deleted successfully"
}
```

### Investor Endpoints

#### POST /captable/investors
Create new investor
```typescript
// Body
{
  investorId: string           // Required - Unique identifier
  name: string                // Required - Full name
  email: string               // Required - Email address
  phone?: string
  walletAddress?: string
  kycStatus?: KycStatus
  accreditationStatus?: string
  investorType?: string
  riskTolerance?: string
  annualIncome?: number
  netWorth?: number
  // ... additional fields
}

// Response 201
{
  success: true,
  data: InvestorWithSubscription,
  message: "Investor created successfully"
}
```

#### GET /captable/investors
Get all investors with filtering
```typescript
// Query Parameters
{
  page?: number                    // Page number (default: 1)
  limit?: number                   // Items per page (default: 20, max: 100)
  search?: string                  // Search in name, email, investor ID
  kycStatus?: KycStatus[]         // Filter by KYC status
  investorType?: string[]         // Filter by investor type
  isActive?: boolean              // Filter by active status
  includeSubscriptions?: boolean   // Include subscription data
  includeAllocations?: boolean    // Include allocation data
  sortBy?: string                 // Sort field (default: createdAt)
  sortOrder?: 'asc' | 'desc'     // Sort direction (default: desc)
}

// Response 200
{
  success: true,
  data: {
    data: InvestorWithSubscription[],
    pagination: {
      total: number,
      page: number,
      limit: number,
      hasMore: boolean,
      totalPages: number
    }
  }
}
```

### Subscription Endpoints

#### POST /captable/subscriptions
Create new subscription
```typescript
// Body
{
  projectId: string           // Required - Project UUID
  investorId: string         // Required - Investor UUID
  subscriptionAmount: number  // Required - Investment amount
  paymentMethod?: string
  paymentStatus?: string      // Default: "pending"
  subscriptionDate?: Date
  notes?: string
}

// Response 201
{
  success: true,
  data: SubscriptionWithDetails,
  message: "Subscription created successfully"
}
```

### Analytics Endpoints

#### GET /captable/analytics/:projectId
Get comprehensive cap table analytics
```typescript
// Response 200
{
  success: true,
  data: {
    summary: CapTableStatistics,
    investors: InvestorStatistics,
    subscriptions: SubscriptionStatistics,
    allocations: TokenAllocationStatistics,
    distributions: DistributionStatistics,
    timeline: Array<TimelineEntry>,
    geography: Array<GeographyEntry>,
    demographics: DemographicsData
  }
}
```

#### GET /captable/statistics/:projectId
Get cap table statistics
```typescript
// Response 200
{
  success: true,
  data: {
    totalInvestors: number,
    totalRaised: Decimal,
    totalTokensAllocated: Decimal,
    totalTokensDistributed: Decimal,
    averageInvestment: Decimal,
    medianInvestment: Decimal,
    completionPercentage: number,
    kycCompletionRate: number,
    distributionCompletionRate: number
  }
}
```

### Export Endpoints

#### POST /captable/export/:projectId
Export cap table data
```typescript
// Body
{
  format: 'csv' | 'excel' | 'pdf' | 'json',  // Required
  includeInvestors?: boolean,                 // Default: true
  includeSubscriptions?: boolean,             // Default: true
  includeAllocations?: boolean,               // Default: true
  includeDistributions?: boolean,             // Default: true
  includeStatistics?: boolean,                // Default: true
  fields?: string[],                          // Specific fields to include
  dateRange?: {
    start: Date,
    end: Date
  }
}

// Response 200
{
  success: true,
  data: ExportedData,
  message: "Data exported successfully"
}
```

## 🔧 Usage Examples

### Basic Cap Table Creation
```typescript
import { capTableServiceManager } from '@/services/captable'

const capTableService = capTableServiceManager.getCapTableService()

// Create a cap table with validation
const result = await capTableServiceManager.createCapTableWithValidation({
  projectId: "project-uuid-here",
  name: "TechCorp Series A Cap Table",
  description: "Cap table for Series A funding round"
}, "user-id-here")

if (result.success) {
  console.log('Cap table created:', result.data.id)
  console.log('Statistics:', result.data)
}
```

### Investor Management
```typescript
// Create investor with validation
const investorResult = await capTableServiceManager.createInvestorWithValidation({
  investorId: "INV-001",
  name: "John Doe",
  email: "john.doe@example.com",
  kycStatus: "pending",
  investorType: "individual",
  riskTolerance: "moderate",
  annualIncome: 150000,
  netWorth: 500000
}, "user-id-here")

// Get investors with filtering
const investorsResult = await capTableService.getInvestors({
  page: 1,
  limit: 20,
  kycStatus: ['approved', 'pending'],
  includeSubscriptions: true,
  sortBy: 'createdAt',
  sortOrder: 'desc'
})
```

### Subscription Management
```typescript
// Create subscription with validation
const subscriptionResult = await capTableServiceManager.createSubscriptionWithValidation({
  projectId: "project-uuid",
  investorId: "investor-uuid",
  subscriptionAmount: 50000,
  paymentMethod: "wire_transfer",
  subscriptionDate: new Date(),
  notes: "Series A investment"
}, "user-id-here")
```

### Analytics and Reporting
```typescript
import { capTableServiceManager } from '@/services/captable'

const analyticsService = capTableServiceManager.getAnalyticsService()

// Get comprehensive analytics
const analytics = await analyticsService.getCapTableAnalytics("project-uuid")
if (analytics.success) {
  console.log('Total raised:', analytics.data.summary.totalRaised)
  console.log('Total investors:', analytics.data.summary.totalInvestors)
  console.log('Geography breakdown:', analytics.data.geography)
  console.log('Timeline data:', analytics.data.timeline)
}

// Export cap table data
const exportResult = await analyticsService.exportCapTableData("project-uuid", {
  format: 'excel',
  includeInvestors: true,
  includeSubscriptions: true,
  includeStatistics: true,
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  }
})
```

## 🛡️ Validation System

### Comprehensive Validation
Each entity has specific validation rules:

```typescript
// Cap Table Validation
- Required: projectId, name
- Business Rules: Unique per project, name length limits
- Referential Integrity: Project must exist

// Investor Validation  
- Required: investorId, name, email
- Business Rules: Unique email/investorId, valid email format, age restrictions
- Financial Validation: Non-negative amounts, reasonable limits
- KYC Compliance: Status tracking and expiry management

// Subscription Validation
- Required: projectId, investorId, subscriptionAmount
- Business Rules: Positive amounts, valid dates, project/investor existence
- Compliance Checks: KYC status, investor activity, project status
- Over-allocation Warnings: Prevents/warns about over-subscription
```

### Validation Response Format
```typescript
{
  isValid: boolean,
  errors: ValidationError[],      // Blocking errors
  warnings: ValidationWarning[],  // Non-blocking warnings
  completionPercentage: number,   // % of required fields completed
  missingFields: string[],        // List of missing required fields
  requiredActions: string[]       // Actions needed to resolve errors
}
```

## 📊 Statistics & Analytics

### Real-time Statistics
Each cap table provides comprehensive statistics:

```typescript
interface CapTableStatistics {
  totalInvestors: number           // Unique investors
  totalRaised: Decimal            // Total amount raised
  totalTokensAllocated: Decimal   // Total tokens allocated
  totalTokensDistributed: Decimal // Total tokens distributed
  averageInvestment: Decimal      // Average investment per investor
  medianInvestment: Decimal       // Median investment amount
  completionPercentage: number    // % of allocations distributed
  kycCompletionRate: number       // % of investors with approved KYC
  distributionCompletionRate: number // % of allocations distributed
}
```

### Advanced Analytics
- **Timeline Analysis** - Cumulative raised amounts, investor onboarding trends
- **Geographic Distribution** - Country-based investor and investment analysis
- **Demographics** - Investor type, risk profile, investment size categorization
- **Trend Analysis** - Monthly subscription and distribution patterns

## 🔐 Security & Compliance

### Data Protection
- **Input Validation** - Comprehensive validation using business rules
- **SQL Injection Protection** - Prisma ORM provides automatic protection
- **Authentication** - JWT-based authentication required for all operations
- **Audit Logging** - All operations logged for compliance and tracking

### Compliance Features
- **KYC Tracking** - Complete KYC status management with expiry dates
- **Investor Accreditation** - Track accreditation status and requirements
- **Regulatory Compliance** - Support for various regulatory frameworks
- **Data Privacy** - Sensitive data handling with appropriate redaction

## ⚡ Performance

### Optimization Features
- **Database Indexes** - Optimized queries with proper indexing via Prisma
- **Pagination** - Efficient pagination for large datasets
- **Selective Loading** - Include only needed related data
- **Batch Operations** - Efficient bulk operations for large datasets
- **Connection Pooling** - Optimized database connections via Prisma

### Monitoring
- **Request Logging** - Detailed request/response logging
- **Error Tracking** - Comprehensive error tracking and reporting
- **Performance Metrics** - Query execution time monitoring
- **Health Checks** - Built-in health and readiness endpoints

## 🔄 Integration

### Frontend Integration
The service is designed to integrate with the existing frontend captable components:

```typescript
// Frontend can directly use the API endpoints
const response = await fetch('/api/v1/captable/project/uuid', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const capTable = await response.json()
```

### Database Integration
- **Prisma ORM** - Type-safe database access with generated client
- **PostgreSQL** - Production-ready database with ACID compliance
- **Migration Support** - Database schema versioning through Prisma
- **Transaction Support** - ACID compliance for critical operations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Prisma CLI installed

### Installation
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start the server
npm run dev
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chaincp
DIRECT_DATABASE_URL=postgresql://user:password@localhost:5432/chaincp

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Authentication
JWT_SECRET=your-jwt-secret

# Features
ENABLE_SWAGGER=true
LOG_LEVEL=info
```

### Testing the API
```bash
# Health check
curl http://localhost:3001/health

# Get cap table (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/v1/captable/project/PROJECT_UUID

# Create investor (requires authentication)
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"investorId":"INV-001","name":"John Doe","email":"john@example.com"}' \
     http://localhost:3001/api/v1/captable/investors
```

## 📈 Future Enhancements

### Planned Features
- **Real-time Updates** - WebSocket support for live cap table updates
- **Advanced Reporting** - Custom report builder with templates
- **Blockchain Integration** - Direct smart contract interaction for distributions
- **Mobile SDK** - React Native SDK for mobile applications
- **Advanced Analytics** - Machine learning-powered insights and predictions

### Performance Improvements
- **Redis Caching** - Advanced caching layer for frequently accessed data
- **ElasticSearch** - Full-text search capabilities across all entities
- **CDN Integration** - Static asset optimization for export files
- **Microservices** - Service decomposition for enhanced scalability

## 🤝 Contributing

### Development Guidelines
- **TypeScript Strict** - Full type safety required
- **ESLint + Prettier** - Code formatting and linting
- **Domain-driven Design** - Organized by business domains
- **Test Coverage** - Comprehensive test suite required
- **Documentation** - Inline docs and README files for all services

### Code Standards
- Follow existing patterns in BaseService
- Use Prisma for all database operations
- Implement comprehensive validation
- Include proper error handling
- Add audit logging for all mutations
- Follow REST API conventions

---

**Chain Capital Captable API & Backend Service** - Enterprise-grade cap table management 🚀
