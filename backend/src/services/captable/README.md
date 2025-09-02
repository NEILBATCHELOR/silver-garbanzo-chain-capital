# Captable Backend Service

## Overview

The Captable Backend Service provides comprehensive cap table management functionality for the Chain Capital platform. Built on top of the BaseService architecture using Fastify + Prisma + TypeScript, it offers robust CRUD operations, advanced analytics, validation, and compliance features.

## 🏗️ Architecture

### Service Structure
```
backend/src/services/captable/
├── CapTableService.ts              # Main CRUD operations
├── CapTableValidationService.ts    # Data validation & business rules
├── CapTableAnalyticsService.ts     # Analytics & reporting
├── types.ts                        # TypeScript interfaces
└── index.ts                        # Module exports and service manager
```

### Routes
```
backend/src/routes/
└── captable.ts                     # API endpoints with full OpenAPI/Swagger docs
```

## 🎯 Key Features

### ✅ Core Functionality
- **Full CRUD Operations** - Create, read, update, delete cap tables, investors, subscriptions, token allocations, distributions
- **Comprehensive Validation** - Business rule validation with detailed error reporting
- **Statistics & Analytics** - Real-time cap table metrics and insights
- **Bulk Operations** - Efficient bulk updates with batch processing
- **Cascade Operations** - Safe entity deletion with related data cleanup

### ✅ Advanced Features
- **Multi-Entity Support** - Cap tables, investors, subscriptions, token allocations, distributions
- **Enhanced Search & Filtering** - Advanced query capabilities with pagination
- **Compliance Tracking** - KYC status, investor accreditation, regulatory compliance
- **Audit Trail** - Complete audit logging for all cap table operations
- **Export/Import** - CSV, Excel, PDF, JSON export formats
- **Performance Monitoring** - Built-in performance metrics and logging

### ✅ Data Entities

#### Cap Tables
- **Core Management** - Project association, naming, description
- **Statistics** - Total investors, raised amounts, token allocations, completion percentages
- **Relationships** - Projects, investors, subscriptions, token allocations, distributions

#### Investors
- **Profile Management** - Personal information, contact details, investor types
- **KYC/Compliance** - KYC status, accreditation, risk tolerance, compliance notes
- **Financial Data** - Annual income, net worth, investment experience, objectives
- **Portfolio Tracking** - Total subscribed, allocated, distributed amounts across all projects

#### Subscriptions
- **Investment Tracking** - Subscription amounts, payment methods, payment status
- **Allocation Management** - Allocation tracking, distribution status
- **Compliance** - Investor verification, project validation, allocation limits

#### Token Allocations
- **Allocation Management** - Token amounts, types, standards (ERC-20, ERC-721, ERC-1155, ERC-1400, etc.)
- **Distribution Tracking** - Distribution status, blockchain transactions
- **Compliance** - Allocation validation, over-allocation prevention

#### Distributions
- **Token Distribution** - Blockchain-based token distribution tracking
- **Transaction Management** - Transaction hashes, wallet addresses, confirmation status
- **Redemption Tracking** - Full redemption status, remaining amounts

## 📚 API Documentation

### Base URL
```
/api/v1/captable
```

### Core Endpoints

#### Cap Table Management
- **POST /captable** - Create new cap table
- **GET /captable/project/:projectId** - Get cap table by project
- **PUT /captable/:id** - Update cap table
- **DELETE /captable/:id** - Delete cap table

#### Investor Management
- **POST /captable/investors** - Create new investor
- **GET /captable/investors** - Get all investors with filtering/pagination
- **GET /captable/investors/:id** - Get specific investor
- **PUT /captable/investors/:id** - Update investor
- **DELETE /captable/investors/:id** - Delete investor

#### Subscription Management
- **POST /captable/subscriptions** - Create new subscription
- **GET /captable/subscriptions** - Get all subscriptions with filtering
- **GET /captable/subscriptions/:id** - Get specific subscription
- **PUT /captable/subscriptions/:id** - Update subscription
- **DELETE /captable/subscriptions/:id** - Delete subscription

#### Token Allocation Management
- **POST /captable/allocations** - Create new token allocation
- **GET /captable/allocations** - Get all allocations with filtering
- **GET /captable/allocations/:id** - Get specific allocation
- **PUT /captable/allocations/:id** - Update allocation
- **DELETE /captable/allocations/:id** - Delete allocation

