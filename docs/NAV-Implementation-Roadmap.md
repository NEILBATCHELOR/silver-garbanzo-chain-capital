# NAV Module Implementation Roadmap

**Status:** Updated 2025-01-09  
**Target:** Production-ready NAV engine with enterprise compliance

## Phase Status Summary

| Phase | Component | Status | Priority | Effort | Dependencies |
|-------|-----------|--------|----------|--------|--------------|
| 0 | Database Schema | ✅ Complete | - | - | - |
| 0.1 | Dependencies | ✅ Complete | - | - | - |
| 1 | TypeScript Types | ✅ Complete | - | - | - |
| 2 | API Routes | ❌ Not Started | P0 | 2-3 days | Phase 3 |
| 3 | Product Type Utils | ❌ Not Started | P0 | 1 day | Types |
| 4 | Basic NAV Service | ❌ Not Started | P0 | 2-3 days | Phase 3 |
| 5 | Calculator Foundation | ✅ Complete | P0 | 1-2 days | Phase 4 |
| 6 | Asset Calculators | ❌ Not Started | P0 | 3-5 days | Phase 5 |
| 7 | Market Data Oracle | ❌ Not Started | P0 | 2-3 days | API keys |
| 8 | Validation Service | ❌ Not Started | P1 | 2-3 days | Phase 6 |
| 9 | Approval Workflow | ❌ Not Started | P1 | 2-3 days | Phase 8 |
| 10 | FX Rate Service | ❌ Not Started | P1 | 1-2 days | Market Data |
| 11 | Redemption Service | ❌ Not Started | P1 | 2 days | Phase 4 |
| 12 | Scheduled Jobs | ❌ Not Started | P1 | 1-2 days | All Services |
| 13 | Frontend Dashboard | ❌ Not Started | P2 | 5-7 days | API Routes |
| 14 | Swagger Docs | ❌ Not Started | P1 | 1 day | API Routes |
| 15 | Testing Suite | ❌ Not Started | P1 | 3-4 days | Services |
| 16 | Performance Tuning | ❌ Not Started | P2 | 2-3 days | Full System |
| 17 | Security & RBAC | ❌ Not Started | P1 | 2 days | Services |
| 18 | Documentation | ❌ Not Started | P2 | 2-3 days | All Features |
| 19 | Final QA | ❌ Not Started | P2 | 2-3 days | Complete System |

## P0 Implementation Plan (MVP - Week 1-2)

### Phase 3: Product Type Utilities (Day 1)
**Goal:** Normalize asset types to database table names

```bash
# Create utility functions
touch backend/src/services/nav/utils/productType.ts
touch backend/src/services/nav/utils/index.ts
```

**Deliverables:**
- `productTypeToTableName(productType: string): string | null`
- `assetTypeToProductType(assetType: AssetType): string`
- Unit tests for all mappings

**Acceptance:**
- ✅ All AssetType enums map to correct database tables
- ✅ 100% test coverage for utility functions
- ✅ TypeScript compilation passes

### Phase 4: Basic NAV Service (Day 2-3)
**Goal:** Core NAV calculation orchestration

```bash
touch backend/src/services/nav/NavService.ts
```

**Deliverables:**
- Basic NAV calculation: `(Total Assets - Total Liabilities) / Outstanding Shares`
- CRUD operations for `nav_calculation_runs`
- Integration with `asset_nav_data` table
- Error handling and logging

**Acceptance:**
- ✅ Can create NAV calculation runs
- ✅ Can persist results to database
- ✅ Handles decimal precision correctly
- ✅ Comprehensive error handling

### Phase 2: API Routes Foundation (Day 4-5)
**Goal:** Essential HTTP endpoints for NAV operations

```bash
touch backend/src/routes/nav.ts
```

**Core Endpoints (MVP):**
```typescript
GET    /nav/current?assetId=:id                    // Current NAV lookup
POST   /nav/runs                                   // Create calculation run  
GET    /nav/runs/:runId                           // Get run details
GET    /nav/runs                                  // List runs with filters
PATCH  /nav/runs/:runId                           // Update run status
GET    /nav/projects/:projectId/weighted          // Project weighted NAV
```

**Acceptance:**
- ✅ All routes registered with TypeBox schemas
- ✅ Request/response validation working
- ✅ Error handling with proper HTTP codes
- ✅ Basic authentication middleware
- ✅ Swagger documentation generated

### Phase 5: Calculator Foundation (Day 6)
**Goal:** Abstract calculator interface and registry

```bash
mkdir backend/src/services/nav/calculators
touch backend/src/services/nav/calculators/BaseCalculator.ts
touch backend/src/services/nav/calculators/CalculatorRegistry.ts
touch backend/src/services/nav/calculators/index.ts
```

**Deliverables:**
- `BaseCalculator` abstract class
- `CalculatorRegistry` for dynamic resolution
- Helper methods for FX conversion and Decimal math

**Acceptance:**
- ✅ Registry can resolve calculators by asset type
- ✅ Base calculator provides common functionality
- ✅ Clean separation of concerns

### Phase 6: Priority Asset Calculators (Day 7-9)
**Goal:** Implement calculators for core asset types

```bash
touch backend/src/services/nav/calculators/EquityCalculator.ts
touch backend/src/services/nav/calculators/BondCalculator.ts
touch backend/src/services/nav/calculators/StablecoinFiatCalculator.ts
```

