# Stage 8 Pricing UI Components - Complete Documentation

## Overview
This directory contains all UI components for Stage 8: Exchange Rate & Valuation Service. Components are organized by priority and use case.

## Components Index

### 🎯 High Priority (Core User Experience)
**Essential components for redemption flow and user-facing features**

#### 1. PriceDisplay
**File:** `price-display.tsx`
**Purpose:** Show current exchange rates for a token
**Usage:** Redemption flow, admin dashboard
**Features:**
- Current USDC/USDT rates
- Last updated timestamp
- Source information (CoinGecko, aggregated, etc.)
- Confidence percentage
- Cache age indicator
- Refresh button

```tsx
import { PriceDisplay } from '@/components/redemption/pricing';

<PriceDisplay tokenId="token-123" />
```

#### 2. ValuationChart
**File:** `valuation-chart.tsx`
**Purpose:** Visualize 4-hour OHLCV price periods
**Usage:** Analytics dashboard, token details page
**Features:**
- Candlestick chart (OHLC)
- Volume bars
- TWAP/VWAP overlay lines
- Time range selector (24h, 7d, 30d)
- Zoom/pan controls
- Period details in tooltips

```tsx
import { ValuationChart } from '@/components/redemption/pricing';

<ValuationChart tokenId="token-123" days={7} />
```

#### 3. ExchangeRateCard
**File:** `exchange-rate-card.tsx`
**Purpose:** Compact rate display for token lists
**Usage:** Token listings, portfolio views
**Features:**
- Token symbol + rate
- 24h change percentage (with color coding)
- Mini sparkline chart
- Click to see full details

```tsx
import { ExchangeRateCard, ExchangeRateCardCompact } from '@/components/redemption/pricing';

<ExchangeRateCard tokenId="token-123" />
<ExchangeRateCardCompact tokenId="token-123" /> {/* Smaller version */}
```

---

### 📊 Medium Priority (Analytics & Insights)
**Important components for detailed analysis and insights**

#### 4. ValuationMetricsPanel
**File:** `valuation-metrics-panel.tsx`
**Purpose:** Display calculated metrics for current valuation period
**Usage:** Token analytics page, detailed views
**Features:**
- TWAP (Time-Weighted Average Price)
- VWAP (Volume-Weighted Average Price)
- Volatility percentage with severity badges
- Price change (absolute + percentage)
- Period timestamps (start/end)
- Data point count
- High/Low prices for period
- Volume information

```tsx
import { ValuationMetricsPanel } from '@/components/redemption/pricing';

<ValuationMetricsPanel tokenId="token-123" />
```

#### 5. PriceHistoryTable
**File:** `price-history-table.tsx`
**Purpose:** Tabular view of historical price periods
**Usage:** Admin reports, detailed analytics
**Features:**
- Sortable columns (date, open, high, low, close, volume)
- Pagination (10 rows per page)
- Export to CSV functionality
- Date range filtering (7d, 14d, 30d, 90d)
- Search/filter capabilities
- Color-coded price movements

```tsx
import { PriceHistoryTable } from '@/components/redemption/pricing';

<PriceHistoryTable tokenId="token-123" defaultDays={30} />
```

#### 6. PriceTrendIndicator
**File:** `price-trend-indicator.tsx`
**Purpose:** Visual indicator of price movement
**Usage:** Token cards, dashboard widgets, portfolio views
**Features:**
- Trend arrow (up/down/flat) with color coding
- Percentage change display
- Configurable time period (7d, 30d, 90d)
- Multiple size variants (sm, md, lg)
- Compact design for embedding

**Variants:**
- `PriceTrendIndicator` - Basic trend with arrow and percentage
- `PriceTrendSparkline` - Includes mini sparkline chart
- `PriceTrendBadge` - Simple badge (Bullish/Bearish/Neutral)

```tsx
import { 
  PriceTrendIndicator, 
  PriceTrendSparkline,
  PriceTrendBadge 
} from '@/components/redemption/pricing';

<PriceTrendIndicator tokenId="token-123" days={7} size="md" />
<PriceTrendSparkline tokenId="token-123" days={30} showSparkline={true} />
<PriceTrendBadge tokenId="token-123" days={90} />
```

---

### 🔧 Admin Components (Medium-Low Priority)
**Administrative tools for configuration and monitoring**

#### 7. ExchangeRateConfigPanel
**File:** `exchange-rate-config-panel.tsx`
**Purpose:** Configure exchange rates for tokens
**Usage:** Admin settings page, token configuration
**Features:**
- Token selection
- Currency selection (USDC/USDT)
- Update frequency configuration (1min to 1hour)
- Price source selection with checkboxes
  - Chainlink (Oracle)
  - Pyth Network (Oracle)
  - CoinGecko (Market)
  - CoinMarketCap (Market)
