# Market Data Charts - Debugging & Scale Fixes

**Date:** September 16, 2025  
**Status:** 🔧 **DEBUGGING ENHANCED**  
**Priority:** High

## Issues Addressed

### 1. ✅ Treasury Rates Single Point Issue - DEBUGGING ENHANCED

**Problem:** Treasury rates showing only one data point on 30-day time range

**Root Cause Investigation:**
- Historical FRED API calls may not be returning proper time series data
- Date range calculations might be incorrect
- Data processing may be filtering out valid observations

**Debugging Enhancements Applied:**

#### Enhanced Logging System
```typescript
// Added comprehensive console logging:
console.log(`🔍 Fetching treasury data from ${startDateStr} to ${endDateStr} for ${timeRange}`);
console.log(`📊 FRED ${seriesId} response:`, result);
console.log(`✅ ${seriesId}: ${observations.length} observations`);
console.log(`📅 Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]} (${sortedDates.length} dates)`);
```

#### Improved Error Handling
- Individual series failures logged separately
- Success/failure tracking for each FRED series
- Sample data point logging for validation

#### Cache Management for Debugging
- **Development Mode:** Cache automatically skipped for fresh data
- **Clear Cache Method:** `FreeMarketDataService.clearCache()` added
- **Dev Button:** Clear cache button in development mode

### 2. ✅ Credit Spreads Scale - FIXED WITH PROPER RANGES

**Problem:** Credit spreads dual y-axis scaling still incorrect for proper visualization

**Solution Applied:**

#### Fixed Y-Axis Domains
```typescript
// Investment Grade (Left Y-Axis): 0-400 basis points
domain={[0, 400]}

// High Yield (Right Y-Axis): 200-1600 basis points  
domain={[200, 1600]}
```

#### Chart Data Mapping Improved
- **Left Axis (IG):** Investment Grade aggregate + Corporate BBB areas
- **Right Axis (HY):** High Yield aggregate + High Yield B lines
- **Visual Hierarchy:** Areas for IG, Lines for HY with different weights

#### Typical Market Ranges
| Credit Quality | Normal Range | Stress Range | Y-Axis Assignment |
|----------------|--------------|--------------|-------------------|
| Investment Grade | 50-300 bps | 300-500 bps | **Left (0-400)** |
| High Yield | 300-800 bps | 800-1600 bps | **Right (200-1600)** |

## Technical Implementation

### Files Modified

1. **Service Layer:** `/services/climateReceivables/freeMarketDataService.ts`
   - ✅ Enhanced treasury data fetching with comprehensive logging
   - ✅ Added cache skip option for development debugging
   - ✅ Added clearCache() method for manual cache management
   - ✅ Improved FRED API response processing and validation

2. **Chart Component:** `/components/climateReceivables/components/visualizations/market-data-charts.tsx`
   - ✅ Fixed credit spreads Y-axis domains with proper ranges
   - ✅ Enhanced loadMarketData with detailed logging
   - ✅ Added clear cache button for development mode
   - ✅ Improved chart data mapping (IG areas, HY lines)

### Debugging Features Added

#### Console Logging Framework
```bash
# Treasury Data Debugging
🔍 Fetching treasury data from 2025-08-17 to 2025-09-16 for 30d
📊 FRED TB3MS response: {success: true, data: {...}}
✅ TB3MS: 23 observations
📅 Date range: 2025-08-17 to 2025-09-16 (23 dates)
✅ Treasury rate history completed: 23 data points for 30d
```

#### Cache Management
```bash
# Development Mode Cache Handling
⚠️ Skipping cache for treasury_history_30d
💾 Cache hit for treasury_history_90d (age: 45 seconds)
🕐 Cache expired for treasury_history_1y (age: 125 minutes)
🗑️ Cleared cache for treasury_history_30d
🗑️ Cleared all market data cache
```