**Implementation Priority:**
1. **EquityCalculator** - Simple price × quantity
2. **BondCalculator** - Mark-to-market with yield adjustment
3. **StablecoinFiatCalculator** - 1:1 peg validation

**Acceptance:**
- ✅ Each calculator handles its asset types correctly
- ✅ Proper decimal arithmetic throughout
- ✅ Integration with market data service
- ✅ Comprehensive unit tests

### Phase 7: Market Data Oracle (Day 10-11)
**Goal:** Price data integration with caching

```bash
touch backend/src/services/nav/MarketDataOracleService.ts
```

**Provider Priority:**
1. **CoinGecko** - Crypto and some equity data (free tier)
2. **Static fallback** - Manual price overrides
3. **Cache layer** - 5-minute TTL for price data

**Deliverables:**
- HTTP client with retry logic
- Price caching in `nav_price_cache` table
- Provider abstraction for future expansion

**Acceptance:**
- ✅ Can fetch prices for major cryptocurrencies
- ✅ Cache reduces API calls effectively  
- ✅ Graceful handling of API failures
- ✅ Rate limiting compliance

## P1 Implementation Plan (Core Features - Week 3-4)

### Phase 8: Validation Service
**Goal:** Business rule enforcement

**Rules to Implement:**
1. NAV_NON_NEGATIVE - NAV must be ≥ 0
2. NAV_JUMP_MAX_PCT - Daily change limits (±5% default, ±0.5% MMF)
3. LIABILITIES_NON_NEGATIVE - No negative liabilities
4. FX_RATE_PRESENT_WHEN_NEEDED - Multi-currency validation

**Acceptance:**
- ✅ Configurable validation rules
- ✅ Results stored in `nav_validation_results`
- ✅ Severity levels (info/warn/error) enforced
- ✅ Integration with approval workflow

### Phase 9: Approval Workflow
**Goal:** Submit → Validate → Approve → Publish cycle

**State Machine:**
```
draft → validated → approved → published
          ↓
       rejected
```

**Acceptance:**
- ✅ State transitions enforced
- ✅ Audit trail in `nav_approvals` table
- ✅ Role-based approval permissions
- ✅ Email/notification integration

### Phase 10: FX Rate Service
**Goal:** Multi-currency NAV calculations

**Features:**
- Historical rate lookup
- Batch rate insertion
- Integration with external FX APIs

### Phase 11: Redemption Service
**Goal:** Track redemption rates and impact

**Calculations:**
- Daily redemption rate
- 7-day/30-day rolling averages
- Impact on NAV calculations

## P2 Implementation Plan (Enhanced Features - Week 5-6)

### Phase 13: Frontend Dashboard
**Goal:** User interface for NAV management

**Pages:**
- `/nav` - Dashboard overview
- `/nav/runs/:id` - Run details with approval actions
- `/nav/analytics` - Charts and KPIs

**Components:**
- DataTable with filters
- ApprovalTimeline component
- ValidationResults display

### Phase 12: Scheduled Jobs
**Goal:** Automated daily operations

**Cron Jobs:**
- 00:15 UTC - Fetch FX rates
- 00:30 UTC - Refresh price cache
- 01:00 UTC - Calculate NAV for active funds

### Phase 15: Testing Suite
**Goal:** Comprehensive test coverage

**Test Categories:**
- Unit tests - All service methods
- Integration tests - API endpoints
- Contract tests - Database operations
- E2E tests - Complete workflows

**Target:** >80% code coverage

## Quality Gates

### Definition of Done (Each Phase)
- ✅ TypeScript compilation passes
- ✅ ESLint warnings resolved
- ✅ Unit tests written and passing
- ✅ Integration tests cover happy path
- ✅ Error scenarios handled
- ✅ Documentation updated
- ✅ Code review completed

### Milestone Acceptance Criteria

**MVP Milestone (End of P0):**
- ✅ Can calculate NAV for equity assets
- ✅ API returns valid NAV data
- ✅ Results persist to database correctly
- ✅ Basic validation prevents invalid calculations
- ✅ Swagger docs accessible

**Core Features Milestone (End of P1):**
- ✅ Multi-asset NAV calculations
- ✅ Approval workflow operational
- ✅ Scheduled daily calculations
- ✅ FX rate integration working
- ✅ Comprehensive validation rules

**Production Ready (End of P2):**
- ✅ Frontend dashboard operational
- ✅ Full test coverage achieved
- ✅ Performance benchmarks met
- ✅ Security audit completed
- ✅ Documentation complete

## Risk Mitigation

### Technical Risks
1. **Decimal Precision** - Use `decimal.js` consistently
2. **Race Conditions** - Database transactions for NAV updates
3. **API Rate Limits** - Implement exponential backoff
4. **Data Consistency** - Validation at multiple layers

### Business Risks
1. **Calculation Accuracy** - Multiple validation checkpoints
2. **Regulatory Compliance** - SEC Rule 2a-7 for MMFs
3. **Audit Trail** - Complete action logging
4. **Data Recovery** - Regular backup verification

## Resource Requirements

### Development Time
- **P0 (MVP):** 11-13 developer days
- **P1 (Core):** 9-11 developer days  
- **P2 (Enhanced):** 9-13 developer days
- **Total Estimate:** 29-37 developer days (6-8 weeks)

### Infrastructure
- Market data API subscriptions (CoinGecko Pro: $499/month)
- Redis instance for caching
- Monitoring/alerting service
- Backup strategy for critical NAV data

---

**Next Action:** Begin Phase 3 implementation with product type utilities to establish the foundation for NAV calculations.
