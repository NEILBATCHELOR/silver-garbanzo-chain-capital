# NAV Implementation Plan - Consolidated

**Version:** v3.0 (Consolidated Plan)  
**Status:** Active Implementation  
**Last Updated:** 2025-01-09  
**Current Phase:** Phase 5 (Calculator Foundation)  

## Executive Summary

This consolidated plan merges the structured implementation approach of Plan 2 with the comprehensive coverage of Plan 1, ensuring both practical execution and complete feature coverage for enterprise NAV calculation capabilities.

**Key Principles:**
- Follow Plan 2's streamlined sequential phases for clear progress tracking
- Incorporate Plan 1's comprehensive asset calculator strategies (15+ types vs 7)
- Add Plan 1's observability, risk controls, and detailed frontend specifications
- Maintain Plan 2's specific acceptance criteria and dependency management

## Implementation Status

**COMPLETED PHASES:**
- ✅ Phase 0: Baseline verification, migrations, and environment readiness
- ✅ Phase 0.1: Package dependencies installation (backend)
- ✅ Phase 1: Product type normalization utilities 
- ✅ Phase 2: Fastify API routes foundation (6 core endpoints)
- ✅ Phase 3: Basic NAV service orchestration
- ✅ Phase 4: Infrastructure and service factory patterns

**CURRENT PHASE:** Phase 5 - Calculator Foundation and Registry

## Phase 5 - Asset Calculator Foundation and Registry (Current Focus)

