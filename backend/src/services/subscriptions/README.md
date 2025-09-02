# Subscription Management Backend Service

## Overview

The Subscription Management Service provides comprehensive backend functionality for managing investment subscriptions and redemption requests. Built on the BaseService + Fastify + Prisma architecture, it offers robust CRUD operations, advanced analytics, validation, and compliance features.

## 🏗️ Architecture

### Service Structure
```
backend/src/services/subscriptions/
├── SubscriptionService.ts           # Main CRUD operations & business logic
├── SubscriptionValidationService.ts # Validation & business rules
├── SubscriptionAnalyticsService.ts  # Analytics & reporting  
├── RedemptionService.ts             # Redemption processing & approvals
├── index.ts                         # Service exports
└── README.md                        # This documentation
```

### API Routes
```
backend/src/routes/
└── subscriptions.ts                 # REST API endpoints
```

### Type Definitions
```
backend/src/types/
└── subscriptions.ts                 # Comprehensive TypeScript interfaces
```

Built with **BaseService + Fastify + Prisma** following Chain Capital's established patterns.

## 🚀 Features

### ✅ Investment Subscription Management
- **Full CRUD Operations** - Create, read, update, delete subscriptions
- **Workflow Management** - Complete subscription lifecycle from creation to distribution
- **Compliance Integration** - KYC/AML validation and investor verification
- **Multi-Currency Support** - USD, EUR, GBP, JPY, AUD, CAD, CHF, SGD, HKD, CNY
- **Payment Method Tracking** - Wire transfer, credit card, crypto, ACH, check
- **Status Management** - Pending → Confirmed → Allocated → Distributed workflow

### ✅ Redemption Request Processing
- **Redemption Types** - Full, partial, dividend, liquidation redemptions
- **Approval Workflows** - Multi-approver support with digital signatures
- **Wallet Verification** - Source and destination wallet validation
- **Redemption Windows** - Time-based redemption periods with capacity limits
- **Risk Assessment** - Automated risk scoring and additional checks
- **Status Tracking** - Complete status lifecycle with transition validation

### ✅ Advanced Validation System
- **Business Rule Enforcement** - Investment limits, accreditation requirements
- **Compliance Checking** - KYC/AML validation, regulatory requirements
- **Data Validation** - Field validation, format checking, business logic
- **Status Transition Validation** - Ensure valid workflow transitions
- **Risk Scoring** - Automated risk assessment for subscriptions and redemptions

### ✅ Comprehensive Analytics
- **Subscription Analytics** - Trends, demographics, currency breakdown
- **Redemption Analytics** - Approval rates, processing times, rejection analysis
- **Performance Metrics** - Completion rates, average processing times
- **Export Capabilities** - CSV, Excel, PDF, JSON formats
- **Time-based Analysis** - Monthly, quarterly, yearly trend analysis

## 📚 API Endpoints

### Base URL: `/api/v1/subscriptions`

#### Core Subscription Operations (7 endpoints)
- `GET /subscriptions` - List subscriptions with filtering & pagination
- `POST /subscriptions` - Create new subscription with validation
- `GET /subscriptions/:id` - Get subscription details with relations
- `PUT /subscriptions/:id` - Update subscription with validation
- `DELETE /subscriptions/:id` - Delete subscription with safety checks
- `GET /subscriptions/:id/statistics` - Get detailed subscription statistics
- `POST /subscriptions/validate` - Validate subscription before creation

#### Subscription Analytics (2 endpoints)
- `GET /subscriptions/analytics` - Get comprehensive analytics with trends
- `POST /subscriptions/export` - Export subscription data in various formats

#### Redemption Operations (8 endpoints)
- `GET /redemptions` - List redemption requests with filtering
- `POST /redemptions` - Create new redemption request
- `GET /redemptions/:id` - Get redemption details with approvals
- `PUT /redemptions/:id` - Update redemption request
- `POST /redemptions/approvals` - Process approval/rejection
- `GET /redemptions/windows/active` - Get active redemption windows
- `POST /redemptions/check-eligibility` - Check redemption eligibility
- `POST /redemptions/validate` - Validate redemption request

