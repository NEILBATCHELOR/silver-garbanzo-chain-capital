# Stage 8 Pricing UI Components

## Overview

Three essential UI components for displaying exchange rates and valuation data from the Stage 8 pricing infrastructure.

## Components

### 1. PriceDisplay

**File**: `price-display.tsx`

**Purpose**: Full-featured current exchange rate display for redemption flows

**Features**:
- Current USDC/USDT rate display
- Last updated timestamp with age indicator
- Source information (oracle, aggregated, etc.)
- Confidence percentage with visual indicator
- Refresh button
- Cache status badge
- Stale data warnings

**Usage**:
```tsx
import { PriceDisplay } from '@/components/redemption/pricing';

<PriceDisplay
  tokenId="token-uuid"
  currency={Currency.USDC}
  showRefresh={true}
  showMetadata={true}
/>
```

**Props**:
- `tokenId` (string, required): Token UUID
- `currency` (Currency, optional): USDC or USDT (default: USDC)
- `showRefresh` (boolean, optional): Show refresh button (default: true)
- `showMetadata` (boolean, optional): Show metadata details (default: true)
- `className` (string, optional): Additional CSS classes

---

### 2. ValuationChart

**File**: `valuation-chart.tsx`

**Purpose**: Interactive chart displaying 4-hour OHLCV price periods

**Features**:
- Candlestick-style price visualization
- Volume bars
- Time range selector (24h, 7d, 30d, 90d)
- Custom tooltip with OHLC details
- Statistics summary (high, low, average, volatility)
- Refresh button
- Responsive design

**Usage**:
```tsx
import { ValuationChart } from '@/components/redemption/pricing';

<ValuationChart
  tokenId="token-uuid"
  title="Price History"
  showVolume={true}
/>
```

**Props**:
- `tokenId` (string, required): Token UUID
- `title` (string, optional): Chart title (default: "4-Hour Price Periods")
- `showTWAP` (boolean, optional): Show TWAP line (default: true)
- `showVWAP` (boolean, optional): Show VWAP line (default: true)
- `showVolume` (boolean, optional): Show volume bars (default: true)
- `className` (string, optional): Additional CSS classes

---

### 3. ExchangeRateCard

**File**: `exchange-rate-card.tsx`

**Purpose**: Compact rate card for token lists and portfolio views

**Features**:
- Token symbol and rate
- 24-hour change percentage with color coding
- Mini sparkline chart (24 periods)
- Confidence indicator bar
- Source badge
- Click handler for navigation
- Hover effects

**Usage**:
```tsx
import { ExchangeRateCard, ExchangeRateCardCompact } from '@/components/redemption/pricing';

// Full card
<ExchangeRateCard
  tokenId="token-uuid"
  tokenSymbol="TOKEN"
  currency={Currency.USDC}
  onClick={() => navigate(`/token/${tokenId}`)}
/>

// Compact variant for grids
<ExchangeRateCardCompact
  tokenId="token-uuid"
  tokenSymbol="TOKEN"
  currency={Currency.USDC}
  onClick={() => navigate(`/token/${tokenId}`)}
/>
```

**Props** (both variants):
- `tokenId` (string, required): Token UUID
- `tokenSymbol` (string, optional): Token symbol/name
- `currency` (Currency, optional): USDC or USDT (default: USDC)
- `onClick` (function, optional): Click handler
- `className` (string, optional): Additional CSS classes

---

## Hooks Used

All components use hooks from `/infrastructure/redemption/pricing/hooks.ts`:

### `useExchangeRate`
Fetches current exchange rate with caching
```tsx
const { exchangeRate, loading, error, cached, age, refresh } = useExchangeRate(tokenId, currency);
```

### `usePriceHistory`
Fetches historical valuation data
```tsx
const { history, loading, error, refresh } = usePriceHistory(tokenId, startDate, endDate);
```

### `usePriceTrend`
Fetches price trend for specified days
```tsx
const { trend, loading, error, refresh } = usePriceTrend(tokenId, 7);
```

---

## Integration

### In Redemption Flow
```tsx
// redemption-request-form.tsx
import { PriceDisplay } from '@/components/redemption/pricing';

<PriceDisplay tokenId={selectedToken.id} currency={Currency.USDC} />
```

### In Token List
```tsx
// token-list.tsx
import { ExchangeRateCard } from '@/components/redemption/pricing';

{tokens.map(token => (
  <ExchangeRateCard
    key={token.id}
    tokenId={token.id}
    tokenSymbol={token.symbol}
    onClick={() => navigate(`/token/${token.id}`)}
  />
))}
```

### In Analytics Dashboard
```tsx
// analytics-dashboard.tsx
import { ValuationChart } from '@/components/redemption/pricing';

<ValuationChart tokenId={selectedToken.id} showVolume={true} />
```

---

## Styling

All components use:
- **shadcn/ui** components (Card, Button, Badge, etc.)
- **Radix UI** primitives
- **Recharts** for charts
- **Tailwind CSS** for styling
- **lucide-react** for icons

Color scheme:
- Green (#10b981): Positive changes, fresh data
- Red (#ef4444): Negative changes, errors
- Gray (#6b7280): Neutral, stale data
- Blue (#3b82f6): Information

---

## Error Handling

All components include:
- Loading states with Skeleton components
- Error states with Alert components
- Retry buttons on errors
- Empty states for no data
- Stale data warnings

---

## Performance

- Uses React hooks for efficient data fetching
- Implements caching at service level
- Memoizes expensive calculations
- Responsive charts with optimized rendering

---

## Testing

Test each component with:
1. Valid token ID
2. Invalid/missing token ID
3. Network errors
4. Slow API responses
5. Different time ranges
6. USDC vs USDT currencies

---

## Next Steps

Consider adding:
1. **PriceTrendIndicator** - Simple arrow/percentage for quick views
2. **ValuationMetricsPanel** - Detailed TWAP/VWAP/volatility display
3. **PriceHistoryTable** - Tabular view of periods
4. **ExchangeRateConfigPanel** - Admin configuration UI
5. **PriceDeviationAlert** - Warning when prices differ significantly