#### Distribution Management
- **POST /captable/distributions** - Create new distribution
- **GET /captable/distributions** - Get all distributions with filtering
- **GET /captable/distributions/:id** - Get specific distribution
- **PUT /captable/distributions/:id** - Update distribution
- **DELETE /captable/distributions/:id** - Delete distribution

### Analytics Endpoints

#### GET /captable/analytics/:projectId
Get comprehensive cap table analytics
```typescript
{
  summary: CapTableStatistics,
  investors: InvestorStatistics,
  subscriptions: SubscriptionStatistics,
  allocations: TokenAllocationStatistics,
  distributions: DistributionStatistics,
  timeline: Array<TimelineData>,
  geography: Array<GeographyData>,
  demographics: DemographicsData
}
```

#### GET /captable/statistics/:projectId
Get cap table statistics
```typescript
{
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
```

### Export/Import Endpoints

#### POST /captable/export/:projectId
Export cap table data in various formats
```typescript
{
  format: 'csv' | 'excel' | 'pdf' | 'json',
  includeInvestors: boolean,
  includeSubscriptions: boolean,
  includeAllocations: boolean,
  includeDistributions: boolean,
  includeStatistics: boolean,
  dateRange?: { start: Date, end: Date },
  fields?: string[]
}
```

## 🔧 Usage Examples

### Basic Cap Table Creation
```typescript
import { capTableServiceManager } from '@/services/captable'

const capTableService = capTableServiceManager.getCapTableService()

// Create a cap table with validation
const result = await capTableServiceManager.createCapTableWithValidation({
  projectId: "uuid-project-id",
  name: "TechCorp Series A Cap Table",
  description: "Cap table for Series A fundraising round"
}, userId)

if (result.success) {
  console.log('Cap table created:', result.data.id)
}
```

### Advanced Investor Management
```typescript
// Create investor with comprehensive validation
const investorResult = await capTableServiceManager.createInvestorWithValidation({
  investorId: "INV-001",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1-555-0123",
  kycStatus: "approved",
  investorType: "accredited_individual",
  riskTolerance: "moderate",
  annualIncome: 250000,
  netWorth: 1500000,
  accreditationStatus: "verified"
}, userId)

// Get investors with filtering and pagination
const investorsResult = await capTableService.getInvestors({
  page: 1,
  limit: 50,
  kycStatus: ['approved', 'pending'],
  investorType: ['accredited_individual', 'institutional'],
  includeSubscriptions: true,
  includeAllocations: true,
  sortBy: 'createdAt',
  sortOrder: 'desc'
})
```

### Subscription and Allocation Workflow
```typescript
// Create subscription with validation
const subscriptionResult = await capTableServiceManager.createSubscriptionWithValidation({
  projectId: "uuid-project-id",
  investorId: "uuid-investor-id",
  subscriptionAmount: 100000.00,
  paymentMethod: "wire_transfer",
  paymentStatus: "pending",
  subscriptionDate: new Date(),
  notes: "Series A investment"
}, userId)

// Create token allocation
const allocationResult = await capTableService.createTokenAllocation({
  projectId: "uuid-project-id",
  subscriptionId: subscriptionResult.data.id,
  investorId: "uuid-investor-id",
  tokenType: "equity",
  tokenAmount: 20000,
  symbol: "TECH",
  standard: "ERC_1400",
  allocationDate: new Date()
}, userId)
```

### Analytics and Reporting
```typescript
const analyticsService = capTableServiceManager.getAnalyticsService()

// Get comprehensive analytics
const analytics = await analyticsService.getCapTableAnalytics(projectId)
if (analytics.success) {
  console.log('Total raised:', analytics.data.summary.totalRaised)
  console.log('Completion rate:', analytics.data.summary.completionPercentage)
  console.log('Geographic breakdown:', analytics.data.geography)
}

// Export cap table data
const exportResult = await analyticsService.exportCapTableData(projectId, {
  format: 'excel',
  includeInvestors: true,
  includeSubscriptions: true,
  includeAllocations: true,
  includeStatistics: true
})
```

## 🛡️ Validation System

### Comprehensive Business Rules
Each entity type has specific mandatory fields and business rule validation:

```typescript
// Investor validation
{
  mandatoryFields: ['investorId', 'name', 'email'],
  validationRules: [
    { field: 'email', rule: 'email_format' },
    { field: 'annualIncome', rule: 'min', value: 0 },
    { field: 'dateOfBirth', rule: 'min_age', value: 18 }
  ]
}

// Subscription validation
{
  mandatoryFields: ['projectId', 'investorId', 'subscriptionAmount'],
  validationRules: [
    { field: 'subscriptionAmount', rule: 'min', value: 0.01 },
    { field: 'subscriptionDate', rule: 'max_date', value: 'now' }
  ]
}
```