**Total: 17+ REST endpoints with full OpenAPI/Swagger documentation**

## 🗄️ Database Integration

### Supported Tables
- ✅ `subscriptions` - Investment subscription records
- ✅ `redemption_requests` - Redemption request records  
- ✅ `redemption_approver_assignments` - Approval workflow assignments
- ✅ `redemption_windows` - Time-based redemption periods
- ✅ `active_redemption_windows` - Currently active windows
- ✅ `distribution_redemptions` - Distribution tracking
- ✅ `redemption_settlements` - Settlement records

### Entity Types Supported
- ✅ Investment subscriptions (11 database fields)
- ✅ Redemption requests (18 database fields)
- ✅ Approval workflows (12 database fields)
- ✅ Redemption windows (24 database fields)

## 🔐 Security Features

### Input Validation
- ✅ **Comprehensive Field Validation** - All input fields validated
- ✅ **Business Rule Enforcement** - Investment limits and compliance rules
- ✅ **SQL Injection Protection** - Prisma ORM automatic protection
- ✅ **Wallet Address Validation** - Ethereum and Bitcoin address formats
- ✅ **Currency and Amount Validation** - Supported currencies and positive amounts

### Access Control
- ✅ **JWT Authentication** - Secure API access
- ✅ **Role-Based Permissions** - Different access levels for operations
- ✅ **Audit Logging** - Complete action audit trail
- ✅ **Rate Limiting** - API endpoint protection

## ⚡ Performance Features

### Database Optimization
- ✅ **Prisma ORM** - Type-safe, optimized database queries
- ✅ **Efficient Pagination** - Large dataset handling
- ✅ **Selective Loading** - Include only needed relations
- ✅ **Connection Pooling** - Database connection optimization
- ✅ **Transaction Support** - Multi-operation consistency

### API Performance
- ✅ **Structured Responses** - Consistent API response format
- ✅ **Error Handling** - Graceful error handling with proper HTTP codes
- ✅ **Early Validation** - Prevent unnecessary processing
- ✅ **Batch Operations** - Efficient bulk operations

## 💡 Usage Examples

### Create Investment Subscription
```typescript
import { SubscriptionService } from '@/services/subscriptions'

const subscriptionService = new SubscriptionService()

const result = await subscriptionService.createSubscription({
  investor_id: "inv_123",
  project_id: "proj_456", 
  fiat_amount: 50000,
  currency: "USD",
  payment_method: "wire_transfer",
  auto_allocate: false,
  compliance_check: true
})

if (result.success) {
  console.log('Subscription created:', result.data.subscription.id)
  console.log('Compliance status:', result.data.compliance_status.overall_status)
  console.log('Next steps:', result.data.next_steps)
}
```

### Process Redemption Request
```typescript
import { RedemptionService } from '@/services/subscriptions'

const redemptionService = new RedemptionService()

const result = await redemptionService.createRedemptionRequest({
  token_amount: 1000,
  token_type: "EQUITY_TOKEN",
  redemption_type: "partial",
  source_wallet_address: "0x742d35Cc6634C0532925a3b8D9C",
  destination_wallet_address: "0x8ba1f109551bD432803012645Hac",
  investor_id: "inv_123",
  required_approvals: 2
})

if (result.success) {
  console.log('Redemption created:', result.data.redemption.id)
  console.log('Assigned approvers:', result.data.assigned_approvers)
  console.log('Estimated completion:', result.data.estimated_completion)
}
```

### Get Analytics
```typescript
import { SubscriptionAnalyticsService } from '@/services/subscriptions'

const analyticsService = new SubscriptionAnalyticsService()

const result = await analyticsService.getSubscriptionAnalytics(
  { project_id: "proj_456" },
  'quarter'
)

if (result.success) {
  console.log('Total raised:', result.data.summary.total_amount)
  console.log('Completion rate:', result.data.summary.completion_rate)
  console.log('Monthly trends:', result.data.trends.monthly_subscriptions)
}
```

