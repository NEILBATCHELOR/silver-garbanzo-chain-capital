# Backend Investor Management Service

## Overview

The Backend Investor Management Service provides comprehensive investor lifecycle management for the Chain Capital platform. Built on top of the BaseService architecture using Fastify + Prisma + TypeScript, it offers robust CRUD operations, advanced analytics, validation, and compliance features for managing investors throughout their journey from onboarding to portfolio management.

## 🏗️ Architecture

### Service Structure
```
backend/src/services/investors/
├── InvestorService.ts              # Main CRUD operations & business logic
├── InvestorValidationService.ts    # Data validation & business rules
├── InvestorAnalyticsService.ts     # Analytics & reporting
├── index.ts                        # Module exports
```

### Routes
```
backend/src/routes/
└── investors.ts                    # API endpoints with full OpenAPI/Swagger docs
```

### Database Schema
The service manages investors across multiple related tables:
- **investors** (25 fields) - Core investor data with KYC, accreditation, compliance
- **investor_groups** - Investor grouping and segmentation
- **investor_group_members** - Many-to-many relationships
- **cap_table_investors** - Investment tracking and portfolio management

## 🎯 Key Features

### ✅ Core Functionality
- **Full CRUD Operations** - Create, read, update, delete investors
- **Comprehensive Validation** - Business rule validation with detailed error reporting
- **KYC Management** - Complete KYC lifecycle tracking and compliance
- **Accreditation Tracking** - Investor accreditation status and requirements
- **Group Management** - Investor segmentation and group assignments
- **Portfolio Analytics** - Investment tracking and performance metrics

### ✅ Advanced Features
- **Multi-Type Support** - Individual, Corporate, Institutional, Fund, Trust investors
- **Enhanced Search & Filtering** - Advanced query capabilities with pagination
- **Compliance Tracking** - KYC, accreditation, regulatory compliance monitoring
- **Risk Assessment** - Investment risk profiling and assessment
- **Audit Trail** - Complete audit logging for all investor operations
- **Export/Import** - CSV, Excel, PDF, JSON export formats
- **Performance Monitoring** - Built-in performance metrics and logging

### ✅ Investor Types & Validation

#### Individual Investors
- **Personal Information** - Name, email, nationality, residence, date of birth
- **Financial Profile** - Annual income, net worth, employment status
- **Risk Assessment** - Risk tolerance, investment experience, objectives
- **KYC Requirements** - Identity verification, address verification

#### Corporate Investors
- **Company Information** - Registration details, authorized representatives
- **Corporate Structure** - Beneficial ownership, board resolutions
- **Financial Standing** - Company financials, authorized investment amounts
- **Enhanced Due Diligence** - Corporate KYC, compliance documentation

#### Institutional Investors
- **Institution Details** - Fund type, investment mandate, regulatory status
- **Accreditation Requirements** - Institutional accreditation certificates
- **Investment Authorization** - Investment committee approvals
- **Regulatory Compliance** - Institutional compliance requirements

## 📚 API Documentation

### Base URL
```
/api/v1/investors
```

### Core Endpoints

#### GET /investors
Get all investors with filtering and pagination
```typescript
// Query Parameters
interface InvestorQueryOptions {
  page?: number                    // Page number (default: 1)
  limit?: number                   // Items per page (default: 20, max: 100)
  search?: string                  // Search in name, email, company, tax_id_number
  investor_status?: InvestorStatus[]  // Filter by status
  kyc_status?: KycStatus[]         // Filter by KYC status
  investor_type?: InvestorType[]   // Filter by investor type
  accreditation_status?: AccreditationStatus[] // Filter by accreditation
  include_statistics?: boolean     // Include computed stats (default: true)
  include_groups?: boolean         // Include group memberships
  include_cap_table?: boolean      // Include cap table data
  sort_by?: string                 // Sort field (default: created_at)
  sort_order?: 'asc' | 'desc'     // Sort direction (default: desc)
  has_wallet?: boolean             // Filter by wallet presence
  compliance_score_min?: number   // Minimum compliance score
  investment_amount_min?: number   // Minimum investment amount
  investment_amount_max?: number   // Maximum investment amount
}

// Response
interface PaginatedResponse<InvestorWithStats> {
  data: InvestorWithStats[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    totalPages: number
  }
}
```