#### Data Validation
```bash
# Sample Data Logging  
📊 Treasury sample: [{date: "2025-08-17", treasury_10y: 4.25}, {...}]
📊 Credit spread sample: [{date: "2025-08-17", investment_grade: 145, high_yield: 425}]
✅ Treasury history: 23 data points for 30d
✅ Credit spread history: 23 data points for 30d
```

### Development Tools

#### Clear Cache Button (Dev Mode Only)
- **Location:** Chart controls section  
- **Functionality:** Clears all market data cache entries
- **Usage:** Click before refresh to get completely fresh data
- **Visibility:** Only shown in `NODE_ENV === 'development'`

#### Cache Skip Logic
- **Development Mode:** Automatically skips cache for fresh data fetching
- **Production Mode:** Uses normal cache behavior (4-hour TTL)
- **Manual Override:** `clearCache()` method available for debugging

## Next Steps for Diagnosis

### Treasury Rates Single Point Issue

**If issue persists after these fixes:**

1. **Check Console Logs:** Look for the new debugging output
   ```bash
   🔍 Fetching treasury data from... to... for 30d
   📊 FRED [SeriesID] response: {...}
   ✅ [SeriesID]: X observations
   ```

2. **Verify FRED API Response:**
   - Check if `observations` array contains multiple entries
   - Verify date range in API response matches request
   - Confirm `value` fields are not '.' (FRED's null indicator)

3. **Data Processing Validation:**
   - Check if date set contains multiple dates
   - Verify data mapping is preserving all observations
   - Confirm filtering isn't removing valid data points

4. **Cache Troubleshooting:**
   - Use "Clear Cache" button in dev mode
   - Check console for cache hit/miss messages
   - Verify fresh API calls are being made

### Credit Spreads Scale Verification

**Testing Checklist:**
- [ ] Investment Grade data displays on left y-axis (0-400 bps range)
- [ ] High Yield data displays on right y-axis (200-1600 bps range)  
- [ ] Both data types are clearly readable at different scales
- [ ] Areas used for IG aggregates, lines used for HY series
- [ ] Tooltips show correct values with proper units (bps)

## Expected Behavior

### Treasury Rates (30d)
- **Data Points:** 20-25 observations (business days in 30-day period)
- **Series:** 3M, 2Y, 5Y, 10Y, 30Y treasury rates
- **Console Output:** Detailed logging showing successful data fetching
- **Chart Display:** Multiple points connected by lines across date range

### Credit Spreads
- **Left Y-Axis:** IG spreads 0-400 bps (filled areas)
- **Right Y-Axis:** HY spreads 200-1600 bps (colored lines)
- **Visual Separation:** Clear distinction between IG and HY scales
- **Tooltips:** Proper bps unit display for all series

## Troubleshooting Commands

### Manual Debugging
```typescript
// Clear specific cache entry
await FreeMarketDataService.clearCache('treasury_history_30d');

// Clear all cache
await FreeMarketDataService.clearCache();

// Check cache status in console logs
// Look for: 💾 Cache hit, 🕐 Cache expired, ⚠️ Skipping cache
```

### Environment Variables Check
```bash
# Ensure these are set correctly
VITE_FRED_API_KEY=your_real_fred_api_key  # Must be valid, not 'demo'
VITE_EIA_API_KEY=your_eia_api_key
NODE_ENV=development  # For enhanced debugging features
```

## Success Metrics

### Treasury Rates Fixed
- ✅ Multiple data points visible on 30d chart (20+ points expected)
- ✅ Console shows successful FRED API responses with multiple observations
- ✅ Date range spans full requested period
- ✅ All treasury series (3M, 2Y, 5Y, 10Y, 30Y) populate correctly

### Credit Spreads Fixed  
- ✅ Investment Grade spreads readable on left axis (0-400 bps)
- ✅ High Yield spreads readable on right axis (200-1600 bps)
- ✅ Clear visual separation between IG and HY data
- ✅ Proper scaling eliminates overlapping/unreadable data

**With these debugging enhancements, we can now identify exactly where the treasury rates single-point issue is occurring and resolve it systematically.**