### Validate Before Creating
```typescript
import { SubscriptionValidationService } from '@/services/subscriptions'

const validationService = new SubscriptionValidationService()

const result = await validationService.validateSubscriptionCreate({
  investor_id: "inv_123",
  fiat_amount: 25000,
  currency: "USD"
})

if (result.success) {
  const validation = result.data
  console.log('Valid:', validation.is_valid)
  console.log('Risk score:', validation.risk_score)
  console.log('Required approvals:', validation.required_approvals)
  console.log('Blocking issues:', validation.blocking_issues)
}
```

## 🧪 Testing

### Running Tests
```bash
# Install dependencies
npm install

# Run subscription service tests
npm run test:subscriptions

# Type checking
npm run type-check

# Build verification
npm run build
```

### Test Coverage
- ✅ Service method validation
- ✅ Database connectivity  
- ✅ Business rule enforcement
- ✅ API endpoint functionality
- ✅ Error handling scenarios

## 🔗 Integration Points

### Frontend Integration
- ✅ **Type Safety** - Shared TypeScript types for frontend integration
- ✅ **API Compatibility** - Compatible with existing subscription components
- ✅ **Response Format** - Frontend-compatible data structures
- ✅ **Error Handling** - Consistent error response format

### Backend Integration
- ✅ **Investor Service** - Investor validation and compliance checking
- ✅ **Project Service** - Project validation and investment limits
- ✅ **Document Service** - KYC document requirements integration
- ✅ **Cap Table Service** - Allocation and distribution integration

## 🚀 Deployment

### Environment Configuration
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# Server
PORT=3001
NODE_ENV=production
ENABLE_SWAGGER=true
```

### Health Monitoring
- ✅ `GET /health` - Service health check
- ✅ `GET /ready` - Database connectivity check
- ✅ Service-specific health metrics

### Production Commands
```bash
# Start production server
npm start

# Health check
curl http://localhost:3001/health

# API documentation
curl http://localhost:3001/docs
```

## 📈 Performance Metrics

### Supported Scale
- **Subscriptions**: 100,000+ records with efficient pagination
- **Redemptions**: 50,000+ requests with approval workflow management
- **Analytics**: Real-time calculations across large datasets
- **Export**: Multi-format export for compliance reporting

### Response Times (Target)
- Simple queries: < 100ms
- Complex analytics: < 500ms
- Data export: < 2s for standard datasets
- Bulk operations: < 5s for 100 records

## 🔮 Future Enhancements

### Planned Features
- **Blockchain Integration** - Direct token balance verification
- **Real-time Notifications** - WebSocket integration for status updates
- **Advanced OCR** - Automatic document processing for compliance
- **ML Risk Scoring** - AI-powered risk assessment
- **Multi-Chain Support** - Support for multiple blockchain networks

### Integration Opportunities
- **Payment Processors** - Direct integration with MoonPay, Stripe, Ramp
- **KYC Providers** - Third-party KYC service integration
- **Audit Systems** - Enhanced compliance and regulatory reporting
- **Portfolio Management** - Advanced portfolio analytics and rebalancing

## 📞 Support

### Development Support
- **Service Location**: `/backend/src/services/subscriptions/`
- **API Routes**: `/backend/src/routes/subscriptions.ts`
- **Type Definitions**: `/backend/src/types/subscriptions.ts`
- **Documentation**: This README file

### Integration Support
- **Frontend Components**: Service provides exact data structure expected
- **API Documentation**: Available via Swagger UI at `/docs`
- **Type Safety**: Complete TypeScript type coverage
- **Error Handling**: Comprehensive error codes and messages

---

**Status**: ✅ **PRODUCTION READY**

**Achievement**: Complete subscription and redemption management system with comprehensive validation, analytics, and approval workflows.

Built with ❤️ for Chain Capital's institutional tokenization platform.
