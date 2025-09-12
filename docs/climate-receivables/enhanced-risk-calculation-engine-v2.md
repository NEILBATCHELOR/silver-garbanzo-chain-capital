# Enhanced Risk Calculation Engine v2.0

## Overview

The Enhanced Risk Calculation Engine has been significantly upgraded to integrate with **free external APIs** and support **batch processing** as specified in the revised implementation plan. This service now provides real-time weather data integration, regulatory monitoring via Federal Register API, and comprehensive risk assessment without relying on paid APIs or mock data.

## ✅ **MAJOR ENHANCEMENTS COMPLETED**

### **1. Free Weather API Integration**
- **Integrated with `EnhancedFreeWeatherService`** 
- **Primary API**: Open-Meteo (free, no API key required)
- **Backup APIs**: NOAA Weather.gov, WeatherAPI.com free tier
- **Asset-specific weather risk calculations** for Solar, Wind, and Hydro assets

### **2. Federal Register API Integration** 
- **Real regulatory tracking** using free Federal Register API
- **No API key required** - completely free government data source
- **Automatic categorization** of regulatory impacts on renewable energy
- **30-day lookback** for recent policy changes

### **3. Batch Processing Support**
- **New `calculateBatchRisk()` method** for processing multiple receivables
- **Chunk-based processing** with rate limiting respect
- **Error handling** with partial success reporting
- **Progress tracking** and metadata reporting

### **4. Enhanced Production Risk Analysis**
- **Real weather data integration** for production variability assessment
- **Asset location-based** weather impact calculations
- **Historical trend analysis** with linear regression
- **Weather risk capping** at 30 points maximum

## **API Integration Details**

### **Weather Data Sources (Free)**
```typescript
// Primary: Open-Meteo API (free, no key)
const weatherData = await EnhancedFreeWeatherService.getCurrentWeather(latitude, longitude);

// Automatic fallback hierarchy:
// 1. Open-Meteo (10,000+ daily calls)
// 2. NOAA Weather.gov (US locations)
// 3. WeatherAPI.com (1M monthly calls)
```

### **Regulatory Data Source (Free)**
```typescript
// Federal Register API (free, no key)
const apiUrl = `https://www.federalregister.gov/api/v1/articles.json`;
const response = await fetch(apiUrl);

// Searches for renewable energy policy changes:
// - Investment Tax Credit updates
// - Production Tax Credit changes
// - Clean energy regulations
// - Solar/Wind specific policies
```

## **New Methods Added**

### **Batch Processing**
```typescript
// Process multiple receivables efficiently
const batchResult = await EnhancedRiskCalculationEngine.calculateBatchRisk(
  ['receivable-1', 'receivable-2', 'receivable-3'],
  true // includeRealTimeData
);
```

### **Weather Risk Assessment**
```typescript
// Asset-specific weather risk calculations
private static async calculateWeatherRisk(latitude, longitude, assetType): Promise<number>
private static calculateSolarWeatherRisk(weatherData, forecast): number
private static calculateWindWeatherRisk(weatherData, forecast): number
private static calculateHydroWeatherRisk(weatherData, forecast): number
```

### **Policy Impact Analysis**
```typescript
// Real-time regulatory monitoring
private static async fetchFederalRegisterData(): Promise<FederalRegisterResponse>
private static categorizeRegulation(title, abstract): string
private static assessRegulationImpact(title, abstract, type): 'low' | 'medium' | 'high'
private static estimateFinancialImpact(title, abstract): number
```

## **Enhanced Risk Factors**

### **Weather-Specific Risk Calculations**

#### **Solar Assets**
- **Cloud cover impact**: >70% cloud cover = +10 risk points
- **Sunlight hours**: <6 hours = +10 risk points  
- **Precipitation**: >10mm = +5 risk points
- **7-day forecast analysis** for trend assessment

#### **Wind Assets**
- **Wind speed optimization**: 3-25 m/s optimal range
- **Too little wind** (<3 m/s) = +15 risk points
- **Too much wind** (>25 m/s) = +10 risk points (turbine shutdown)
- **Forecast consistency** analysis over 7 days

#### **Hydro Assets** 
- **Precipitation dependency**: <10mm total = +15 risk (drought)
- **Flooding risk**: >100mm total = +10 risk points
- **Water flow predictability** assessment

### **Policy Risk Enhancements**
- **Real-time regulatory changes** from Federal Register
- **Automatic impact classification**: Low/Medium/High
- **Financial impact estimation**: -0.5 to +0.3 scale
- **30-day rolling window** for recent policy changes

## **Performance Optimizations**

### **API Rate Limiting**
- **Batch processing chunks**: 5 receivables per chunk
- **Inter-chunk delays**: 1 second between API calls
- **Weather data caching**: 6 hours via EnhancedFreeWeatherService
- **Policy data caching**: 1 hour for regulatory updates

### **Error Handling**
- **Graceful API failures** with intelligent fallbacks
- **Partial batch success** reporting
- **Weather API failover** hierarchy
- **Conservative risk estimates** when APIs unavailable

### **Database Integration**
- **Risk persistence** to `climate_risk_calculations` table
- **Weather data caching** in `weather_cache` table (via weather service)
- **Policy impact storage** in `climate_policy_impacts` table

## **Usage Examples**

### **Single Risk Calculation**
```typescript
import { EnhancedRiskCalculationEngine } from './enhancedRiskCalculationEngine';

