# Hardcoded Data Removal Plan - Climate Receivables Services
**Date:** September 15, 2025  
**Priority:** CRITICAL - Remove all hardcoded fallback data, mock data, and conservative estimations  

## 📋 Requirements Checklist

- [x] **Identified**: 12+ service files with extensive hardcoded data patterns
- [x] **Database Analysis**: Confirmed proper tables exist but are empty (causing fallbacks)  
- [ ] **Implementation**: Remove hardcoded values, populate database tables with real data
- [ ] **Verification**: Ensure all services use database/API data instead of hardcoded fallbacks
- [ ] **Testing**: Verify no build-blocking errors, proper data flow

## 🗂️ Target Service Files & Issues

### 1. **freeMarketDataService.ts** (CRITICAL)
**Hardcoded Issues:**
- `getFallbackTreasuryRates()` → hardcoded rates: 1.25%, 1.55%, 1.85%, etc.
- `getFallbackCreditSpreads()` → static spreads: 150, 400, 100, 180 basis points  
- `getFallbackEnergyData()` → fixed values: $35/MWh, 100 index, 25 carbon price
- Multiple `generateHistorical...()` methods creating synthetic data

**Solution:** 
- Use `external_api_cache` and `climate_market_data_cache` tables
- Remove all fallback methods, force API calls or database lookups
- Populate missing data through initial API calls

### 2. **enhancedCashFlowForecastingService.ts** (CRITICAL)  
**Hardcoded Issues:**
- `ENHANCED_SEASONAL_FACTORS` → artificial monthly multipliers (0.82, 0.88, 1.06, etc.)
- `DEFAULT_PARAMETERS` → hardcoded growth rates, weights (0.015, 0.20, 0.12)
- `generateEnhancedDefaultHistoricalData()` → creates fake 12-month patterns

**Solution:**
- Use `climate_cash_flow_projections` table for historical data
- Create database-driven parameter configuration system
- Replace hardcoded seasonal factors with data-driven calculations

### 3. **enhancedRiskCalculationEngine.ts** (HIGH)
**Hardcoded Issues:**
- `RISK_WEIGHTS` → hardcoded weights (0.35, 0.25, 0.20, 0.10, 0.10)
- `PRODUCTION_VARIANCE_THRESHOLDS` → hardcoded thresholds (0.1, 0.25, 0.50)
- Conservative estimates: "return 60 + weatherRisk" hardcoded risk score

**Solution:**
- Use `climate_risk_factors` table for configurable risk weights
- Replace hardcoded thresholds with database-driven configuration
- Remove all hardcoded risk score returns

### 4. **payerRiskAssessmentService.ts** (EXTENSIVE)
**Hardcoded Issues:**
- `CREDIT_RATING_MATRIX` → massive hardcoded S&P ratings data (AAA to D)
- Conservative assessments: "return 85" for unknown ratings
- Hardcoded adjustment multipliers (0.2) and ranges (-5 to +10 points)

**Solution:**
- Create `credit_rating_configurations` table for dynamic rating data
- Replace hardcoded matrix with database-driven credit rating system
- Remove all arbitrary return values

## 🛠️ Implementation Phases

### Phase 1: Database Schema Enhancement (30 min)
1. Verify existing tables can store required data
2. Create missing configuration tables if needed
3. Add indexes for performance

### Phase 2: Service Layer Cleanup (2 hours)  
1. **freeMarketDataService.ts**: Remove fallback methods, enhance API integration
2. **enhancedCashFlowForecastingService.ts**: Remove hardcoded seasonal factors and parameters
3. **enhancedRiskCalculationEngine.ts**: Replace hardcoded weights and thresholds
4. **payerRiskAssessmentService.ts**: Remove massive credit rating matrix

### Phase 3: Data Population (1 hour)
1. Populate `climate_market_data_cache` with initial API data
2. Configure `climate_risk_factors` with proper risk weights
3. Setup `climate_cash_flow_projections` with historical data
4. Initialize credit rating configurations

### Phase 4: Verification & Testing (30 min)
1. TypeScript compilation verification
2. Service integration testing  
3. Ensure no build-blocking errors
4. Document changes and create README

## 📊 Success Metrics

- ✅ **Zero hardcoded fallback methods** in all 12+ service files
- ✅ **Database-driven configuration** for all risk factors, seasonal adjustments, credit ratings
- ✅ **API-first approach** with proper caching, no synthetic data generation  
- ✅ **Build-blocking errors**: ZERO
- ✅ **Performance**: No degradation, improved cacheability

## 🚨 Critical Guidelines

- **NO hardcoded values** - every number must come from database or API
- **NO synthetic data generation** - use real historical data or explicit user configuration
- **NO conservative estimates** - force proper data sources or graceful degradation
- **Follow project conventions**: snake_case database, camelCase TypeScript, proper error handling

## 📁 Files to Modify

1. `/frontend/src/services/climateReceivables/freeMarketDataService.ts`
2. `/frontend/src/services/climateReceivables/enhancedCashFlowForecastingService.ts`  
3. `/frontend/src/services/climateReceivables/enhancedRiskCalculationEngine.ts`
4. `/frontend/src/services/climateReceivables/payerRiskAssessmentService.ts`
5. Additional services: `production-variability-analytics-service.ts`, `simplifiedValuationService.ts`, `userDataSourceService.ts`

## 📋 Quality Assurance

- [ ] Remove every `getFallback*()` method
- [ ] Remove every hardcoded constant object (`CREDIT_RATING_MATRIX`, `ENHANCED_SEASONAL_FACTORS`, etc.)
- [ ] Remove every `return [hardcoded_number]` statement
- [ ] Replace with database queries or API calls
- [ ] Add proper error handling for missing data
- [ ] Maintain TypeScript compilation
- [ ] Update imports and exports as needed

---

**Estimated Timeline:** 4 hours total  
**Priority:** CRITICAL - Blocking user's clean data preference  
**Status:** Ready to begin implementation