### Status Transition Validation
```typescript
// Valid KYC status transitions
const validKycTransitions = {
  'not_started': ['pending'],
  'pending': ['approved', 'failed'],
  'approved': ['expired'],
  'failed': ['pending'],
  'expired': ['pending']
}
```

## 📊 Statistics & Metrics

### Computed Fields
Each entity automatically gets enhanced with computed statistics:
- **Cap Tables** - Total investors, raised amounts, completion percentages
- **Investors** - Total subscribed, allocated, distributed across all projects
- **Subscriptions** - Allocation percentages, remaining amounts
- **Token Allocations** - Distribution percentages, remaining to distribute

### Real-time Analytics
```typescript
interface CapTableStatistics {
  totalInvestors: number
  totalRaised: Decimal
  totalTokensAllocated: Decimal
  totalTokensDistributed: Decimal
  averageInvestment: Decimal
  medianInvestment: Decimal
  completionPercentage: number
  kycCompletionRate: number
  distributionCompletionRate: number
}
```

## 🔐 Security & Compliance

### Data Protection
- **Input Validation** - Comprehensive validation using TypeScript schemas
- **SQL Injection Protection** - Prisma ORM provides automatic protection
- **Rate Limiting** - API endpoints protected by rate limiting
- **Authentication** - JWT-based authentication required
- **Audit Logging** - All operations logged for compliance

### Compliance Features
- **KYC Tracking** - Complete KYC status management and workflow
- **Investor Accreditation** - Accreditation status and verification
- **Risk Management** - Risk tolerance and investment experience tracking
- **Financial Compliance** - Income and net worth verification
- **Regulatory Reporting** - Comprehensive audit trail for regulatory compliance

## ⚡ Performance

### Optimization Features
- **Database Indexes** - Optimized queries with proper indexing via Prisma
- **Pagination** - Efficient pagination for large datasets
- **Selective Loading** - Include only needed related data
- **Batch Operations** - Efficient bulk operations
- **Computed Fields** - Smart caching for frequently accessed statistics
- **Connection Pooling** - Optimized database connections via Prisma

### Monitoring
- **Request Logging** - Detailed request/response logging
- **Error Tracking** - Comprehensive error tracking and reporting
- **Performance Metrics** - Query execution time monitoring
- **Health Checks** - Built-in health and readiness endpoints

## 🔄 Integration

### Frontend Integration
The service is designed to work seamlessly with frontend captable components:

```typescript
// Frontend-compatible data structures
const enhancedCapTable = await capTableService.enhanceCapTableWithStats(capTable)
// Returns data structure expected by frontend components
```

### Database Integration
- **Prisma ORM** - Type-safe database access with auto-generated types
- **PostgreSQL** - Production-ready database with full ACID compliance
- **Migration Support** - Database schema versioning
- **Transaction Support** - Multi-entity operations with rollback capability

## 🚀 Deployment

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# Server Configuration  
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# Authentication
JWT_SECRET=your-jwt-secret

# Features
ENABLE_SWAGGER=true
LOG_LEVEL=info
```

### Health Endpoints
- **GET /captable/health** - Service health check
- **GET /health** - General server health
- **GET /ready** - Database connectivity check

## 📈 Future Enhancements

### Planned Features
- **Real-time Updates** - WebSocket support for live cap table updates
- **Advanced Workflows** - Multi-step approval workflows for investments
- **Integration APIs** - Third-party service integrations (KYC providers, payment processors)
- **Mobile SDK** - React Native SDK for mobile cap table management
- **Blockchain Integration** - Direct smart contract interaction for token distributions
- **Advanced Reporting** - Custom report builder with templates

### Performance Improvements
- **Redis Caching** - Advanced caching layer for computed statistics
- **Background Processing** - Async processing for bulk operations
- **Database Optimization** - Query optimization and indexing improvements
- **Microservices** - Service decomposition for horizontal scaling

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Run tests
npm run test
```

### Code Standards
- **TypeScript Strict** - Full type safety with strict mode
- **Prisma Best Practices** - Efficient database queries and relationships
- **Domain-driven Design** - Organized by business domains
- **Test Coverage** - Comprehensive test suite
- **Documentation** - Inline docs and comprehensive README files

---

**Chain Capital Captable Backend Service** - Enterprise-grade cap table management infrastructure 🚀