const result = await EnhancedRiskCalculationEngine.calculateEnhancedRisk({
  receivableId: 'climate-recv-123',
  assetId: 'solar-farm-456'
}, true); // Include real-time data

if (result.success) {
  console.log(`Risk Score: ${result.data.riskScore}`);
  console.log(`Discount Rate: ${result.data.discountRate}%`);
  console.log(`Weather Impact: ${result.data.factorsConsidered}`);
}
```

### **Batch Processing**
```typescript
const batchResult = await EnhancedRiskCalculationEngine.calculateBatchRisk([
  'receivable-1', 'receivable-2', 'receivable-3', 'receivable-4'
], true);

console.log(`Processed: ${batchResult.data?.length} of ${batchResult.metadata?.totalRequested}`);
console.log(`Errors: ${batchResult.metadata?.errors?.length || 0}`);
```

## **Integration Requirements**

### **Environment Variables (Optional)**
```bash
# All weather APIs are free, but WeatherAPI.com requires registration
VITE_WEATHERAPI_KEY=your_free_weatherapi_key  # Optional fallback

# Federal Register API requires no key
# Open-Meteo requires no key
# NOAA Weather.gov requires no key
```

### **Database Tables Required**
- ✅ `climate_risk_calculations` (exists)
- ✅ `climate_policy_impacts` (exists) 
- ✅ `energy_assets` (exists)
- ✅ `climate_pool_energy_assets` (exists)
- ✅ `weather_cache` (managed by weather service)

## **Service Dependencies**

### **Internal Dependencies**
- ✅ `EnhancedFreeWeatherService` - Weather data with free APIs
- ✅ `PayerRiskAssessmentService` - Credit risk analysis
- ✅ Supabase database connection

### **External APIs (All Free)**
- ✅ **Open-Meteo API** - Primary weather source (no key)
- ✅ **NOAA Weather.gov** - US weather backup (no key)  
- ✅ **Federal Register API** - Regulatory data (no key)
- ⚠️ **WeatherAPI.com** - International backup (free tier, key required)

## **Key Improvements from v1.0**

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Weather Data | Mock/defaults | Real API integration |
| Policy Risk | Database only | Federal Register API |
| Batch Processing | Single only | Chunk-based batch |
| API Costs | Paid APIs planned | 100% free APIs |
| Asset Specificity | Generic | Solar/Wind/Hydro specific |
| Error Handling | Basic | Comprehensive with fallbacks |
| Weather Risk | Estimated | Asset-specific calculations |
| Policy Tracking | Manual | Real-time government API |

## **Testing Recommendations**

### **Unit Tests**
- Test weather risk calculations for each asset type
- Verify batch processing chunk logic  
- Test API fallback hierarchy
- Validate policy impact categorization

### **Integration Tests**
- End-to-end risk calculation with real APIs
- Batch processing with error scenarios
- Database persistence verification
- Service orchestration integration

### **Performance Tests**
- Batch processing latency with 50+ receivables
- API rate limit compliance
- Memory usage with large batches
- Concurrent risk calculation loads

## **Next Steps**

1. **Complete Integration Testing** - Verify all API integrations work correctly
2. **Orchestrator Integration** - Update orchestrator service to use batch methods
3. **UI Integration** - Connect enhanced service to report generation system  
4. **Performance Monitoring** - Add logging for API response times and success rates
5. **Documentation** - Create API documentation for batch processing endpoints

## **Breaking Changes**

- **New return type** for production risk includes `weatherImpact` field
- **New batch method** requires different error handling approach
- **Enhanced policy risk** returns additional `recentChanges` field
- **Weather integration** may cause slower response times (cached after first call)

---

**Status**: ✅ **ENHANCED AND READY FOR INTEGRATION**
**Completion**: ~95% (pending integration testing)
**API Costs**: $0.00 (all free APIs)
**Real-time Capability**: Full weather and policy integration
**Batch Processing**: Fully implemented with rate limiting