- Fallback rate setting
- Max deviation threshold (0-100%)
- Multi-source requirement toggle
- Form validation
- Success/error messages

```tsx
import { ExchangeRateConfigPanel } from '@/components/redemption/pricing';

<ExchangeRateConfigPanel 
  tokenId="token-123"
  onSuccess={() => console.log('Config saved!')}
/>
```

#### 8. CacheStatisticsPanel
**File:** `cache-statistics-panel.tsx`
**Purpose:** Monitor cache performance
**Usage:** Admin dashboard, system monitoring
**Features:**
- Cache hit rate percentage with status (Excellent/Good/Fair/Poor)
- Total hits/misses metrics
- Cache size / max size with utilization progress
- Oldest and newest entry age
- Auto-refresh capability (configurable interval)
- Clear cache button with confirmation
- Refresh stats button
- Empty state handling

**Variants:**
- `CacheStatisticsPanel` - Full panel with all metrics
- `CompactCacheStats` - Minimal widget version

```tsx
import { 
  CacheStatisticsPanel,
  CompactCacheStats 
} from '@/components/redemption/pricing';

<CacheStatisticsPanel autoRefresh={true} refreshInterval={10000} />
<CompactCacheStats /> {/* For widgets */}
```

#### 9. OracleSourcesPanel
**File:** `oracle-sources-panel.tsx`
**Purpose:** View and manage price sources
**Usage:** Admin settings, oracle monitoring
**Features:**
- List of configured sources
- Source status indicators (Active/Inactive/Error)
- Last successful fetch timestamp
- Source type badges (Oracle/Market)
- Confidence scores
- Enable/disable sources with toggle
- Test connection button with loading state
- Visit source website links
- Minimum source warnings

**Variants:**
- `OracleSourcesPanel` - Full management panel
- `CompactSourceStatus` - Status widget

```tsx
import { 
  OracleSourcesPanel,
  CompactSourceStatus 
} from '@/components/redemption/pricing';

<OracleSourcesPanel tokenId="token-123" />
<CompactSourceStatus /> {/* For dashboards */}
```

---

### 🚨 Alert Components (Low Priority / Future)
**Notification and warning components for error states**

#### 10. Price Alert Components
**File:** `price-alerts.tsx`
**Purpose:** Alert users about price-related issues
**Usage:** Dashboard, admin notifications, redemption flow

**Components:**

##### PriceDeviationAlert
Warns when price deviates excessively between sources
```tsx
import { PriceDeviationAlert } from '@/components/redemption/pricing';

<PriceDeviationAlert
  tokenId="token-123"
  sources={[
    { provider: 'chainlink', rate: 1.0005 },
    { provider: 'pyth', rate: 1.0095 }
  ]}
  threshold={5}
  deviation={8.2}
  onManualReview={() => {}}
  onAcknowledge={() => {}}
/>
```

##### StaleDataWarning
Alerts when exchange rate data is stale
```tsx
import { StaleDataWarning } from '@/components/redemption/pricing';

<StaleDataWarning
  tokenId="token-123"
  lastUpdate="2024-01-01T10:00:00Z"
  staleThreshold={15} // minutes
  onRetry={async () => {}}
  onUseManualRate={() => {}}
  onDismiss={() => {}}
/>
```

##### PriceHealthAlert
Combined alert for multiple price issues
```tsx
import { PriceHealthAlert } from '@/components/redemption/pricing';

<PriceHealthAlert
  tokenId="token-123"
  status={{
    isHealthy: false,
    hasDeviation: true,
    isStale: false,
    deviationDetails: { /* ... */ }
  }}
  onResolve={() => {}}
/>
```

##### PriceAlertBanner
Compact alert banner for notifications
```tsx
import { PriceAlertBanner } from '@/components/redemption/pricing';

<PriceAlertBanner
  type="stale"
  message="Exchange rate data is outdated"
  severity="warning"
  onAction={() => {}}
  actionLabel="Refresh"
/>
```

---

## Data Flow

### Hooks Used
All components use centralized hooks from `/infrastructure/redemption/pricing/hooks.ts`:

- `useExchangeRate(tokenId, currency)` - Get exchange rate for token
- `useValuation(tokenId)` - Get current valuation with OHLCV
- `usePriceHistory(tokenId, startDate, endDate)` - Get historical periods
- `usePriceTrend(tokenId, days)` - Get price trend analysis
- `useConfigureExchangeRate()` - Configure exchange rate settings
- `useCacheStatistics()` - Get cache performance metrics

### Services
Components integrate with these backend services:

- `ExchangeRateService` - Exchange rate management
- `ValuationOracle` - 4-hour price period tracking
- `PriceHistoryTracker` - Historical data management
- `ExchangeRateCache` - Rate caching layer