#### GET /investors/:id
Get specific investor by ID
```typescript
// Query Parameters
{
  include_statistics?: boolean      // Include statistics (default: true)
  include_groups?: boolean         // Include group data (default: false)
  include_cap_table?: boolean      // Include cap table data (default: false)
}

// Response
{
  success: boolean
  data: InvestorWithStats
}
```

#### POST /investors
Create new investor
```typescript
// Body
interface InvestorCreateRequest {
  name: string                    // Required
  email: string                   // Required
  type: string                    // Required
  investor_type?: InvestorType    // Default: 'individual'
  wallet_address?: string
  company?: string
  tax_residency?: string
  tax_id_number?: string
  profile_data?: {
    phone?: string
    nationality?: string
    residence_country?: string
    date_of_birth?: string
    employment_status?: string
    annual_income?: number
    net_worth?: number
    source_of_funds?: string
    investment_objectives?: string
  }
  risk_assessment?: {
    risk_tolerance?: 'conservative' | 'moderate' | 'aggressive'
    investment_experience?: 'none' | 'limited' | 'moderate' | 'extensive'
    liquidity_needs?: string
    time_horizon?: string
  }
  investment_preferences?: {
    preferred_sectors?: string[]
    preferred_regions?: string[]
    minimum_investment?: number
    maximum_investment?: number
    preferred_project_types?: string[]
  }
}

// Query Parameters
{
  validate_data?: boolean         // Validate data (default: true)
  assign_to_groups?: string[]     // Group IDs to assign
  auto_kyc_check?: boolean        // Auto KYC check (default: true)
}

// Response
{
  success: boolean
  data: {
    investor: InvestorWithStats
    validation: InvestorValidationResult
    groups_assigned?: InvestorGroup[]
    compliance_status: {
      kyc_required: boolean
      accreditation_required: boolean
      additional_documentation: string[]
    }
  }
}
```

#### PUT /investors/:id
Update existing investor
```typescript
// Body: Partial<InvestorCreateRequest> + status fields
interface InvestorUpdateRequest {
  investor_status?: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected'
  kyc_status?: 'not_started' | 'pending' | 'approved' | 'failed' | 'expired'
  accreditation_status?: 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired'
  kyc_expiry_date?: Date
  accreditation_expiry_date?: Date
  accreditation_type?: string
  verification_details?: any
  last_compliance_check?: Date
  // ... plus all fields from InvestorCreateRequest
}

// Response: { success: boolean, data: InvestorWithStats }
```

#### DELETE /investors/:id
Delete investor (with cascade handling)
```typescript
// Response: { success: boolean, data: boolean }
```

### Specialized Endpoints

#### GET /investors/:id/statistics
Get detailed investor statistics
```typescript
// Response
{
  success: boolean
  data: {
    total_invested: number
    number_of_investments: number
    active_projects: number
    completed_projects: number
    average_investment_size: number
    portfolio_value: number
    kyc_compliance_rate: number
    accreditation_status_current: boolean
    first_investment_date?: Date
    last_investment_date?: Date
    preferred_investment_types: string[]
    geographic_exposure: Record<string, number>
    sector_exposure: Record<string, number>
  }
}
```

#### PUT /investors/bulk-update
Bulk update multiple investors
```typescript
// Body
{
  investor_ids: string[]           // Array of investor UUIDs
  updates: InvestorUpdateRequest   // Updates to apply to all
  options?: {
    validate_before_update?: boolean
    create_audit_log?: boolean
    notify_investors?: boolean
  }
}

// Response
{
  success: boolean
  data: {
    successful: InvestorWithStats[]
    failed: Array<{ item: string, error: string, index: number }>
    summary: { total: number, success: number, failed: number }
  }
}
```

### Analytics Endpoints

#### GET /investors/:id/analytics
Get comprehensive investor analytics
```typescript
// Response
{
  success: boolean
  data: {
    investor_id: string
    summary: {
      total_invested: number
      total_projects: number
      average_investment: number
      portfolio_performance: number
      roi_percentage: number
    }
    timeline: Array<{
      date: string
      cumulative_invested: number
      new_investments: number
      portfolio_value: number
    }>
    project_breakdown: Array<{
      project_id: string
      project_name: string
      amount_invested: number
      current_value: number
      roi: number
      status: string
    }>
    risk_profile: {
      risk_score: number
      diversification_score: number
      concentration_risk: number
      recommended_actions: string[]
    }
  }
}
```