### Objectives
- Create abstract calculator interface with comprehensive coverage
- Implement calculator registry for dynamic resolution
- Establish foundation for 15+ asset types (expanded from Plan 2's 7)
- Add provider strategy pattern for market data (from Plan 1)
- Include risk controls in calculator interfaces

### Deliverables

#### 1. BaseCalculator Abstract Class
```typescript
// backend/src/services/nav/calculators/BaseCalculator.ts
abstract class BaseCalculator implements AssetNavCalculator {
  // Common calculation helpers
  // FX conversion utilities
  // Decimal math precision handling
  // Risk control validations
  // Observability hooks
}
```

#### 2. Calculator Registry
```typescript
// backend/src/services/nav/calculators/CalculatorRegistry.ts
class CalculatorRegistry {
  // Dynamic calculator resolution by asset type
  // Fallback strategies for unsupported types
  // Calculator health checks
  // Performance monitoring
}
```

#### 3. Enhanced Calculator Coverage (15+ Types)
Expand from Plan 2's 7 calculators to Plan 1's comprehensive coverage:

**Priority Calculators (MVP - Plan 2):**
- MmfCalculator.ts - Money Market Funds
- BondCalculator.ts - Fixed Income Securities
- EquityCalculator.ts - Stock Holdings
- CommoditiesCalculator.ts - Physical Commodities
- StablecoinFiatCalculator.ts - Fiat-backed Stablecoins
- StablecoinCryptoCalculator.ts - Crypto-backed Stablecoins
- AssetBackedCalculator.ts - Asset-backed Securities

**Extended Calculators (Plan 1 Additions):**
- CompositeFundCalculator.ts - Multi-asset Funds
- PrivateEquityCalculator.ts - PE Holdings
- PrivateDebtCalculator.ts - Private Credit
- RealEstateCalculator.ts - Property Holdings
- InfrastructureCalculator.ts - Infrastructure Assets
- StructuredProductCalculator.ts - Derivatives
- QuantitativeStrategiesCalculator.ts - Quant Funds
- EnergyCalculator.ts - Energy Assets
- CollectiblesCalculator.ts - Alternative Assets
- DigitalTokenizedFundCalculator.ts - Digital Funds
- ClimateReceivablesCalculator.ts - Climate Assets
- InvoiceReceivablesCalculator.ts - Invoice Finance

#### 4. Market Data Provider Architecture (Plan 1 Enhancement)
```typescript
// backend/src/services/nav/providers/MarketDataProvider.ts
interface MarketDataProvider {
  // Multiple provider strategy
  // Chainlink, CoinGecko, internal DB, manual override
  // Fallback cascading
  // Rate limiting and caching
}
```

### Technical Requirements

#### Risk Controls Integration (Plan 1)
- Input validation with asset-specific thresholds
- Calculation result validation
- Price staleness detection
- Outlier detection and alerts
- Dual-control for sensitive operations

#### Observability Hooks (Plan 1)
- Structured logging with context
- Performance metrics per calculator
- Error rate tracking
- Cache hit/miss ratios
- API latency monitoring

#### Financial Precision
- Decimal.js with 28 decimal places
- ROUND_HALF_UP consistency
- Currency conversion accuracy
- Rounding error minimization

### Acceptance Criteria

#### Calculator Foundation
- ✅ Registry resolves appropriate calculator for all 15+ asset types
- ✅ BaseCalculator provides common FX, decimal math, and validation utilities
- ✅ Risk controls prevent invalid calculations from propagating
- ✅ Observability hooks capture performance and error metrics
- ✅ Unit tests cover resolution logic and calculator interfaces

#### Calculator Implementation
- ✅ Each priority calculator (7) handles asset types correctly
- ✅ Proper decimal arithmetic throughout all calculations
- ✅ Integration with market data service providers
- ✅ Fallback strategies for missing data
- ✅ Comprehensive unit tests with realistic scenarios

#### Performance & Reliability
- ✅ Calculator resolution < 10ms average
- ✅ Calculation performance < 500ms for complex assets
- ✅ Circuit breaker for failing market data providers
- ✅ Graceful degradation when data sources unavailable

## Enhanced Future Phases (Plan 1 Additions)

### Phase 6A - Market Data Provider Architecture
**From Plan 1, Phase 4**
- Multi-provider strategy pattern
- Chainlink, CoinGecko, DEX oracles, internal DB
- Provider health checks and automatic failover
- Rate limiting and cost optimization

### Phase 10A - Observability and Metrics  
**From Plan 1, Phase 22**
- Structured logging with asset_id, run_id context
- Metrics: calculation durations, validation failure rates
- Alert thresholds for missing prices and validation failures
- Dashboard for operational monitoring

### Phase 11A - Risk Controls and Safeguards
**From Plan 1, Appendix C**
- Dry-run mode for calculations
- Dual-control for approve→publish transitions
- Threshold-based blocks (>5% daily NAV move requires 2 approvals)
- Full traceability with inputs_json and pricing sources

### Phase 13A - Enhanced Frontend Components
**From Plan 1, Phases 14-18**
- Asset-specific calculator UI panels
- Historical NAV tracking with time-series visualization
- Detailed validation panel with rule breakdown
- Enhanced approval workflow with audit timeline
- Redemption rate interface with trend analysis

## Quality Gates (Enhanced)

### Definition of Done (Each Phase)
- ✅ TypeScript compilation passes (`pnpm type-check`)
- ✅ ESLint warnings resolved (`pnpm lint`)
- ✅ Unit tests written and passing (>80% coverage target)
- ✅ Integration tests cover happy path scenarios
- ✅ Error scenarios properly handled with appropriate HTTP codes
- ✅ Observability logging implemented
- ✅ Risk controls validated
- ✅ Documentation updated with examples
- ✅ Code review completed with security focus

### Financial Calculation Validation
- ✅ Decimal precision maintained throughout calculations
- ✅ Currency conversion accuracy verified
- ✅ Rounding consistency across all operations
- ✅ Edge cases handled (zero values, very large/small numbers)
- ✅ Historical calculation results can be reproduced

## Architecture Decisions

### Plan 2 Strengths (Retained)
1. **Sequential Implementation**: Clear dependencies between phases
2. **Specific Acceptance Criteria**: Measurable success metrics
3. **Practical MVP Approach**: Early feedback opportunities
4. **Explicit Dependencies**: Clear package requirements

### Plan 1 Enhancements (Added)
1. **Comprehensive Asset Coverage**: 15+ calculator types
2. **Production Readiness**: Observability and monitoring
3. **Risk Management**: Financial controls and safeguards
4. **User Experience**: Detailed frontend specifications
5. **Data Architecture**: Market data provider patterns

## Risk Mitigation

### Technical Risks
- **Decimal Precision**: Strict Decimal.js usage with validation
- **Data Quality**: Multiple provider fallbacks with validation
- **Performance**: Caching strategies and optimization
- **Security**: Input sanitization and authorization checks

### Business Risks
- **Calculation Accuracy**: Multi-layer validation and dual-control
- **Regulatory Compliance**: SEC Rule 2a-7 for MMFs, audit trails
- **Operational Risk**: Comprehensive monitoring and alerting
- **Data Recovery**: Backup strategies and data retention

## Success Metrics

### Phase 5 Success Criteria
- All 15+ asset types supported with appropriate calculators
- Calculator resolution and execution performance within SLAs
- Risk controls prevent invalid calculations in 100% of test cases
- Observability provides clear insight into calculation health
- Code coverage >80% with comprehensive test scenarios

### Overall Project Success
- End-to-end NAV calculations for all supported asset types
- Production-ready monitoring and alerting
- Comprehensive risk controls and audit capabilities
- User-friendly interfaces for NAV management
- Full regulatory compliance and audit trail

## Next Steps

**Immediate Actions (Phase 5 Implementation):**
1. Create BaseCalculator abstract class with common utilities
2. Implement CalculatorRegistry with dynamic resolution
3. Create first 3 priority calculators (MMF, Bond, Equity)
4. Add market data provider foundation
5. Implement basic risk controls and validation

**Phase 5 Timeline:** 3-5 days (Days 6-10 of implementation)

This consolidated approach ensures we maintain the practical execution strategy of Plan 2 while incorporating the comprehensive features and production-readiness elements from Plan 1.