---

## Styling & Design

### Design System
- **Framework:** Radix UI + shadcn/ui
- **Color Scheme:**
  - Green: Positive price movement, fresh data, success states
  - Red: Negative movement, errors, critical alerts
  - Gray: Neutral, stale data, inactive states
  - Blue: Information, cache hits, secondary actions

### Responsive Design
All components are responsive and adapt to different screen sizes:
- Mobile: Stacked layouts, collapsed details
- Tablet: 2-column grids
- Desktop: Full layouts with all details

---

## Performance Considerations

### Optimization Strategies
1. **Memoization:** All hooks use React.useMemo and useCallback
2. **Caching:** Exchange rates cached with configurable TTL
3. **Lazy Loading:** Charts and heavy components load on demand
4. **Pagination:** Large datasets use server-side pagination
5. **Debouncing:** Search and filter inputs debounced

### Best Practices
- Components check for data before rendering
- Loading states prevent layout shift
- Error boundaries handle failures gracefully
- Auto-refresh configurable or disabled

---

## Usage Examples

### Basic Redemption Flow
```tsx
import {
  PriceDisplay,
  PriceTrendIndicator,
  StaleDataWarning
} from '@/components/redemption/pricing';

function RedemptionPage({ tokenId }) {
  return (
    <div className="space-y-6">
      {/* Show current rate */}
      <PriceDisplay tokenId={tokenId} />
      
      {/* Show trend */}
      <PriceTrendIndicator tokenId={tokenId} days={7} />
      
      {/* Stale data check */}
      <StaleDataWarning /* ... */ />
    </div>
  );
}
```

### Analytics Dashboard
```tsx
import {
  ValuationChart,
  ValuationMetricsPanel,
  PriceHistoryTable
} from '@/components/redemption/pricing';

function AnalyticsDashboard({ tokenId }) {
  return (
    <div className="grid gap-6">
      <ValuationChart tokenId={tokenId} days={30} />
      <ValuationMetricsPanel tokenId={tokenId} />
      <PriceHistoryTable tokenId={tokenId} defaultDays={90} />
    </div>
  );
}
```

### Admin Panel
```tsx
import {
  ExchangeRateConfigPanel,
  CacheStatisticsPanel,
  OracleSourcesPanel
} from '@/components/redemption/pricing';

function AdminSettings({ tokenId }) {
  return (
    <div className="grid gap-6">
      <ExchangeRateConfigPanel tokenId={tokenId} />
      <CacheStatisticsPanel autoRefresh={true} />
      <OracleSourcesPanel tokenId={tokenId} />
    </div>
  );
}
```

### Token List/Portfolio
```tsx
import {
  ExchangeRateCardCompact,
  PriceTrendIndicator
} from '@/components/redemption/pricing';

function TokenList({ tokens }) {
  return (
    <div className="grid gap-4">
      {tokens.map(token => (
        <div key={token.id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3>{token.name}</h3>
            <PriceTrendIndicator tokenId={token.id} days={7} size="sm" />
          </div>
          <ExchangeRateCardCompact tokenId={token.id} />
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### Component Tests
All components include:
- Unit tests for rendering
- Integration tests with hooks
- Edge case handling
- Error state tests
- Loading state tests

### Manual Testing Checklist
- [ ] Components render without errors
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] Refresh/reload functionality works
- [ ] Export features work (CSV, etc.)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Color coding accurate (green/red for trends)
- [ ] Tooltips show correct information
- [ ] Forms validate properly
- [ ] Buttons disabled during loading

---

## Deployment Notes

### Environment Variables Required
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Tables Required
- `token_exchange_configs`
- `exchange_rate_history`
- `valuation_price_history`

See Stage 8 documentation for schema details.

---

## Future Enhancements

### Planned Features
1. **Real-time Updates:** WebSocket integration for live prices
2. **Advanced Charting:** More chart types (line, area, comparison)
3. **Price Alerts:** User-configurable price notifications
4. **Mobile App:** React Native versions of components
5. **Internationalization:** Multi-language support
6. **Dark Mode:** Enhanced dark mode theming
7. **Accessibility:** WCAG 2.1 AA compliance
8. **PDF Reports:** Export analytics as PDF

---

## Support

### Documentation
- Stage 8 Master Plan: `STAGE-8-EXCHANGE-VALUATION.md`
- Implementation Complete: `IMPLEMENTATION-COMPLETE.md`
- API Reference: `/infrastructure/redemption/pricing/`

### Troubleshooting
Common issues and solutions documented in component files.

---

**Last Updated:** November 2024
**Version:** 1.0.0
**Status:** ✅ Complete - All priority levels implemented