#### GET /investors/overview
Get investor overview dashboard data
```typescript
// Response
{
  success: boolean
  data: {
    totalInvestors: number
    activeInvestors: number
    kycApprovalRate: number
    averageInvestmentSize: number
    totalInvested: number
    topInvestors: InvestorWithStats[]
    complianceMetrics: {
      kycCompliant: number
      accreditationCompliant: number
      documentationComplete: number
    }
    geographicDistribution: Record<string, number>
    investorTypeDistribution: Record<string, number>
  }
}
```

#### POST /investors/export
Export investors in various formats
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
  investorIds?: string[]          // Specific investors to export
}

// Response: Binary file download
```

#### POST /investors/:id/validate
Validate investor data and compliance
```typescript
// Response
{
  success: boolean
  data: {
    is_valid: boolean
    completion_percentage: number
    missing_fields: string[]
    validation_errors: string[]
    compliance_issues: string[]
    kyc_requirements: string[]
    accreditation_requirements: string[]
  }
}
```

## 🔧 Usage Examples

### Basic Investor Creation
```typescript
import { InvestorService } from '@/services/investors'

const investorService = new InvestorService()

// Create an individual investor
const result = await investorService.createInvestor({
  name: "John Smith",
  email: "john.smith@example.com",
  type: "individual",
  investor_type: "individual",
  tax_residency: "US",
  profile_data: {
    phone: "+1-555-0123",
    nationality: "US",
    residence_country: "US",
    date_of_birth: "1985-03-15",
    annual_income: 150000,
    net_worth: 500000,
    employment_status: "employed"
  },
  risk_assessment: {
    risk_tolerance: "moderate",
    investment_experience: "moderate"
  }
})

if (result.success) {
  console.log('Investor created:', result.data.investor.investor_id)
  console.log('KYC required:', result.data.compliance_status.kyc_required)
  console.log('Completion:', result.data.validation.completion_percentage + '%')
}
```

### Advanced Filtering
```typescript
// Get all active accredited investors with recent activity
const accreditedInvestors = await investorService.getInvestors({
  investor_status: ['active'],
  accreditation_status: ['approved'],
  investment_amount_min: 25000,
  include_statistics: true,
  sort_by: 'last_investment_date',
  sort_order: 'desc',
  limit: 50
})

accreditedInvestors.data.forEach(investor => {
  console.log(`${investor.name}: $${investor.statistics?.total_invested} invested`)
})
```

### Bulk Operations
```typescript
// Update multiple investors' KYC status
await investorService.bulkUpdateInvestors({
  investor_ids: ['uuid1', 'uuid2', 'uuid3'],
  updates: {
    kyc_status: 'approved',
    kyc_expiry_date: new Date('2025-12-31'),
    last_compliance_check: new Date()
  },
  options: {
    validate_before_update: true,
    create_audit_log: true,
    notify_investors: true
  }
})
```

### Analytics Integration
```typescript
import { InvestorAnalyticsService } from '@/services/investors'

const analyticsService = new InvestorAnalyticsService()

// Get comprehensive analytics
const analytics = await analyticsService.getInvestorAnalytics(investorId)
if (analytics.success) {
  console.log('Portfolio performance:', analytics.data.summary.portfolio_performance)
  console.log('ROI:', analytics.data.summary.roi_percentage + '%')
  console.log('Risk score:', analytics.data.risk_profile.risk_score)
}

// Export investor data
const exportResult = await analyticsService.exportInvestors({
  format: 'excel',
  fields: ['name', 'email', 'investor_type', 'kyc_status', 'total_invested'],
  includeStatistics: true,
  includeCompliance: true,
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
})
```

## 🛡️ Validation System

### Investor Type Validation
Each investor type has specific mandatory fields and business rules:

```typescript
// Individual Investors
{
  mandatoryFields: [
    'name', 'email', 'type', 'profile_data.nationality',
    'profile_data.residence_country', 'profile_data.date_of_birth'
  ],
  validationRules: [
    {
      field: 'profile_data.date_of_birth',
      rule: 'custom',
      message: 'Investor must be at least 18 years old',
      condition: (data) => calculateAge(data.profile_data.date_of_birth) >= 18
    }
  ]
}

// Corporate Investors
{
  mandatoryFields: [
    'name', 'email', 'type', 'company',
    'profile_data.registration_number'
  ],
  validationRules: [
    {
      field: 'company',
      rule: 'required',
      message: 'Company name is required for corporate investors'
    }
  ]
}
```

### Status Transition Validation
```typescript
// Valid KYC status transitions
const validKycTransitions = {
  'not_started': ['pending'],
  'pending': ['approved', 'failed', 'not_started'],
  'approved': ['expired', 'pending'], // Can re-verify
  'failed': ['pending', 'not_started'],
  'expired': ['pending', 'not_started']
}

// Valid investor status transitions
const validStatusTransitions = {
  'pending': ['active', 'rejected'],
  'active': ['inactive', 'suspended'],
  'inactive': ['active', 'suspended'],
  'suspended': ['active', 'inactive'],
  'rejected': ['pending'] // Can reapply
}
```

### Compliance Validation
```typescript
// Accreditation requirements
function isAccreditationRequired(investor: Investor): boolean {
  // Institutional investors always require accreditation
  if (['institutional', 'fund'].includes(investor.investor_type)) {
    return true
  }
  
  // Individual accreditation thresholds (US standards)
  if (investor.profile_data) {
    const netWorth = investor.profile_data.net_worth || 0
    const annualIncome = investor.profile_data.annual_income || 0
    return netWorth > 1000000 || annualIncome > 200000
  }
  
  return false
}
```

## 📊 Statistics & Metrics

### Computed Fields
Each investor automatically gets enhanced with:
- **completion_percentage** - Based on mandatory fields for investor type
- **compliance_score** - Computed compliance rating (0-100)
- **total_investments** - Number of investments made
- **active_projects** - Number of active project investments
- **portfolio_value** - Current portfolio value
- **risk_score** - Investment risk assessment score

### Real-time Statistics
```typescript
interface InvestorStatistics {
  total_invested: number           // Total amount invested
  number_of_investments: number    // Count of investments
  active_projects: number          // Active project investments
  completed_projects: number       // Completed project investments
  average_investment_size: number  // Average per investment
  portfolio_value: number          // Current portfolio value
  kyc_compliance_rate: number      // Compliance percentage
  accreditation_status_current: boolean // Current accreditation status
  first_investment_date?: Date     // First investment date
  last_investment_date?: Date      // Most recent investment
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
- **KYC Management** - Complete KYC lifecycle tracking
- **Accreditation Tracking** - Investor accreditation requirements
- **Document Management** - KYC document storage and verification
- **Compliance Scoring** - Automated compliance assessment
- **Regulatory Reporting** - Export capabilities for regulatory compliance
- **Data Privacy** - GDPR and privacy regulation compliance

### KYC & Accreditation Workflow
```typescript
// KYC Status Flow
not_started → pending → approved/failed
approved → expired (time-based)
failed/expired → pending (re-verification)

// Accreditation Status Flow
not_started → pending → approved/rejected
approved → expired (time-based)
rejected/expired → pending (re-application)
```

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
The service is designed to seamlessly integrate with frontend investor management components:

```typescript
// Frontend compatibility
import { mapDbInvestorToInvestor } from '@/utils/shared/formatting/typeMappers'

// Backend provides the same data structure expected by frontend
const enhancedInvestor = await this.enhanceInvestorWithStats(investor)
```

### Database Integration
- **Prisma ORM** - Type-safe database access
- **Supabase PostgreSQL** - Production-ready database
- **Foreign Key Relationships** - Proper referential integrity
- **Transaction Support** - ACID compliance for critical operations

### Related Services Integration
- **Cap Table Service** - Investment tracking and portfolio management
- **Project Service** - Investment opportunity management
- **Compliance Service** - Regulatory compliance tracking
- **Document Service** - KYC document management

## 🚀 Deployment

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...

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

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 📈 Future Enhancements

### Planned Features
- **Real-time Notifications** - Investor status change notifications
- **Advanced Risk Modeling** - ML-powered risk assessment
- **Document OCR** - Automated document processing
- **Compliance Automation** - Automated compliance checks
- **Integration APIs** - Third-party KYC/AML service integration
- **Mobile SDK** - React Native SDK for mobile apps

### Performance Improvements
- **Redis Caching** - Advanced caching layer
- **ElasticSearch** - Full-text search capabilities
- **Event Streaming** - Real-time event processing
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

**Chain Capital Backend Investor Management Service** - Building the future of investor relations and compliance 🚀
